import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationDto, paginate, safeSkip, safeTake, successResponse } from '../common/dto/pagination.dto';
import { CreateStudentDto, UpdateStudentDto, CreateGuardianDto } from './students.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class StudentsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateStudentDto & { classId?: string; sessionId?: string }, schoolId: string) {
    const existing = await this.prisma.student.findUnique({
      where: { schoolId_admissionNumber: { schoolId, admissionNumber: dto.admissionNumber } },
    });
    if (existing) throw new ConflictException('Admission number already exists');

    // Extract classId/sessionId — not part of Student model, used for auto-enrollment
    const { classId, sessionId, ...studentData } = dto;

    // Validate classId if provided
    if (classId) {
      const cls = await this.prisma.class.findFirst({ where: { id: classId, schoolId } });
      if (!cls) {
        throw new BadRequestException('Selected class does not exist in this school');
      }
    }

    // Get latest session if not provided
    let activeSessionId = sessionId;
    if (!activeSessionId) {
      const session = await this.prisma.academicSession.findFirst({
        where: { schoolId, isCurrent: true },
      }) || await this.prisma.academicSession.findFirst({
        where: { schoolId },
        orderBy: { createdAt: 'desc' },
      });
      activeSessionId = session?.id;
    }

    // Create student + auto-enroll in class if classId provided (transactional)
    const student = await this.prisma.$transaction(async (tx) => {
      const newStudent = await tx.student.create({
        data: {
          ...studentData,
          schoolId,
          dateOfBirth: new Date(studentData.dateOfBirth),
          guardians: studentData.guardians
            ? { create: studentData.guardians }
            : undefined,
        },
        include: { guardians: true },
      });

      // Auto-enroll in class if classId is provided
      if (classId && activeSessionId) {
        await tx.classEnrollment.create({
          data: {
            studentId: newStudent.id,
            classId,
            sessionId: activeSessionId,
          },
        });
      }

      return newStudent;
    });

    // Return student with enrollment info
    const studentWithEnrollment = await this.prisma.student.findUnique({
      where: { id: student.id },
      include: {
        guardians: true,
        classEnrollments: {
          include: { class: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    return successResponse(studentWithEnrollment, 'Student created successfully');
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
    const [total, active, male, female, byClassRaw] = await Promise.all([
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

    // Enrich byClass with class names (fixes UUID-as-label bug in Reports chart)
    const classIds = byClassRaw.map((b: any) => b.classId);
    const classes = await this.prisma.class.findMany({
      where: { id: { in: classIds } },
      select: { id: true, name: true },
    });
    const classMap = new Map(classes.map(c => [c.id, c.name]));
    const byClass = byClassRaw.map((b: any) => ({
      ...b,
      className: classMap.get(b.classId) || 'Unknown',
    }));

    return successResponse({ total, active, male, female, byClass });
  }

  async generateAdmissionNumber(schoolId: string): Promise<string> {
    const school = await this.prisma.school.findUnique({ where: { id: schoolId } });
    const year = new Date().getFullYear().toString().slice(-2);
    const count = await this.prisma.student.count({ where: { schoolId } });
    return `${school?.code || 'SCH'}/${year}/${String(count + 1).padStart(4, '0')}`;
  }

  /**
   * Returns latest term results for all students in the school.
   * Used by the Promotions page to compute average scores and identify promotion candidates.
   */
  async getPromotionResults(schoolId: string) {
    const currentTerm = await this.prisma.term.findFirst({
      where: { session: { schoolId }, isCurrent: true },
    }) || await this.prisma.term.findFirst({
      where: { session: { schoolId } },
      orderBy: { createdAt: 'desc' },
    });

    if (!currentTerm) return successResponse([]);

    const results = await this.prisma.result.findMany({
      where: {
        termId: currentTerm.id,
        student: { schoolId, deletedAt: null },
      },
      select: {
        studentId: true,
        totalScore: true,
        subjectId: true,
        status: true,
      },
    });

    return successResponse(results);
  }

  /**
   * Promote, hold back, or graduate a student.
   * - PROMOTED: student's classEnrollment is updated to the next class
   * - REPEATED: student stays in the current class for another session
   * - GRADUATED: student status is set to GRADUATED
   */
  async promoteStudent(
    studentId: string,
    schoolId: string,
    data: { action: 'PROMOTED' | 'REPEATED' | 'GRADUATED'; targetClassId?: string },
  ) {
    const student = await this.findOne(studentId, schoolId);

    if (data.action === 'GRADUATED') {
      const updated = await this.prisma.student.update({
        where: { id: studentId },
        data: { status: 'GRADUATED' },
      });
      return successResponse(updated, 'Student graduated successfully');
    }

    if (data.action === 'PROMOTED' && data.targetClassId) {
      // Verify target class belongs to same school
      const targetClass = await this.prisma.class.findFirst({
        where: { id: data.targetClassId, schoolId },
      });
      if (!targetClass) {
        throw new NotFoundException('Target class not found in this school');
      }
      // Close current enrollment and create new one for target class
      const currentEnrollment = student.data?.classEnrollments?.[0];
      if (currentEnrollment) {
        await this.prisma.classEnrollment.update({
          where: { id: currentEnrollment.id },
          data: { isPromoted: true },
        });
      }
      const latestSession = await this.prisma.academicSession.findFirst({
        where: { schoolId },
        orderBy: { createdAt: 'desc' },
      });
      const sessionId = latestSession?.id || currentEnrollment?.sessionId || '';
      if (!sessionId) {
        throw new NotFoundException('No academic session found for this school');
      }
      const enrollment = await this.prisma.classEnrollment.create({
        data: {
          studentId,
          classId: data.targetClassId,
          sessionId,
        },
        include: { class: true },
      });
      return successResponse(enrollment, 'Student promoted to next class');
    }

    if (data.action === 'REPEATED') {
      return successResponse(student.data, 'Student held back in current class');
    }

    return successResponse(student.data, 'No action taken');
  }
}
