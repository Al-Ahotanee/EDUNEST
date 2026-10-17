import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { successResponse, PaginationDto, paginate, safeSkip, safeTake } from '../common/dto/pagination.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService) {}

  async markAttendance(data: any, schoolId: string) {
    const { studentId, status, termId, date, remarks } = data;

    const student = await this.prisma.student.findFirst({ where: { id: studentId, schoolId } });
    if (!student) throw new Error('Student not found');

    const record = await this.prisma.attendance.upsert({
      where: { studentId_date: { studentId, date: new Date(date) } },
      create: { studentId, termId, status, date: new Date(date), remarks },
      update: { status, remarks },
      include: { student: { select: { firstName: true, lastName: true } } },
    });

    return successResponse(record, 'Attendance marked');
  }

  async bulkMarkAttendance(data: { records: any[] }, schoolId: string) {
    const results = await Promise.allSettled(
      data.records.map((r) => this.markAttendance(r, schoolId)),
    );
    const success = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;
    return successResponse({ success, failed }, `${success} attendance records saved`);
  }

  async getAttendance(schoolId: string, query: PaginationDto & { classId?: string; termId?: string; date?: string; studentId?: string }) {
    const {  classId, termId, date, studentId } = query;

    const where: Prisma.AttendanceWhereInput = {
      student: { schoolId },
      ...(termId && { termId }),
      ...(studentId && { studentId }),
      ...(date && { date: new Date(date) }),
      ...(classId && { student: { classEnrollments: { some: { classId } } } }),
    };

    const [data2, total] = await Promise.all([
      this.prisma.attendance.findMany({
        where,
        skip: safeSkip(query), take: safeTake(query),
        include: {
          student: { select: { firstName: true, lastName: true, admissionNumber: true } },
          term: true,
        },
        orderBy: { date: 'desc' },
      }),
      this.prisma.attendance.count({ where }),
    ]);

    return paginate(data2, total, query);
  }

  async getStatistics(schoolId: string, params: { classId?: string; termId?: string }) {
    const { classId, termId } = params;

    const where: Prisma.AttendanceWhereInput = {
      student: { schoolId },
      ...(termId && { termId }),
      ...(classId && { student: { classEnrollments: { some: { classId } } } }),
    };

    const [total, present, absent, late, excused] = await Promise.all([
      this.prisma.attendance.count({ where }),
      this.prisma.attendance.count({ where: { ...where, status: 'PRESENT' } }),
      this.prisma.attendance.count({ where: { ...where, status: 'ABSENT' } }),
      this.prisma.attendance.count({ where: { ...where, status: 'LATE' } }),
      this.prisma.attendance.count({ where: { ...where, status: 'EXCUSED' } }),
    ]);

    const presentRate = total ? Math.round((present / total) * 100) : 0;

    // Students with low attendance
    const lowAttendance = await this.prisma.student.findMany({
      where: {
        schoolId,
        ...(classId && { classEnrollments: { some: { classId } } }),
      },
      include: {
        attendances: {
          where: { ...(termId && { termId }) },
        },
      },
    });

    const studentsWithRate = lowAttendance
      .map((s) => {
        const studentTotal = s.attendances.length;
        const studentPresent = s.attendances.filter((a) => a.status === 'PRESENT').length;
        return {
          id: s.id,
          name: `${s.firstName} ${s.lastName}`,
          admissionNumber: s.admissionNumber,
          attendanceRate: studentTotal ? Math.round((studentPresent / studentTotal) * 100) : 0,
          totalDays: studentTotal,
          presentDays: studentPresent,
        };
      })
      .filter((s) => s.attendanceRate < 75 && s.totalDays > 0)
      .sort((a, b) => a.attendanceRate - b.attendanceRate)
      .slice(0, 10);

    return successResponse({
      total, present, absent, late, excused, presentRate,
      lowAttendanceStudents: studentsWithRate,
    });
  }

  async getStudentAttendanceSummary(studentId: string, termId?: string) {
    const where: Prisma.AttendanceWhereInput = {
      studentId,
      ...(termId && { termId }),
    };

    const records = await this.prisma.attendance.findMany({ where, orderBy: { date: 'desc' } });

    const summary = {
      total: records.length,
      present: records.filter((r) => r.status === 'PRESENT').length,
      absent: records.filter((r) => r.status === 'ABSENT').length,
      late: records.filter((r) => r.status === 'LATE').length,
      excused: records.filter((r) => r.status === 'EXCUSED').length,
    };
    const rate = summary.total ? Math.round((summary.present / summary.total) * 100) : 0;

    return successResponse({ records, summary, attendanceRate: rate });
  }
}
