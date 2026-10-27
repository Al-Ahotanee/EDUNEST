const { PrismaClient, TeacherRoleType, AttendanceStatus, Gender } = require('@prisma/client');
const { TeacherService } = require('../dist/teacher/teacher.service');
const { AttendanceService } = require('../dist/attendance/attendance.service');
const { TimetableService } = require('../dist/timetable/timetable.service');

async function runTests() {
  const prisma = new PrismaClient();
  console.log('───────────────────────────────────────────────────────');
  console.log('🧪 Starting EduNest Teacher Portal Comprehensive Audit');
  console.log('───────────────────────────────────────────────────────\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      failed++;
    }
  }

  try {
    const teacherService = new TeacherService(prisma);
    const attendanceService = new AttendanceService(prisma);
    const timetableService = new TimetableService(prisma);

    // 1. Fetch teacher@demo.com
    const teacherUser = await prisma.user.findFirst({
      where: { email: 'teacher@demo.com' },
      include: {
        userRoles: { include: { role: { include: { rolePermissions: { include: { permission: true } } } } } },
        school: true,
      },
    });

    if (!teacherUser) {
      throw new Error('teacher@demo.com user not found in database.');
    }

    const schoolId = teacherUser.schoolId;
    const userPayload = {
      id: teacherUser.id,
      email: teacherUser.email,
      firstName: teacherUser.firstName,
      lastName: teacherUser.lastName,
      isSuperAdmin: false,
      roles: teacherUser.userRoles.map(ur => ({
        id: ur.role.id,
        name: ur.role.name,
        permissions: ur.role.rolePermissions.map(rp => ({ module: rp.permission.module, action: rp.permission.action })),
      })),
    };

    console.log(`📌 1. Testing Teacher Profile: ${userPayload.firstName} ${userPayload.lastName} (${userPayload.email})`);
    assert(userPayload.roles.some(r => r.name === 'Teacher'), 'User has database role "Teacher"');

    // 2. Test Teacher Dashboard Summary
    console.log('\n📌 2. Testing GET /teacher/dashboard summary logic...');
    const dashRes = await teacherService.getDashboardSummary(userPayload, schoolId);
    const dash = dashRes.data;

    assert(dash !== null && typeof dash === 'object', 'Dashboard response returned successfully');
    assert(dash.roles?.isClassMaster === true, 'Teacher is correctly recognized as CLASS_MASTER');
    assert(dash.roles?.isSubjectTeacher === true, 'Teacher is correctly recognized as SUBJECT_TEACHER');
    assert(dash.roles?.hasDualRole === true, 'Teacher has dual responsibility (Class Master & Subject Teacher)');
    assert(dash.classMaster?.classId !== undefined, `Class Master class assigned: ${dash.classMaster?.className}`);
    assert(dash.classMaster?.todayAttendance?.attendanceRate !== undefined, 'Attendance rate computed dynamically');
    assert(Array.isArray(dash.teaching?.classes) && dash.teaching.classes.length > 0, `Subject teaching classes listed: ${dash.teaching?.classes?.length} classes`);
    assert(Array.isArray(dash.teaching?.todayLessons), `Today's lessons populated: ${dash.teaching?.todayLessons?.length} periods`);

    // 3. Test Class Master "My Class" API
    console.log('\n📌 3. Testing GET /teacher/my-class logic...');
    const myClassRes = await teacherService.getMyClass(userPayload, schoolId);
    const myClass = myClassRes.data;

    assert(myClass.class?.id === dash.classMaster?.classId, 'My Class returns the assigned Class Master class');
    assert(Array.isArray(myClass.students) && myClass.students.length > 0, `Roster returns ${myClass.students.length} enrolled students`);
    assert(myClass.students[0]?.todayAttendance?.status !== undefined, 'Each enrolled student includes today attendance status');
    assert(Array.isArray(myClass.timetableSlots), `Class timetable slots returned: ${myClass.timetableSlots.length} slots`);

    // 4. Test Teacher Timetable API
    console.log('\n📌 4. Testing GET /teacher/my-schedule logic...');
    const scheduleRes = await timetableService.getMySchedule(userPayload, schoolId);
    const schedule = scheduleRes.data;

    assert(schedule.schedule && typeof schedule.schedule === 'object', 'Weekly schedule returned grouped by day');
    assert(schedule.totalSlots > 0, `Total teacher slots allocated: ${schedule.totalSlots}`);

    // 5. Test Attendance Scoping: Allowed for Assigned Class
    console.log('\n📌 5. Testing Attendance Recording Enforcement...');
    const validStudent = myClass.students[0];
    const session = await prisma.academicSession.findFirst({ where: { schoolId }, include: { terms: true } });
    const term = session?.terms[0];

    const markAllowedRes = await attendanceService.markAttendance(
      {
        studentId: validStudent.id,
        termId: term.id,
        date: new Date().toISOString(),
        status: AttendanceStatus.PRESENT,
        remarks: 'Automated RBAC verification test',
      },
      schoolId,
      userPayload
    );

    assert(markAllowedRes.data?.status === AttendanceStatus.PRESENT, 'Class Master successfully records attendance for student in assigned class');

    // 6. Test Attendance Scoping: Forbidden for Student in Another Class
    console.log('\n📌 6. Testing Attendance Rejection for Unassigned Class...');
    // Create or find an unassigned class
    let otherClass = await prisma.class.findFirst({
      where: { schoolId, id: { not: dash.classMaster.classId } },
    });
    if (!otherClass) {
      otherClass = await prisma.class.create({
        data: { name: 'SS 3 Test', schoolId, level: 6, capacity: 30 },
      });
    }

    // Create a student in the other class
    const otherStudent = await prisma.student.upsert({
      where: { schoolId_admissionNumber: { schoolId, admissionNumber: 'BFS/TEST/999' } },
      create: {
        schoolId,
        admissionNumber: 'BFS/TEST/999',
        firstName: 'Unauthorized',
        lastName: 'Student',
        gender: Gender.MALE,
        dateOfBirth: new Date('2014-01-01'),
      },
      update: {},
    });

    await prisma.classEnrollment.upsert({
      where: { studentId_sessionId: { studentId: otherStudent.id, sessionId: session.id } },
      create: { studentId: otherStudent.id, classId: otherClass.id, sessionId: session.id },
      update: { classId: otherClass.id },
    });

    let rejectedOtherClass = false;
    try {
      await attendanceService.markAttendance(
        {
          studentId: otherStudent.id,
          termId: term.id,
          date: new Date().toISOString(),
          status: AttendanceStatus.PRESENT,
        },
        schoolId,
        userPayload
      );
    } catch (e) {
      if (e.status === 403 || e.message.includes('only authorized')) {
        rejectedOtherClass = true;
      }
    }

    assert(rejectedOtherClass, 'Attendance submission for unassigned class is rejected with 403 Forbidden');

    // 7. Test Subject-Only Teacher (Cannot Record Any Class Attendance)
    console.log('\n📌 7. Testing Subject-Teacher-Only Restriction...');
    const subjectOnlyUser = {
      id: 'subject-teacher-only-test-id',
      email: 'subject.only@demo.com',
      firstName: 'Subject',
      lastName: 'Only',
      isSuperAdmin: false,
      roles: [{ id: 'role-tch', name: 'Teacher', permissions: [] }],
    };

    let rejectedSubjectOnly = false;
    try {
      await attendanceService.markAttendance(
        {
          studentId: validStudent.id,
          termId: term.id,
          date: new Date().toISOString(),
          status: AttendanceStatus.PRESENT,
        },
        schoolId,
        subjectOnlyUser
      );
    } catch (e) {
      if (e.status === 403 || e.message.includes('Subject teachers are not permitted')) {
        rejectedSubjectOnly = true;
      }
    }

    assert(rejectedSubjectOnly, 'Subject teacher without Class Master role is rejected with 403 Forbidden');

    console.log('\n───────────────────────────────────────────────────────');
    console.log(`Results: ${passed} PASSED, ${failed} FAILED`);
    console.log('───────────────────────────────────────────────────────');

    await prisma.$disconnect();
    if (failed > 0) process.exit(1);
  } catch (err) {
    console.error('Fatal error during test:', err);
    await prisma.$disconnect();
    process.exit(1);
  }
}

runTests();
