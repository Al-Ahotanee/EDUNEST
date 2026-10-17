import { PrismaClient, TeacherRoleType, ResultStatus, Gender, StudentStatus, SubscriptionPlan } from '@prisma/client';
import * as bcrypt from 'bcrypt';

import * as dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('\n=============================================================');
  console.log('🚀 PUSHING ALL SCHEMA & DATA ADDITIONS TO AIVEN CLOUD MYSQL');
  console.log('=============================================================\n');

  // ─── 1. Permissions ────────────────────────────────────────────────────────
  console.log('📌 1. Ensuring Permissions...');
  const modules = [
    'students', 'admissions', 'academic', 'attendance', 'results',
    'finance', 'hr', 'cbt', 'library', 'hostel', 'health', 'inventory',
    'timetable', 'notifications', 'reports', 'users', 'schools', 'settings',
  ];
  const actions = ['create', 'read', 'update', 'delete', 'export', 'approve'];

  const permissionData: Array<{ id: string; module: string; action: string; description: string }> = [];
  for (const module of modules) {
    for (const action of actions) {
      permissionData.push({
        id: `${module}_${action}`,
        module,
        action,
        description: `${action} ${module}`,
      });
    }
  }
  await prisma.permission.createMany({
    data: permissionData,
    skipDuplicates: true,
  });
  const allPermissions = await prisma.permission.findMany();
  console.log(`  ✅ ${allPermissions.length} permissions configured.`);

  // ─── 2. Tenant ─────────────────────────────────────────────────────────────
  console.log('📌 2. Ensuring Demo Tenant...');
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'demo-school' },
    create: {
      name: 'Bright Future Schools',
      slug: 'demo-school',
      email: 'admin@brightfuture.edu.ng',
      phone: '+2348012345678',
      address: 'No. 1 Education Road, Dutse, Jigawa State',
      primaryColor: '#2563eb',
      secondaryColor: '#7e3af2',
      subscriptionPlan: SubscriptionPlan.ENTERPRISE,
      isActive: true,
    },
    update: { isActive: true },
  });
  console.log(`  ✅ Tenant: ${tenant.name} (${tenant.slug})`);

  // ─── 3. School ─────────────────────────────────────────────────────────────
  console.log('📌 3. Ensuring Demo School...');
  const school = await prisma.school.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'BFS' } },
    create: {
      tenantId: tenant.id,
      name: 'Bright Future Secondary School',
      code: 'BFS',
      type: 'SECONDARY',
      address: 'No. 1 Education Road, Dutse, Jigawa State',
      phone: '+2348012345678',
      email: 'info@brightfuture.edu.ng',
      motto: 'Knowledge, Integrity, and Excellence',
      website: 'https://edunest.edu',
    },
    update: {
      type: 'SECONDARY',
      motto: 'Knowledge, Integrity, and Excellence',
      website: 'https://edunest.edu',
    },
  });
  console.log(`  ✅ School: ${school.name} (${school.code})`);

  // ─── 4. Roles ──────────────────────────────────────────────────────────────
  console.log('📌 4. Ensuring Roles...');
  const superAdminRole = await prisma.role.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: 'Super Admin' } },
    create: {
      tenantId: tenant.id,
      name: 'Super Admin',
      description: 'Full institutional authority',
      isSystem: true,
      rolePermissions: { create: allPermissions.map((p) => ({ permissionId: p.id })) },
    },
    update: {},
  });

  const teacherRole = await prisma.role.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: 'Teacher' } },
    create: {
      tenantId: tenant.id,
      name: 'Teacher',
      description: 'Academic staff access',
      rolePermissions: {
        create: allPermissions
          .filter((p) => ['students', 'attendance', 'results', 'academic'].includes(p.module) && ['read', 'create', 'update'].includes(p.action))
          .map((p) => ({ permissionId: p.id })),
      },
    },
    update: {},
  });

  const accountantRole = await prisma.role.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: 'Accountant' } },
    create: {
      tenantId: tenant.id,
      name: 'Accountant',
      description: 'Finance module access',
      rolePermissions: {
        create: allPermissions
          .filter((p) => ['finance', 'students'].includes(p.module))
          .map((p) => ({ permissionId: p.id })),
      },
    },
    update: {},
  });

  const parentRole = await prisma.role.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: 'Parent' } },
    create: {
      tenantId: tenant.id,
      name: 'Parent',
      description: 'Parent Portal Access',
      isSystem: true,
    },
    update: {},
  });

  console.log('  ✅ Roles established: Super Admin, Teacher, Accountant, Parent');

  // ─── 5. Users ──────────────────────────────────────────────────────────────
  console.log('📌 5. Ensuring Users with password123...');
  const hashedPassword = await bcrypt.hash('password123', 10);

  // Platform SuperAdmin
  await prisma.user.upsert({
    where: { email_tenantId: { email: 'superadmin@schoolerp.com', tenantId: tenant.id } },
    create: {
      tenantId: tenant.id,
      schoolId: school.id,
      email: 'superadmin@schoolerp.com',
      password: hashedPassword,
      firstName: 'Platform',
      lastName: 'SuperAdmin',
      isSuperAdmin: true,
      isActive: true,
      userRoles: { create: { roleId: superAdminRole.id } },
    },
    update: { password: hashedPassword, isSuperAdmin: true, isActive: true },
  });

  // School Admin / Principal (Musa Ibrahim)
  const adminUser = await prisma.user.upsert({
    where: { email_tenantId: { email: 'admin@demo.com', tenantId: tenant.id } },
    create: {
      tenantId: tenant.id,
      schoolId: school.id,
      email: 'admin@demo.com',
      password: hashedPassword,
      firstName: 'Musa',
      lastName: 'Ibrahim',
      isSuperAdmin: true,
      isActive: true,
      userRoles: { create: { roleId: superAdminRole.id } },
    },
    update: { password: hashedPassword, isSuperAdmin: true, isActive: true, schoolId: school.id },
  });

  // Class Master (Fatima Garba)
  const classMasterUser = await prisma.user.upsert({
    where: { email_tenantId: { email: 'classmaster.jss1@demo.com', tenantId: tenant.id } },
    create: {
      tenantId: tenant.id,
      schoolId: school.id,
      email: 'classmaster.jss1@demo.com',
      password: hashedPassword,
      firstName: 'Fatima',
      lastName: 'Garba',
      isActive: true,
      userRoles: { create: { roleId: teacherRole.id } },
    },
    update: { password: hashedPassword, isActive: true, schoolId: school.id },
  });

  // Subject Teacher (Babajide Ojo)
  const mathTeacherUser = await prisma.user.upsert({
    where: { email_tenantId: { email: 'teacher.math@demo.com', tenantId: tenant.id } },
    create: {
      tenantId: tenant.id,
      schoolId: school.id,
      email: 'teacher.math@demo.com',
      password: hashedPassword,
      firstName: 'Babajide',
      lastName: 'Ojo',
      isActive: true,
      userRoles: { create: { roleId: teacherRole.id } },
    },
    update: { password: hashedPassword, isActive: true, schoolId: school.id },
  });

  // General Teacher (Aisha Saleh)
  await prisma.user.upsert({
    where: { email_tenantId: { email: 'teacher@demo.com', tenantId: tenant.id } },
    create: {
      tenantId: tenant.id,
      schoolId: school.id,
      email: 'teacher@demo.com',
      password: hashedPassword,
      firstName: 'Aisha',
      lastName: 'Saleh',
      isActive: true,
      userRoles: { create: { roleId: teacherRole.id } },
    },
    update: { password: hashedPassword, isActive: true, schoolId: school.id },
  });

  // Accountant (Bello Usman)
  await prisma.user.upsert({
    where: { email_tenantId: { email: 'accountant@demo.com', tenantId: tenant.id } },
    create: {
      tenantId: tenant.id,
      schoolId: school.id,
      email: 'accountant@demo.com',
      password: hashedPassword,
      firstName: 'Bello',
      lastName: 'Usman',
      isActive: true,
      userRoles: { create: { roleId: accountantRole.id } },
    },
    update: { password: hashedPassword, isActive: true, schoolId: school.id },
  });

  // Parent (Engr. Nnamdi Eze)
  const parentEmail = 'parent.eze@demo.com';
  await prisma.user.upsert({
    where: { email_tenantId: { email: parentEmail, tenantId: tenant.id } },
    create: {
      tenantId: tenant.id,
      schoolId: school.id,
      email: parentEmail,
      password: hashedPassword,
      firstName: 'Nnamdi',
      lastName: 'Eze',
      isActive: true,
      userRoles: { create: { roleId: parentRole.id } },
    },
    update: { password: hashedPassword, isActive: true, schoolId: school.id },
  });

  console.log('  ✅ Users created & updated on Aiven.');

  // ─── 6. Academic Sessions & Terms ──────────────────────────────────────────
  console.log('📌 6. Ensuring Academic Session & Term...');
  const session = await prisma.academicSession.upsert({
    where: { schoolId_name: { schoolId: school.id, name: '2026/2027' } },
    create: {
      schoolId: school.id,
      name: '2026/2027',
      startDate: new Date('2026-09-01'),
      endDate: new Date('2027-07-31'),
      isCurrent: true,
    },
    update: { isCurrent: true },
  });

  const term = await prisma.term.upsert({
    where: { sessionId_name: { sessionId: session.id, name: 'First Term' } },
    create: {
      sessionId: session.id,
      name: 'First Term',
      startDate: new Date('2026-09-01'),
      endDate: new Date('2026-12-18'),
      isCurrent: true,
    },
    update: { isCurrent: true },
  });

  console.log(`  ✅ Academic Session: ${session.name}, Term: ${term.name}`);

  // ─── 7. Classes ────────────────────────────────────────────────────────────
  console.log('📌 7. Ensuring Classes...');
  const cls = await prisma.class.upsert({
    where: { schoolId_name_section: { schoolId: school.id, name: 'JSS 1 Emerald', section: 'Emerald' } },
    create: {
      schoolId: school.id,
      name: 'JSS 1 Emerald',
      level: 1,
      section: 'Emerald',
      capacity: 40,
    },
    update: {},
  });

  const additionalClasses = [
    { name: 'JSS 1', level: 1, section: 'A' },
    { name: 'JSS 2', level: 2, section: 'A' },
    { name: 'JSS 3', level: 3, section: 'A' },
    { name: 'SS 1', level: 4, section: 'A' },
    { name: 'SS 2', level: 5, section: 'A' },
    { name: 'SS 3', level: 6, section: 'A' },
  ];
  for (const ac of additionalClasses) {
    await prisma.class.upsert({
      where: { schoolId_name_section: { schoolId: school.id, name: ac.name, section: ac.section } },
      create: { schoolId: school.id, ...ac, capacity: 40 },
      update: {},
    });
  }
  console.log('  ✅ Classes established on Aiven.');

  // ─── 8. Subjects ───────────────────────────────────────────────────────────
  console.log('📌 8. Ensuring Subjects...');
  const mathSubject = await prisma.subject.upsert({
    where: { schoolId_code: { schoolId: school.id, code: 'MTH101' } },
    create: {
      schoolId: school.id,
      name: 'Mathematics',
      code: 'MTH101',
      description: 'Junior Secondary Mathematics',
      isCore: true,
    },
    update: {},
  });

  const engSubject = await prisma.subject.upsert({
    where: { schoolId_code: { schoolId: school.id, code: 'ENG101' } },
    create: {
      schoolId: school.id,
      name: 'English Studies',
      code: 'ENG101',
      description: 'Junior Secondary English',
      isCore: true,
    },
    update: {},
  });

  const bscSubject = await prisma.subject.upsert({
    where: { schoolId_code: { schoolId: school.id, code: 'BSC101' } },
    create: {
      schoolId: school.id,
      name: 'Basic Science',
      code: 'BSC101',
      description: 'Junior Secondary Basic Science',
      isCore: true,
    },
    update: {},
  });
  console.log('  ✅ Subjects established: Mathematics, English Studies, Basic Science');

  // ─── 9. Students & Guardians ───────────────────────────────────────────────
  console.log('📌 9. Ensuring Students & Guardians...');
  const studentData = [
    { firstName: 'Chukwudi', lastName: 'Eze', adm: 'BFS/2026/001', gender: Gender.MALE },
    { firstName: 'Amina', lastName: 'Bello', adm: 'BFS/2026/002', gender: Gender.FEMALE },
    { firstName: 'Oluwaseun', lastName: 'Adeleke', adm: 'BFS/2026/003', gender: Gender.MALE },
  ];

  const students = [];
  for (const s of studentData) {
    const student = await prisma.student.upsert({
      where: { schoolId_admissionNumber: { schoolId: school.id, admissionNumber: s.adm } },
      create: {
        schoolId: school.id,
        admissionNumber: s.adm,
        firstName: s.firstName,
        lastName: s.lastName,
        gender: s.gender,
        dateOfBirth: new Date('2014-05-12'),
        status: StudentStatus.ACTIVE,
      },
      update: {},
    });

    await prisma.classEnrollment.upsert({
      where: { studentId_sessionId: { studentId: student.id, sessionId: session.id } },
      create: {
        studentId: student.id,
        classId: cls.id,
        sessionId: session.id,
      },
      update: { classId: cls.id },
    });

    students.push(student);
  }

  // Link Guardian
  const existingGuardian = await prisma.guardian.findFirst({
    where: { studentId: students[0].id, email: parentEmail },
  });
  if (!existingGuardian) {
    await prisma.guardian.create({
      data: {
        studentId: students[0].id,
        firstName: 'Nnamdi',
        lastName: 'Eze',
        relationship: 'Father',
        phone: '+2348031234567',
        email: parentEmail,
        isEmergency: true,
        isPrimary: true,
      },
    });
  }
  console.log('  ✅ Students and Guardian record linked.');

  // ─── 10. Teacher Assignments ───────────────────────────────────────────────
  console.log('📌 10. Ensuring Teacher Assignments...');
  await prisma.teacherAssignment.upsert({
    where: {
      userId_classId_subjectId: {
        userId: mathTeacherUser.id,
        classId: cls.id,
        subjectId: mathSubject.id,
      },
    },
    create: {
      schoolId: school.id,
      userId: mathTeacherUser.id,
      classId: cls.id,
      subjectId: mathSubject.id,
      roleType: TeacherRoleType.SUBJECT_TEACHER,
    },
    update: { roleType: TeacherRoleType.SUBJECT_TEACHER },
  });

  const existingMaster = await prisma.teacherAssignment.findFirst({
    where: {
      userId: classMasterUser.id,
      classId: cls.id,
      roleType: TeacherRoleType.CLASS_MASTER,
    },
  });
  if (!existingMaster) {
    await prisma.teacherAssignment.create({
      data: {
        schoolId: school.id,
        userId: classMasterUser.id,
        classId: cls.id,
        roleType: TeacherRoleType.CLASS_MASTER,
      },
    });
  }
  console.log('  ✅ Teacher Assignments: Subject Teacher & Class Master assigned.');

  // ─── 11. Grading Scales ────────────────────────────────────────────────────
  console.log('📌 11. Ensuring Standard WAEC Grading Scales...');
  const scales = [
    { grade: 'A1', minScore: 75, maxScore: 100, remark: 'Distinction / Excellent' },
    { grade: 'B2', minScore: 70, maxScore: 74, remark: 'Very Good' },
    { grade: 'B3', minScore: 65, maxScore: 69, remark: 'Good' },
    { grade: 'C4', minScore: 60, maxScore: 64, remark: 'Credit / Upper Average' },
    { grade: 'C5', minScore: 55, maxScore: 59, remark: 'Credit / Average' },
    { grade: 'C6', minScore: 50, maxScore: 54, remark: 'Credit / Fair' },
    { grade: 'D7', minScore: 45, maxScore: 49, remark: 'Pass' },
    { grade: 'E8', minScore: 40, maxScore: 44, remark: 'Weak Pass' },
    { grade: 'F9', minScore: 0, maxScore: 39, remark: 'Fail' },
  ];

  const existingScales = await prisma.gradingScale.findMany({ where: { schoolId: school.id } });
  if (existingScales.length === 0) {
    await prisma.gradingScale.createMany({
      data: scales.map((sc, i) => ({
        schoolId: school.id,
        name: 'WAEC Standard',
        grade: sc.grade,
        minScore: sc.minScore,
        maxScore: sc.maxScore,
        remark: sc.remark,
        isPass: sc.grade !== 'F9',
        orderIndex: i,
      })),
    });
  }
  console.log('  ✅ WAEC 9-point grading scale configured.');

  // ─── 12. Results & Report Card ─────────────────────────────────────────────
  console.log('📌 12. Pushing Verified Official Results & Report Cards...');
  const resultScores = [
    { studentId: students[0].id, ca1: 18, ca2: 17, ca3: 8, exam: 52, total: 95, grade: 'A1', remark: 'Excellent' },
    { studentId: students[1].id, ca1: 16, ca2: 14, ca3: 7, exam: 48, total: 85, grade: 'A1', remark: 'Excellent' },
    { studentId: students[2].id, ca1: 12, ca2: 10, ca3: 5, exam: 38, total: 65, grade: 'B3', remark: 'Good' },
  ];

  for (const r of resultScores) {
    await prisma.result.upsert({
      where: {
        studentId_subjectId_termId: {
          studentId: r.studentId,
          subjectId: mathSubject.id,
          termId: term.id,
        },
      },
      create: {
        studentId: r.studentId,
        subjectId: mathSubject.id,
        termId: term.id,
        ca1Score: r.ca1,
        ca2Score: r.ca2,
        ca3Score: r.ca3,
        examScore: r.exam,
        totalScore: r.total,
        grade: r.grade,
        remark: r.remark,
        status: ResultStatus.PUBLISHED,
        isApproved: true,
        submittedBy: mathTeacherUser.id,
        submittedAt: new Date(),
        approvedBy: adminUser.id,
        approvedAt: new Date(),
        publishedBy: adminUser.id,
        publishedAt: new Date(),
      },
      update: {
        ca1Score: r.ca1,
        ca2Score: r.ca2,
        ca3Score: r.ca3,
        examScore: r.exam,
        totalScore: r.total,
        grade: r.grade,
        remark: r.remark,
        status: ResultStatus.PUBLISHED,
        isApproved: true,
        publishedBy: adminUser.id,
        publishedAt: new Date(),
      },
    });
  }

  // Endorse Official Report Card on Aiven
  await prisma.termReportCard.upsert({
    where: {
      studentId_termId: {
        studentId: students[0].id,
        termId: term.id,
      },
    },
    create: {
      schoolId: school.id,
      studentId: students[0].id,
      termId: term.id,
      classId: cls.id,
      attendanceDaysTotal: 65,
      attendanceDaysPresent: 63,
      attendanceDaysAbsent: 2,
      classTeacherRemark: 'An exceptionally diligent, brilliant, and well-behaved young scholar. Keep it up!',
      principalRemark: 'Outstanding academic performance and exemplary conduct. Highly commendable result.',
      promotionStatus: 'Promoted to JSS 2 Emerald',
      nextTermResumption: new Date('2027-01-11T08:00:00.000Z'),
      affectiveRatings: {
        Punctuality: 5,
        Neatness: 5,
        Politeness: 4,
        Honesty: 5,
        Leadership: 4,
        Teamwork: 5,
      },
      psychomotorRatings: {
        Handwriting: 4,
        Sports: 5,
        Craft: 4,
        PublicSpeaking: 4,
      },
      totalScore: 95,
      averageScore: 95,
      status: ResultStatus.PUBLISHED,
      publishedBy: adminUser.id,
      publishedAt: new Date(),
    },
    update: {
      attendanceDaysTotal: 65,
      attendanceDaysPresent: 63,
      attendanceDaysAbsent: 2,
      classTeacherRemark: 'An exceptionally diligent, brilliant, and well-behaved young scholar. Keep it up!',
      principalRemark: 'Outstanding academic performance and exemplary conduct. Highly commendable result.',
      promotionStatus: 'Promoted to JSS 2 Emerald',
      nextTermResumption: new Date('2027-01-11T08:00:00.000Z'),
      status: ResultStatus.PUBLISHED,
      publishedBy: adminUser.id,
      publishedAt: new Date(),
    },
  });

  console.log('  ✅ Published Results & Formal Report Card stored on Aiven.');

  console.log('\n=============================================================');
  console.log('🎉 ALL DATA & SCHEMA ADDITIONS SUCCESSFULLY PUSHED TO AIVEN!');
  console.log('=============================================================\n');
}

main()
  .catch((err) => {
    console.error('❌ SEED TO AIVEN FAILED:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
