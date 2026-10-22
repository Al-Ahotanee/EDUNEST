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
import { FinanceService } from '../finance/finance.service';

@Injectable()
export class StudentsService {
  constructor(
    private prisma: PrismaService,
    private financeService: FinanceService,
  ) {}

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

    // Auto-generate initial class fee invoice
    if (classId) {
      try {
        await this.financeService.generateInvoiceForStudent(student.id, schoolId, {
          sessionId: activeSessionId,
          studentCategory: 'NEW_STUDENT',
          isInitialEnrollment: true,
        });
      } catch (err: any) {
        console.warn(`Initial invoice auto-generation for student ${dto.admissionNumber} skipped:`, err?.message || err);
      }
    }

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
    return this.findAllScoped(schoolId, null, query);
  }

  /**
   * EDN-003 fix: Role-scoped student listing.
   * - Super Admin: sees all students with full guardian info
   * - Teacher/Class Master: sees only students in their assigned classes,
   *   with minimal fields (no guardian phone/email PII unless they're admin)
   */
  async findAllScoped(
    schoolId: string,
    currentUser: any | null,
    query: PaginationDto & { status?: string; classId?: string },
  ) {
    const { search, sortBy, sortOrder, status, classId } = query;

    // Determine if the user is a super admin or has admin-level access
    const isSuperAdmin = currentUser?.isSuperAdmin === true;
    const hasAdminRole = isSuperAdmin || currentUser?.roles?.some(
      (r: any) => r.name === 'Super Admin' || r.name === 'Accountant'
    );

    // Build the where clause
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

    // EDN-003: For non-admin users (teachers), scope to assigned classes only
    if (!hasAdminRole && currentUser?.id) {
      // Get the user's assigned class IDs from TeacherAssignment
      const assignments = await this.prisma.teacherAssignment.findMany({
        where: { userId: currentUser.id, schoolId },
        select: { classId: true },
      });
      const assignedClassIds = assignments.map(a => a.classId);

      if (assignedClassIds.length > 0) {
        // Scope to only students in the teacher's assigned classes
        where.classEnrollments = {
          some: { classId: { in: assignedClassIds } },
        };
      } else {
        // Teacher with no assignments — return zero results (not all students)
        return paginate([], 0, query);
      }
    }

    // EDN-003: For non-admin users, exclude guardian PII (phone, email)
    const includeGuardians = hasAdminRole;

    const [students, total] = await Promise.all([
      this.prisma.student.findMany({
        where,
        skip: safeSkip(query),
        take: safeTake(query),
        orderBy: sortBy
          ? { [sortBy]: sortOrder || 'asc' }
          : { createdAt: 'desc' },
        include: {
          guardians: includeGuardians ? { take: 1 } : false,
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

    // EDN-003: For non-admin users, strip guardian PII from results
    if (!includeGuardians) {
      students.forEach(s => { delete (s as any).guardians; });
    }

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

  // ─── EDN-014 fix: Unassigned students ───────────────────────────────────────
  // Students with NO active ClassEnrollment in the current academic session.
  // Surfaces them in the admin UI so they can be bulk-assigned to a class.
  async findUnassigned(schoolId: string) {
    // Resolve the current academic session for this school
    const currentSession = await this.prisma.academicSession.findFirst({
      where: { schoolId, isCurrent: true },
      orderBy: { createdAt: 'desc' },
    }) || await this.prisma.academicSession.findFirst({
      where: { schoolId },
      orderBy: { createdAt: 'desc' },
    });

    if (!currentSession) {
      // No sessions exist → all students are "unassigned" by definition
      const all = await this.prisma.student.findMany({
        where: { schoolId, deletedAt: null },
        select: {
          id: true, admissionNumber: true, firstName: true, lastName: true,
          otherName: true, gender: true, status: true, dateOfBirth: true,
          photo: true, createdAt: true,
        },
        orderBy: { firstName: 'asc' },
      });
      return successResponse({ students: all, total: all.length, sessionId: null, sessionName: null });
    }

    // Students whose enrollment for the current session doesn't exist
    const enrolledStudentIds = await this.prisma.classEnrollment.findMany({
      where: { sessionId: currentSession.id, student: { schoolId, deletedAt: null } },
      select: { studentId: true },
    });
    const enrolledIdSet = new Set(enrolledStudentIds.map(e => e.studentId));

    const all = await this.prisma.student.findMany({
      where: { schoolId, deletedAt: null },
      select: {
        id: true, admissionNumber: true, firstName: true, lastName: true,
        otherName: true, gender: true, status: true, dateOfBirth: true,
        photo: true, createdAt: true,
      },
      orderBy: { firstName: 'asc' },
    });
    const unassigned = all.filter(s => !enrolledIdSet.has(s.id));

    return successResponse({
      students: unassigned,
      total: unassigned.length,
      sessionId: currentSession.id,
      sessionName: currentSession.name,
    });
  }

  // Bulk-assign many students to one class for the current session.
  // Used by the admin UI when a new term begins and students need to be
  // distributed into classes.
  async bulkAssignClass(
    schoolId: string,
    body: { studentIds: string[]; classId: string; sessionId?: string },
  ) {
    if (!body?.studentIds?.length) {
      throw new BadRequestException('studentIds is required and must be non-empty');
    }
    if (!body?.classId) {
      throw new BadRequestException('classId is required');
    }

    // Verify the class belongs to this school
    const cls = await this.prisma.class.findFirst({
      where: { id: body.classId, schoolId },
    });
    if (!cls) throw new BadRequestException('Class not found in this school');

    // Resolve target session (provided or current)
    const session = body.sessionId
      ? await this.prisma.academicSession.findFirst({ where: { id: body.sessionId, schoolId } })
      : await this.prisma.academicSession.findFirst({
          where: { schoolId, isCurrent: true },
          orderBy: { createdAt: 'desc' },
        }) || await this.prisma.academicSession.findFirst({
          where: { schoolId },
          orderBy: { createdAt: 'desc' },
        });
    if (!session) throw new BadRequestException('No academic session found. Create a session first.');

    // Verify all studentIds belong to this school
    const validStudents = await this.prisma.student.findMany({
      where: { id: { in: body.studentIds }, schoolId, deletedAt: null },
      select: { id: true },
    });
    const validIds = new Set(validStudents.map(s => s.id));
    const invalidIds = body.studentIds.filter(id => !validIds.has(id));
    if (invalidIds.length) {
      throw new BadRequestException(`${invalidIds.length} student(s) not found in this school`);
    }

    // Upsert enrollments (idempotent — re-assigning overwrites the class)
    const results = await this.prisma.$transaction(
      body.studentIds.map(studentId =>
        this.prisma.classEnrollment.upsert({
          where: { studentId_sessionId: { studentId, sessionId: session.id } },
          create: { studentId, classId: body.classId, sessionId: session.id },
          update: { classId: body.classId },
        })
      )
    );

    return successResponse(
      { assigned: results.length, classId: body.classId, className: cls.name, sessionId: session.id, sessionName: session.name },
      `${results.length} student(s) assigned to ${cls.name} for ${session.name} session`,
    );
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

    if (data.action === 'PROMOTED') {
      let targetClassId = data.targetClassId;
      const currentEnrollment = student.data?.classEnrollments?.[0];

      if (!targetClassId && currentEnrollment?.class) {
        const currentLevel = currentEnrollment.class.level;
        const nextClass = await this.prisma.class.findFirst({
          where: { schoolId, level: { gt: currentLevel } },
          orderBy: { level: 'asc' },
        });
        if (nextClass) {
          targetClassId = nextClass.id;
        } else {
          // If no higher class, student has reached completion
          const updated = await this.prisma.student.update({
            where: { id: studentId },
            data: { status: 'GRADUATED' },
          });
          return successResponse(updated, 'Student reached final grade level and graduated successfully');
        }
      }

      if (!targetClassId) {
        throw new BadRequestException('Target class must be specified to promote student');
      }

      // Verify target class belongs to same school
      const targetClass = await this.prisma.class.findFirst({
        where: { id: targetClassId, schoolId },
      });
      if (!targetClass) {
        throw new NotFoundException('Target class not found in this school');
      }
      // Close current enrollment and create new one for target class
      if (currentEnrollment) {
        await this.prisma.classEnrollment.update({
          where: { id: currentEnrollment.id },
          data: { isPromoted: true },
        });
      }
      const latestSession = await this.prisma.academicSession.findFirst({
        where: { schoolId, isCurrent: true },
      }) || await this.prisma.academicSession.findFirst({
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
          classId: targetClassId,
          sessionId,
        },
        include: { class: true },
      });
      await this.prisma.student.update({
        where: { id: studentId },
        data: { status: 'ACTIVE' },
      });
      return successResponse(enrollment, `Student promoted to ${targetClass.name}`);
    }

    if (data.action === 'REPEATED') {
      return successResponse(student.data, 'Student retained in current class');
    }

    return successResponse(student.data, 'No action taken');
  }
}
