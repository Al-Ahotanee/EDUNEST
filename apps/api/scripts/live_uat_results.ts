import { PrismaClient, TeacherRoleType, ResultStatus, Gender, StudentStatus, SubscriptionPlan } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const API_BASE = 'http://127.0.0.1:3000/api/v1';
const prisma = new PrismaClient();

// Helper for HTTP requests
async function request(endpoint: string, options: { method?: string; token?: string; body?: any } = {}) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (options.token) {
    headers['Authorization'] = `Bearer ${options.token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const text = await res.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  return { status: res.status, ok: res.ok, data };
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  } else {
    console.log(`  ✅ ${message}`);
  }
}

async function runLiveUat() {
  console.log('\n=============================================================');
  console.log('🚀 STARTING COMPREHENSIVE LIVE UAT FOR RESULT MANAGEMENT');
  console.log('=============================================================\n');

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 1: PRISMA SEED & TEST FIXTURES INITIALIZATION
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('📌 STEP 1: Establishing Test Environment & Seed Fixtures...');

  // 1. Tenant & School
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

  // 2. Roles & Permissions
  const teacherRole = await prisma.role.findFirst({
    where: { tenantId: tenant.id, name: 'Teacher' },
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

  const defaultPasswordHash = await bcrypt.hash('password123', 10);

  // 3. Academic Session & Term (2026/2027 First Term)
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

  // 4. Class: JSS 1 Emerald
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

  // 5. Subjects: Mathematics & English Studies & Basic Science
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

  // 6. Students & Enrollments
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

  // 7. Users:
  // Math Subject Teacher
  const mathTeacherUser = await prisma.user.upsert({
    where: { email_tenantId: { email: 'teacher.math@demo.com', tenantId: tenant.id } },
    create: {
      tenantId: tenant.id,
      schoolId: school.id,
      email: 'teacher.math@demo.com',
      password: defaultPasswordHash,
      firstName: 'Babajide',
      lastName: 'Ojo',
      isActive: true,
      userRoles: teacherRole ? { create: { roleId: teacherRole.id } } : undefined,
    },
    update: { password: defaultPasswordHash, isActive: true },
  });

  // Class Master for JSS 1 Emerald
  const classMasterUser = await prisma.user.upsert({
    where: { email_tenantId: { email: 'classmaster.jss1@demo.com', tenantId: tenant.id } },
    create: {
      tenantId: tenant.id,
      schoolId: school.id,
      email: 'classmaster.jss1@demo.com',
      password: defaultPasswordHash,
      firstName: 'Fatima',
      lastName: 'Garba',
      isActive: true,
      userRoles: teacherRole ? { create: { roleId: teacherRole.id } } : undefined,
    },
    update: { password: defaultPasswordHash, isActive: true },
  });

  // School Principal / Admin
  const adminUser = await prisma.user.findFirst({
    where: { email: 'admin@demo.com', tenantId: tenant.id },
  });
  if (adminUser) {
    await prisma.user.update({
      where: { id: adminUser.id },
      data: { password: defaultPasswordHash, isActive: true, isSuperAdmin: true, schoolId: school.id, tenantId: tenant.id },
    });
  }

  // Parent User & Guardian record for Chukwudi Eze
  const parentEmail = 'parent.eze@demo.com';
  const parentUser = await prisma.user.upsert({
    where: { email_tenantId: { email: parentEmail, tenantId: tenant.id } },
    create: {
      tenantId: tenant.id,
      schoolId: school.id,
      email: parentEmail,
      password: defaultPasswordHash,
      firstName: 'Nnamdi',
      lastName: 'Eze',
      isActive: true,
      userRoles: { create: { roleId: parentRole.id } },
    },
    update: { password: defaultPasswordHash, isActive: true },
  });

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

  // 8. Teacher Assignments
  // Subject Teacher: Babajide Ojo -> JSS 1 Emerald -> Mathematics
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

  // Class Master: Fatima Garba -> JSS 1 Emerald
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

  // Reset any previous test results for clean UAT run
  await prisma.result.deleteMany({
    where: {
      termId: term.id,
      studentId: { in: students.map(s => s.id) },
    },
  });
  await prisma.termReportCard.deleteMany({
    where: {
      termId: term.id,
      studentId: { in: students.map(s => s.id) },
    },
  });

  console.log('✅ Step 1 Complete: All test fixtures, users, assignments, and entities seeded.\n');

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 2: LIVE UAT — SUBJECT TEACHER PERSONA
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('📌 STEP 2: Live UAT — Subject Teacher (Babajide Ojo)...');

  // A. Login
  const teacherLogin = await request('/auth/login', {
    method: 'POST',
    body: { email: 'teacher.math@demo.com', password: 'password123' },
  });
  assert(teacherLogin.ok, 'Subject Teacher login succeeds');
  const teacherToken = teacherLogin.data.accessToken;

  // B. Verify Assignments Endpoint
  const assignmentsRes = await request('/results/my-assignments', { token: teacherToken });
  assert(assignmentsRes.ok, 'Subject Teacher fetches their assigned classes & subjects');
  assert(
    assignmentsRes.data?.data?.assignments?.some((a: any) => a.classId === cls.id && a.subjectId === mathSubject.id),
    'Subject Teacher is recognized as Mathematics teacher for JSS 1 Emerald',
  );

  // C. Test RBAC: Attempt to modify English Studies (Teacher is NOT assigned to English)
  const unauthorizedSave = await request('/results/matrix/save', {
    method: 'POST',
    token: teacherToken,
    body: {
      classId: cls.id,
      subjectId: engSubject.id,
      termId: term.id,
      scores: [{ studentId: students[0].id, ca1Score: 15, examScore: 50 }],
    },
  });
  assert(unauthorizedSave.status === 403, 'RBAC Security: Subject Teacher blocked with 403 from editing unassigned subject (English Studies)');

  // D. Authorized Save: Save Draft Continuous Assessment & Exam scores for Mathematics
  const draftSave = await request('/results/matrix/save', {
    method: 'POST',
    token: teacherToken,
    body: {
      classId: cls.id,
      subjectId: mathSubject.id,
      termId: term.id,
      submitForApproval: false,
      scores: [
        { studentId: students[0].id, ca1Score: 18, ca2Score: 17, ca3Score: 8, examScore: 52 }, // Total: 95 -> A1
        { studentId: students[1].id, ca1Score: 16, ca2Score: 14, ca3Score: 7, examScore: 48 }, // Total: 85 -> A1
        { studentId: students[2].id, ca1Score: 12, ca2Score: 10, ca3Score: 5, examScore: 38 }, // Total: 65 -> B3
      ],
    },
  });
  assert(draftSave.ok, 'Subject Teacher saves scores as DRAFT in Mathematics');
  assert(draftSave.data?.data?.status === 'DRAFT', 'Scores are correctly stored with status DRAFT');

  // E. Retrieve Matrix Spreadsheet
  const matrixRes = await request(`/results/matrix?classId=${cls.id}&subjectId=${mathSubject.id}&termId=${term.id}`, {
    token: teacherToken,
  });
  assert(matrixRes.ok, 'Subject Teacher retrieves interactive spreadsheet matrix');
  const matrixRows = matrixRes.data?.data?.students;
  assert(matrixRows?.length === 3, 'Spreadsheet contains all 3 students');
  const ezeMath = matrixRows?.find((s: any) => s.studentId === students[0].id);
  assert(ezeMath?.totalScore === 95 && ezeMath?.grade === 'A1', 'Automated WAEC grading computes 95 = A1 for Chukwudi Eze');

  // F. Submit Scores to Principal/Class Master for Approval
  const submitRes = await request('/results/matrix/save', {
    method: 'POST',
    token: teacherToken,
    body: {
      classId: cls.id,
      subjectId: mathSubject.id,
      termId: term.id,
      submitForApproval: true,
      scores: [
        { studentId: students[0].id, ca1Score: 18, ca2Score: 17, ca3Score: 8, examScore: 52 },
        { studentId: students[1].id, ca1Score: 16, ca2Score: 14, ca3Score: 7, examScore: 48 },
        { studentId: students[2].id, ca1Score: 12, ca2Score: 10, ca3Score: 5, examScore: 38 },
      ],
    },
  });
  assert(submitRes.ok, 'Subject Teacher submits Mathematics scores for formal approval');
  assert(submitRes.data?.data?.status === 'SUBMITTED', 'Scores transition to SUBMITTED status');

  console.log('✅ Step 2 Complete: Subject Teacher CRUD, automated grading, access guard, and submission verified.\n');

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 3: LIVE UAT — CLASS MASTER PERSONA (Fatima Garba)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('📌 STEP 3: Live UAT — Class Master (Fatima Garba)...');

  // A. Login
  const masterLogin = await request('/auth/login', {
    method: 'POST',
    body: { email: 'classmaster.jss1@demo.com', password: 'password123' },
  });
  assert(masterLogin.ok, 'Class Master login succeeds');
  const masterToken = masterLogin.data.accessToken;

  // B. Master Class Broadsheet
  const broadsheetRes = await request(`/results/broadsheet/${cls.id}/${term.id}`, { token: masterToken });
  assert(broadsheetRes.ok, 'Class Master compiles master class broadsheet for JSS 1 Emerald');
  const broadsheet = broadsheetRes.data?.data;
  assert(broadsheet?.students?.length === 3, 'Broadsheet compiles all students across active subjects');
  assert(broadsheet?.students[0]?.position === 1, 'Broadsheet correctly ranks student #1 (Chukwudi Eze with 95%)');
  assert(broadsheet?.subjectStats?.length > 0, 'Broadsheet includes comprehensive subject statistics (High, Low, Average)');

  // C. Class Teacher Endorsement: Affective & Psychomotor Domains + Remarks
  const endorseRes = await request('/results/report-card/endorse', {
    method: 'POST',
    token: masterToken,
    body: {
      studentId: students[0].id,
      termId: term.id,
      classId: cls.id,
      attendanceDaysTotal: 65,
      attendanceDaysPresent: 63,
      attendanceDaysAbsent: 2,
      classTeacherRemark: 'An exceptionally diligent, brilliant, and well-behaved young scholar. Keep it up!',
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
    },
  });
  assert(endorseRes.ok, 'Class Master endorses report card with 65-day attendance, 5-point affective & psychomotor ratings, and formal remarks');

  console.log('✅ Step 3 Complete: Class Master broadsheet review and holistic domain endorsement verified.\n');

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 4: LIVE UAT — PRINCIPAL / ADMIN PERSONA (Musa Ibrahim)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('📌 STEP 4: Live UAT — Principal / School Admin (Musa Ibrahim)...');

  // A. Login
  const adminLogin = await request('/auth/login', {
    method: 'POST',
    body: { email: 'admin@demo.com', password: 'password123' },
  });
  assert(adminLogin.ok, 'Principal / School Admin login succeeds');
  const adminToken = adminLogin.data.accessToken;

  // B. Approval Pipeline Overview
  const pipelineRes = await request(`/results/pipeline/${term.id}`, { token: adminToken });
  assert(pipelineRes.ok, 'Principal accesses institutional results approval pipeline');
  const pipelineList = Array.isArray(pipelineRes.data?.data) ? pipelineRes.data?.data : (pipelineRes.data?.data?.pipeline || []);
  const classPipeline = pipelineList.find((p: any) => p.classId === cls.id);
  assert(classPipeline?.submitted > 0, 'Pipeline detects JSS 1 Emerald Mathematics submitted scores awaiting approval');

  // C. Principal Formal Approval
  const approveRes = await request('/results/approve', {
    method: 'POST',
    token: adminToken,
    body: { termId: term.id, classId: cls.id, subjectId: mathSubject.id },
  });
  assert(approveRes.ok, 'Principal formally approves JSS 1 Emerald Mathematics scores');

  // D. Principal Report Card Endorsement
  const principalEndorseRes = await request('/results/report-card/endorse', {
    method: 'POST',
    token: adminToken,
    body: {
      studentId: students[0].id,
      termId: term.id,
      classId: cls.id,
      principalRemark: 'Outstanding academic performance and exemplary conduct. Highly commendable result.',
      promotionStatus: 'Promoted to JSS 2 Emerald',
      nextTermResumption: '2027-01-11T08:00:00.000Z',
    },
  });
  assert(principalEndorseRes.ok, 'Principal provides institutional remark, promotion status, and next term resumption date');

  // E. Official Institutional Publication
  const publishRes = await request('/results/publish', {
    method: 'POST',
    token: adminToken,
    body: { termId: term.id, classId: cls.id, subjectId: mathSubject.id },
  });
  assert(publishRes.ok, 'Principal officially PUBLISHES the results to the institutional registry and Parent Portal');

  console.log('✅ Step 4 Complete: Principal pipeline overview, formal approval, and official publication verified.\n');

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 5: IMMUTABILITY LOCKING & SECURITY VERIFICATION
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('📌 STEP 5: Live UAT — Immutability Locking Security Checks...');

  // A. Subject Teacher attempts to modify published score
  const tamperAttemptTeacher = await request('/results/matrix/save', {
    method: 'POST',
    token: teacherToken,
    body: {
      classId: cls.id,
      subjectId: mathSubject.id,
      termId: term.id,
      scores: [{ studentId: students[0].id, ca1Score: 20, examScore: 60 }],
    },
  });
  assert(
    tamperAttemptTeacher.status === 403,
    'Immutability Enforced: Subject Teacher receives 403 Forbidden when attempting to edit published scores',
  );

  // B. Class Master attempts to modify published score
  const tamperAttemptMaster = await request('/results/matrix/save', {
    method: 'POST',
    token: masterToken,
    body: {
      classId: cls.id,
      subjectId: mathSubject.id,
      termId: term.id,
      scores: [{ studentId: students[0].id, ca1Score: 20, examScore: 60 }],
    },
  });
  assert(
    tamperAttemptMaster.status === 403,
    'Immutability Enforced: Class Master receives 403 Forbidden when attempting to edit published scores',
  );

  console.log('✅ Step 5 Complete: Strict immutability locking verified across teacher roles.\n');

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 6: LIVE UAT — PARENT PORTAL PERSONA (Engr. Nnamdi Eze)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('📌 STEP 6: Live UAT — Parent Portal (Engr. Nnamdi Eze)...');

  // A. Parent Login via Parent Portal
  const parentLogin = await request('/parent/auth/login', {
    method: 'POST',
    body: { email: 'parent.eze@demo.com', password: 'password123', tenantSlug: 'demo-school' },
  });
  assert(parentLogin.ok, 'Parent logs in successfully to EduNest Parent Portal');
  const parentToken = parentLogin.data.accessToken;

  // B. Parent Dashboard
  const parentDashboard = await request('/parent/dashboard', { token: parentToken });
  assert(parentDashboard.ok, 'Parent accesses dashboard');
  const ward = parentDashboard.data?.data?.children?.find((c: any) => c.id === students[0].id);
  assert(ward !== undefined, 'Parent dashboard recognizes ward Chukwudi Eze (BFS/2026/001)');
  assert(ward?.averageScore === 95, 'Parent dashboard displays accurate published average score (95%)');

  // C. Parent Results Endpoint
  const parentResults = await request('/parent/results', { token: parentToken });
  assert(parentResults.ok, 'Parent queries published academic results');
  const wardResults = parentResults.data?.data;
  assert(wardResults?.length > 0, 'Parent receives published results for ward');
  assert(wardResults?.every((r: any) => r.status === 'PUBLISHED'), 'Parent CANNOT see any unpublished or draft scores');

  // D. Full Official Institutional Report Card Generation
  const reportCardRes = await request(`/results/report-card/student/${students[0].id}/term/${term.id}`, {
    token: parentToken,
  });
  assert(reportCardRes.ok, 'Parent successfully generates formal Official Report Sheet');
  const reportCard = reportCardRes.data?.data;

  // Verify all sections of the official institutional report sheet:
  assert(reportCard?.school?.name === 'Bright Future Secondary School', 'Report Card has institutional school letterhead');
  assert(reportCard?.student?.fullName.includes('Chukwudi'), 'Report Card displays student full name');
  assert(reportCard?.student?.admissionNumber === 'BFS/2026/001', 'Report Card displays official admission number');
  assert(reportCard?.academicSummary?.totalObtained === 95, 'Cognitive Summary displays Total Score of 95');
  assert(reportCard?.academicSummary?.studentAverage === 95, 'Cognitive Summary displays Average Score of 95.0%');
  assert(
    reportCard?.affectiveDomain?.Punctuality === 5 || reportCard?.affectiveDomain?.punctuality === 5,
    'Affective Domain displays Punctuality rating of 5/5',
  );
  assert(
    reportCard?.psychomotorDomain?.Sports === 5 || reportCard?.psychomotorDomain?.sports === 5,
    'Psychomotor Domain displays Sports rating of 5/5',
  );
  assert(
    reportCard?.endorsements?.classTeacherRemark?.includes('exceptionally diligent'),
    'Class Master official signature & remark rendered on report sheet',
  );
  assert(
    reportCard?.endorsements?.principalRemark?.includes('Outstanding academic performance'),
    'Principal official signature & institutional remark rendered on report sheet',
  );
  assert(
    reportCard?.academicSummary?.promotionStatus?.includes('Promoted'),
    'Promotion status displayed on report sheet',
  );

  console.log('✅ Step 6 Complete: Parent portal login, dashboard, and official report sheet verified.\n');

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 7: PERMANENT DATABASE STORAGE VERIFICATION
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('📌 STEP 7: Verifying Permanent Persistence in MySQL Database...');

  const dbResults = await prisma.result.findMany({
    where: { termId: term.id, studentId: students[0].id },
  });
  assert(dbResults.length > 0, 'Results permanently stored in MySQL `Result` table');
  assert(dbResults[0].status === ResultStatus.PUBLISHED, 'Result status permanently persisted as `PUBLISHED`');
  assert(dbResults[0].totalScore === 95, 'Result total score permanently persisted as 95');

  const dbReportCard = await prisma.termReportCard.findFirst({
    where: { termId: term.id, studentId: students[0].id },
  });
  assert(dbReportCard !== null, 'Report card permanently stored in MySQL `TermReportCard` table');
  assert(dbReportCard?.attendanceDaysPresent === 63, 'Attendance record permanently persisted');
  assert(
    dbReportCard?.classTeacherRemark?.includes('exceptionally diligent'),
    'Class Teacher remark permanently persisted in database',
  );
  assert(
    dbReportCard?.principalRemark?.includes('Outstanding academic performance'),
    'Principal remark permanently persisted in database',
  );

  console.log('✅ Step 7 Complete: Permanent MySQL persistence 100% verified.\n');

  console.log('=============================================================');
  console.log('🎉 ALL LIVE UAT TESTS PASSED SUCCESSFULLY! (100% PASS RATE)');
  console.log('=============================================================\n');
}

runLiveUat()
  .catch((err) => {
    console.error('❌ UAT FAILED WITH ERROR:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
