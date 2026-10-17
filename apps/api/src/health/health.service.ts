import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { successResponse, paginate, safeSkip, safeTake, PaginationDto } from '../common/dto/pagination.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class HealthService {
  constructor(private prisma: PrismaService) {}

  async createRecord(data: any, schoolId: string) {
    // Accept admissionNumber or studentId
    let student: any;
    if (data.studentAdmNo) {
      student = await this.prisma.student.findFirst({ where: { admissionNumber: data.studentAdmNo, schoolId } });
      if (!student) throw new NotFoundException(`Student with admission number "${data.studentAdmNo}" not found`);
    } else {
      student = await this.prisma.student.findFirst({ where: { id: data.studentId, schoolId } });
      if (!student) throw new NotFoundException('Student not found');
    }

    const record = await this.prisma.healthRecord.create({
      data: {
        studentId: student.id,
        complaint: data.complaint,
        diagnosis: data.diagnosis,
        treatment: data.treatment,
        prescription: data.prescription,
        attendedBy: data.attendedBy,
        visitDate: data.visitDate ? new Date(data.visitDate) : new Date(),
        followUpDate: data.followUpDate ? new Date(data.followUpDate) : null,
      },
      include: { student: { select: { firstName: true, lastName: true, admissionNumber: true, gender: true } } },
    });
    return successResponse(record, 'Health record saved');
  }

  async getRecords(schoolId: string, query: PaginationDto & { studentId?: string; fromDate?: string; toDate?: string }) {
    const {  search, studentId, fromDate, toDate } = query;
    const where: Prisma.HealthRecordWhereInput = {
      student: { schoolId },
      ...(studentId && { studentId }),
      ...(fromDate && { visitDate: { gte: new Date(fromDate) } }),
      ...(toDate && { visitDate: { lte: new Date(toDate) } }),
      ...(search && {
        student: { schoolId, OR: [{ firstName: { contains: search } }, { lastName: { contains: search } }, { admissionNumber: { contains: search } }] },
      }),
    };
    const [data, total] = await Promise.all([
      this.prisma.healthRecord.findMany({
        where, skip: safeSkip(query), take: safeTake(query),
        include: { student: { select: { firstName: true, lastName: true, admissionNumber: true, gender: true } } },
        orderBy: { visitDate: 'desc' },
      }),
      this.prisma.healthRecord.count({ where }),
    ]);
    return paginate(data, total, query);
  }

  async getRecord(id: string, schoolId: string) {
    const record = await this.prisma.healthRecord.findFirst({
      where: { id, student: { schoolId } },
      include: { student: { select: { firstName: true, lastName: true, admissionNumber: true, gender: true, dateOfBirth: true } } },
    });
    if (!record) throw new NotFoundException('Record not found');
    return successResponse(record);
  }

  async updateRecord(id: string, schoolId: string, data: any) {
    const existing = await this.prisma.healthRecord.findFirst({ where: { id, student: { schoolId } } });
    if (!existing) throw new NotFoundException('Record not found');

    const record = await this.prisma.healthRecord.update({
      where: { id },
      data: {
        ...(data.complaint && { complaint: data.complaint }),
        ...(data.diagnosis !== undefined && { diagnosis: data.diagnosis }),
        ...(data.treatment !== undefined && { treatment: data.treatment }),
        ...(data.prescription !== undefined && { prescription: data.prescription }),
        ...(data.attendedBy !== undefined && { attendedBy: data.attendedBy }),
        ...(data.followUpDate !== undefined && { followUpDate: data.followUpDate ? new Date(data.followUpDate) : null }),
      },
      include: { student: { select: { firstName: true, lastName: true, admissionNumber: true } } },
    });
    return successResponse(record, 'Record updated');
  }

  async deleteRecord(id: string, schoolId: string) {
    const existing = await this.prisma.healthRecord.findFirst({ where: { id, student: { schoolId } } });
    if (!existing) throw new NotFoundException('Record not found');

    await this.prisma.healthRecord.delete({ where: { id } });
    return successResponse(null, 'Record deleted');
  }

  async getStudentHistory(studentId: string, schoolId: string) {
    const student = await this.prisma.student.findFirst({ where: { id: studentId, schoolId } });
    if (!student) throw new NotFoundException('Student not found');
    const records = await this.prisma.healthRecord.findMany({
      where: { studentId },
      orderBy: { visitDate: 'desc' },
    });
    return successResponse({ student, records });
  }

  async getFollowUps(schoolId: string) {
    const followUps = await this.prisma.healthRecord.findMany({
      where: { student: { schoolId }, followUpDate: { gte: new Date() } },
      include: { student: { select: { firstName: true, lastName: true, admissionNumber: true } } },
      orderBy: { followUpDate: 'asc' },
    });
    return successResponse(followUps);
  }

  async getStats(schoolId: string) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const thisMonth = new Date(); thisMonth.setDate(1); thisMonth.setHours(0, 0, 0, 0);
    const [total, todayVisits, thisMonthVisits, pendingFollowUps] = await Promise.all([
      this.prisma.healthRecord.count({ where: { student: { schoolId } } }),
      this.prisma.healthRecord.count({ where: { student: { schoolId }, visitDate: { gte: today } } }),
      this.prisma.healthRecord.count({ where: { student: { schoolId }, visitDate: { gte: thisMonth } } }),
      this.prisma.healthRecord.count({ where: { student: { schoolId }, followUpDate: { gte: new Date() } } }),
    ]);
    return successResponse({ total, todayVisits, thisMonthVisits, pendingFollowUps });
  }
}
