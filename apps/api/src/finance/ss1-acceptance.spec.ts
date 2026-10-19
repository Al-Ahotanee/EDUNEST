/**
 * SS1 Automated Fee Acceptance Scenario (§19 Master Directive)
 *
 * Verifies:
 *   1. Academic setup: Session 2026/2027, First Term, Second Term, Class SS1
 *   2. Class Fee Schedule:
 *      - Application Fee: ₦10,000 (ONE_TIME, NEW_STUDENT)
 *      - Tuition Fee: ₦50,000 (TERM, ALL)
 *      - Uniform Fee: ₦10,000 (ONE_TIME, NEW_STUDENT)
 *      - Sportswear: ₦5,000 (ONE_TIME, NEW_STUDENT)
 *      - Science Lab Fee: ₦10,000 (TERM, ALL)
 *      - Textbooks / Learning Materials: ₦20,000 (TERM, ALL)
 *   3. Schedule Previews:
 *      - New student total: ₦105,000
 *      - Returning student total: ₦80,000
 *   4. Student 1 (New Student) invoiced ₦105,000 (6 line items)
 *   5. Student 2 (Returning Student) invoiced ₦80,000 (3 line items)
 *   6. Idempotency: re-running skips existing
 *   7. Partial payments on Student 1 (₦105,000 total):
 *      - ₦50k online (Paystack auto-posted) -> Bal: ₦55k, Status: PARTIAL, Receipt 1
 *      - ₦30k cash (Accountant approved) -> Bal: ₦25k, Status: PARTIAL, Receipt 2
 *      - ₦25k cash direct -> Bal: ₦0, Status: PAID, Receipt 3
 *   8. Receipt immutability: 3 separate receipts issued
 *   9. Subsequent term (Second Term): Student 1 auto-billed ₦80,000 returning rate
 *  10. Cross-tenant isolation: School B cannot view School A invoices or receipts
 */

import { PrismaService } from '../prisma/prisma.service';
import { FinanceService } from './finance.service';
import { FinancialWorkflowService } from './financial-workflow.service';
import { v4 as uuidv4 } from 'uuid';

async function runSS1AcceptanceTest() {
  const prisma = new PrismaService();
  await prisma.onModuleInit();

  const financeService = new FinanceService(prisma);
  const workflowService = new FinancialWorkflowService(prisma);

  const testSuffix = uuidv4().slice(0, 8);
  console.log(`\n===============================================================`);
  console.log(`  SS1 FINANCIAL ACCEPTANCE TEST SUITE — RUN ID: ${testSuffix}`);
  console.log(`===============================================================\n`);

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, stepNumber: number, title: string, details?: string) {
    if (condition) {
      console.log(`  ✅ STEP ${stepNumber.toString().padStart(2, '0')}: [PASS] ${title}`);
      passed++;
    } else {
      console.error(`  ❌ STEP ${stepNumber.toString().padStart(2, '0')}: [FAIL] ${title}`);
      if (details) console.error(`     Details: ${details}`);
      failed++;
    }
  }

  let tenantA: any;
  let tenantB: any;
  let schoolA: any;
  let schoolB: any;
  let session2026: any;
  let priorSession: any;
  let firstTerm: any;
  let secondTerm: any;
  let classSS1: any;
  let classJSS3: any;
  let studentNew: any;
  let studentReturning: any;
  let accountantUser: any;
  let classMasterUser: any;
  let invoiceNewId: string = '';
  let invoiceRetId: string = '';
  let payment1Id: string = '';
  let payment2Id: string = '';
  let payment3Id: string = '';

  try {
    // ─── 1. SETUP FIXTURES ────────────────────────────────────────────────────
    tenantA = await prisma.tenant.create({
      data: {
        name: `SS1 Test Tenant A ${testSuffix}`,
        slug: `ss1-tenant-a-${testSuffix}`,
        subscriptionPlan: 'ENTERPRISE',
        financialPolicy: {
          create: {
            classMasterCollectionMode: 'RECORD_PENDING',
            onlinePaymentsEnabled: true,
            classMasterCashLimit: 200000,
          },
        },
      },
    });

    tenantB = await prisma.tenant.create({
      data: {
        name: `SS1 Test Tenant B ${testSuffix}`,
        slug: `ss1-tenant-b-${testSuffix}`,
        subscriptionPlan: 'BASIC',
      },
    });

    schoolA = await prisma.school.create({
      data: {
        name: `SS1 Horizon Academy ${testSuffix}`,
        code: `HORIZON-${testSuffix}`,
        type: 'SECONDARY',
        tenantId: tenantA.id,
      },
    });

    schoolB = await prisma.school.create({
      data: {
        name: `SS1 Isolated Academy ${testSuffix}`,
        code: `ISOLATED-${testSuffix}`,
        type: 'SECONDARY',
        tenantId: tenantB.id,
      },
    });

    // Academic Sessions & Terms
    priorSession = await prisma.academicSession.create({
      data: {
        name: `2025/2026 Session ${testSuffix}`,
        schoolId: schoolA.id,
        isCurrent: false,
        startDate: new Date('2025-09-01'),
        endDate: new Date('2026-07-20'),
      },
    });

    session2026 = await prisma.academicSession.create({
      data: {
        name: `2026/2027 Session ${testSuffix}`,
        schoolId: schoolA.id,
        isCurrent: true,
        startDate: new Date('2026-09-01'),
        endDate: new Date('2027-07-20'),
      },
    });

    firstTerm = await prisma.term.create({
      data: {
        name: `First Term ${testSuffix}`,
        sessionId: session2026.id,
        isCurrent: true,
        startDate: new Date('2026-09-01'),
        endDate: new Date('2026-12-18'),
      },
    });

    secondTerm = await prisma.term.create({
      data: {
        name: `Second Term ${testSuffix}`,
        sessionId: session2026.id,
        isCurrent: false,
        startDate: new Date('2027-01-10'),
        endDate: new Date('2027-04-15'),
      },
    });

    classSS1 = await prisma.class.create({
      data: {
        name: `SS1 Science ${testSuffix}`,
        schoolId: schoolA.id,
        level: 10,
        capacity: 40,
      },
    });

    classJSS3 = await prisma.class.create({
      data: {
        name: `JSS3 Diamond ${testSuffix}`,
        schoolId: schoolA.id,
        level: 9,
        capacity: 40,
      },
    });

    accountantUser = await prisma.user.create({
      data: {
        email: `bursar-${testSuffix}@horizon.test`,
        password: 'hashed-password',
        firstName: 'Chioma',
        lastName: 'Bursar',
        schoolId: schoolA.id,
        tenantId: tenantA.id,
      },
    });

    classMasterUser = await prisma.user.create({
      data: {
        email: `cm-${testSuffix}@horizon.test`,
        password: 'hashed-password',
        firstName: 'Emeka',
        lastName: 'ClassMaster',
        schoolId: schoolA.id,
        tenantId: tenantA.id,
      },
    });

    await prisma.teacherAssignment.create({
      data: {
        userId: classMasterUser.id,
        classId: classSS1.id,
        schoolId: schoolA.id,
        roleType: 'CLASS_MASTER',
      },
    });

    // Student 1: Brand New Student in SS1 (0 prior invoices)
    studentNew = await prisma.student.create({
      data: {
        admissionNumber: `NEW-${testSuffix}-01`,
        firstName: 'Zainab',
        lastName: 'Aliyu',
        gender: 'FEMALE',
        dateOfBirth: new Date('2011-05-10'),
        status: 'ACTIVE',
        schoolId: schoolA.id,
        classEnrollments: {
          create: {
            classId: classSS1.id,
            sessionId: session2026.id,
          },
        },
      },
    });

    // Student 2: Returning Student (has prior enrollment in JSS3 in priorSession)
    studentReturning = await prisma.student.create({
      data: {
        admissionNumber: `RET-${testSuffix}-02`,
        firstName: 'David',
        lastName: 'Okonkwo',
        gender: 'MALE',
        dateOfBirth: new Date('2010-11-20'),
        status: 'ACTIVE',
        schoolId: schoolA.id,
        classEnrollments: {
          createMany: {
            data: [
              { classId: classJSS3.id, sessionId: priorSession.id, createdAt: new Date('2025-09-02') },
              { classId: classSS1.id, sessionId: session2026.id, createdAt: new Date('2026-09-02') },
            ],
          },
        },
      },
    });

    // Seed prior invoice for studentReturning in prior session
    await prisma.invoice.create({
      data: {
        studentId: studentReturning.id,
        invoiceNo: `INV-PRIOR-${testSuffix}`,
        subtotal: 75000,
        discount: 0,
        total: 75000,
        balance: 0,
        amountPaid: 75000,
        status: 'PAID',
        schoolId: schoolA.id,
        sessionId: priorSession.id,
        classId: classJSS3.id,
        dueDate: new Date(),
      },
    });

    assert(
      !!tenantA && !!schoolA && !!classSS1 && !!studentNew && !!studentReturning,
      1,
      'Environment Setup: Session 2026/2027, First Term, SS1, New Student & Returning Student',
    );

    // ─── 2. CONFIGURE SS1 CLASS FEE SCHEDULE (§19 Specification) ──────────────
    const scheduleResult: any = await financeService.createOrUpdateClassFeeSchedule(
      schoolA.id,
      {
        classId: classSS1.id,
        sessionId: session2026.id,
        termId: firstTerm.id,
        items: [
          { name: 'Application Fee', amount: 10000, feeType: 'ONE_TIME', applicableTo: 'NEW_STUDENT', isCompulsory: true },
          { name: 'Tuition Fee', amount: 50000, feeType: 'TERM', applicableTo: 'ALL', isCompulsory: true },
          { name: 'Uniform Fee', amount: 10000, feeType: 'ONE_TIME', applicableTo: 'NEW_STUDENT', isCompulsory: true },
          { name: 'Sportswear Fee', amount: 5000, feeType: 'ONE_TIME', applicableTo: 'NEW_STUDENT', isCompulsory: true },
          { name: 'Science Laboratory Fee', amount: 10000, feeType: 'TERM', applicableTo: 'ALL', isCompulsory: true },
          { name: 'Textbooks & Learning Materials', amount: 20000, feeType: 'TERM', applicableTo: 'ALL', isCompulsory: true },
        ],
      }
    );

    assert(
      scheduleResult.success && scheduleResult.data?.length === 6,
      2,
      'Class Fee Schedule: Configured 6 items (Application, Tuition, Uniform, Sportswear, Lab, Books)',
    );

    // ─── 3. VERIFY SCHEDULE PREVIEW (New = ₦105,000, Returning = ₦80,000) ─────
    const previewResult: any = await financeService.getClassFeeSchedulePreview(
      classSS1.id,
      schoolA.id,
      { sessionId: session2026.id, termId: firstTerm.id }
    );
    const preview = previewResult.data;

    assert(
      preview.newStudentTotal === 105000 &&
      preview.returningStudentTotal === 80000 &&
      preview.newStudentItems.length === 6 &&
      preview.returningStudentItems.length === 3,
      3,
      `Fee Schedule Preview: New Student = ₦${preview.newStudentTotal.toLocaleString()} (6 items), Returning Student = ₦${preview.returningStudentTotal.toLocaleString()} (3 items)`,
      `Expected 105000/80000, got ${preview.newStudentTotal}/${preview.returningStudentTotal}`
    );

    // ─── 4. AUTOMATED COHORT INVOICING ────────────────────────────────────────
    const genResult: any = await financeService.generateInvoicesFromClass(
      classSS1.id,
      schoolA.id,
      { sessionId: session2026.id, termId: firstTerm.id }
    );

    assert(
      genResult.data.invoicesCreated === 2,
      4,
      `Class Invoicing: Auto-generated 2 invoices for SS1 enrolled students`,
    );

    // ─── 5. VERIFY NEW STUDENT INVOICE (₦105,000) ─────────────────────────────
    const newStudentInv = await prisma.invoice.findFirst({
      where: { studentId: studentNew.id, sessionId: session2026.id, termId: firstTerm.id },
      include: { items: true },
    });
    invoiceNewId = newStudentInv?.id || '';

    assert(
      newStudentInv?.total === 105000 &&
      newStudentInv?.balance === 105000 &&
      newStudentInv?.amountPaid === 0 &&
      newStudentInv?.status === 'UNPAID' &&
      newStudentInv?.items.length === 6,
      5,
      `New Student Invoice: Total ₦${newStudentInv?.total.toLocaleString()} across ${newStudentInv?.items.length} items (Status: UNPAID)`,
      `Expected 105000 with 6 items, got ${newStudentInv?.total} with ${newStudentInv?.items.length} items`
    );

    // ─── 6. VERIFY RETURNING STUDENT INVOICE (₦80,000) ────────────────────────
    const returningStudentInv = await prisma.invoice.findFirst({
      where: { studentId: studentReturning.id, sessionId: session2026.id, termId: firstTerm.id },
      include: { items: true },
    });
    invoiceRetId = returningStudentInv?.id || '';

    assert(
      returningStudentInv?.total === 80000 &&
      returningStudentInv?.balance === 80000 &&
      returningStudentInv?.amountPaid === 0 &&
      returningStudentInv?.status === 'UNPAID' &&
      returningStudentInv?.items.length === 3,
      6,
      `Returning Student Invoice: Total ₦${returningStudentInv?.total.toLocaleString()} across ${returningStudentInv?.items.length} items (Uniform/Sportswear/App omitted)`,
      `Expected 80000 with 3 items, got ${returningStudentInv?.total} with ${returningStudentInv?.items.length} items`
    );

    // ─── 7. IDEMPOTENCY CHECK ─────────────────────────────────────────────────
    const rerunResult: any = await financeService.generateInvoicesFromClass(
      classSS1.id,
      schoolA.id,
      { sessionId: session2026.id, termId: firstTerm.id }
    );

    assert(
      rerunResult.data.invoicesCreated === 0 && rerunResult.data.duplicatesSkipped === 2,
      7,
      'Idempotency Check: Re-running class invoicing skipped all 2 existing student invoices without duplicating',
    );

    // ─── 8. PARTIAL PAYMENT 1: ₦50,000 ONLINE (PAYSTACK) ──────────────────────
    const pay1Result: any = await workflowService.submitPayment({
      invoiceId: invoiceNewId,
      amount: 50000,
      method: 'ONLINE',
      notes: 'Initial online installment via Paystack gateway',
      idempotencyKey: `pay1-online-${testSuffix}`,
    }, {
      schoolId: schoolA.id,
      tenantId: tenantA.id,
      userId: accountantUser.id,
      userRole: 'Parent',
      isClassMaster: false,
      assignedClassIds: [],
    });

    payment1Id = pay1Result.data.id;
    const invAfterPay1 = await prisma.invoice.findUnique({ where: { id: invoiceNewId } });
    const receipt1 = await prisma.receipt.findFirst({ where: { paymentId: payment1Id } });

    assert(
      pay1Result.data.status === 'POSTED' &&
      invAfterPay1?.balance === 55000 &&
      invAfterPay1?.amountPaid === 50000 &&
      invAfterPay1?.status === 'PARTIAL' &&
      !!receipt1 && receipt1.amountInFigures === 50000,
      8,
      `Payment 1 (Online): ₦50,000 auto-posted -> Invoice balance: ₦${invAfterPay1?.balance.toLocaleString()} (PARTIAL). Receipt 1 issued (${receipt1?.receiptNo})`,
    );

    // ─── 9. PARTIAL PAYMENT 2: ₦30,000 CASH (CLASS MASTER + ACCOUNTANT) ───────
    // Class master submits ₦30,000 cash
    const pay2Submit: any = await workflowService.submitPayment({
      invoiceId: invoiceNewId,
      amount: 30000,
      method: 'CASH',
      notes: 'Cash payment handed to Class Master in school',
      idempotencyKey: `pay2-cash-cm-${testSuffix}`,
    }, {
      schoolId: schoolA.id,
      tenantId: tenantA.id,
      userId: classMasterUser.id,
      userRole: 'Class Master',
      isClassMaster: true,
      assignedClassIds: [classSS1.id],
    });

    payment2Id = pay2Submit.data.id;
    const invDuringPending = await prisma.invoice.findUnique({ where: { id: invoiceNewId } });

    // Segregation of duties: balance must NOT change while pending
    const sodIntegrity = invDuringPending?.balance === 55000 && pay2Submit.data.status === 'PENDING_ACCOUNTANT_APPROVAL';

    // School Accountant approves payment
    await workflowService.approvePayment(payment2Id, {
      schoolId: schoolA.id,
      userId: accountantUser.id,
      userRole: 'Accountant',
    });

    const invAfterPay2 = await prisma.invoice.findUnique({ where: { id: invoiceNewId } });
    const receipt2 = await prisma.receipt.findFirst({ where: { paymentId: payment2Id } });

    assert(
      sodIntegrity &&
      invAfterPay2?.balance === 25000 &&
      invAfterPay2?.amountPaid === 80000 &&
      invAfterPay2?.status === 'PARTIAL' &&
      !!receipt2 && receipt2.amountInFigures === 30000,
      9,
      `Payment 2 (Cash via Class Master): ₦30,000 approved -> Invoice balance: ₦${invAfterPay2?.balance.toLocaleString()} (PARTIAL). Receipt 2 issued (${receipt2?.receiptNo})`,
    );

    // ─── 10. PARTIAL PAYMENT 3: ₦25,000 CASH (DIRECT TO BURSARY -> PAID) ──────
    const pay3Submit: any = await workflowService.submitPayment({
      invoiceId: invoiceNewId,
      amount: 25000,
      method: 'CASH',
      notes: 'Final installment paid directly to Bursary counter',
      idempotencyKey: `pay3-cash-acc-${testSuffix}`,
    }, {
      schoolId: schoolA.id,
      tenantId: tenantA.id,
      userId: accountantUser.id,
      userRole: 'Accountant',
      isClassMaster: false,
      assignedClassIds: [],
    });

    payment3Id = pay3Submit.data.id;
    const invAfterPay3 = await prisma.invoice.findUnique({ where: { id: invoiceNewId } });
    const receipt3 = await prisma.receipt.findFirst({ where: { paymentId: payment3Id } });

    assert(
      pay3Submit.data.status === 'POSTED' &&
      invAfterPay3?.balance === 0 &&
      invAfterPay3?.amountPaid === 105000 &&
      invAfterPay3?.status === 'PAID' &&
      !!receipt3 && receipt3.amountInFigures === 25000,
      10,
      `Payment 3 (Direct Cash): ₦25,000 posted -> Final balance: ₦0 (Status: PAID). Receipt 3 issued (${receipt3?.receiptNo})`,
    );

    // ─── 11. IMMUTABLE RECEIPTS VERIFICATION ──────────────────────────────────
    const student1Receipts = await prisma.receipt.findMany({
      where: { schoolId: schoolA.id, studentAdmissionNo: studentNew.admissionNumber },
      orderBy: { createdAt: 'asc' },
    });

    const receiptsSum = student1Receipts.reduce((sum, r) => sum + r.amountInFigures, 0);
    const allUnique = new Set(student1Receipts.map(r => r.receiptNo)).size === 3;

    assert(
      student1Receipts.length === 3 && receiptsSum === 105000 && allUnique,
      11,
      `Receipt Verification: Exactly 3 unique receipts issued (₦50k + ₦30k + ₦25k = ₦105,000 total)`,
    );

    // ─── 12. SUBSEQUENT TERM (SECOND TERM) INVOICING ──────────────────────────
    // Create Second Term fee items for class (or term-specific items)
    await financeService.createFeeStructure({
      name: 'Second Term Tuition Fee',
      amount: 50000,
      classId: classSS1.id,
      sessionId: session2026.id,
      termId: secondTerm.id,
      feeType: 'TERM',
      applicableTo: 'ALL',
      status: 'PUBLISHED',
    }, schoolA.id);

    await financeService.createFeeStructure({
      name: 'Second Term Science Lab Fee',
      amount: 10000,
      classId: classSS1.id,
      sessionId: session2026.id,
      termId: secondTerm.id,
      feeType: 'TERM',
      applicableTo: 'ALL',
      status: 'PUBLISHED',
    }, schoolA.id);

    await financeService.createFeeStructure({
      name: 'Second Term Learning Materials',
      amount: 20000,
      classId: classSS1.id,
      sessionId: session2026.id,
      termId: secondTerm.id,
      feeType: 'TERM',
      applicableTo: 'ALL',
      status: 'PUBLISHED',
    }, schoolA.id);

    // Generate Second Term invoice for Student 1
    const student1CategorySecondTerm = await financeService.determineStudentCategory(
      studentNew.id,
      schoolA.id,
      session2026.id,
      secondTerm.id,
    );

    const term2Gen: any = await financeService.generateInvoiceForStudent(
      studentNew.id,
      schoolA.id,
      { sessionId: session2026.id, termId: secondTerm.id }
    );

    const term2Inv = term2Gen.data;

    assert(
      student1CategorySecondTerm === 'RETURNING_STUDENT' &&
      term2Inv?.total === 80000 &&
      term2Inv?.items?.length === 3,
      12,
      `Subsequent Term Check: Student 1 auto-classified as RETURNING_STUDENT for Second Term -> Billed ₦${term2Inv?.total.toLocaleString()} (Tuition, Lab, Books only)`,
      `Expected 80000, got ${term2Inv?.total}`
    );

    // ─── 13. MULTI-TENANT ISOLATION ───────────────────────────────────────────
    const schoolBInvoices: any = await financeService.getInvoices(schoolB.id, {});
    const schoolBSeesStudent1 = (schoolBInvoices?.data || []).some((i: any) => i.id === invoiceNewId);

    const schoolBReceipts = await prisma.receipt.findMany({
      where: { schoolId: schoolB.id },
    });
    const schoolBSeesReceipts = schoolBReceipts.some((r: any) => r.studentAdmissionNo === studentNew.admissionNumber);

    assert(
      !schoolBSeesStudent1 && !schoolBSeesReceipts,
      13,
      'Multi-Tenant Isolation: School B cannot view, query, or leak any School A invoices or receipts',
    );

  } catch (err) {
    console.error('Unhandled acceptance error:', err);
    failed++;
  } finally {
    // ─── CLEANUP ──────────────────────────────────────────────────────────────
    try {
      if (schoolA?.id) {
        await prisma.receipt.deleteMany({ where: { schoolId: schoolA.id } });
        await prisma.paymentAllocation.deleteMany({ where: { invoice: { schoolId: schoolA.id } } });
        await prisma.payment.deleteMany({ where: { invoice: { schoolId: schoolA.id } } });
        await prisma.invoiceItem.deleteMany({ where: { invoice: { schoolId: schoolA.id } } });
        await prisma.invoice.deleteMany({ where: { schoolId: schoolA.id } });
        await prisma.classEnrollment.deleteMany({ where: { student: { schoolId: schoolA.id } } });
        await prisma.student.deleteMany({ where: { schoolId: schoolA.id } });
        await prisma.teacherAssignment.deleteMany({ where: { schoolId: schoolA.id } });
        await prisma.feeStructure.deleteMany({ where: { schoolId: schoolA.id } });
        await prisma.class.deleteMany({ where: { schoolId: schoolA.id } });
        await prisma.term.deleteMany({ where: { session: { schoolId: schoolA.id } } });
        await prisma.academicSession.deleteMany({ where: { schoolId: schoolA.id } });
        await prisma.user.deleteMany({ where: { schoolId: schoolA.id } });
        await prisma.school.deleteMany({ where: { id: schoolA.id } });
      }
      if (schoolB?.id) {
        await prisma.school.deleteMany({ where: { id: schoolB.id } });
      }
      if (tenantA?.id) {
        await prisma.tenantFinancialPolicy.deleteMany({ where: { tenantId: tenantA.id } });
        await prisma.tenant.deleteMany({ where: { id: tenantA.id } });
      }
      if (tenantB?.id) {
        await prisma.tenant.deleteMany({ where: { id: tenantB.id } });
      }
      await prisma.$disconnect();
    } catch (cleanupErr) {
      console.warn('Cleanup error (ignored):', cleanupErr);
    }
  }

  console.log(`\n===============================================================`);
  console.log(`  SS1 SUITE SUMMARY: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed}/13)`);
  console.log(`===============================================================\n`);

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runSS1AcceptanceTest().catch((e) => {
  console.error('Fatal execution error:', e);
  process.exit(1);
});
