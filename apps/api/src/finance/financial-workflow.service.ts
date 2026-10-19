import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { successResponse } from '../common/dto/pagination.dto';
import { v4 as uuidv4 } from 'uuid';

/**
 * FinancialWorkflowService — implements the payment lifecycle state machine,
 * payment allocation, receipt generation, credit notes, and audit logging.
 *
 * Payment lifecycle (per the master prompt §7):
 *   INITIATED → PENDING_VERIFICATION → PENDING_ACCOUNTANT_APPROVAL
 *            → VERIFIED → POSTED (officially reduces invoice balance)
 *            → REVERSED (compensating entry, preserves audit trail)
 *
 * Key rules enforced here:
 *   - Only POSTED payments reduce the official invoice balance
 *   - Pending payments (PENDING_ACCOUNTANT_APPROVAL) do NOT reduce balance
 *   - Class Masters cannot approve their own submissions
 *   - All actions are written to FinancialAuditLog (append-only)
 *   - Idempotency keys prevent duplicate submissions from retries
 *   - Payment allocations cannot exceed the payment amount
 */
@Injectable()
export class FinancialWorkflowService {
  constructor(private prisma: PrismaService) {}

  // ─── PAYMENT SUBMISSION ─────────────────────────────────────────────────────

  /**
   * Submit a new payment. Used by:
   *   - School Accountant (direct recording → goes straight to POSTED if method is cash/POS)
   *   - Class Master (cash collection → goes to PENDING_ACCOUNTANT_APPROVAL)
   *   - Parent (bank transfer reference → goes to PENDING_VERIFICATION)
   *
   * The tenant's financial policy determines which submission modes are allowed.
   */
  async submitPayment(
    data: {
      invoiceId: string;
      amount: number;
      method: string;
      reference?: string;
      notes?: string;
      idempotencyKey?: string;
      paymentDate?: string;
      allocations?: { invoiceItemId?: string; amount: number }[];
    },
    context: {
      schoolId: string;
      tenantId: string;
      userId: string;
      userRole: string;
      isClassMaster: boolean;
      assignedClassIds?: string[];
    },
  ) {
    const { schoolId, tenantId, userId, userRole, isClassMaster, assignedClassIds } = context;

    // 1. Validate invoice exists and belongs to this school
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: data.invoiceId, student: { schoolId } },
      include: { student: { include: { classEnrollments: { where: {}, take: 1, orderBy: { createdAt: 'desc' } } } } },
    });
    if (!invoice) throw new NotFoundException('Invoice not found in this school');
    if (invoice.status === 'PAID' || invoice.balance <= 0) {
      throw new BadRequestException('Invoice is already fully paid');
    }
    if (invoice.status === 'CANCELLED') {
      throw new BadRequestException('Cannot record payment on a cancelled invoice');
    }

    // 2. Validate amount
    if (!data.amount || data.amount <= 0) {
      throw new BadRequestException('Payment amount must be greater than zero');
    }
    if (data.amount > invoice.balance + 0.01) {
      // Allow tiny overpayment (rounding) but flag large overpayments
      throw new BadRequestException(
        `Payment amount (₦${data.amount.toLocaleString()}) exceeds invoice balance (₦${invoice.balance.toLocaleString()}). ` +
        `If this is an intentional overpayment, please contact the School Accountant to record it as a credit.`
      );
    }

    // 3. Check idempotency — prevent duplicate submissions from retries
    if (data.idempotencyKey) {
      const existing = await this.prisma.payment.findUnique({
        where: { idempotencyKey: data.idempotencyKey },
      });
      if (existing) {
        return successResponse(existing, 'Payment already submitted (idempotency check)');
      }
    }

    // 4. Determine the initial payment status based on who is submitting
    let initialStatus: string;
    let isClassMasterSubmission = false;

    if (isClassMaster) {
      // Class Master — check tenant policy
      const policy = await this.getOrCreatePolicy(tenantId);
      if (policy.classMasterCollectionMode === 'VIEW_ONLY') {
        throw new ForbiddenException(
          'Your school does not permit Class Masters to record cash payments. ' +
          'Only the School Accountant can record payments. Please direct the parent to the accounts office.'
        );
      }
      // Class Master can only record for students in their assigned classes
      if (assignedClassIds && assignedClassIds.length > 0) {
        const studentClassId = invoice.student.classEnrollments[0]?.classId;
        if (!studentClassId || !assignedClassIds.includes(studentClassId)) {
          throw new ForbiddenException(
            'This student is not in your assigned class. You can only record payments for students in your class.'
          );
        }
      }
      // Check cash limit if configured
      if (policy.classMasterCashLimit > 0 && data.amount > policy.classMasterCashLimit) {
        throw new BadRequestException(
          `This payment exceeds your Class Master cash limit of ₦${policy.classMasterCashLimit.toLocaleString()}. ` +
          `Please direct the parent to the School Accountant for this payment.`
        );
      }
      initialStatus = 'PENDING_ACCOUNTANT_APPROVAL';
      isClassMasterSubmission = true;
    } else if (userRole === 'Accountant' || userRole === 'Super Admin') {
      // School Accountant recording directly — auto-post for cash/POS
      // (bank transfers still need verification if there's a reference)
      if (data.method === 'BANK_TRANSFER' && data.reference) {
        initialStatus = 'PENDING_VERIFICATION';
      } else {
        initialStatus = 'POSTED';
      }
    } else if (data.method === 'ONLINE') {
      // Verified online payment clearing (Paystack)
      initialStatus = 'POSTED';
    } else {
      // Parent or other manual submission — pending verification
      initialStatus = 'PENDING_VERIFICATION';
    }

    // 5. Generate receipt number (unique per school)
    const receiptNo = await this.generateReceiptNumber(schoolId);

    // 6. Create the payment record
    const payment = await this.prisma.payment.create({
      data: {
        invoiceId: data.invoiceId,
        amount: data.amount,
        method: data.method as any,
        reference: data.reference,
        receiptNo,
        notes: data.notes,
        status: initialStatus as any,
        recordedById: userId,
        isClassMasterSubmission,
        submissionNotes: isClassMasterSubmission ? (data.notes || '') : null,
        idempotencyKey: data.idempotencyKey,
        paymentDate: data.paymentDate ? new Date(data.paymentDate) : new Date(),
        // If auto-posting (Accountant direct), set postedAt
        postedAt: initialStatus === 'POSTED' ? new Date() : null,
        verifiedById: initialStatus === 'POSTED' ? userId : null,
        verifiedAt: initialStatus === 'POSTED' ? new Date() : null,
        approvedById: initialStatus === 'POSTED' ? userId : null,
        approvedAt: initialStatus === 'POSTED' ? new Date() : null,
      },
      include: { invoice: { include: { student: true } } },
    });

    // 7. If auto-posted, update invoice balance + create allocations + receipt
    if (initialStatus === 'POSTED') {
      await this.postPaymentInternal(payment, data.allocations || []);
    }

    // 8. Write audit log
    await this.writeAuditLog({
      schoolId,
      action: 'PAYMENT_SUBMITTED',
      entityType: 'Payment',
      entityId: payment.id,
      userId,
      userRole,
      description: `Payment of ₦${data.amount.toLocaleString()} submitted via ${data.method} for invoice ${invoice.invoiceNo}. Status: ${initialStatus}.`,
      metadata: JSON.stringify({ amount: data.amount, method: data.method, status: initialStatus, invoiceNo: invoice.invoiceNo }),
    });

    return successResponse(payment, isClassMasterSubmission
      ? 'Cash payment submitted for Accountant approval. The official balance will update once approved.'
      : initialStatus === 'POSTED'
        ? 'Payment recorded and posted successfully.'
        : 'Payment submitted for verification.'
    );
  }

  // ─── PAYMENT APPROVAL WORKFLOW ──────────────────────────────────────────────

  /**
   * Approve a pending payment (School Accountant only).
   * Moves status from PENDING_ACCOUNTANT_APPROVAL → POSTED.
   * Cannot approve own submission (segregation of duties).
   */
  async approvePayment(
    paymentId: string,
    context: { schoolId: string; userId: string; userRole: string },
  ) {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, invoice: { student: { schoolId: context.schoolId } } },
      include: { invoice: { include: { student: true, items: true } } },
    });
    if (!payment) throw new NotFoundException('Payment not found');

    if (payment.status !== 'PENDING_ACCOUNTANT_APPROVAL' && payment.status !== 'PENDING_VERIFICATION') {
      throw new BadRequestException(
        `Payment status is ${payment.status}, not PENDING_ACCOUNTANT_APPROVAL or PENDING_VERIFICATION. ` +
        `Only pending payments can be approved.`
      );
    }

    // Segregation of duties: cannot approve own submission
    if (payment.recordedById === context.userId) {
      throw new ForbiddenException(
        'You cannot approve a payment you submitted yourself. ' +
        'This is a segregation-of-duties control — another School Accountant must approve it.'
      );
    }

    // Post the payment (updates invoice balance + creates allocations + receipt)
    await this.postPaymentInternal(payment, []);

    // Update payment status
    const updated = await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'POSTED',
        approvedById: context.userId,
        approvedAt: new Date(),
        verifiedById: context.userId,
        verifiedAt: new Date(),
        postedAt: new Date(),
      },
      include: { invoice: { include: { student: true } }, receipt: true },
    });

    await this.writeAuditLog({
      schoolId: context.schoolId,
      action: 'PAYMENT_APPROVED',
      entityType: 'Payment',
      entityId: paymentId,
      userId: context.userId,
      userRole: context.userRole,
      description: `Payment of ₦${payment.amount.toLocaleString()} approved and posted for invoice ${payment.invoice.invoiceNo}.`,
      metadata: JSON.stringify({ amount: payment.amount, invoiceNo: payment.invoice.invoiceNo }),
    });

    return successResponse(updated, 'Payment approved and posted. Official balance updated.');
  }

  /**
   * Reject a pending payment (School Accountant only).
   * Requires a rejection reason. Preserves the original submission + audit history.
   */
  async rejectPayment(
    paymentId: string,
    reason: string,
    context: { schoolId: string; userId: string; userRole: string },
  ) {
    if (!reason || reason.trim().length < 5) {
      throw new BadRequestException('A detailed rejection reason is required (minimum 5 characters)');
    }

    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, invoice: { student: { schoolId: context.schoolId } } },
      include: { invoice: true },
    });
    if (!payment) throw new NotFoundException('Payment not found');

    if (payment.status !== 'PENDING_ACCOUNTANT_APPROVAL' && payment.status !== 'PENDING_VERIFICATION') {
      throw new BadRequestException(`Payment status is ${payment.status}, not pending. Only pending payments can be rejected.`);
    }

    const updated = await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'REJECTED',
        rejectionReason: reason,
        verifiedById: context.userId,
        verifiedAt: new Date(),
        approvedById: context.userId,
        approvedAt: new Date(),
      },
    });

    await this.writeAuditLog({
      schoolId: context.schoolId,
      action: 'PAYMENT_REJECTED',
      entityType: 'Payment',
      entityId: paymentId,
      userId: context.userId,
      userRole: context.userRole,
      description: `Payment of ₦${payment.amount.toLocaleString()} rejected. Reason: ${reason}`,
      metadata: JSON.stringify({ amount: payment.amount, reason, invoiceNo: payment.invoice.invoiceNo }),
    });

    return successResponse(updated, 'Payment rejected. The original submission is preserved in the audit trail.');
  }

  // ─── POST PAYMENT (internal) ────────────────────────────────────────────────

  /**
   * Internal: post a payment — update invoice balance, create allocations,
   * generate official receipt. Called by approvePayment and direct Accountant recording.
   */
  private async postPaymentInternal(
    payment: any,
    allocations: { invoiceItemId?: string; amount: number }[],
  ) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: payment.invoiceId },
      include: { items: true, student: { include: { classEnrollments: { take: 1, orderBy: { createdAt: 'desc' } } } } },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');

    // Update invoice balance + status
    const newAmountPaid = invoice.amountPaid + payment.amount;
    const newBalance = Math.max(0, invoice.total - newAmountPaid);
    const newStatus = newBalance <= 0.01 ? 'PAID' : newAmountPaid > 0 ? 'PARTIAL' : 'UNPAID';

    await this.prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        amountPaid: newAmountPaid,
        balance: newBalance,
        status: newStatus as any,
      },
    });

    // Create allocations if provided, else auto-allocate to invoice items in order
    if (allocations.length > 0) {
      // Validate: total allocations must not exceed payment amount
      const totalAllocated = allocations.reduce((sum, a) => sum + a.amount, 0);
      if (totalAllocated > payment.amount + 0.01) {
        throw new BadRequestException(
          `Total allocation (₦${totalAllocated.toLocaleString()}) exceeds payment amount (₦${payment.amount.toLocaleString()})`
        );
      }
      for (const alloc of allocations) {
        await this.prisma.paymentAllocation.create({
          data: {
            paymentId: payment.id,
            invoiceId: invoice.id,
            invoiceItemId: alloc.invoiceItemId || null,
            amount: alloc.amount,
          },
        });
      }
    } else {
      // Auto-allocate to invoice items in order (FIFO)
      let remaining = payment.amount;
      for (const item of invoice.items) {
        if (remaining <= 0) break;
        const itemBalance = item.subtotal; // simplified — assumes no prior allocation to items
        const allocAmount = Math.min(remaining, itemBalance);
        await this.prisma.paymentAllocation.create({
          data: {
            paymentId: payment.id,
            invoiceId: invoice.id,
            invoiceItemId: item.id,
            amount: allocAmount,
          },
        });
        remaining -= allocAmount;
      }
    }

    // Generate official receipt
    await this.generateReceipt(payment, invoice);
  }

  // ─── RECEIPT GENERATION ─────────────────────────────────────────────────────

  private async generateReceipt(payment: any, invoice: any) {
    // Check if receipt already exists (idempotency — don't create duplicate receipts)
    const existing = await this.prisma.receipt.findUnique({
      where: { paymentId: payment.id },
    });
    if (existing) return existing;

    const student = invoice.student;
    const className = student.classEnrollments?.[0]?.classId
      ? (await this.prisma.class.findUnique({ where: { id: student.classEnrollments[0].classId } }))?.name
      : null;

    const receipt = await this.prisma.receipt.create({
      data: {
        receiptNo: payment.receiptNo,
        paymentId: payment.id,
        schoolId: invoice.student.schoolId,
        studentName: `${student.firstName} ${student.lastName}`,
        studentAdmissionNo: student.admissionNumber,
        className,
        payerName: null, // could be populated from guardian info
        amountInFigures: payment.amount,
        amountInWords: this.numberToWords(payment.amount),
        paymentDate: payment.paymentDate,
        paymentMethod: payment.method,
        transactionRef: payment.reference,
        invoiceAllocations: JSON.stringify([{ invoiceNo: invoice.invoiceNo, amount: payment.amount }]),
        issuedById: payment.approvedById || payment.recordedById || '',
      },
    });

    await this.writeAuditLog({
      schoolId: invoice.student.schoolId,
      action: 'RECEIPT_ISSUED',
      entityType: 'Receipt',
      entityId: receipt.id,
      userId: payment.approvedById || payment.recordedById,
      userRole: 'System',
      description: `Receipt ${receipt.receiptNo} issued for payment of ₦${payment.amount.toLocaleString()}.`,
      metadata: JSON.stringify({ receiptNo: receipt.receiptNo, paymentId: payment.id }),
    });

    return receipt;
  }

  /**
   * Reprint a receipt (audited — increments reprintCount, does NOT create a new payment).
   */
  async reprintReceipt(
    receiptId: string,
    context: { schoolId: string; userId: string; userRole: string },
  ) {
    const receipt = await this.prisma.receipt.findFirst({
      where: { id: receiptId, schoolId: context.schoolId },
    });
    if (!receipt) throw new NotFoundException('Receipt not found');
    if (receipt.isCancelled) throw new BadRequestException('Cannot reprint a cancelled receipt');

    const updated = await this.prisma.receipt.update({
      where: { id: receiptId },
      data: {
        reprintCount: { increment: 1 },
        lastReprintedAt: new Date(),
        lastReprintedById: context.userId,
      },
    });

    await this.writeAuditLog({
      schoolId: context.schoolId,
      action: 'RECEIPT_REPRINTED',
      entityType: 'Receipt',
      entityId: receiptId,
      userId: context.userId,
      userRole: context.userRole,
      description: `Receipt ${receipt.receiptNo} reprinted (reprint #${updated.reprintCount}).`,
      metadata: JSON.stringify({ receiptNo: receipt.receiptNo, reprintCount: updated.reprintCount }),
    });

    return successResponse(updated, 'Receipt reprinted successfully');
  }

  // ─── PAYMENT REVERSAL ───────────────────────────────────────────────────────

  /**
   * Reverse a posted payment (School Accountant or Super Admin only).
   * Creates a compensating entry — does NOT delete the original payment.
   * The original payment is marked REVERSED with a reason.
   */
  async reversePayment(
    paymentId: string,
    reason: string,
    context: { schoolId: string; userId: string; userRole: string },
  ) {
    if (!reason || reason.trim().length < 10) {
      throw new BadRequestException('A detailed reversal reason is required (minimum 10 characters)');
    }

    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, invoice: { student: { schoolId: context.schoolId } } },
      include: { invoice: true, allocations: true },
    });
    if (!payment) throw new NotFoundException('Payment not found');

    if (payment.status !== 'POSTED') {
      throw new BadRequestException(`Only POSTED payments can be reversed. Current status: ${payment.status}`);
    }

    // Mark original payment as REVERSED
    await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'REVERSED',
        reversedAt: new Date(),
        reversedById: context.userId,
        reversalReason: reason,
      },
    });

    // Reverse the invoice balance update
    const invoice = payment.invoice;
    const newAmountPaid = Math.max(0, invoice.amountPaid - payment.amount);
    const newBalance = invoice.total - newAmountPaid;
    const newStatus = newBalance <= 0.01 ? 'PAID' : newAmountPaid > 0 ? 'PARTIAL' : 'UNPAID';

    await this.prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        amountPaid: newAmountPaid,
        balance: newBalance,
        status: newStatus as any,
      },
    });

    // Cancel the receipt
    await this.prisma.receipt.updateMany({
      where: { paymentId, schoolId: context.schoolId },
      data: {
        isCancelled: true,
        cancelledAt: new Date(),
        cancelledById: context.userId,
        cancellationReason: `Payment reversed: ${reason}`,
      },
    });

    await this.writeAuditLog({
      schoolId: context.schoolId,
      action: 'PAYMENT_REVERSED',
      entityType: 'Payment',
      entityId: paymentId,
      userId: context.userId,
      userRole: context.userRole,
      description: `Payment of ₦${payment.amount.toLocaleString()} reversed. Reason: ${reason}`,
      metadata: JSON.stringify({ amount: payment.amount, reason, invoiceNo: invoice.invoiceNo }),
    });

    return successResponse({ paymentId, status: 'REVERSED' }, 'Payment reversed. Invoice balance restored. Original record preserved in audit trail.');
  }

  // ─── PENDING PAYMENTS QUEUE ─────────────────────────────────────────────────

  /**
   * List pending payments for the School Accountant's approval queue.
   * Returns payments with status PENDING_ACCOUNTANT_APPROVAL or PENDING_VERIFICATION.
   */
  async listPendingPayments(schoolId: string, filters?: { classId?: string; method?: string }) {
    const where: any = {
      invoice: { student: { schoolId } },
      status: { in: ['PENDING_ACCOUNTANT_APPROVAL', 'PENDING_VERIFICATION'] },
    };
    if (filters?.classId) {
      where.invoice.student.classEnrollments = { some: { classId: filters.classId } };
    }
    if (filters?.method) {
      where.method = filters.method;
    }

    const payments = await this.prisma.payment.findMany({
      where,
      include: {
        invoice: { include: { student: { include: { classEnrollments: { take: 1, orderBy: { createdAt: 'desc' } } } } } },
      },
      orderBy: { createdAt: 'asc' }, // oldest first
      take: 200,
    });

    return successResponse(payments);
  }

  // ─── TENANT FINANCIAL POLICY ────────────────────────────────────────────────

  async getOrCreatePolicy(tenantId: string) {
    let policy = await this.prisma.tenantFinancialPolicy.findUnique({
      where: { tenantId },
    });
    if (!policy) {
      policy = await this.prisma.tenantFinancialPolicy.create({
        data: { tenantId },
      });
    }
    return policy;
  }

  async updatePolicy(
    tenantId: string,
    updates: {
      classMasterCollectionMode?: string;
      allowProvisionalAcknowledgement?: boolean;
      onlinePaymentsEnabled?: boolean;
      allowTransferReferenceSubmission?: boolean;
      defaultDueDateDays?: number;
      overdueThresholdDays?: number;
      refundsRequirePrincipalApproval?: boolean;
      classMasterCashLimit?: number;
    },
    context: { schoolId: string; userId: string; userRole: string },
  ) {
    const policy = await this.getOrCreatePolicy(tenantId);
    const updated = await this.prisma.tenantFinancialPolicy.update({
      where: { id: policy.id },
      data: updates,
    });

    await this.writeAuditLog({
      schoolId: context.schoolId,
      action: 'POLICY_UPDATED',
      entityType: 'TenantFinancialPolicy',
      entityId: policy.id,
      userId: context.userId,
      userRole: context.userRole,
      description: `Financial policy updated. Changes: ${Object.keys(updates).join(', ')}`,
      metadata: JSON.stringify(updates),
    });

    return successResponse(updated, 'Financial policy updated');
  }

  // ─── PARENT-STUDENT LINKS ───────────────────────────────────────────────────

  /**
   * Link a parent User account to a Student record.
   * Used by School Admin to grant parent portal access to a specific child.
   */
  async createParentStudentLink(
    data: { userId: string; studentId: string; relationship?: string },
    context: { schoolId: string; userId: string; userRole: string },
  ) {
    // Validate student belongs to this school
    const student = await this.prisma.student.findFirst({
      where: { id: data.studentId, schoolId: context.schoolId },
    });
    if (!student) throw new NotFoundException('Student not found in this school');

    // Validate user exists and belongs to same tenant
    const user = await this.prisma.user.findFirst({
      where: { id: data.userId, schoolId: context.schoolId },
    });
    if (!user) throw new NotFoundException('User not found in this school');

    // Check for existing link (idempotency)
    const existing = await this.prisma.parentStudentLink.findUnique({
      where: { userId_studentId: { userId: data.userId, studentId: data.studentId } },
    });
    if (existing) {
      // Reactivate if was inactive
      if (!existing.isActive) {
        await this.prisma.parentStudentLink.update({
          where: { id: existing.id },
          data: { isActive: true, relationship: data.relationship || existing.relationship },
        });
        return successResponse(existing, 'Parent-student link reactivated');
      }
      return successResponse(existing, 'Parent-student link already exists');
    }

    const link = await this.prisma.parentStudentLink.create({
      data: {
        userId: data.userId,
        studentId: data.studentId,
        relationship: data.relationship,
      },
    });

    return successResponse(link, 'Parent linked to student successfully');
  }

  /**
   * Get all students linked to a parent User (scoped — for parent portal).
   * Returns only active links for students in the same school as the parent.
   */
  async getParentStudents(userId: string, schoolId: string) {
    const links = await this.prisma.parentStudentLink.findMany({
      where: { userId, isActive: true, student: { schoolId } },
      include: {
        student: {
          include: {
            classEnrollments: { take: 1, orderBy: { createdAt: 'desc' }, include: { class: true } },
          },
        },
      },
    });
    return links.map(l => l.student);
  }

  // ─── AUDIT LOG ──────────────────────────────────────────────────────────────

  private async writeAuditLog(data: {
    schoolId: string;
    action: string;
    entityType: string;
    entityId: string;
    userId?: string;
    userRole?: string;
    description: string;
    metadata?: string;
    ipAddress?: string;
    userAgent?: string;
  }) {
    return this.prisma.financialAuditLog.create({
      data: {
        schoolId: data.schoolId,
        action: data.action as any,
        entityType: data.entityType,
        entityId: data.entityId,
        userId: data.userId,
        userRole: data.userRole,
        description: data.description,
        metadata: data.metadata,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      },
    });
  }

  // ─── HELPERS ─────────────────────────────────────────────────────────────────

  private async generateReceiptNumber(schoolId: string): Promise<string> {
    const school = await this.prisma.school.findUnique({ where: { id: schoolId }, select: { code: true } });
    const year = new Date().getFullYear().toString().slice(-2);
    const count = await this.prisma.payment.count({
      where: { invoice: { student: { schoolId } } },
    });
    return `RCP-${school?.code || 'SCH'}-${year}-${String(count + 1).padStart(6, '0')}`;
  }

  /**
   * Convert a number to words for receipt "amount in words" field.
   * Handles amounts up to billions. Uses Nigerian Naira + Kobo.
   */
  private numberToWords(amount: number): string {
    const naira = Math.floor(amount);
    const kobo = Math.round((amount - naira) * 100);

    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
      'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const convert = (num: number): string => {
      if (num === 0) return 'Zero';
      if (num < 20) return ones[num];
      if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? '-' + ones[num % 10] : '');
      if (num < 1000) return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 ? ' ' + convert(num % 100) : '');
      if (num < 1000000) return convert(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 ? ' ' + convert(num % 1000) : '');
      if (num < 1000000000) return convert(Math.floor(num / 1000000)) + ' Million' + (num % 1000000 ? ' ' + convert(num % 1000000) : '');
      return convert(Math.floor(num / 1000000000)) + ' Billion' + (num % 1000000000 ? ' ' + convert(num % 1000000000) : '');
    };

    let result = convert(naira) + ' Naira';
    if (kobo > 0) result += ', ' + convert(kobo) + ' Kobo';
    return result + ' Only';
  }

  // ─── PAYSTACK ONLINE PAYMENT INTEGRATION ────────────────────────────────────

  /**
   * Initiate a Paystack payment session for an invoice.
   *
   * Per the master prompt §14:
   *   - Server-side transaction initialization (never trust client-calculated amounts)
   *   - Unique payment references
   *   - Server-side transaction verification
   *   - Idempotent processing
   *
   * This method calls the Paystack Initialize Transaction API to create a
   * checkout session. The parent is redirected to Paystack's hosted checkout
   * page. After payment, Paystack redirects back to the callback URL and
   * fires the webhook.
   */
  async initiatePaystackPayment(
    data: { invoiceId: string; callbackUrl?: string },
    context: { schoolId: string; userId: string; userRole: string },
  ) {
    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) {
      throw new BadRequestException(
        'Online payments are not configured. The school administrator must set the PAYSTACK_SECRET_KEY environment variable.'
      );
    }

    // 1. Validate invoice exists (scoped to caller school if provided)
    const invoice = await this.prisma.invoice.findFirst({
      where: {
        id: data.invoiceId,
        ...(context.schoolId ? { student: { schoolId: context.schoolId } } : {}),
      },
      include: { student: true },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    if (invoice.balance <= 0) {
      throw new BadRequestException('This invoice is already fully paid');
    }

    const effectiveSchoolId = context.schoolId || invoice.schoolId || invoice.student?.schoolId;

    // 2. Check tenant policy — online payments must be enabled
    const tenant = await this.prisma.tenant.findFirst({
      where: effectiveSchoolId ? { schools: { some: { id: effectiveSchoolId } } } : {},
      include: { financialPolicy: true },
    });
    if (tenant?.financialPolicy && !tenant.financialPolicy.onlinePaymentsEnabled) {
      throw new BadRequestException(
        'Online payments are not enabled for this school. Please contact the school administrator.'
      );
    }

    // 3. Generate unique reference
    const reference = `EDN-${invoice.invoiceNo}-${Date.now()}-${uuidv4().slice(0, 8)}`;

    // 4. Call Paystack Initialize Transaction API
    const callbackUrl = data.callbackUrl || `${process.env.FRONTEND_URL || 'https://edunest.onrender.com'}/parent-portal?payment=success`;

    const paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: (invoice.student as any)?.email || `${invoice.studentId}@edunest.test`,
        amount: Math.round(invoice.balance * 100), // Paystack expects kobo (amount in minor units)
        currency: 'NGN',
        reference,
        callback_url: callbackUrl,
        metadata: {
          invoiceId: invoice.id,
          schoolId: context.schoolId,
          userId: context.userId,
          studentId: invoice.studentId,
          invoiceNo: invoice.invoiceNo,
          amount: invoice.balance,
          custom_fields: [
            { display_name: 'Invoice Number', variable_name: 'invoice_no', value: invoice.invoiceNo },
            { display_name: 'Student', variable_name: 'student_name', value: `${invoice.student.firstName} ${invoice.student.lastName}` },
          ],
        },
      }),
    });

    if (!paystackResponse.ok) {
      const errorBody = await paystackResponse.text();
      console.error('[Paystack] Initialize failed:', paystackResponse.status, errorBody);
      throw new BadRequestException(
        `Failed to initialize payment with Paystack. Please try again or contact support. (HTTP ${paystackResponse.status})`
      );
    }

    const paystackData = await paystackResponse.json() as any;
    if (!paystackData?.status || !paystackData?.data?.authorization_url) {
      throw new BadRequestException(
        'Paystack returned an unexpected response. Please try again or contact support.'
      );
    }

    // 5. Create a payment record in INITIATED state (not yet posted)
    const receiptNo = await this.generateReceiptNumber(effectiveSchoolId || context.schoolId);
    const payment = await this.prisma.payment.create({
      data: {
        invoiceId: invoice.id,
        amount: invoice.balance,
        method: 'ONLINE',
        reference,
        receiptNo,
        status: 'INITIATED',
        recordedById: context.userId,
        idempotencyKey: reference, // use the Paystack reference as idempotency key
        notes: `Paystack online payment — ${invoice.invoiceNo}`,
      },
    });

    // 6. Write audit log
    await this.writeAuditLog({
      schoolId: effectiveSchoolId || context.schoolId,
      action: 'PAYMENT_SUBMITTED',
      entityType: 'Payment',
      entityId: payment.id,
      userId: context.userId,
      userRole: context.userRole,
      description: `Online payment of ₦${invoice.balance.toLocaleString()} initiated via Paystack for invoice ${invoice.invoiceNo}. Reference: ${reference}`,
      metadata: JSON.stringify({ reference, invoiceNo: invoice.invoiceNo, amount: invoice.balance }),
    });

    return successResponse({
      authorizationUrl: paystackData.data.authorization_url,
      accessCode: paystackData.data.access_code,
      reference,
      paymentId: payment.id,
      amount: invoice.balance,
    }, 'Payment session initialized. Redirecting to Paystack...');
  }

  /**
   * Verify a Paystack transaction after the parent returns from the
   * Paystack checkout page.
   *
   * Per the master prompt §14: "A browser redirect to a success URL is not
   * sufficient evidence of payment." This method calls the Paystack Verify
   * Transaction API to confirm the payment was actually successful.
   *
   * If verified, the payment is posted through the normal workflow.
   */
  async verifyPaystackPayment(
    reference: string,
    context: { schoolId: string; userId: string; userRole: string },
  ) {
    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) {
      throw new BadRequestException('Online payments are not configured on this server.');
    }

    // 1. Find the payment record by reference
    const payment = await this.prisma.payment.findFirst({
      where: {
        reference,
        ...(context.schoolId ? { invoice: { student: { schoolId: context.schoolId } } } : {}),
      },
      include: { invoice: { include: { student: true, items: true } } },
    });
    if (!payment) throw new NotFoundException('Payment record not found for this reference');

    // Idempotency — if already posted, return success without re-processing
    if (payment.status === 'POSTED') {
      return successResponse({ payment, alreadyVerified: true }, 'Payment was already verified and posted.');
    }

    // 2. Call Paystack Verify Transaction API
    const verifyResponse = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
      },
    });

    if (!verifyResponse.ok) {
      throw new BadRequestException(`Failed to verify payment with Paystack (HTTP ${verifyResponse.status})`);
    }

    const verifyData = await verifyResponse.json() as any;

    // 3. Check transaction status
    if (!verifyData?.status || verifyData?.data?.status !== 'success') {
      // Update payment to FAILED
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'FAILED' },
      });

      await this.writeAuditLog({
        schoolId: context.schoolId,
        action: 'PAYMENT_REJECTED',
        entityType: 'Payment',
        entityId: payment.id,
        userId: context.userId,
        userRole: context.userRole,
        description: `Paystack payment verification failed for reference ${reference}. Status: ${verifyData?.data?.status || 'unknown'}`,
        metadata: JSON.stringify({ reference, paystackStatus: verifyData?.data?.status }),
      });

      throw new BadRequestException(
        `Payment verification failed. Paystack status: ${verifyData?.data?.status || 'unknown'}. ` +
        `If you believe this is an error, please contact the school with reference: ${reference}`
      );
    }

    // 4. Verify amount matches (protect against amount manipulation)
    const paidAmountKobo = verifyData.data.amount;
    const expectedAmountKobo = Math.round(payment.amount * 100);
    if (paidAmountKobo !== expectedAmountKobo) {
      console.error(`[Paystack] Amount mismatch: expected ${expectedAmountKobo} kobo, got ${paidAmountKobo} kobo`);
      throw new BadRequestException(
        `Amount mismatch detected. Expected ₦${payment.amount.toLocaleString()} but received ₦${(paidAmountKobo / 100).toLocaleString()}. ` +
        `Please contact the school administrator.`
      );
    }

    // 5. Post the payment through the normal workflow
    await this.postPaymentInternal(payment, []);

    // 6. Update payment status to POSTED
    const updated = await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'POSTED',
        verifiedById: context.userId || null,
        verifiedAt: new Date(),
        approvedById: context.userId || null,
        approvedAt: new Date(),
        postedAt: new Date(),
      },
      include: { receipt: true },
    });

    // 7. Write audit log
    await this.writeAuditLog({
      schoolId: context.schoolId,
      action: 'PAYMENT_POSTED',
      entityType: 'Payment',
      entityId: payment.id,
      userId: context.userId,
      userRole: context.userRole,
      description: `Paystack payment of ₦${payment.amount.toLocaleString()} verified and posted for invoice ${payment.invoice.invoiceNo}. Reference: ${reference}`,
      metadata: JSON.stringify({ reference, amount: payment.amount, invoiceNo: payment.invoice.invoiceNo }),
    });

    return successResponse(updated, 'Payment verified and posted successfully. Official receipt generated.');
  }
}
