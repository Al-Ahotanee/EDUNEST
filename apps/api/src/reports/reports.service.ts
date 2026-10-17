import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { successResponse } from '../common/dto/pagination.dto';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getOverview(schoolId: string) {
    const [students, staff, invoiced, collected] = await Promise.all([
      this.prisma.student.count({ where: { schoolId, deletedAt: null } }),
      this.prisma.staff.count({ where: { schoolId, deletedAt: null, isActive: true } }),
      this.prisma.invoice.aggregate({ where: { student: { schoolId } }, _sum: { total: true } }),
      this.prisma.invoice.aggregate({ where: { student: { schoolId } }, _sum: { amountPaid: true } }),
    ]);
    return successResponse({
      students,
      staff,
      totalInvoiced: invoiced._sum.total || 0,
      totalCollected: collected._sum.amountPaid || 0,
    });
  }

  async getEnrollment(schoolId: string) {
    const [total, male, female, active, enrollments, classDetails] = await Promise.all([
      this.prisma.student.count({ where: { schoolId, deletedAt: null } }),
      this.prisma.student.count({ where: { schoolId, gender: 'MALE', deletedAt: null } }),
      this.prisma.student.count({ where: { schoolId, gender: 'FEMALE', deletedAt: null } }),
      this.prisma.student.count({ where: { schoolId, status: 'ACTIVE', deletedAt: null } }),
      this.prisma.classEnrollment.findMany({
        where: { class: { schoolId }, session: { isCurrent: true }, student: { deletedAt: null } },
        select: { classId: true },
      }),
      this.prisma.class.findMany({
        where: { schoolId },
        select: { id: true, name: true },
      }),
    ]);

    const countMap: Record<string, number> = {};
    enrollments.forEach(e => { countMap[e.classId] = (countMap[e.classId] || 0) + 1; });

    const byClass = classDetails.map(c => ({
      classId: c.id,
      className: c.name,
      count: countMap[c.id] || 0,
    }));

    return successResponse({
      total,
      male,
      female,
      active,
      femaleRatio: total > 0 ? Math.round((female / total) * 100) : 0,
      byClass,
    });
  }

  async getAttendance(schoolId: string, query?: any) {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [present, absent, late, excused] = await Promise.all([
      this.prisma.attendance.count({ where: { student: { schoolId }, status: 'PRESENT', date: { gte: thirtyDaysAgo } } }),
      this.prisma.attendance.count({ where: { student: { schoolId }, status: 'ABSENT', date: { gte: thirtyDaysAgo } } }),
      this.prisma.attendance.count({ where: { student: { schoolId }, status: 'LATE', date: { gte: thirtyDaysAgo } } }),
      this.prisma.attendance.count({ where: { student: { schoolId }, status: 'EXCUSED', date: { gte: thirtyDaysAgo } } }),
    ]);

    const total = present + absent + late + excused;
    const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 0;

    return successResponse({
      totalDaysMarked: total,
      present,
      absent,
      late,
      excused,
      attendanceRate: rate,
    });
  }

  async getFinance(schoolId: string, query?: any) {
    const [invoiced, collected, paymentsByMethod] = await Promise.all([
      this.prisma.invoice.aggregate({ where: { student: { schoolId } }, _sum: { total: true, balance: true } }),
      this.prisma.payment.aggregate({ where: { invoice: { student: { schoolId } } }, _sum: { amount: true } }),
      this.prisma.payment.groupBy({
        by: ['method'],
        where: { invoice: { student: { schoolId } } },
        _sum: { amount: true },
        _count: { id: true },
      }),
    ]);

    const totalInvoiced = invoiced._sum.total || 0;
    const totalCollected = collected._sum.amount || 0;
    const totalBalance = invoiced._sum.balance || Math.max(0, totalInvoiced - totalCollected);
    const collectionRate = totalInvoiced > 0 ? Math.round((totalCollected / totalInvoiced) * 100) : 0;

    return successResponse({
      totalInvoiced,
      totalCollected,
      totalBalance,
      collectionRate,
      byMethod: paymentsByMethod.map(p => ({
        method: p.method,
        amount: p._sum.amount || 0,
        count: p._count.id,
      })),
    });
  }
}
