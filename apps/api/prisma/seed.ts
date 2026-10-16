import { PrismaClient, Gender, StudentStatus, SubscriptionPlan } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // ─── Permissions ─────────────────────────────────────────────────────────────
  const modules = [
    'students', 'admissions', 'academic', 'attendance', 'results',
    'finance', 'hr', 'cbt', 'library', 'hostel', 'health', 'inventory',
    'timetable', 'notifications', 'reports', 'users', 'schools', 'settings',
  ];
  const actions = ['create', 'read', 'update', 'delete', 'export', 'approve'];

  console.log('Creating permissions...');
  for (const module of modules) {
    for (const action of actions) {
      await prisma.permission.upsert({
        where: { module_action: { module, action } },
        create: { module, action, description: `${action} ${module}` },
        update: {},
      });
    }
  }

  const allPermissions = await prisma.permission.findMany();

  // ─── Tenant ──────────────────────────────────────────────────────────────────
  console.log('Creating demo tenant...');
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
    update: {},
  });

  // ─── School ──────────────────────────────────────────────────────────────────
  console.log('Creating demo school...');
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
    },
    update: {},
  });

  // ─── Roles ───────────────────────────────────────────────────────────────────
  console.log('Creating roles...');
  const superAdminRole = await prisma.role.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: 'Super Admin' } },
    create: {
      tenantId: tenant.id, name: 'Super Admin', description: 'Full platform access', isSystem: true,
      rolePermissions: { create: allPermissions.map(p => ({ permissionId: p.id })) },
    },
    update: {},
  });

  const teacherRole = await prisma.role.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: 'Teacher' } },
    create: {
      tenantId: tenant.id, name: 'Teacher', description: 'Academic staff access',
      rolePermissions: {
        create: allPermissions
          .filter(p => ['students', 'attendance', 'results', 'academic'].includes(p.module) && ['read', 'create', 'update'].includes(p.action))
          .map(p => ({ permissionId: p.id })),
      },
    },
    update: {},
  });

  const accountantRole = await prisma.role.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: 'Accountant' } },
    create: {
      tenantId: tenant.id, name: 'Accountant', description: 'Finance module access',
      rolePermissions: {
        create: allPermissions
          .filter(p => ['finance', 'students'].includes(p.module))
          .map(p => ({ permissionId: p.id })),
      },
    },
    update: {},
  });

  // ─── Users ───────────────────────────────────────────────────────────────────
  console.log('Creating users...');
  const hashedPassword = await bcrypt.hash('password123', 12);

  const adminUser = await prisma.user.upsert({
    where: { email_tenantId: { email: 'admin@demo.com', tenantId: tenant.id } },
    create: {
      tenantId: tenant.id, schoolId: school.id,
      email: 'admin@demo.com', password: hashedPassword,
      firstName: 'Musa', lastName: 'Ibrahim',
      isEmailVerified: true,
      isSuperAdmin: true,
      userRoles: { create: { roleId: superAdminRole.id } },
    },
    update: {
      isSuperAdmin: true,
    },
  });

  const platformAdmin = await prisma.user.upsert({
    where: { email_tenantId: { email: 'superadmin@schoolerp.com', tenantId: tenant.id } },
    create: {
      tenantId: tenant.id, schoolId: school.id,
      email: 'superadmin@schoolerp.com', password: hashedPassword,
      firstName: 'Platform', lastName: 'SuperAdmin',
      isEmailVerified: true,
      isSuperAdmin: true,
      userRoles: { create: { roleId: superAdminRole.id } },
    },
    update: {
      isSuperAdmin: true,
    },
  });

  const teacherUser = await prisma.user.upsert({
    where: { email_tenantId: { email: 'teacher@demo.com', tenantId: tenant.id } },
    create: {
      tenantId: tenant.id, schoolId: school.id,
      email: 'teacher@demo.com', password: hashedPassword,
      firstName: 'Aisha', lastName: 'Saleh',
      isEmailVerified: true,
      userRoles: { create: { roleId: teacherRole.id } },
    },
    update: {},
  });

  // ─── Academic Session ────────────────────────────────────────────────────────
  console.log('Creating academic session...');
  const session = await prisma.academicSession.upsert({
    where: { schoolId_name: { schoolId: school.id, name: '2024/2025' } },
    create: {
      schoolId: school.id, name: '2024/2025',
      startDate: new Date('2024-09-01'), endDate: new Date('2025-07-31'),
      isCurrent: true,
    },
    update: {},
  });

  const firstTerm = await prisma.term.upsert({
    where: { sessionId_name: { sessionId: session.id, name: 'First Term' } },
    create: {
      sessionId: session.id, name: 'First Term',
      startDate: new Date('2024-09-01'), endDate: new Date('2024-12-14'),
      isCurrent: true,
    },
    update: {},
  });

  // ─── Classes ─────────────────────────────────────────────────────────────────
  console.log('Creating classes...');
  const classData = [
    { name: 'JSS 1', level: 1, section: 'A', capacity: 40 },
    { name: 'JSS 2', level: 2, section: 'A', capacity: 40 },
    { name: 'JSS 3', level: 3, section: 'A', capacity: 40 },
    { name: 'SS 1', level: 4, section: 'A', capacity: 35 },
    { name: 'SS 2', level: 5, section: 'A', capacity: 35 },
    { name: 'SS 3', level: 6, section: 'A', capacity: 35 },
  ];

  const classes: any[] = [];
  for (const cls of classData) {
    const created = await prisma.class.upsert({
      where: { schoolId_name_section: { schoolId: school.id, name: cls.name, section: cls.section } },
      create: { schoolId: school.id, ...cls },
      update: {},
    });
    classes.push(created);
  }

  // ─── Subjects ────────────────────────────────────────────────────────────────
  console.log('Creating subjects...');
  const subjectData = [
    { name: 'Mathematics', code: 'MTH', isCore: true },
    { name: 'English Language', code: 'ENG', isCore: true },
    { name: 'Physics', code: 'PHY', isCore: true },
    { name: 'Chemistry', code: 'CHM', isCore: true },
    { name: 'Biology', code: 'BIO', isCore: true },
    { name: 'Economics', code: 'ECO', isCore: false },
    { name: 'Government', code: 'GOV', isCore: false },
    { name: 'Literature', code: 'LIT', isCore: false },
    { name: 'Further Mathematics', code: 'FMT', isCore: false },
    { name: 'Agricultural Science', code: 'AGR', isCore: false },
  ];

  const subjects: any[] = [];
  for (const subj of subjectData) {
    const created = await prisma.subject.upsert({
      where: { schoolId_code: { schoolId: school.id, code: subj.code } },
      create: { schoolId: school.id, ...subj },
      update: {},
    });
    subjects.push(created);
  }

  // ─── Departments ─────────────────────────────────────────────────────────────
  console.log('Creating departments...');
  const deptData = [
    { name: 'Science Department' },
    { name: 'Arts Department' },
    { name: 'Commercial Department' },
    { name: 'Administration' },
  ];
  const depts: any[] = [];
  for (const dept of deptData) {
    const created = await prisma.department.upsert({
      where: { schoolId_name: { schoolId: school.id, name: dept.name } },
      create: { schoolId: school.id, ...dept },
      update: {},
    });
    depts.push(created);
  }

  // ─── Staff ───────────────────────────────────────────────────────────────────
  console.log('Creating staff...');
  const staffData = [
    { staffId: 'STF001', firstName: 'Abdullahi', lastName: 'Musa', gender: Gender.MALE, designation: 'Principal', salary: 120000, departmentId: depts[3].id },
    { staffId: 'STF002', firstName: 'Fatima', lastName: 'Yusuf', gender: Gender.FEMALE, designation: 'Vice Principal', salary: 100000, departmentId: depts[3].id },
    { staffId: 'STF003', firstName: 'Ibrahim', lastName: 'Sani', gender: Gender.MALE, designation: 'Mathematics Teacher', salary: 75000, departmentId: depts[0].id },
    { staffId: 'STF004', firstName: 'Zainab', lastName: 'Hassan', gender: Gender.FEMALE, designation: 'English Teacher', salary: 75000, departmentId: depts[1].id },
    { staffId: 'STF005', firstName: 'Umar', lastName: 'Bello', gender: Gender.MALE, designation: 'Physics Teacher', salary: 80000, departmentId: depts[0].id },
    { staffId: 'STF006', firstName: 'Amina', lastName: 'Garba', gender: Gender.FEMALE, designation: 'Accountant', salary: 85000, departmentId: depts[3].id },
  ];

  for (const staff of staffData) {
    await prisma.staff.upsert({
      where: { schoolId_staffId: { schoolId: school.id, staffId: staff.staffId } },
      create: { schoolId: school.id, employmentType: 'FULL_TIME', isActive: true, ...staff } as any,
      update: {},
    });
  }

  // ─── Students ────────────────────────────────────────────────────────────────
  console.log('Creating sample students...');
  const studentData = [
    { admissionNumber: 'BFS/24/0001', firstName: 'Ahmad', lastName: 'Usman', gender: Gender.MALE, dateOfBirth: new Date('2010-03-15'), stateOfOrigin: 'Jigawa', classIdx: 0 },
    { admissionNumber: 'BFS/24/0002', firstName: 'Hafsat', lastName: 'Ibrahim', gender: Gender.FEMALE, dateOfBirth: new Date('2010-07-22'), stateOfOrigin: 'Kano', classIdx: 0 },
    { admissionNumber: 'BFS/24/0003', firstName: 'Suleiman', lastName: 'Abdullahi', gender: Gender.MALE, dateOfBirth: new Date('2009-11-08'), stateOfOrigin: 'Jigawa', classIdx: 1 },
    { admissionNumber: 'BFS/24/0004', firstName: 'Maryam', lastName: 'Sani', gender: Gender.FEMALE, dateOfBirth: new Date('2009-04-30'), stateOfOrigin: 'Bauchi', classIdx: 1 },
    { admissionNumber: 'BFS/24/0005', firstName: 'Yakubu', lastName: 'Garba', gender: Gender.MALE, dateOfBirth: new Date('2008-01-17'), stateOfOrigin: 'Jigawa', classIdx: 2 },
    { admissionNumber: 'BFS/24/0006', firstName: 'Hauwa', lastName: 'Musa', gender: Gender.FEMALE, dateOfBirth: new Date('2008-09-05'), stateOfOrigin: 'Katsina', classIdx: 2 },
    { admissionNumber: 'BFS/24/0007', firstName: 'Ismail', lastName: 'Yusuf', gender: Gender.MALE, dateOfBirth: new Date('2007-06-12'), stateOfOrigin: 'Jigawa', classIdx: 3 },
    { admissionNumber: 'BFS/24/0008', firstName: 'Aisha', lastName: 'Bello', gender: Gender.FEMALE, dateOfBirth: new Date('2007-02-28'), stateOfOrigin: 'Sokoto', classIdx: 3 },
    { admissionNumber: 'BFS/24/0009', firstName: 'Kabir', lastName: 'Saleh', gender: Gender.MALE, dateOfBirth: new Date('2006-08-19'), stateOfOrigin: 'Jigawa', classIdx: 4 },
    { admissionNumber: 'BFS/24/0010', firstName: 'Zulaihat', lastName: 'Isa', gender: Gender.FEMALE, dateOfBirth: new Date('2006-12-03'), stateOfOrigin: 'Gombe', classIdx: 4 },
  ];

  const students: any[] = [];
  for (const s of studentData) {
    const { classIdx, ...studentFields } = s;
    const student = await prisma.student.upsert({
      where: { schoolId_admissionNumber: { schoolId: school.id, admissionNumber: s.admissionNumber } },
      create: {
        schoolId: school.id,
        ...studentFields,
        status: StudentStatus.ACTIVE,
        nationality: 'Nigerian',
        guardians: {
          create: [{
            firstName: 'Alhaji', lastName: studentFields.lastName,
            relationship: 'Father', phone: `+23480${Math.floor(10000000 + Math.random() * 90000000)}`,
            isEmergency: true,
          }],
        },
      },
      update: {},
    });

    // Enroll in class
    await prisma.classEnrollment.upsert({
      where: { studentId_sessionId: { studentId: student.id, sessionId: session.id } },
      create: { studentId: student.id, classId: classes[classIdx].id, sessionId: session.id },
      update: {},
    });

    students.push({ ...student, classIdx });
  }

  // ─── Fee Structures ──────────────────────────────────────────────────────────
  console.log('Creating fee structures...');
  const feeStructures = [
    { name: 'School Fees', amount: 45000, description: 'Termly school fees', termBased: true },
    { name: 'PTA Levy', amount: 5000, description: 'Parent-Teacher Association levy', termBased: true },
    { name: 'Development Levy', amount: 10000, description: 'School development fund', termBased: false },
    { name: 'Examination Fee', amount: 3000, description: 'End of term examination fee', termBased: true },
  ];

  const fees: any[] = [];
  for (const fee of feeStructures) {
    const created = await prisma.feeStructure.upsert({
      where: { id: `fee-${school.id}-${fee.name}`.slice(0, 36) },
      create: { schoolId: school.id, ...fee },
      update: {},
    }).catch(() => prisma.feeStructure.create({ data: { schoolId: school.id, ...fee } }));
    fees.push(created);
  }

  // ─── Invoices & Payments ─────────────────────────────────────────────────────
  console.log('Creating sample invoices...');
  let invoiceCounter = 1;
  for (const student of students.slice(0, 6)) {
    const total = 45000 + 5000 + 3000;
    const amountPaid = invoiceCounter <= 3 ? total : invoiceCounter === 4 ? 30000 : 0;
    const balance = total - amountPaid;
    const status = amountPaid >= total ? 'PAID' : amountPaid > 0 ? 'PARTIAL' : 'UNPAID';

    const invoice = await prisma.invoice.create({
      data: {
        studentId: student.id,
        invoiceNo: `INV-BFS-24-${String(invoiceCounter).padStart(5, '0')}`,
        dueDate: new Date('2024-09-30'),
        subtotal: total,
        discount: 0,
        total,
        amountPaid,
        balance,
        status,
        items: {
          create: [
            { description: 'School Fees (First Term)', amount: 45000, quantity: 1, subtotal: 45000 },
            { description: 'PTA Levy', amount: 5000, quantity: 1, subtotal: 5000 },
            { description: 'Examination Fee', amount: 3000, quantity: 1, subtotal: 3000 },
          ],
        },
      },
    });

    if (amountPaid > 0) {
      await prisma.payment.create({
        data: {
          invoiceId: invoice.id,
          amount: amountPaid,
          method: 'BANK_TRANSFER',
          receiptNo: `RCP-BFS-${String(invoiceCounter).padStart(6, '0')}`,
          paymentDate: new Date('2024-09-10'),
        },
      });
    }
    invoiceCounter++;
  }

  // ─── Sample Results ──────────────────────────────────────────────────────────
  console.log('Creating sample results...');
  for (const student of students.slice(0, 4)) {
    for (const subject of subjects.slice(0, 5)) {
      const ca1 = Math.floor(15 + Math.random() * 15);
      const ca2 = Math.floor(15 + Math.random() * 15);
      const exam = Math.floor(25 + Math.random() * 15);
      const total = ca1 + ca2 + exam;

      let grade = 'F';
      if (total >= 90) grade = 'A+';
      else if (total >= 80) grade = 'A';
      else if (total >= 70) grade = 'B';
      else if (total >= 60) grade = 'C';
      else if (total >= 50) grade = 'D';

      const remark = { 'A+': 'Excellent', A: 'Very Good', B: 'Good', C: 'Average', D: 'Below Average', F: 'Fail' }[grade]!;

      await prisma.result.upsert({
        where: { studentId_subjectId_termId: { studentId: student.id, subjectId: subject.id, termId: firstTerm.id } },
        create: { studentId: student.id, subjectId: subject.id, termId: firstTerm.id, ca1Score: ca1, ca2Score: ca2, examScore: exam, totalScore: total, grade, remark },
        update: {},
      });
    }
  }

  // ─── Sample Attendance ───────────────────────────────────────────────────────
  console.log('Creating sample attendance...');
  const attendanceDates = [
    '2024-09-02', '2024-09-03', '2024-09-04', '2024-09-05', '2024-09-09',
    '2024-09-10', '2024-09-11', '2024-09-12', '2024-09-16', '2024-09-17',
  ];

  const statuses = ['PRESENT', 'PRESENT', 'PRESENT', 'PRESENT', 'ABSENT', 'PRESENT', 'LATE', 'PRESENT', 'PRESENT', 'PRESENT'];

  for (const student of students.slice(0, 4)) {
    for (let i = 0; i < attendanceDates.length; i++) {
      await prisma.attendance.upsert({
        where: { studentId_date: { studentId: student.id, date: new Date(attendanceDates[i]) } },
        create: {
          studentId: student.id,
          termId: firstTerm.id,
          date: new Date(attendanceDates[i]),
          status: statuses[i] as any,
        },
        update: {},
      }).catch(() => {});
    }
  }

  console.log('\n✅ Database seeded successfully!');
  console.log('─────────────────────────────────');
  console.log('Demo Credentials:');
  console.log('  Super Admin: admin@demo.com / password123');
  console.log('  Teacher:     teacher@demo.com / password123');
  console.log('  Tenant Slug: demo-school');
  console.log('─────────────────────────────────');
}

main()
  .catch(e => { console.error('❌ Seed error:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
