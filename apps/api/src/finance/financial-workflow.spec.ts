/**
 * Financial Workflow Acceptance Test Suite (§22 Master Directive)
 *
 * Verifies the 20-step financial lifecycle:
 *   1. Setup School, Class (Pre-Nursery), Session, Term, Users, Student
 *   2. Class Fee Structure: Tuition ₦60k (TERM), Registration ₦20k (ONE_TIME), Dev ₦10k (ANNUAL) = ₦90k
 *   3. Bulk Invoicing: generates ₦90k invoice (UNPAID, balance ₦90k)
 *   4. Idempotency: re-running invoice generation skips existing
 *   5. Mode A Policy: Class Master cash submission rejected (403 Forbidden)
 *   6. Mode B Policy: RECORD_PENDING enabled
 *   7. Class Master records ₦40k cash collection
 *   8. State Machine: payment is PENDING_ACCOUNTANT_APPROVAL
 *   9. Segregation of Duties: invoice balance remains ₦90k
 *  10. Segregation of Duties: Class Master cannot self-approve (403 Forbidden)
 *  11. Pending Queue: payment visible to School Accountant
 *  12. Accountant Approval: approves payment
 *  13. State Machine: payment transitions to POSTED
 *  14. Balance Update: invoice balance = ₦50k, paid = ₦40k, status = PARTIAL
 *  15. Official Receipt: issued with amountInWords ('FORTY THOUSAND NAIRA ONLY')
 *  16. Receipt Reprint: increments reprintCount to 1, logs lastReprintedAt
 *  17. Second Payment: Accountant records ₦50k direct cash -> POSTED, balance = ₦0, status = PAID
 *  18. Financial Ledger: chronological debits (₦90k), credits (₦90k), balance (₦0)
 *  19. Payment Reversal: Accountant reverses ₦40k -> REVERSED, receipt cancelled, balance restored to ₦40k
 *  20. Cross-Tenant Isolation: School B cannot access School A records
 */

import { PrismaService } from '../prisma/prisma.service';
import { FinanceService } from './finance.service';
import { FinancialWorkflowService } from './financial-workflow.service';
import { FinancialReportsService } from './financial-reports.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

async function runAcceptanceTests() {
  const prisma = new PrismaService();
  await prisma.onModuleInit();

  const financeService = new FinanceService(prisma);
  const workflowService = new FinancialWorkflowService(prisma);
  const reportsService = new FinancialReportsService(prisma);

  const testSuffix = uuidv4().slice(0, 8);
  console.log(`\n===============================================================`);
  console.log(`  EDUNEST FINANCIAL WORKFLOW ACCEPTANCE SUITE — TEST ID: ${testSuffix}`);
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

  // IDs for cleanup
  let tenantA: any;
  let tenantB: any;
  let schoolA: any;
  let schoolB: any;
  let sessionA: any;
  let termA: any;
  let classA: any;
  let studentA: any;
  let accountantUser: any;
  let classMasterUser: any;
  let invoiceId: string = '';
  let payment1Id: string = '';
  let payment2Id: string = '';
  let receipt1Id: string = '';

  try {
    // ─── STEP 1: TEST FIXTURES SETUP ──────────────────────────────────────────
    tenantA = await prisma.tenant.create({
      data: {
        name: `Test Tenant A ${testSuffix}`,
        slug: `tenant-a-${testSuffix}`,
        subscriptionPlan: 'ENTERPRISE',
        financialPolicy: {
          create: {
            classMasterCollectionMode: 'VIEW_ONLY',
            onlinePaymentsEnabled: true,
            classMasterCashLimit: 100000,
          },
        },
      },
    });

    tenantB = await prisma.tenant.create({
      data: {
        name: `Test Tenant B (Cross-Tenant) ${testSuffix}`,
        slug: `tenant-b-${testSuffix}`,
        subscriptionPlan: 'BASIC',
      },
    });

    schoolA = await prisma.school.create({
      data: {
        name: `Alpha Academy ${testSuffix}`,
        code: `ALPHA-${testSuffix}`,
        type: 'COMBINED',
        tenant: { connect: { id: tenantA.id } },
      },
    });

    schoolB = await prisma.school.create({
      data: {
        name: `Beta Academy (Isolated) ${testSuffix}`,
        code: `BETA-${testSuffix}`,
        type: 'COMBINED',
        tenant: { connect: { id: tenantB.id } },
      },
    });

    sessionA = await prisma.academicSession.create({
      data: {
        name: `2026/2027 Academic Session ${testSuffix}`,
        schoolId: schoolA.id,
        isCurrent: true,
        startDate: new Date('2026-09-01'),
        endDate: new Date('2027-07-20'),
      },
    });

    termA = await prisma.term.create({
      data: {
        name: `First Term ${testSuffix}`,
        sessionId: sessionA.id,
        isCurrent: true,
        startDate: new Date('2026-09-01'),
        endDate: new Date('2026-12-18'),
      },
    });

    classA = await prisma.class.create({
      data: {
        name: `Pre-Nursery Pearls ${testSuffix}`,
        schoolId: schoolA.id,
        level: 1,
        capacity: 30,
      },
    });

    // Create Accountant User
    accountantUser = await prisma.user.create({
      data: {
        email: `accountant-${testSuffix}@edunest.test`,
        password: 'hashed-password',
        firstName: 'Farida',
        lastName: 'Bursar',
        schoolId: schoolA.id,
        tenantId: tenantA.id,
      },
    });

    // Create Class Master User
    classMasterUser = await prisma.user.create({
      data: {
        email: `classmaster-${testSuffix}@edunest.test`,
        password: 'hashed-password',
        firstName: 'Samuel',
        lastName: 'Teacher',
        schoolId: schoolA.id,
        tenantId: tenantA.id,
      },
    });

    // Assign Class Master to Pre-Nursery
    await prisma.teacherAssignment.create({
      data: {
        userId: classMasterUser.id,
        classId: classA.id,
        schoolId: schoolA.id,
        roleType: 'CLASS_MASTER',
      },
    });

    // Create Enrolled Student
    studentA = await prisma.student.create({
      data: {
        admissionNumber: `ADM-${testSuffix}-001`,
        firstName: 'Tariq',
        lastName: 'Mohammed',
        dateOfBirth: new Date('2022-04-15'),
        gender: 'MALE',
        status: 'ACTIVE',
        schoolId: schoolA.id,
        classEnrollments: {
          create: {
            classId: classA.id,
            sessionId: sessionA.id,
          },
        },
      },
    });

    assert(
      !!tenantA && !!schoolA && !!classA && !!studentA && !!accountantUser && !!classMasterUser,
      1,
      'Environment Setup: Tenant, School, Class, Session, Term, Users, Student',
    );

    // ─── STEP 2: CLASS FEE STRUCTURE CREATION ─────────────────────────────────
    // Tuition ₦60k (TERM), Registration ₦20k (ONE_TIME), Development ₦10k (ANNUAL)
    await financeService.createFeeStructure({
      name: 'Pre-Nursery First Term Tuition',
      amount: 60000,
      classId: classA.id,
      sessionId: sessionA.id,
      termId: termA.id,
      feeType: 'TERM',
      status: 'PUBLISHED',
    }, schoolA.id);

    await financeService.createFeeStructure({
      name: 'New Student Admission & Registration',
      amount: 20000,
      classId: classA.id,
      sessionId: sessionA.id,
      feeType: 'ONE_TIME',
      status: 'PUBLISHED',
    }, schoolA.id);

    await financeService.createFeeStructure({
      name: 'Annual Campus Development Levy',
      amount: 10000,
      classId: classA.id,
      sessionId: sessionA.id,
      feeType: 'ANNUAL',
      status: 'PUBLISHED',
    }, schoolA.id);

    const feeList = await prisma.feeStructure.findMany({ where: { schoolId: schoolA.id } });
    const feeTotal = feeList.reduce((sum, f) => sum + f.amount, 0);
    assert(
      feeList.length === 3 && feeTotal === 90000,
      2,
      'Class Fee Structure: Tuition (₦60k), Reg (₦20k), Dev (₦10k) = ₦90,000 total',
    );

    // ─── STEP 3: BULK INVOICE GENERATION ──────────────────────────────────────
    const genResult: any = await financeService.generateInvoicesFromClass(classA.id, schoolA.id);
    const invoices = await prisma.invoice.findMany({
      where: { studentId: studentA.id },
      include: { items: true },
    });
    const inv = invoices[0];
    invoiceId = inv?.id;

    assert(
      genResult.data.invoicesCreated === 1 &&
      inv?.total === 90000 &&
      inv?.balance === 90000 &&
      inv?.amountPaid === 0 &&
      inv?.status === 'UNPAID' &&
      inv?.items.length === 3,
      3,
      'Invoice Issuance: Generated ₦90,000 invoice with 3 line items (status UNPAID)',
    );

    // ─── STEP 4: INVOICE GENERATION IDEMPOTENCY ───────────────────────────────
    const rerunResult: any = await financeService.generateInvoicesFromClass(classA.id, schoolA.id);
    const invoiceCount = await prisma.invoice.count({ where: { studentId: studentA.id } });
    assert(
      rerunResult.data.invoicesCreated === 0 &&
      rerunResult.data.duplicatesSkipped === 1 &&
      invoiceCount === 1,
      4,
      'Idempotency Check: Re-running invoice generation skips existing invoice (0 duplicates)',
    );

    // ─── STEP 5: MODE A (VIEW_ONLY) CLASS MASTER REJECTION ────────────────────
    let modeABlocked = false;
    try {
      await workflowService.submitPayment({
        invoiceId: inv.id,
        amount: 40000,
        method: 'CASH',
        notes: 'Pre-Nursery Cash Collection',
      }, {
        schoolId: schoolA.id,
        tenantId: tenantA.id,
        userId: classMasterUser.id,
        userRole: 'Class Master',
        isClassMaster: true,
        assignedClassIds: [classA.id],
      });
    } catch (err: any) {
      if (err instanceof ForbiddenException) {
        modeABlocked = true;
      }
    }
    assert(
      modeABlocked,
      5,
      'Mode A Policy Enforcement: Class Master cash submission rejected under VIEW_ONLY mode',
    );

    // ─── STEP 6: ENABLE MODE B (RECORD_PENDING) ───────────────────────────────
    await workflowService.updatePolicy(tenantA.id, {
      classMasterCollectionMode: 'RECORD_PENDING',
    }, {
      schoolId: schoolA.id,
      userId: accountantUser.id,
      userRole: 'Accountant',
    });
    const policy = await workflowService.getOrCreatePolicy(tenantA.id);
    assert(
      policy.classMasterCollectionMode === 'RECORD_PENDING',
      6,
      'Policy Configuration: Successfully enabled Mode B (RECORD_PENDING)',
    );

    // ─── STEP 7 & 8: CLASS MASTER SUBMISSION & STATE MACHINE ──────────────────
    const submitResult: any = await workflowService.submitPayment({
      invoiceId: inv.id,
      amount: 40000,
      method: 'CASH',
      notes: 'First installment cash payment from parent',
      idempotencyKey: `cm-pay-${testSuffix}-01`,
    }, {
      schoolId: schoolA.id,
      tenantId: tenantA.id,
      userId: classMasterUser.id,
      userRole: 'Class Master',
      isClassMaster: true,
      assignedClassIds: [classA.id],
    });

    const payment1 = submitResult?.data;
    payment1Id = payment1?.id;

    assert(
      payment1?.status === 'PENDING_ACCOUNTANT_APPROVAL' &&
      payment1?.isClassMasterSubmission === true &&
      payment1?.amount === 40000,
      7,
      'Class Master Submission: ₦40,000 cash recorded in PENDING_ACCOUNTANT_APPROVAL status',
    );

    // ─── STEP 8: PAYMENT SUBMISSION AUDIT TRAIL ──────────────────────────────
    const submitAudit = await prisma.financialAuditLog.findFirst({
      where: { entityId: payment1Id, action: 'PAYMENT_SUBMITTED' },
    });
    assert(
      !!submitAudit && submitAudit.userId === classMasterUser.id,
      8,
      'Audit Trail Integrity: Financial audit log recorded for Class Master submission',
    );

    // ─── STEP 9: SEGREGATION OF DUTIES (BALANCE INTEGRITY) ────────────────────
    const invCheck1 = await prisma.invoice.findUnique({ where: { id: inv.id } });
    assert(
      invCheck1?.balance === 90000 && invCheck1?.amountPaid === 0 && invCheck1?.status === 'UNPAID',
      9,
      'Segregation of Duties: Pending cash does NOT reduce invoice balance (remains ₦90,000)',
    );

    // ─── STEP 10: SEGREGATION OF DUTIES (SELF-APPROVAL PROHIBITION) ───────────
    let selfApprovalBlocked = false;
    try {
      await workflowService.approvePayment(payment1Id, {
        schoolId: schoolA.id,
        userId: classMasterUser.id,
        userRole: 'Class Master',
      });
    } catch (err: any) {
      if (err instanceof ForbiddenException) {
        selfApprovalBlocked = true;
      }
    }
    assert(
      selfApprovalBlocked,
      10,
      'Segregation of Duties: Class Master cannot approve their own payment (403 Forbidden)',
    );

    // ─── STEP 11: ACCOUNTANT PENDING QUEUE VISIBILITY ──────────────────────────
    const pendingQueue: any = await workflowService.listPendingPayments(schoolA.id, { classId: classA.id });
    const inQueue = pendingQueue?.data?.some((p: any) => p.id === payment1Id);
    assert(
      inQueue,
      11,
      'Queue Visibility: Payment is visible in School Accountant pending review queue',
    );

    // ─── STEP 12 & 13: ACCOUNTANT APPROVAL & STATE MACHINE ────────────────────
    const approveResult: any = await workflowService.approvePayment(payment1Id, {
      schoolId: schoolA.id,
      userId: accountantUser.id,
      userRole: 'Accountant',
    });
    const approvedPayment = approveResult?.data;

    assert(
      approvedPayment?.status === 'POSTED' &&
      approvedPayment?.approvedById === accountantUser.id &&
      !!approvedPayment?.postedAt,
      12,
      'Accountant Approval: Status transitioned to POSTED with audit timestamps',
    );

    // ─── STEP 13: APPROVAL AUDIT TRAIL ────────────────────────────────────────
    const approveAudit = await prisma.financialAuditLog.findFirst({
      where: { entityId: payment1Id, action: 'PAYMENT_APPROVED' },
    });
    assert(
      !!approveAudit && approveAudit.userId === accountantUser.id,
      13,
      'Approval Audit Trail: Financial audit log recorded for Accountant approval',
    );

    // ─── STEP 14: INVOICE BALANCE UPDATE ──────────────────────────────────────
    const invCheck2 = await prisma.invoice.findUnique({ where: { id: inv.id } });
    assert(
      invCheck2?.balance === 50000 &&
      invCheck2?.amountPaid === 40000 &&
      invCheck2?.status === 'PARTIAL',
      14,
      'Invoice Balance Update: Balance decreased to ₦50,000, paid = ₦40,000 (status PARTIAL)',
    );

    // ─── STEP 15: OFFICIAL RECEIPT GENERATION ─────────────────────────────────
    const receipt1 = await prisma.receipt.findFirst({
      where: { paymentId: payment1Id },
    });
    receipt1Id = receipt1?.id || '';

    assert(
      !!receipt1 &&
      receipt1.amountInFigures === 40000 &&
      receipt1.amountInWords.toUpperCase().includes('FORTY THOUSAND NAIRA') &&
      receipt1.reprintCount === 0 &&
      !receipt1.isCancelled,
      15,
      `Official Receipt Issued: ${receipt1?.receiptNo} with Amount in Words: "${receipt1?.amountInWords}"`,
    );

    // ─── STEP 16: RECEIPT REPRINT AUDITING ────────────────────────────────────
    const reprintResult: any = await workflowService.reprintReceipt(receipt1Id, {
      schoolId: schoolA.id,
      userId: accountantUser.id,
      userRole: 'Accountant',
    });
    const reprintedReceipt = reprintResult?.data;
    assert(
      reprintedReceipt?.reprintCount === 1 && !!reprintedReceipt?.lastReprintedAt,
      16,
      'Receipt Reprint Audit: reprintCount incremented to 1, lastReprintedAt recorded',
    );

    // ─── STEP 17: SECOND PAYMENT & FULL SETTLEMENT ────────────────────────────
    // School Accountant directly records the remaining ₦50,000 cash balance
    const directPayResult: any = await workflowService.submitPayment({
      invoiceId: inv.id,
      amount: 50000,
      method: 'CASH',
      notes: 'Final balance settlement at Bursary',
      idempotencyKey: `acc-pay-${testSuffix}-02`,
    }, {
      schoolId: schoolA.id,
      tenantId: tenantA.id,
      userId: accountantUser.id,
      userRole: 'Accountant',
      isClassMaster: false,
      assignedClassIds: [],
    });

    const payment2 = directPayResult?.data;
    payment2Id = payment2?.id;

    const invCheck3 = await prisma.invoice.findUnique({ where: { id: inv.id } });
    assert(
      payment2?.status === 'POSTED' &&
      invCheck3?.balance === 0 &&
      invCheck3?.amountPaid === 90000 &&
      invCheck3?.status === 'PAID',
      17,
      'Full Settlement: Direct Accountant payment of ₦50k auto-posts -> Balance = ₦0 (PAID)',
    );

    // ─── STEP 18: CHRONOLOGICAL STUDENT LEDGER STATEMENT ──────────────────────
    const statementResult: any = await financeService.getStudentStatement(studentA.id, schoolA.id);
    const ledger = statementResult?.data;

    assert(
      ledger?.summary?.totalBilled === 90000 &&
      ledger?.summary?.totalPaid === 90000 &&
      ledger?.summary?.outstandingBalance === 0 &&
      ledger?.entries?.length >= 3,
      18,
      'Student Financial Ledger: Debits ₦90k, Credits ₦90k, Closing Balance ₦0 across entries',
    );

    // ─── STEP 19: PAYMENT REVERSAL LIFECYCLE ──────────────────────────────────
    // Reverse the first payment (₦40,000)
    await workflowService.reversePayment(payment1Id, 'Erroneous receipt issued', {
      schoolId: schoolA.id,
      userId: accountantUser.id,
      userRole: 'Accountant',
    });

    const reversedPayment = await prisma.payment.findUnique({ where: { id: payment1Id } });
    const cancelledReceipt = await prisma.receipt.findUnique({ where: { id: receipt1Id } });
    const invCheck4 = await prisma.invoice.findUnique({ where: { id: inv.id } });

    assert(
      reversedPayment?.status === 'REVERSED' &&
      cancelledReceipt?.isCancelled === true &&
      invCheck4?.balance === 40000 &&
      invCheck4?.amountPaid === 50000 &&
      invCheck4?.status === 'PARTIAL',
      19,
      'Payment Reversal: ₦40k payment reversed, receipt cancelled, balance restored to ₦40k',
    );

    // ─── STEP 20: CROSS-TENANT ISOLATION ──────────────────────────────────────
    let crossTenantBlocked = false;
    try {
      // School B attempts to access School A's receipt
      await workflowService.reprintReceipt(receipt1Id, {
        schoolId: schoolB.id,
        userId: accountantUser.id,
        userRole: 'Accountant',
      });
    } catch (err: any) {
      if (err instanceof NotFoundException) {
        crossTenantBlocked = true;
      }
    }

    const schoolBInvoices: any = await financeService.getInvoices(schoolB.id, {});
    const leakedRecords = schoolBInvoices?.data?.some((i: any) => i.id === invoiceId);

    assert(
      crossTenantBlocked && !leakedRecords,
      20,
      'Cross-Tenant Isolation: School B cannot access, view, or modify School A financial records',
    );

  } catch (error) {
    console.error('Unhandled exception during acceptance suite execution:', error);
    failed++;
  } finally {
    // ─── CLEANUP TEST FIXTURES ────────────────────────────────────────────────
    try {
      if (invoiceId) {
        await prisma.receipt.deleteMany({ where: { schoolId: schoolA?.id } });
        await prisma.paymentAllocation.deleteMany({ where: { invoiceId } });
        await prisma.payment.deleteMany({ where: { invoiceId } });
        await prisma.invoiceItem.deleteMany({ where: { invoiceId } });
        await prisma.invoice.deleteMany({ where: { id: invoiceId } });
      }
      if (studentA) {
        await prisma.classEnrollment.deleteMany({ where: { studentId: studentA.id } });
        await prisma.student.deleteMany({ where: { id: studentA.id } });
      }
      if (classA) {
        await prisma.teacherAssignment.deleteMany({ where: { classId: classA.id } });
        await prisma.feeStructure.deleteMany({ where: { schoolId: schoolA?.id } });
        await prisma.class.deleteMany({ where: { id: classA.id } });
      }
      if (termA) await prisma.term.deleteMany({ where: { sessionId: sessionA?.id } });
      if (sessionA) await prisma.academicSession.deleteMany({ where: { id: sessionA.id } });
      if (accountantUser) await prisma.user.deleteMany({ where: { id: accountantUser.id } });
      if (classMasterUser) await prisma.user.deleteMany({ where: { id: classMasterUser.id } });
      if (schoolA) await prisma.school.deleteMany({ where: { id: schoolA.id } });
      if (schoolB) await prisma.school.deleteMany({ where: { id: schoolB.id } });
      if (tenantA) {
        await prisma.tenantFinancialPolicy.deleteMany({ where: { tenantId: tenantA.id } });
        await prisma.tenant.deleteMany({ where: { id: tenantA.id } });
      }
      if (tenantB) await prisma.tenant.deleteMany({ where: { id: tenantB.id } });
      await prisma.$disconnect();
    } catch (cleanupErr) {
      console.warn('Cleanup warning:', cleanupErr);
    }
  }

  console.log(`\n===============================================================`);
  console.log(`  SUITE SUMMARY: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed}/20)`);
  console.log(`===============================================================\n`);

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

// Execute suite
runAcceptanceTests().catch((e) => {
  console.error('Fatal test error:', e);
  process.exit(1);
});
