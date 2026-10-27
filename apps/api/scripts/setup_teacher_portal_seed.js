const { PrismaClient, TeacherRoleType, Gender } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  console.log('Connecting to database...');

  // Find all teachers with email teacher@demo.com
  const teachers = await prisma.user.findMany({
    where: { email: 'teacher@demo.com' },
    include: { school: true, tenant: true },
  });

  console.log(`Found ${teachers.length} teacher@demo.com user(s)`);

  for (const teacher of teachers) {
    const schoolId = teacher.schoolId;
    if (!schoolId) {
      console.log(`Skipping teacher ${teacher.id} (no schoolId)`);
      continue;
    }

    console.log(`Configuring teacher for school: ${teacher.school?.name || schoolId}`);

    // 1. Ensure Staff record linked to teacher
    let staff = await prisma.staff.findFirst({
      where: { schoolId, OR: [{ userId: teacher.id }, { email: teacher.email }] },
    });

    if (!staff) {
      staff = await prisma.staff.create({
        data: {
          schoolId,
          userId: teacher.id,
          staffId: 'STF-TCH-001',
          firstName: teacher.firstName || 'Aisha',
          lastName: teacher.lastName || 'Saleh',
          email: teacher.email,
          gender: Gender.FEMALE,
          designation: 'Senior Teacher & Class Master',
          employmentType: 'FULL_TIME',
          isActive: true,
        },
      });
      console.log(`  ✅ Created staff record: ${staff.id}`);
    } else {
      if (!staff.userId) {
        staff = await prisma.staff.update({
          where: { id: staff.id },
          data: { userId: teacher.id },
        });
        console.log(`  ✅ Linked existing staff ${staff.id} to userId ${teacher.id}`);
      }
    }

    // 2. Find classes in this school (e.g. SS 1 or JSS 1)
    const classes = await prisma.class.findMany({
      where: { schoolId },
      orderBy: [{ level: 'asc' }, { name: 'asc' }],
    });

    if (classes.length === 0) {
      console.log('  ⚠️ No classes found in school.');
      continue;
    }

    const classMasterClass = classes.find(c => c.name.includes('SS 1') || c.name.includes('JSS 1')) || classes[0];
    const secondClass = classes.find(c => c.id !== classMasterClass.id) || classMasterClass;

    // 3. Find Mathematics subject (or first subject)
    const mathSubject = await prisma.subject.findFirst({
      where: { schoolId, OR: [{ name: { contains: 'Math' } }, { code: { contains: 'MTH' } }] },
    }) || await prisma.subject.findFirst({ where: { schoolId } });

    if (!mathSubject) {
      console.log('  ⚠️ No subjects found in school.');
      continue;
    }

    // 4. Create CLASS_MASTER assignment
    const existingCm = await prisma.teacherAssignment.findFirst({
      where: {
        schoolId,
        userId: teacher.id,
        classId: classMasterClass.id,
        roleType: TeacherRoleType.CLASS_MASTER,
      },
    });

    if (!existingCm) {
      await prisma.teacherAssignment.create({
        data: {
          schoolId,
          userId: teacher.id,
          classId: classMasterClass.id,
          roleType: TeacherRoleType.CLASS_MASTER,
        },
      });
      console.log(`  ✅ Assigned as CLASS_MASTER for ${classMasterClass.name} (${classMasterClass.section || 'A'})`);
    } else {
      console.log(`  ℹ️ Already CLASS_MASTER for ${classMasterClass.name}`);
    }

    // 5. Create SUBJECT_TEACHER assignments
    // For Class 1
    const existingSt1 = await prisma.teacherAssignment.findFirst({
      where: {
        schoolId,
        userId: teacher.id,
        classId: classMasterClass.id,
        subjectId: mathSubject.id,
      },
    });
    if (!existingSt1) {
      await prisma.teacherAssignment.create({
        data: {
          schoolId,
          userId: teacher.id,
          classId: classMasterClass.id,
          subjectId: mathSubject.id,
          roleType: TeacherRoleType.SUBJECT_TEACHER,
        },
      });
      console.log(`  ✅ Assigned as SUBJECT_TEACHER for ${mathSubject.name} in ${classMasterClass.name}`);
    }

    // For Class 2 (if different)
    if (secondClass.id !== classMasterClass.id) {
      const existingSt2 = await prisma.teacherAssignment.findFirst({
        where: {
          schoolId,
          userId: teacher.id,
          classId: secondClass.id,
          subjectId: mathSubject.id,
        },
      });
      if (!existingSt2) {
        await prisma.teacherAssignment.create({
          data: {
            schoolId,
            userId: teacher.id,
            classId: secondClass.id,
            subjectId: mathSubject.id,
            roleType: TeacherRoleType.SUBJECT_TEACHER,
          },
        });
        console.log(`  ✅ Assigned as SUBJECT_TEACHER for ${mathSubject.name} in ${secondClass.name}`);
      }
    }

    // 6. Ensure Timetable Slots for Aisha Saleh
    const slotCount = await prisma.timetableSlot.count({
      where: { staffId: staff.id },
    });

    if (slotCount === 0) {
      console.log('  Adding realistic timetable slots for Aisha Saleh...');
      const slots = [
        { dayOfWeek: 1, startTime: '08:00', endTime: '08:50', room: 'Room 101', classId: classMasterClass.id, subjectId: mathSubject.id },
        { dayOfWeek: 1, startTime: '09:00', endTime: '09:50', room: 'Room 201', classId: secondClass.id, subjectId: mathSubject.id },
        { dayOfWeek: 2, startTime: '10:00', endTime: '10:50', room: 'Room 101', classId: classMasterClass.id, subjectId: mathSubject.id },
        { dayOfWeek: 3, startTime: '08:00', endTime: '08:50', room: 'Room 201', classId: secondClass.id, subjectId: mathSubject.id },
        { dayOfWeek: 4, startTime: '11:00', endTime: '11:50', room: 'Room 101', classId: classMasterClass.id, subjectId: mathSubject.id },
        { dayOfWeek: 5, startTime: '09:00', endTime: '09:50', room: 'Room 201', classId: secondClass.id, subjectId: mathSubject.id },
      ];

      for (const slot of slots) {
        await prisma.timetableSlot.create({
          data: {
            ...slot,
            staffId: staff.id,
          },
        });
      }
      console.log(`  ✅ Created ${slots.length} timetable slots.`);
    } else {
      console.log(`  ℹ️ Staff already has ${slotCount} timetable slots.`);
    }
  }

  await prisma.$disconnect();
  console.log('\n🎉 Teacher portal seed completed successfully!');
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
