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
  async generateInvoicesFromClass(classId: string, schoolId: string) {
    // Get all published fee structures for this class
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

    // Get all active students enrolled in this class
    const enrollments = await this.prisma.classEnrollment.findMany({
      where: { classId, student: { status: 'ACTIVE', deletedAt: null } },
      include: { student: true },
    });

    if (enrollments.length === 0) {
      throw new BadRequestException('No active students found in this class.');
    }

    const totalAmount = fees.reduce((sum, f) => sum + (f.amount || 0), 0);
    let invoicesCreated = 0;
    let duplicatesSkipped = 0;

    for (const enrollment of enrollments) {
      // Check if invoice already exists for this student with the same fee items this term
      const existingInvoice = await this.prisma.invoice.findFirst({
        where: {
          studentId: enrollment.studentId,
          createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
        },
      });

      if (existingInvoice) {
        duplicatesSkipped++;
        continue;
      }

      const invoiceNo = await this.generateInvoiceNumber(schoolId);
      await this.prisma.invoice.create({
        data: {
          studentId: enrollment.studentId,
          invoiceNo,
          totalAmount,
          balance: totalAmount,
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          status: 'UNPAID',
          items: {
            create: fees.map(fee => ({
              description: fee.name,
              amount: fee.amount,
              quantity: 1,
              feeStructureId: fee.id,
            })),
          },
        },
      });
      invoicesCreated++;
    }

    return successResponse({
      invoicesCreated,
      duplicatesSkipped,
      totalStudents: enrollments.length,
      totalAmount,
      feeItems: fees.length,
    }, `Generated ${invoicesCreated} invoice(s) from ${fees.length} fee item(s).`);
  }

  // ─── INVOICES ────────────────────────────────────────────────────────────────

  async createInvoice(data: any, schoolId: string) {
    const { studentId, items, dueDate, discount = 0, notes } = data;

    const student = await this.prisma.student.findFirst({
      where: { id: studentId, schoolId },
    });
    if (!student) throw new NotFoundException('Student not found');

    const subtotal = items.reduce((sum: number, item: any) => sum + item.amount * (item.quantity || 1), 0);
    const total = subtotal - discount;
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
        notes,
        items: {
          create: items.map((item: any) => ({
            description: item.description,
            amount: item.amount,
            quantity: item.quantity || 1,
            subtotal: item.amount * (item.quantity || 1),
            feeStructureId: item.feeStructureId,
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
          paymentDate: { gte: startOfMonth },
        },
        _sum: { amount: true },
      }),
      this.prisma.payment.aggregate({
        where: {
          invoice: { student: { schoolId } },
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
        where: { invoice: { student: { schoolId } } },
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
