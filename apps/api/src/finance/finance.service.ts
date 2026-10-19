import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationDto, paginate, safeSkip, safeTake, successResponse } from '../common/dto/pagination.dto';
import { Prisma } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class FinanceService {
  constructor(private prisma: PrismaService) {}

  // ─── FEE STRUCTURES ──────────────────────────────────────────────────────────

  async createFeeStructure(data: any, schoolId: string) {
    // Validate classId if provided
    if (data.classId) {
      const cls = await this.prisma.class.findFirst({ where: { id: data.classId, schoolId } });
      if (!cls) throw new BadRequestException('Selected class does not exist');
    }

    const fee = await this.prisma.feeStructure.create({
      data: {
        ...data,
        schoolId,
        // New fields with defaults
        classId: data.classId || null,
        sessionId: data.sessionId || null,
        termId: data.termId || null,
        feeType: data.feeType || 'TERM',
        status: data.status || 'DRAFT',
      },
      include: { class: true },
    });
    return successResponse(fee, 'Fee structure created');
  }

  async getFeeStructures(schoolId: string, query: PaginationDto & { classId?: string; status?: string }) {
    const { search, classId, status } = query;
    const where: Prisma.FeeStructureWhereInput = {
      schoolId,
      ...(search && { name: { contains: search } }),
      ...(classId && { classId }),
      ...(status && { status }),
    };

    const [data, total] = await Promise.all([
      this.prisma.feeStructure.findMany({
        where,
        skip: safeSkip(query), take: safeTake(query),
        include: { class: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.feeStructure.count({ where }),
    ]);
    return paginate(data, total, query);
  }

  async publishFeeStructure(id: string, schoolId: string) {
    const existing = await this.prisma.feeStructure.findFirst({ where: { id, schoolId } });
    if (!existing) throw new NotFoundException('Fee structure not found');
    const updated = await this.prisma.feeStructure.update({
      where: { id },
      data: { status: 'PUBLISHED' },
      include: { class: { select: { id: true, name: true } } },
    });
    return successResponse(updated, 'Fee structure published — now visible to parents');
  }

  async getFeeStructuresByClass(classId: string, schoolId: string) {
    // Get published fee structures for a specific class (or class-agnostic ones)
    const fees = await this.prisma.feeStructure.findMany({
      where: {
        schoolId,
        status: 'PUBLISHED',
        OR: [
          { classId },
          { classId: null }, // class-agnostic fees apply to all
        ],
      },
      include: { class: { select: { id: true, name: true } } },
      orderBy: { feeType: 'asc' },
    });
    // Calculate total
    const total = fees.reduce((sum, f) => sum + (f.amount || 0), 0);
    return successResponse({ fees, total });
  }

  // ─── Generate invoices from published fee structures ──────────────────────
  async generateInvoicesFromClass(
    classId: string,
    schoolId: string,
    options?: { sessionId?: string; termId?: string; isInitialEnrollment?: boolean }
  ) {
    // 1. Resolve session and term
    let sessionId = options?.sessionId;
    let termId = options?.termId;

    if (!sessionId) {
      const activeSession = await this.prisma.academicSession.findFirst({
        where: { schoolId, isCurrent: true },
      }) || await this.prisma.academicSession.findFirst({
        where: { schoolId },
        orderBy: { createdAt: 'desc' },
      });
      sessionId = activeSession?.id;
    }

    if (!termId && sessionId) {
      const activeTerm = await this.prisma.term.findFirst({
        where: { sessionId, isCurrent: true },
      }) || await this.prisma.term.findFirst({
        where: { sessionId },
        orderBy: { createdAt: 'desc' },
      });
      termId = activeTerm?.id;
    }

    // 2. Get all published fee structures for this class (or class-agnostic)
    const fees = await this.prisma.feeStructure.findMany({
      where: {
        schoolId,
        status: 'PUBLISHED',
        OR: [
          { classId },
          { classId: null },
        ],
      },
    });

    if (fees.length === 0) {
      throw new BadRequestException('No published fee structures found for this class. Publish fee items first.');
    }

    // 3. Get all active students enrolled in this class
    const enrollments = await this.prisma.classEnrollment.findMany({
      where: { classId, student: { status: 'ACTIVE', deletedAt: null } },
      include: {
        student: {
          include: {
            invoices: {
              include: { items: true },
            },
          },
        },
      },
    });

    if (enrollments.length === 0) {
      throw new BadRequestException('No active students found in this class.');
    }

    let invoicesCreated = 0;
    let duplicatesSkipped = 0;
    let totalGeneratedAmount = 0;

    for (const enrollment of enrollments) {
      const student = enrollment.student;

      // Check if invoice already exists for this student for this session and term
      const existingInvoice = student.invoices.find((inv: any) => {
        if (sessionId && termId && inv.sessionId === sessionId && inv.termId === termId) {
          return true;
        }
        // Fallback: check if created within the current calendar month
        const thisMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        return new Date(inv.createdAt) >= thisMonth && inv.classId === classId;
      });

      if (existingInvoice) {
        duplicatesSkipped++;
        continue;
      }

      // Filter applicable fee items based on frequency (ONE_TIME vs ANNUAL vs TERM)
      const applicableFees = fees.filter((fee) => {
        const feeType = (fee.feeType || 'TERM').toUpperCase();

        if (feeType === 'ONE_TIME') {
          // If this is not an initial enrollment, or student has already been billed for this fee before, skip it
          if (!options?.isInitialEnrollment && student.invoices.length > 0) {
            // Check if student was ever billed for this fee item
            const alreadyBilled = student.invoices.some((inv: any) =>
              inv.items.some((item: any) =>
                item.feeStructureId === fee.id || item.description?.toLowerCase() === fee.name.toLowerCase()
              )
            );
            if (alreadyBilled) return false;
          }
        } else if (feeType === 'ANNUAL') {
          // Check if already billed in this academic session
          if (sessionId) {
            const billedThisSession = student.invoices.some((inv: any) =>
              inv.sessionId === sessionId &&
              inv.items.some((item: any) =>
                item.feeStructureId === fee.id || item.description?.toLowerCase() === fee.name.toLowerCase()
              )
            );
            if (billedThisSession) return false;
          }
        }

        return true;
      });

      if (applicableFees.length === 0) {
        continue;
      }

      const totalAmount = applicableFees.reduce((sum, f) => sum + (f.amount || 0), 0);
      const invoiceNo = await this.generateInvoiceNumber(schoolId);

      await this.prisma.invoice.create({
        data: {
          studentId: student.id,
          invoiceNo,
          subtotal: totalAmount,
          discount: 0,
          total: totalAmount,
          balance: totalAmount,
          amountPaid: 0,
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          status: 'UNPAID',
          schoolId,
          sessionId: sessionId || null,
          termId: termId || null,
          classId,
          items: {
            create: applicableFees.map((fee) => ({
              description: fee.name,
              amount: fee.amount,
              quantity: 1,
              subtotal: fee.amount,
              feeStructureId: fee.id,
            })),
          },
        },
      });

      invoicesCreated++;
      totalGeneratedAmount += totalAmount;
    }

    return successResponse(
      {
        invoicesCreated,
        duplicatesSkipped,
        totalStudents: enrollments.length,
        totalAmount: totalGeneratedAmount,
        feeItems: fees.length,
      },
      `Generated ${invoicesCreated} invoice(s) for ${classId}. Skipped ${duplicatesSkipped} duplicate(s).`
    );
  }

  // ─── Generate single student invoice (e.g. on admission or placement) ────────
  async generateInvoiceForStudent(
    studentId: string,
    schoolId: string,
    options?: { sessionId?: string; termId?: string; isInitialEnrollment?: boolean }
  ) {
    const student = await this.prisma.student.findFirst({
      where: { id: studentId, schoolId, deletedAt: null },
      include: {
        classEnrollments: { orderBy: { createdAt: 'desc' }, take: 1, include: { class: true } },
        invoices: { include: { items: true } },
      },
    });

    if (!student) throw new NotFoundException('Student not found');

    const enrollment = student.classEnrollments[0];
    if (!enrollment || !enrollment.classId) {
      throw new BadRequestException(
        `Student ${student.admissionNumber} (${student.firstName} ${student.lastName}) has no active class assignment. ` +
        `Assign the student to an approved class before generating fee invoices.`
      );
    }

    const classId = enrollment.classId;

    // Resolve session & term
    let sessionId = options?.sessionId || enrollment.sessionId;
    let termId = options?.termId;

    if (!sessionId) {
      const activeSession = await this.prisma.academicSession.findFirst({
        where: { schoolId, isCurrent: true },
      }) || await this.prisma.academicSession.findFirst({
        where: { schoolId },
        orderBy: { createdAt: 'desc' },
      });
      sessionId = activeSession?.id;
    }

    if (!termId && sessionId) {
      const activeTerm = await this.prisma.term.findFirst({
        where: { sessionId, isCurrent: true },
      }) || await this.prisma.term.findFirst({
        where: { sessionId },
        orderBy: { createdAt: 'desc' },
      });
      termId = activeTerm?.id;
    }

    // Get published fees for this class
    const fees = await this.prisma.feeStructure.findMany({
      where: {
        schoolId,
        status: 'PUBLISHED',
        OR: [{ classId }, { classId: null }],
      },
    });

    if (fees.length === 0) {
      throw new BadRequestException(`No published fee structures found for class ${enrollment.class?.name || classId}.`);
    }

    // Filter fees by frequency
    const isInitial = options?.isInitialEnrollment ?? (student.invoices.length === 0);

    const applicableFees = fees.filter((fee) => {
      const feeType = (fee.feeType || 'TERM').toUpperCase();

      if (feeType === 'ONE_TIME') {
        if (!isInitial) {
          const alreadyBilled = student.invoices.some((inv: any) =>
            inv.items.some((item: any) =>
              item.feeStructureId === fee.id || item.description?.toLowerCase() === fee.name.toLowerCase()
            )
          );
          if (alreadyBilled) return false;
        }
      } else if (feeType === 'ANNUAL') {
        if (sessionId) {
          const billedThisSession = student.invoices.some((inv: any) =>
            inv.sessionId === sessionId &&
            inv.items.some((item: any) =>
              item.feeStructureId === fee.id || item.description?.toLowerCase() === fee.name.toLowerCase()
            )
          );
          if (billedThisSession) return false;
        }
      }

      return true;
    });

    if (applicableFees.length === 0) {
      throw new BadRequestException('No applicable fee items to invoice for this student.');
    }

    const totalAmount = applicableFees.reduce((sum, f) => sum + (f.amount || 0), 0);
    const invoiceNo = await this.generateInvoiceNumber(schoolId);

    const invoice = await this.prisma.invoice.create({
      data: {
        studentId: student.id,
        invoiceNo,
        subtotal: totalAmount,
        discount: 0,
        total: totalAmount,
        balance: totalAmount,
        amountPaid: 0,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'UNPAID',
        schoolId,
        sessionId: sessionId || null,
        termId: termId || null,
        classId,
        items: {
          create: applicableFees.map((fee) => ({
            description: fee.name,
            amount: fee.amount,
            quantity: 1,
            subtotal: fee.amount,
            feeStructureId: fee.id,
          })),
        },
      },
      include: { items: true, student: true },
    });

    return successResponse(invoice, `Generated invoice ${invoiceNo} for ${student.firstName} ${student.lastName} (₦${totalAmount.toLocaleString()})`);
  }

  // ─── Student Financial Statement (Chronological Ledger) ─────────────────────
  async getStudentStatement(studentId: string, schoolId: string) {
    const student = await this.prisma.student.findFirst({
      where: { id: studentId, schoolId },
      include: {
        classEnrollments: { include: { class: true }, orderBy: { createdAt: 'desc' }, take: 1 },
        invoices: {
          include: {
            items: true,
            payments: {
              where: { status: 'POSTED' },
              include: { receipt: true },
              orderBy: { paymentDate: 'asc' },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!student) throw new NotFoundException('Student not found');

    const creditNotes = await this.prisma.creditNote.findMany({
      where: { studentId, schoolId, status: 'POSTED' },
      orderBy: { createdAt: 'asc' },
    });

    let totalBilled = 0;
    let totalPaid = 0;
    let totalDiscounts = 0;
    let totalCredits = 0;

    const ledgerEntries: any[] = [];

    for (const inv of student.invoices) {
      totalBilled += inv.total;
      totalDiscounts += inv.discount || 0;

      ledgerEntries.push({
        date: inv.createdAt,
        type: 'INVOICE',
        reference: inv.invoiceNo,
        description: `Invoice: ${inv.items.map((i: any) => i.description).join(', ')}`,
        debit: inv.total,
        credit: 0,
        balance: 0, // will compute running balance
      });

      for (const p of inv.payments) {
        totalPaid += p.amount;
        ledgerEntries.push({
          date: p.paymentDate,
          type: 'PAYMENT',
          reference: p.receiptNo || p.reference || 'PAY',
          description: `Payment via ${p.method}${p.receipt?.receiptNo ? ` (Receipt: ${p.receipt.receiptNo})` : ''}`,
          debit: 0,
          credit: p.amount,
          balance: 0,
        });
      }
    }

    for (const cn of creditNotes) {
      totalCredits += cn.amount;
      ledgerEntries.push({
        date: cn.createdAt,
        type: 'CREDIT_NOTE',
        reference: cn.creditNoteNo,
        description: `Credit Note (${cn.type}): ${cn.reason}`,
        debit: 0,
        credit: cn.amount,
        balance: 0,
      });
    }

    // Sort chronologically and compute running balance
    ledgerEntries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let runningBalance = 0;
    for (const entry of ledgerEntries) {
      runningBalance += (entry.debit - entry.credit);
      entry.balance = Math.max(0, runningBalance);
    }

    const currentBalance = Math.max(0, totalBilled - totalPaid - totalCredits);

    return successResponse({
      student: {
        id: student.id,
        name: `${student.firstName} ${student.lastName}`,
        admissionNumber: student.admissionNumber,
        className: student.classEnrollments[0]?.class?.name || 'Unassigned',
      },
      summary: {
        totalBilled,
        totalPaid,
        totalDiscounts,
        totalCredits,
        outstandingBalance: currentBalance,
      },
      entries: ledgerEntries,
    });
  }

  // ─── INVOICES ────────────────────────────────────────────────────────────────

  async createInvoice(data: any, schoolId: string) {
    const { studentId, items, dueDate, discount = 0, notes } = data;

    const student = await this.prisma.student.findFirst({
      where: { id: studentId, schoolId },
      include: {
        classEnrollments: { orderBy: { createdAt: 'desc' }, take: 1, include: { class: true } },
      },
    });
    if (!student) throw new NotFoundException('Student not found');

    const enrollment = student.classEnrollments[0];
    if (!enrollment || !enrollment.classId) {
      throw new BadRequestException(
        `Student ${student.admissionNumber} (${student.firstName} ${student.lastName}) has no active class assignment. ` +
        `Assign the student to an approved class before generating fee invoices.`
      );
    }

    const subtotal = items.reduce((sum: number, item: any) => sum + item.amount * (item.quantity || 1), 0);
    const total = Math.max(0, subtotal - discount);
    const invoiceNo = await this.generateInvoiceNumber(schoolId);

    const invoice = await this.prisma.invoice.create({
      data: {
        studentId,
        invoiceNo,
        dueDate: new Date(dueDate),
        subtotal,
        discount,
        total,
        balance: total,
        amountPaid: 0,
        notes,
        schoolId,
        sessionId: data.sessionId || enrollment.sessionId || null,
        termId: data.termId || null,
        classId: enrollment.classId,
        status: 'UNPAID',
        items: {
          create: items.map((item: any) => ({
            description: item.description,
            amount: item.amount,
            quantity: item.quantity || 1,
            subtotal: item.amount * (item.quantity || 1),
            feeStructureId: item.feeStructureId || null,
          })),
        },
      },
      include: { items: true, student: true },
    });

    return successResponse(invoice, 'Invoice created successfully');
  }

  async getInvoices(schoolId: string, query: PaginationDto & { status?: string; studentId?: string }) {
    const { search, status, studentId } = query;

    const where: Prisma.InvoiceWhereInput = {
      student: { schoolId },
      ...(status && { status: status as any }),
      ...(studentId && { studentId }),
      ...(search && {
        OR: [
          { invoiceNo: { contains: search } },
          { student: { firstName: { contains: search } } },
          { student: { lastName: { contains: search } } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        skip: safeSkip(query), take: safeTake(query),
        include: {
          student: { select: { firstName: true, lastName: true, admissionNumber: true } },
          items: true,
          payments: { orderBy: { paymentDate: 'desc' }, take: 1 },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return paginate(data, total, query);
  }

  async getInvoice(id: string, schoolId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, student: { schoolId } },
      include: {
        student: true,
        items: { include: { feeStructure: true } },
        payments: { orderBy: { paymentDate: 'desc' } },
      },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    return successResponse(invoice);
  }

  async recordPayment(invoiceId: string, data: any, schoolId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, student: { schoolId } },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    if (invoice.balance <= 0) throw new BadRequestException('Invoice already fully paid');

    const amount = Math.min(data.amount, invoice.balance);
    const receiptNo = await this.generateReceiptNumber(schoolId);

    const [payment] = await this.prisma.$transaction([
      this.prisma.payment.create({
        data: {
          invoiceId,
          amount,
          method: data.method,
          reference: data.reference,
          receiptNo,
          notes: data.notes,
          status: 'POSTED',
          paymentDate: data.paymentDate ? new Date(data.paymentDate) : new Date(),
        },
      }),
      this.prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          amountPaid: { increment: amount },
          balance: { decrement: amount },
          status: invoice.balance - amount <= 0 ? 'PAID' : invoice.amountPaid + amount > 0 ? 'PARTIAL' : 'UNPAID',
        },
      }),
    ]);

    return successResponse(payment, 'Payment recorded successfully');
  }

  // ─── ANALYTICS ───────────────────────────────────────────────────────────────

  async getDashboardStats(schoolId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const [
      totalInvoiced,
      totalCollected,
      monthlyCollected,
      yearlyCollected,
      unpaidCount,
      overdueCount,
      recentPayments,
    ] = await Promise.all([
      this.prisma.invoice.aggregate({
        where: { student: { schoolId } },
        _sum: { total: true },
      }),
      this.prisma.invoice.aggregate({
        where: { student: { schoolId } },
        _sum: { amountPaid: true },
      }),
      this.prisma.payment.aggregate({
        where: {
          invoice: { student: { schoolId } },
          status: 'POSTED',
          paymentDate: { gte: startOfMonth },
        },
        _sum: { amount: true },
      }),
      this.prisma.payment.aggregate({
        where: {
          invoice: { student: { schoolId } },
          status: 'POSTED',
          paymentDate: { gte: startOfYear },
        },
        _sum: { amount: true },
      }),
      this.prisma.invoice.count({
        where: { student: { schoolId }, status: 'UNPAID' },
      }),
      this.prisma.invoice.count({
        where: {
          student: { schoolId },
          status: { in: ['UNPAID', 'PARTIAL'] },
          dueDate: { lt: now },
        },
      }),
      this.prisma.payment.findMany({
        where: { invoice: { student: { schoolId } }, status: 'POSTED' },
        include: {
          invoice: {
            include: {
              student: { select: { firstName: true, lastName: true, admissionNumber: true } },
            },
          },
        },
        orderBy: { paymentDate: 'desc' },
        take: 10,
      }),
    ]);

    const collectionRate = totalInvoiced._sum.total
      ? ((totalCollected._sum.amountPaid || 0) / totalInvoiced._sum.total) * 100
      : 0;

    return successResponse({
      totalInvoiced: totalInvoiced._sum.total || 0,
      totalCollected: totalCollected._sum.amountPaid || 0,
      totalBalance: (totalInvoiced._sum.total || 0) - (totalCollected._sum.amountPaid || 0),
      monthlyCollected: monthlyCollected._sum.amount || 0,
      yearlyCollected: yearlyCollected._sum.amount || 0,
      collectionRate: Math.round(collectionRate * 100) / 100,
      unpaidCount,
      overdueCount,
      recentPayments,
    });
  }

  async getMonthlyTrend(schoolId: string, year: number) {
    const months = Array.from({ length: 12 }, (_, i) => i);
    const trends = await Promise.all(
      months.map(async (month) => {
        const start = new Date(year, month, 1);
        const end = new Date(year, month + 1, 0);
        const result = await this.prisma.payment.aggregate({
          where: {
            invoice: { student: { schoolId } },
            status: 'POSTED',
            paymentDate: { gte: start, lte: end },
          },
          _sum: { amount: true },
          _count: true,
        });
        return {
          month: start.toLocaleString('default', { month: 'short' }),
          collected: result._sum.amount || 0,
          transactions: result._count,
        };
      }),
    );
    return successResponse(trends);
  }

  private async generateInvoiceNumber(schoolId: string): Promise<string> {
    const school = await this.prisma.school.findUnique({ where: { id: schoolId } });
    const year = new Date().getFullYear().toString().slice(-2);
    const count = await this.prisma.invoice.count({ where: { student: { schoolId } } });
    return `INV-${school?.code || 'SCH'}-${year}-${String(count + 1).padStart(5, '0')}`;
  }

  private async generateReceiptNumber(schoolId: string): Promise<string> {
    const school = await this.prisma.school.findUnique({ where: { id: schoolId } });
    const count = await this.prisma.payment.count({ where: { invoice: { student: { schoolId } } } });
    return `RCP-${school?.code || 'SCH'}-${String(count + 1).padStart(6, '0')}`;
  }
}
