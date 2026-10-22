import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { successResponse, PaginationDto, paginate } from '../common/dto/pagination.dto';

@Injectable()
export class AcademicService {
  constructor(private prisma: PrismaService) {}

  // ─── SESSIONS ────────────────────────────────────────────────────────────────

  async createSession(data: any, schoolId: string) {
    const existing = await this.prisma.academicSession.findFirst({
      where: { schoolId, name: data.name },
    });
    if (existing) throw new ConflictException('Session with this name already exists');

    const session = await this.prisma.academicSession.create({
      data: { ...data, schoolId, startDate: new Date(data.startDate), endDate: new Date(data.endDate) },
      include: { terms: true },
    });
    return successResponse(session, 'Academic session created');
  }

  async getSessions(schoolId: string) {
    const sessions = await this.prisma.academicSession.findMany({
      where: { schoolId },
      include: { terms: { orderBy: { startDate: 'asc' } } },
      orderBy: { startDate: 'desc' },
    });
    return successResponse(sessions);
  }

  async setCurrentSession(sessionId: string, schoolId: string) {
    await this.prisma.$transaction([
      this.prisma.academicSession.updateMany({ where: { schoolId }, data: { isCurrent: false } }),
      this.prisma.academicSession.update({ where: { id: sessionId }, data: { isCurrent: true } }),
    ]);
    return successResponse(null, 'Current session updated');
  }

  // ─── TERMS ───────────────────────────────────────────────────────────────────

  async createTerm(sessionId: string, data: any) {
    const session = await this.prisma.academicSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('Session not found');

    const term = await this.prisma.term.create({
      data: { ...data, sessionId, startDate: new Date(data.startDate), endDate: new Date(data.endDate) },
    });
    return successResponse(term, 'Term created');
  }

  async getTermsBySession(sessionId: string) {
    const terms = await this.prisma.term.findMany({
      where: { sessionId },
      orderBy: { startDate: 'asc' },
    });
    return successResponse(terms);
  }

  async setCurrentTerm(termId: string, sessionId: string) {
    await this.prisma.$transaction([
      this.prisma.term.updateMany({ where: { sessionId }, data: { isCurrent: false } }),
      this.prisma.term.update({ where: { id: termId }, data: { isCurrent: true } }),
    ]);
    return successResponse(null, 'Current term updated');
  }

  // ─── CLASSES ─────────────────────────────────────────────────────────────────

  async createClass(data: any, schoolId: string) {
    const name = data.name?.trim();
    if (!name) throw new BadRequestException('Class name is required');
    const section = data.section?.trim() || null;

    const existing = await this.prisma.class.findFirst({
      where: { schoolId, name, section },
    });
    if (existing) {
      throw new ConflictException(`Class '${name}'${section ? ` (${section})` : ''} already exists in this school`);
    }

    const cls = await this.prisma.class.create({
      data: {
        ...data,
        name,
        section,
        schoolId,
        level: Number(data.level),
        capacity: Number(data.capacity || 40),
      },
    });
    return successResponse(cls, 'Class created');
  }

  async getClasses(schoolId: string, query?: PaginationDto) {
    const currentSession = await this.prisma.academicSession.findFirst({
      where: { schoolId, isCurrent: true },
    }) || await this.prisma.academicSession.findFirst({
      where: { schoolId },
      orderBy: { createdAt: 'desc' },
    });

    const classes = await this.prisma.class.findMany({
      where: { schoolId, ...(query?.search && { name: { contains: query.search } }) },
      orderBy: [{ level: 'asc' }, { name: 'asc' }],
      include: {
        _count: {
          select: {
            classEnrollments: currentSession ? { where: { sessionId: currentSession.id } } : true,
          },
        },
      },
    });
    return successResponse(classes);
  }

  async updateClass(id: string, schoolId: string, data: any) {
    const cls = await this.prisma.class.findFirst({ where: { id, schoolId } });
    if (!cls) throw new NotFoundException('Class not found');

    if (data.name !== undefined || data.section !== undefined) {
      const name = data.name !== undefined ? data.name.trim() : cls.name;
      const section = data.section !== undefined ? (data.section?.trim() || null) : cls.section;
      const existing = await this.prisma.class.findFirst({
        where: {
          schoolId,
          name,
          section,
          id: { not: id },
        },
      });
      if (existing) {
        throw new ConflictException(`Class '${name}'${section ? ` (${section})` : ''} already exists in this school`);
      }
    }

    const updated = await this.prisma.class.update({ where: { id }, data });
    return successResponse(updated, 'Class updated');
  }

  async deleteClass(id: string, schoolId: string) {
    const cls = await this.prisma.class.findFirst({ where: { id, schoolId } });
    if (!cls) throw new NotFoundException('Class not found');
    await this.prisma.class.delete({ where: { id } });
    return successResponse(null, 'Class deleted');
  }

  // ─── SUBJECTS ────────────────────────────────────────────────────────────────

  async createSubject(data: any, schoolId: string) {
    const subject = await this.prisma.subject.create({
      data: { ...data, schoolId, isCore: data.isCore === 'true' || data.isCore === true },
    });
    return successResponse(subject, 'Subject created');
  }

  async getSubjects(schoolId: string) {
    const subjects = await this.prisma.subject.findMany({
      where: { schoolId },
      orderBy: [{ isCore: 'desc' }, { name: 'asc' }],
    });
    return successResponse(subjects);
  }

  async updateSubject(id: string, schoolId: string, data: any) {
    const subject = await this.prisma.subject.findFirst({ where: { id, schoolId } });
    if (!subject) throw new NotFoundException('Subject not found');
    const updated = await this.prisma.subject.update({ where: { id }, data });
    return successResponse(updated, 'Subject updated');
  }

  // ─── ENROLLMENT ──────────────────────────────────────────────────────────────

  async enrollStudent(data: { studentId: string; classId: string; sessionId: string }, schoolId: string) {
    const student = await this.prisma.student.findFirst({ where: { id: data.studentId, schoolId } });
    if (!student) throw new NotFoundException('Student not found');

    const enrollment = await this.prisma.classEnrollment.upsert({
      where: { studentId_sessionId: { studentId: data.studentId, sessionId: data.sessionId } },
      create: { studentId: data.studentId, classId: data.classId, sessionId: data.sessionId },
      update: { classId: data.classId },
      include: { class: true, session: true },
    });
    return successResponse(enrollment, 'Student enrolled');
  }

  async getClassEnrollments(classId: string, sessionId: string) {
    const enrollments = await this.prisma.classEnrollment.findMany({
      where: { classId, sessionId },
      include: { student: { include: { guardians: { take: 1 } } }, class: true },
      orderBy: { student: { firstName: 'asc' } },
    });
    return successResponse(enrollments);
  }

  async promoteStudents(fromClassId: string, toClassId: string, sessionId: string, schoolId: string) {
    const enrollments = await this.prisma.classEnrollment.findMany({
      where: { classId: fromClassId, sessionId },
    });

    const nextSession = await this.prisma.academicSession.findFirst({
      where: { schoolId, startDate: { gt: new Date() } },
      orderBy: { startDate: 'asc' },
    });

    if (!nextSession) throw new NotFoundException('No upcoming session found for promotion');

    const promotions = await this.prisma.$transaction(
      enrollments.map((e) =>
        this.prisma.classEnrollment.upsert({
          where: { studentId_sessionId: { studentId: e.studentId, sessionId: nextSession.id } },
          create: { studentId: e.studentId, classId: toClassId, sessionId: nextSession.id, isPromoted: true },
          update: { classId: toClassId, isPromoted: true },
        }),
      ),
    );

    return successResponse(promotions, `${promotions.length} students promoted`);
  }
}
