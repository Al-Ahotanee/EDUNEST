import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { successResponse } from '../common/dto/pagination.dto';

/**
 * FinancialReportsService — provides role-scoped financial dashboards and reports.
 *
 * All statistics are computed from the database in real-time — no hardcoded totals.
 * Strictly enforces:
 *   - Tenant isolation (schoolId scoping on every query)
 *   - Class-level access for Class Masters (only their assigned classes)
 *   - Parent-child access (only linked students)
 *   - Payment status filtering (pending ≠ posted ≠ verified)
 */
@Injectable()
export class FinancialReportsService {
  constructor(private prisma: PrismaService) {}

  // ─── SCHOOL ACCOUNTANT DASHBOARD ─────────────────────────────────────────────

  /**
   * Comprehensive dashboard for the School Accountant.
   * Distinguishes pending submissions from verified collections.
   */
  async getAccountantDashboard(schoolId: string, filters?: { sessionId?: string; termId?: string; classId?: string }) {
    const invoiceWhere: any = { student: { schoolId } };
    if (filters?.classId) invoiceWhere.student.classEnrollments = { some: { classId: filters.classId } };

    const paymentWhere: any = { invoice: { student: { schoolId } } };
    if (filters?.classId) paymentWhere.invoice.student.classEnrollments = { some: { classId: filters.classId } };

    const [
      totalInvoiced,
      totalCollected,
      totalOutstanding,
      pendingApprovalCount,
      pendingVerificationCount,
      pendingApprovalAmount,
      rejectedCount,
      reversedCount,
      overdueCount,
      paymentMethodBreakdown,
      recentPayments,
      classCollectionPerformance,
    ] = await Promise.all([
      // Total invoiced
      this.prisma.invoice.aggregate({
        where: invoiceWhere,
        _sum: { total: true },
      }),
      // Total collected (POSTED payments only)
      this.prisma.payment.aggregate({
        where: { ...paymentWhere, status: 'POSTED' },
        _sum: { amount: true },
      }),
      // Total outstanding
      this.prisma.invoice.aggregate({
        where: { ...invoiceWhere, status: { in: ['UNPAID', 'PARTIAL', 'OVERDUE'] } },
        _sum: { balance: true },
      }),
      // Pending Accountant approval (Class Master submissions)
      this.prisma.payment.count({
        where: { ...paymentWhere, status: 'PENDING_ACCOUNTANT_APPROVAL' },
      }),
      // Pending verification (bank transfers)
      this.prisma.payment.count({
        where: { ...paymentWhere, status: 'PENDING_VERIFICATION' },
      }),
      // Pending approval amount
      this.prisma.payment.aggregate({
        where: { ...paymentWhere, status: { in: ['PENDING_ACCOUNTANT_APPROVAL', 'PENDING_VERIFICATION'] } },
        _sum: { amount: true },
      }),
      // Rejected count
      this.prisma.payment.count({
        where: { ...paymentWhere, status: 'REJECTED' },
      }),
      // Reversed count
      this.prisma.payment.count({
        where: { ...paymentWhere, status: 'REVERSED' },
      }),
      // Overdue invoices
      this.prisma.invoice.count({
        where: { ...invoiceWhere, status: 'OVERDUE' },
      }),
      // Payment method breakdown (POSTED only)
      this.prisma.payment.groupBy({
        by: ['method'],
        where: { ...paymentWhere, status: 'POSTED' },
        _sum: { amount: true },
        _count: true,
      }),
      // Recent payments (last 10)
      this.prisma.payment.findMany({
        where: paymentWhere,
        include: {
          invoice: { include: { student: { select: { firstName: true, lastName: true, admissionNumber: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      // Class-level collection performance
      this.getClassCollectionPerformance(schoolId, filters?.sessionId),
    ]);

    return successResponse({
      totals: {
        totalInvoiced: totalInvoiced._sum.total || 0,
        totalCollected: totalCollected._sum.amount || 0,
        totalOutstanding: totalOutstanding._sum.balance || 0,
        collectionRate: totalInvoiced._sum.total
          ? Math.round(((totalCollected._sum.amount || 0) / totalInvoiced._sum.total) * 100)
          : 0,
      },
      pending: {
        pendingApprovalCount,
        pendingVerificationCount,
        pendingApprovalAmount: pendingApprovalAmount._sum.amount || 0,
      },
      exceptions: {
        rejectedCount,
        reversedCount,
        overdueCount,
      },
      paymentMethodBreakdown: paymentMethodBreakdown.map(m => ({
        method: m.method,
        totalAmount: m._sum.amount || 0,
        count: m._count,
      })),
      recentPayments: recentPayments.map(p => ({
        id: p.id,
        amount: p.amount,
        method: p.method,
        status: p.status,
        receiptNo: p.receiptNo,
        paymentDate: p.paymentDate,
        studentName: `${p.invoice.student.firstName} ${p.invoice.student.lastName}`,
        admissionNumber: p.invoice.student.admissionNumber,
        isClassMasterSubmission: p.isClassMasterSubmission,
      })),
      classCollectionPerformance,
    });
  }

  // ─── CLASS MASTER DASHBOARD ──────────────────────────────────────────────────

  /**
   * Scoped dashboard for Class Masters — only shows their assigned classes.
   * No school-wide totals, no other classes' data.
   */
  async getClassMasterDashboard(
    schoolId: string,
    assignedClassIds: string[],
  ) {
    if (!assignedClassIds.length) {
      return successResponse({
        classes: [],
        totals: { totalCharges: 0, totalCollected: 0, totalOutstanding: 0, pendingSubmissions: 0 },
        students: [],
      });
    }

    const classes = await this.prisma.class.findMany({
      where: { id: { in: assignedClassIds }, schoolId },
      include: {
        classEnrollments: {
          include: {
            student: {
              include: {
                invoices: {
                  where: { status: { in: ['UNPAID', 'PARTIAL', 'OVERDUE'] } },
                  select: { id: true, invoiceNo: true, total: true, amountPaid: true, balance: true, status: true },
                },
              },
            },
          },
        },
      },
    });

    const studentIds = classes.flatMap(c => c.classEnrollments.map(e => e.studentId));

    const [
      totalCharges,
      totalCollected,
      pendingSubmissions,
    ] = await Promise.all([
      this.prisma.invoice.aggregate({
        where: { studentId: { in: studentIds } },
        _sum: { total: true },
      }),
      this.prisma.payment.aggregate({
        where: { invoice: { studentId: { in: studentIds } }, status: 'POSTED' },
        _sum: { amount: true },
      }),
      this.prisma.payment.count({
        where: { invoice: { studentId: { in: studentIds } }, status: 'PENDING_ACCOUNTANT_APPROVAL' },
      }),
    ]);

    // Build per-student summary
    const students = classes.flatMap(c =>
      c.classEnrollments.map(e => {
        const invoices = e.student.invoices;
        const totalCharges = invoices.reduce((s, i) => s + i.total, 0);
        const totalPaid = invoices.reduce((s, i) => s + i.amountPaid, 0);
        const totalOutstanding = invoices.reduce((s, i) => s + i.balance, 0);
        return {
          studentId: e.studentId,
          studentName: `${e.student.firstName} ${e.student.lastName}`,
          admissionNumber: e.student.admissionNumber,
          className: c.name,
          totalCharges,
          totalPaid,
          totalOutstanding,
          invoiceCount: invoices.length,
          status: totalOutstanding <= 0.01 ? 'PAID' : totalPaid > 0 ? 'PARTIAL' : 'UNPAID',
        };
      })
    );

    return successResponse({
      classes: classes.map(c => ({ id: c.id, name: c.name, studentCount: c.classEnrollments.length })),
      totals: {
        totalCharges: totalCharges._sum.total || 0,
        totalCollected: totalCollected._sum.amount || 0,
        totalOutstanding: (totalCharges._sum.total || 0) - (totalCollected._sum.amount || 0),
        pendingSubmissions,
      },
      students,
    });
  }

  // ─── PARENT PORTAL FINANCIAL SUMMARY ────────────────────────────────────────

  /**
   * Scoped to a parent's linked children only.
   * Returns invoices, payments, and balances for each linked student.
   */
  async getParentFinancialSummary(userId: string, schoolId: string) {
    const links = await this.prisma.parentStudentLink.findMany({
      where: { userId, isActive: true, student: { schoolId, deletedAt: null } },
      include: {
        student: {
          include: {
            classEnrollments: { take: 1, orderBy: { createdAt: 'desc' }, include: { class: true } },
            invoices: {
              include: {
                items: true,
                payments: {
                  where: { status: 'POSTED' },
                  select: { id: true, amount: true, method: true, paymentDate: true, receiptNo: true, reference: true },
                },
              },
              orderBy: { createdAt: 'desc' },
            },
          },
        },
      },
    });

    const children = links.map(l => {
      const student = l.student;
      const invoices = student.invoices;
      const totalCharges = invoices.reduce((s, i) => s + i.total, 0);
      const totalPaid = invoices.reduce((s, i) => s + i.amountPaid, 0);
      const totalOutstanding = invoices.reduce((s, i) => s + i.balance, 0);
      return {
        studentId: student.id,
        studentName: `${student.firstName} ${student.lastName}`,
        admissionNumber: student.admissionNumber,
        className: student.classEnrollments[0]?.class?.name || '—',
        relationship: l.relationship,
        totalCharges,
        totalPaid,
        totalOutstanding,
        invoices: invoices.map(inv => ({
          id: inv.id,
          invoiceNo: inv.invoiceNo,
          issueDate: inv.issueDate,
          dueDate: inv.dueDate,
          total: inv.total,
          amountPaid: inv.amountPaid,
          balance: inv.balance,
          status: inv.status,
          items: inv.items,
          payments: inv.payments,
        })),
      };
    });

    return successResponse({ children });
  }

  // ─── FINANCIAL REPORTS ──────────────────────────────────────────────────────

  /**
   * Outstanding fees / debtor report.
   * Returns students with unpaid/partial invoices, sorted by outstanding amount (desc).
   */
  async getOutstandingFeesReport(
    schoolId: string,
    filters?: { classId?: string; sessionId?: string; minAmount?: number },
  ) {
    const where: any = {
      student: { schoolId, deletedAt: null },
      status: { in: ['UNPAID', 'PARTIAL', 'OVERDUE'] },
      balance: { gt: 0 },
    };
    if (filters?.classId) where.student.classEnrollments = { some: { classId: filters.classId } };
    if (filters?.sessionId) where.sessionId = filters.sessionId;
    if (filters?.minAmount) where.balance = { gte: filters.minAmount };

    const invoices = await this.prisma.invoice.findMany({
      where,
      include: {
        student: {
          include: {
            classEnrollments: { take: 1, orderBy: { createdAt: 'desc' }, include: { class: true } },
            guardians: { where: { isPrimary: true }, take: 1 },
          },
        },
      },
      orderBy: { balance: 'desc' },
      take: 500,
    });

    const report = invoices.map(inv => ({
      invoiceId: inv.id,
      invoiceNo: inv.invoiceNo,
      studentName: `${inv.student.firstName} ${inv.student.lastName}`,
      admissionNumber: inv.student.admissionNumber,
      className: inv.student.classEnrollments[0]?.class?.name || '—',
      guardianName: inv.student.guardians[0]
        ? `${inv.student.guardians[0].firstName} ${inv.student.guardians[0].lastName}`
        : '—',
      guardianPhone: inv.student.guardians[0]?.phone || '—',
      total: inv.total,
      amountPaid: inv.amountPaid,
      balance: inv.balance,
      status: inv.status,
      dueDate: inv.dueDate,
      isOverdue: inv.dueDate < new Date() && inv.balance > 0,
    }));

    const totalOutstanding = report.reduce((s, r) => s + r.balance, 0);

    return successResponse({
      students: report,
      summary: {
        totalStudents: report.length,
        totalOutstanding,
        averageOutstanding: report.length ? totalOutstanding / report.length : 0,
      },
    });
  }

  /**
   * Daily collection report — POSTED payments only.
   */
  async getDailyCollectionReport(schoolId: string, date: string) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    const payments = await this.prisma.payment.findMany({
      where: {
        invoice: { student: { schoolId } },
        status: 'POSTED',
        postedAt: { gte: start, lte: end },
      },
      include: {
        invoice: { include: { student: { select: { firstName: true, lastName: true, admissionNumber: true } } } },
        receipt: true,
      },
      orderBy: { postedAt: 'asc' },
    });

    const byMethod: Record<string, { count: number; total: number }> = {};
    let grandTotal = 0;
    for (const p of payments) {
      const m = p.method;
      if (!byMethod[m]) byMethod[m] = { count: 0, total: 0 };
      byMethod[m].count++;
      byMethod[m].total += p.amount;
      grandTotal += p.amount;
    }

    return successResponse({
      date,
      payments: payments.map(p => ({
        receiptNo: p.receiptNo,
        amount: p.amount,
        method: p.method,
        reference: p.reference,
        studentName: `${p.invoice.student.firstName} ${p.invoice.student.lastName}`,
        admissionNumber: p.invoice.student.admissionNumber,
        postedAt: p.postedAt,
        postedById: p.approvedById,
      })),
      summary: {
        totalPayments: payments.length,
        grandTotal,
        byMethod: Object.entries(byMethod).map(([method, data]) => ({
          method,
          count: data.count,
          total: data.total,
        })),
      },
    });
  }

  /**
   * Collection-by-user report — shows which staff member collected what.
   */
  async getCollectionByUserReport(
    schoolId: string,
    filters: { startDate: string; endDate: string },
  ) {
    const payments = await this.prisma.payment.findMany({
      where: {
        invoice: { student: { schoolId } },
        status: 'POSTED',
        postedAt: {
          gte: new Date(filters.startDate),
          lte: new Date(filters.endDate + 'T23:59:59'),
        },
      },
      select: { amount: true, method: true, approvedById: true, recordedById: true, isClassMasterSubmission: true },
    });

    const byUser: Record<string, { total: number; count: number; classMasterSubmissions: number }> = {};
    for (const p of payments) {
      const userId = p.approvedById || p.recordedById || 'unknown';
      if (!byUser[userId]) byUser[userId] = { total: 0, count: 0, classMasterSubmissions: 0 };
      byUser[userId].total += p.amount;
      byUser[userId].count++;
      if (p.isClassMasterSubmission) byUser[userId].classMasterSubmissions++;
    }

    // Resolve user names
    const userIds = Object.keys(byUser);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, firstName: true, lastName: true, email: true },
    });
    const userMap = new Map(users.map(u => [u.id, u]));

    return successResponse({
      byUser: Object.entries(byUser).map(([userId, data]) => ({
        userId,
        userName: userMap.get(userId)
          ? `${userMap.get(userId)!.firstName} ${userMap.get(userId)!.lastName}`
          : 'Unknown',
        userEmail: userMap.get(userId)?.email || '—',
        totalCollected: data.total,
        paymentCount: data.count,
        classMasterSubmissions: data.classMasterSubmissions,
      })),
      grandTotal: Object.values(byUser).reduce((s, d) => s + d.total, 0),
    });
  }

  /**
   * Financial audit log — read-only, for School Admin / Auditor.
   */
  async getAuditLog(
    schoolId: string,
    filters?: { action?: string; entityType?: string; entityId?: string; userId?: string; startDate?: string; endDate?: string },
  ) {
    const where: any = { schoolId };
    if (filters?.action) where.action = filters.action;
    if (filters?.entityType) where.entityType = filters.entityType;
    if (filters?.entityId) where.entityId = filters.entityId;
    if (filters?.userId) where.userId = filters.userId;
    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters?.startDate) where.createdAt.gte = new Date(filters.startDate);
      if (filters?.endDate) where.createdAt.lte = new Date(filters.endDate + 'T23:59:59');
    }

    const logs = await this.prisma.financialAuditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    return successResponse(logs);
  }

  // ─── HELPERS ─────────────────────────────────────────────────────────────────

  private async getClassCollectionPerformance(schoolId: string, sessionId?: string) {
    const classes = await this.prisma.class.findMany({
      where: { schoolId },
      select: { id: true, name: true },
      orderBy: { level: 'asc' },
    });

    const performance = [];
    for (const cls of classes) {
      const enrollments = await this.prisma.classEnrollment.findMany({
        where: { classId: cls.id },
        select: { studentId: true },
      });
      const studentIds = enrollments.map(e => e.studentId);

      const [invoiced, collected] = await Promise.all([
        this.prisma.invoice.aggregate({
          where: { studentId: { in: studentIds }, sessionId: sessionId || undefined },
          _sum: { total: true },
        }),
        this.prisma.payment.aggregate({
          where: {
            invoice: { studentId: { in: studentIds } },
            status: 'POSTED',
          },
          _sum: { amount: true },
        }),
      ]);

      const totalInvoiced = invoiced._sum.total || 0;
      const totalCollected = collected._sum.amount || 0;
      performance.push({
        classId: cls.id,
        className: cls.name,
        studentCount: studentIds.length,
        totalInvoiced,
        totalCollected,
        totalOutstanding: totalInvoiced - totalCollected,
        collectionRate: totalInvoiced ? Math.round((totalCollected / totalInvoiced) * 100) : 0,
      });
    }
    return performance;
  }
}
