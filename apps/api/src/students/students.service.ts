import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationDto, paginate, safeSkip, safeTake, successResponse } from '../common/dto/pagination.dto';
import { CreateStudentDto, UpdateStudentDto, CreateGuardianDto } from './students.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class StudentsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateStudentDto, schoolId: string) {
    const existing = await this.prisma.student.findUnique({
      where: { schoolId_admissionNumber: { schoolId, admissionNumber: dto.admissionNumber } },
    });
    if (existing) throw new ConflictException('Admission number already exists');

    const student = await this.prisma.student.create({
      data: {
        ...dto,
        schoolId,
        dateOfBirth: new Date(dto.dateOfBirth),
        guardians: dto.guardians
          ? { create: dto.guardians }
          : undefined,
      },
      include: { guardians: true },
    });

    return successResponse(student, 'Student created successfully');
  }

  async findAll(schoolId: string, query: PaginationDto & { status?: string; classId?: string }) {
    const { search, sortBy, sortOrder, status, classId } = query;

    const where: Prisma.StudentWhereInput = {
      schoolId,
      deletedAt: null,
      ...(status && { status: status as any }),
      ...(search && {
        OR: [
          { firstName: { contains: search } },
          { lastName: { contains: search } },
          { admissionNumber: { contains: search } },
        ],
      }),
      ...(classId && {
        classEnrollments: { some: { classId } },
      }),
    };

    const [students, total] = await Promise.all([
      this.prisma.student.findMany({
        where,
        skip: safeSkip(query),
        take: safeTake(query),
        orderBy: sortBy
          ? { [sortBy]: sortOrder || 'asc' }
          : { createdAt: 'desc' },
        include: {
          guardians: { take: 1 },
          classEnrollments: {
            where: {},
            include: { class: true },
            take: 1,
            orderBy: { createdAt: 'desc' },
          },
        },
      }),
      this.prisma.student.count({ where }),
    ]);

    return paginate(students, total, query);
  }

  async findOne(id: string, schoolId: string) {
    const student = await this.prisma.student.findFirst({
      where: { id, schoolId, deletedAt: null },
      include: {
        guardians: true,
        classEnrollments: {
          include: { class: true, session: true },
          orderBy: { createdAt: 'desc' },
        },
        invoices: {
          include: { payments: true },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        healthRecords: { orderBy: { visitDate: 'desc' }, take: 5 },
        hostelAllocations: {
          where: { isActive: true },
          include: { room: { include: { hostel: true } } },
        },
        documents: true,
      },
    });

    if (!student) throw new NotFoundException('Student not found');
    return successResponse(student);
  }

  async update(id: string, schoolId: string, dto: UpdateStudentDto) {
    await this.findOne(id, schoolId);

    const { guardians, dateOfBirth, ...rest } = dto;

    const student = await this.prisma.student.update({
      where: { id },
      data: {
        ...rest,
        ...(dateOfBirth && { dateOfBirth: new Date(dateOfBirth) }),
      },
      include: { guardians: true },
    });

    return successResponse(student, 'Student updated successfully');
  }

  async softDelete(id: string, schoolId: string) {
    await this.findOne(id, schoolId);
    await this.prisma.student.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'INACTIVE' },
    });
    return successResponse(null, 'Student removed successfully');
  }

  async addGuardian(studentId: string, schoolId: string, dto: CreateGuardianDto) {
    await this.findOne(studentId, schoolId);
    const guardian = await this.prisma.guardian.create({
      data: { ...dto, studentId },
    });
    return successResponse(guardian, 'Guardian added successfully');
  }

  async getStudentResults(studentId: string, schoolId: string, termId?: string) {
    await this.findOne(studentId, schoolId);

    const results = await this.prisma.result.findMany({
      where: {
        studentId,
        ...(termId && { termId }),
      },
      include: { subject: true, term: { include: { session: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return successResponse(results);
  }

  async getStudentAttendance(studentId: string, schoolId: string, termId?: string) {
    await this.findOne(studentId, schoolId);

    const attendance = await this.prisma.attendance.findMany({
      where: {
        studentId,
        ...(termId && { termId }),
      },
      orderBy: { date: 'desc' },
    });

    const summary = {
      total: attendance.length,
      present: attendance.filter((a) => a.status === 'PRESENT').length,
      absent: attendance.filter((a) => a.status === 'ABSENT').length,
      late: attendance.filter((a) => a.status === 'LATE').length,
      excused: attendance.filter((a) => a.status === 'EXCUSED').length,
    };

    return successResponse({ records: attendance, summary });
  }

  async getStatistics(schoolId: string) {
    const [total, active, male, female, byClass] = await Promise.all([
      this.prisma.student.count({ where: { schoolId, deletedAt: null } }),
      this.prisma.student.count({ where: { schoolId, deletedAt: null, status: 'ACTIVE' } }),
      this.prisma.student.count({ where: { schoolId, deletedAt: null, gender: 'MALE' } }),
      this.prisma.student.count({ where: { schoolId, deletedAt: null, gender: 'FEMALE' } }),
      this.prisma.classEnrollment.groupBy({
        by: ['classId'],
        where: { student: { schoolId, deletedAt: null } },
        _count: { studentId: true },
      }),
    ]);

    return successResponse({ total, active, male, female, byClass });
  }

  async generateAdmissionNumber(schoolId: string): Promise<string> {
    const school = await this.prisma.school.findUnique({ where: { id: schoolId } });
    const year = new Date().getFullYear().toString().slice(-2);
    const count = await this.prisma.student.count({ where: { schoolId } });
    return `${school?.code || 'SCH'}/${year}/${String(count + 1).padStart(4, '0')}`;
  }
}
