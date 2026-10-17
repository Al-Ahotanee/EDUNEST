import { Injectable, NotFoundException, ConflictException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { successResponse } from '../common/dto/pagination.dto';
import { ResultStatus, TeacherRoleType } from '@prisma/client';

export const DEFAULT_GRADE_SCALES = [
  { minScore: 75, maxScore: 100, grade: 'A1', gradePoint: 5.0, remark: 'Excellent' },
  { minScore: 70, maxScore: 74.99, grade: 'B2', gradePoint: 4.5, remark: 'Very Good' },
  { minScore: 65, maxScore: 69.99, grade: 'B3', gradePoint: 4.0, remark: 'Good' },
  { minScore: 60, maxScore: 64.99, grade: 'C4', gradePoint: 3.5, remark: 'Credit' },
  { minScore: 55, maxScore: 59.99, grade: 'C5', gradePoint: 3.0, remark: 'Credit' },
  { minScore: 50, maxScore: 54.99, grade: 'C6', gradePoint: 2.5, remark: 'Credit' },
  { minScore: 45, maxScore: 49.99, grade: 'D7', gradePoint: 2.0, remark: 'Pass' },
  { minScore: 40, maxScore: 44.99, grade: 'E8', gradePoint: 1.5, remark: 'Pass' },
  { minScore: 0, maxScore: 39.99, grade: 'F9', gradePoint: 0.0, remark: 'Fail' },
];

@Injectable()
export class ResultsService {
  constructor(private prisma: PrismaService) {}

  // ─── HELPER: GRADE CALCULATION ───────────────────────────────────────────────
  async resolveGrade(score: number, schoolId: string) {
    const scales = await this.prisma.gradingScale.findMany({
      where: { schoolId },
      orderBy: { minScore: 'desc' },
    });

    const activeScales = scales.length > 0 ? scales : DEFAULT_GRADE_SCALES;
    const rounded = Math.round(score * 100) / 100;
    const match = activeScales.find((s) => rounded >= s.minScore && rounded <= s.maxScore);

    if (match) {
      return { grade: match.grade, remark: match.remark, gradePoint: match.gradePoint ?? null };
    }
    return rounded >= 50
      ? { grade: 'C6', remark: 'Credit', gradePoint: 2.5 }
      : { grade: 'F9', remark: 'Fail', gradePoint: 0.0 };
  }

  // ─── HELPER: RBAC ACCESS VERIFICATION ────────────────────────────────────────
  async checkTeacherAccess(
    user: any,
    schoolId: string,
    classId: string,
    subjectId?: string,
    action: 'view' | 'edit' | 'submit' | 'approve' | 'publish' = 'view',
  ) {
    if (user.isSuperAdmin) return { isPrivileged: true, role: 'SUPER_ADMIN' };

    const roleNames = (user.roles || []).map((r: any) => (r.name || '').toLowerCase());
    const isPrivileged = roleNames.some((n: string) =>
      ['admin', 'school admin', 'principal', 'proprietor', 'head of school', 'director'].some(title => n.includes(title)),
    );

    if (isPrivileged) {
      return { isPrivileged: true, role: 'ADMIN' };
    }

    if (action === 'approve' || action === 'publish') {
      throw new ForbiddenException('Only the School Admin or Principal has authority to approve or publish results.');
    }

    // Look up Teacher Assignments for this specific user
    const assignments = await this.prisma.teacherAssignment.findMany({
      where: { schoolId, userId: user.id, classId },
    });

    const isClassMaster = assignments.some(
      (a) => a.roleType === TeacherRoleType.CLASS_MASTER || (!a.subjectId && (a.roleType as string) === 'CLASS_MASTER'),
    );

    if (isClassMaster) {
      return { isPrivileged: false, isClassMaster: true, role: 'CLASS_MASTER' };
    }

    if (subjectId) {
      const hasSubject = assignments.some((a) => a.subjectId === subjectId);
      if (hasSubject) {
        return { isPrivileged: false, isClassMaster: false, role: 'SUBJECT_TEACHER' };
      }
    }

    // Graceful onboarding fallback: If the school has zero assignments configured yet, allow teachers access
    const totalAssignments = await this.prisma.teacherAssignment.count({ where: { schoolId, classId } });
    const isTeacher = roleNames.some((n: string) => n.includes('teacher') || n.includes('staff'));
    if (isTeacher && totalAssignments === 0) {
      return { isPrivileged: false, isClassMaster: false, role: 'TEACHER' };
    }

    throw new ForbiddenException('Access denied: You are not assigned to manage results for this class or subject.');
  }

  // ─── 1. TEACHER ASSIGNMENTS CRUD ─────────────────────────────────────────────
  async getTeacherAssignments(schoolId: string, userId?: string) {
    const where: any = { schoolId };
    if (userId) where.userId = userId;

    const assignments = await this.prisma.teacherAssignment.findMany({
      where,
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        class: { select: { id: true, name: true, section: true } },
        subject: { select: { id: true, name: true, code: true } },
      },
      orderBy: [{ class: { name: 'asc' } }, { roleType: 'asc' }],
    });
    return successResponse(assignments);
  }

  async getMyAssignments(user: any, schoolId: string) {
    if (user.isSuperAdmin) {
      return successResponse({ isPrivileged: true, assignments: [], isClassMaster: true });
    }
    const roleNames = (user.roles || []).map((r: any) => (r.name || '').toLowerCase());
    const isPrivileged = roleNames.some((n: string) =>
      ['admin', 'school admin', 'principal', 'proprietor', 'head of school', 'director'].some(title => n.includes(title)),
    );

    const assignments = await this.prisma.teacherAssignment.findMany({
      where: { schoolId, userId: user.id },
      include: {
        class: { select: { id: true, name: true, section: true } },
        subject: { select: { id: true, name: true, code: true } },
      },
    });

    return successResponse({
      isPrivileged,
      assignments,
      isClassMaster: isPrivileged || assignments.some((a) => a.roleType === TeacherRoleType.CLASS_MASTER),
    });
  }

  async assignTeacher(
    data: { userId: string; classId: string; subjectId?: string; roleType: TeacherRoleType },
    schoolId: string,
  ) {
    const { userId, classId, subjectId = null, roleType } = data;

    const existing = await this.prisma.teacherAssignment.findFirst({
      where: {
        userId,
        classId,
        subjectId: subjectId || null,
      },
    });

    let assignment;
    if (existing) {
      assignment = await this.prisma.teacherAssignment.update({
        where: { id: existing.id },
        data: { roleType },
        include: {
          user: { select: { firstName: true, lastName: true, email: true } },
          class: true,
          subject: true,
        },
      });
    } else {
      assignment = await this.prisma.teacherAssignment.create({
        data: {
          schoolId,
          userId,
          classId,
          subjectId: subjectId || null,
          roleType,
        },
        include: {
          user: { select: { firstName: true, lastName: true, email: true } },
          class: true,
          subject: true,
        },
      });
    }

    return successResponse(assignment, 'Teacher assigned successfully');
  }

  async deleteTeacherAssignment(id: string, schoolId: string) {
    await this.prisma.teacherAssignment.deleteMany({
      where: { id, schoolId },
    });
    return successResponse(null, 'Assignment deleted successfully');
  }

  // ─── 2. SPREADSHEET MATRIX SCORE ENTRY ───────────────────────────────────────
  async getScoreMatrix(
    classId: string,
    subjectId: string,
    termId: string,
    schoolId: string,
    user: any,
  ) {
    await this.checkTeacherAccess(user, schoolId, classId, subjectId, 'view');

    const [classData, subjectData, termData] = await Promise.all([
      this.prisma.class.findUnique({ where: { id: classId } }),
      this.prisma.subject.findUnique({ where: { id: subjectId } }),
      this.prisma.term.findUnique({ where: { id: termId }, include: { session: true } }),
    ]);

    if (!classData || !subjectData || !termData) {
      throw new NotFoundException('Class, Subject, or Term not found');
    }

    // Fetch enrolled students for this class
    const enrollments = await this.prisma.classEnrollment.findMany({
      where: { classId, student: { schoolId } },
      include: {
        student: {
          select: {
            id: true,
            admissionNumber: true,
            firstName: true,
            lastName: true,
            otherName: true,
            gender: true,
            photo: true,
          },
        },
      },
      orderBy: [{ student: { lastName: 'asc' } }, { student: { firstName: 'asc' } }],
    });

    // Fetch existing results for this subject and term
    const studentIds = enrollments.map((e) => e.student.id);
    const existingResults = await this.prisma.result.findMany({
      where: {
        subjectId,
        termId,
        studentId: { in: studentIds },
      },
    });

    const resultMap = new Map(existingResults.map((r) => [r.studentId, r]));

    // Determine overall submission status for this subject matrix
    let matrixStatus: ResultStatus = ResultStatus.DRAFT;
    if (existingResults.length > 0) {
      if (existingResults.every((r) => r.status === ResultStatus.PUBLISHED)) {
        matrixStatus = ResultStatus.PUBLISHED;
      } else if (existingResults.every((r) => r.status === ResultStatus.APPROVED || r.status === ResultStatus.PUBLISHED)) {
        matrixStatus = ResultStatus.APPROVED;
      } else if (existingResults.some((r) => r.status === ResultStatus.SUBMITTED)) {
        matrixStatus = ResultStatus.SUBMITTED;
      }
    }

    const rows = enrollments.map((e) => {
      const student = e.student;
      const res = resultMap.get(student.id);
      return {
        studentId: student.id,
        admissionNumber: student.admissionNumber,
        name: `${student.lastName}, ${student.firstName} ${student.otherName || ''}`.trim(),
        gender: student.gender,
        photo: student.photo,
        ca1Score: res?.ca1Score ?? 0,
        ca2Score: res?.ca2Score ?? 0,
        ca3Score: res?.ca3Score ?? 0,
        examScore: res?.examScore ?? 0,
        totalScore: res?.totalScore ?? 0,
        grade: res?.grade ?? '—',
        remark: res?.remark ?? '—',
        position: res?.position ?? null,
        status: res?.status ?? ResultStatus.DRAFT,
        isApproved: res?.isApproved ?? false,
      };
    });

    return successResponse({
      class: classData,
      subject: subjectData,
      term: termData,
      matrixStatus,
      isLocked: matrixStatus === ResultStatus.PUBLISHED,
      students: rows,
    });
  }

  async saveScoreMatrix(
    data: {
      classId: string;
      subjectId: string;
      termId: string;
      scores: Array<{
        studentId: string;
        ca1Score?: number;
        ca2Score?: number;
        ca3Score?: number;
        examScore?: number;
      }>;
      submitForApproval?: boolean;
    },
    schoolId: string,
    user: any,
  ) {
    const { classId, subjectId, termId, scores, submitForApproval = false } = data;
    const access = await this.checkTeacherAccess(user, schoolId, classId, subjectId, submitForApproval ? 'submit' : 'edit');

    // ─── IMMUTABILITY CHECK ───────────────────────────────────────────────────
    const existingPublished = await this.prisma.result.count({
      where: {
        subjectId,
        termId,
        student: { classEnrollments: { some: { classId } } },
        status: ResultStatus.PUBLISHED,
      },
    });

    if (existingPublished > 0 && !access.isPrivileged) {
      throw new ForbiddenException(
        'Results for this subject are PUBLISHED and locked against modification. Only the Principal or School Administrator can make revisions.',
      );
    }

    const targetStatus = submitForApproval
      ? ResultStatus.SUBMITTED
      : access.isPrivileged
      ? ResultStatus.APPROVED
      : ResultStatus.DRAFT;

    // ─── SCORE VALIDATION (per Nigerian CA convention: 20/20/20/40 = 100) ──────
    const MAX_CA = 20;
    const MAX_EXAM = 40;
    const validatedScores = scores.map((item, idx) => {
      const ca1 = Number(item.ca1Score) || 0;
      const ca2 = Number(item.ca2Score) || 0;
      const ca3 = Number(item.ca3Score) || 0;
      const exam = Number(item.examScore) || 0;
      if (ca1 < 0 || ca2 < 0 || ca3 < 0 || exam < 0) {
        throw new BadRequestException(`Row ${idx + 1}: Scores cannot be negative`);
      }
      if (ca1 > MAX_CA) {
        throw new BadRequestException(`Row ${idx + 1}: CA1 score ${ca1} exceeds maximum of ${MAX_CA}`);
      }
      if (ca2 > MAX_CA) {
        throw new BadRequestException(`Row ${idx + 1}: CA2 score ${ca2} exceeds maximum of ${MAX_CA}`);
      }
      if (ca3 > MAX_CA) {
        throw new BadRequestException(`Row ${idx + 1}: CA3 score ${ca3} exceeds maximum of ${MAX_CA}`);
      }
      if (exam > MAX_EXAM) {
        throw new BadRequestException(`Row ${idx + 1}: Exam score ${exam} exceeds maximum of ${MAX_EXAM}`);
      }
      return { ...item, ca1, ca2, ca3, exam };
    });

    const updatedResults = await Promise.all(
      validatedScores.map(async (item) => {
        const ca1 = item.ca1;
        const ca2 = item.ca2;
        const ca3 = item.ca3;
        const exam = item.exam;
        const total = ca1 + ca2 + ca3 + exam;

        const { grade, remark } = await this.resolveGrade(total, schoolId);

        return this.prisma.result.upsert({
          where: {
            studentId_subjectId_termId: {
              studentId: item.studentId,
              subjectId,
              termId,
            },
          },
          create: {
            studentId: item.studentId,
            subjectId,
            termId,
            ca1Score: ca1,
            ca2Score: ca2,
            ca3Score: ca3,
            examScore: exam,
            totalScore: total,
            grade,
            remark,
            status: targetStatus,
            submittedBy: submitForApproval ? user.id : undefined,
            submittedAt: submitForApproval ? new Date() : undefined,
          },
          update: {
            ca1Score: ca1,
            ca2Score: ca2,
            ca3Score: ca3,
            examScore: exam,
            totalScore: total,
            grade,
            remark,
            status: targetStatus,
            submittedBy: submitForApproval ? user.id : undefined,
            submittedAt: submitForApproval ? new Date() : undefined,
          },
        });
      }),
    );

    // Recalculate subject positions for this class
    await this.recalculatePositions(subjectId, termId);

    const msg = submitForApproval
      ? 'Scores saved and submitted to the Principal for formal approval.'
      : 'Scores saved successfully in draft.';

    return successResponse({ count: updatedResults.length, status: targetStatus }, msg);
  }

  // ─── 3. APPROVAL & PUBLISHING PIPELINE ───────────────────────────────────────
  async getApprovalPipelineOverview(termId: string, schoolId: string) {
    if (!schoolId) {
      const term = await this.prisma.term.findUnique({
        where: { id: termId },
        include: { session: true },
      });
      schoolId = term?.session?.schoolId || '';
    }

    const classes = await this.prisma.class.findMany({
      where: { schoolId },
      include: {
        teacherAssignments: {
          where: { roleType: TeacherRoleType.CLASS_MASTER },
          include: { user: { select: { firstName: true, lastName: true } } },
        },
      },
      orderBy: { level: 'asc' },
    });

    const subjects = await this.prisma.subject.findMany({
      where: { schoolId },
      orderBy: { name: 'asc' },
    });

    const pipeline = await Promise.all(
      classes.map(async (cls) => {
        const enrollmentsCount = await this.prisma.classEnrollment.count({
          where: { classId: cls.id, student: { schoolId } },
        });

        // Get count of results per status for this class
        const results = await this.prisma.result.findMany({
          where: {
            termId,
            student: { classEnrollments: { some: { classId: cls.id } } },
          },
          select: { id: true, subjectId: true, status: true },
        });

        const drafts = results.filter((r) => r.status === ResultStatus.DRAFT).length;
        const submitted = results.filter((r) => r.status === ResultStatus.SUBMITTED).length;
        const approved = results.filter((r) => r.status === ResultStatus.APPROVED).length;
        const published = results.filter((r) => r.status === ResultStatus.PUBLISHED).length;

        // Breakdown per subject
        const subjectStatus = subjects.map((sub) => {
          const subResults = results.filter((r) => r.subjectId === sub.id);
          let status: ResultStatus = ResultStatus.DRAFT;
          if (subResults.length > 0) {
            if (subResults.every((r) => r.status === ResultStatus.PUBLISHED)) status = ResultStatus.PUBLISHED;
            else if (subResults.every((r) => r.status === ResultStatus.APPROVED)) status = ResultStatus.APPROVED;
            else if (subResults.some((r) => r.status === ResultStatus.SUBMITTED)) status = ResultStatus.SUBMITTED;
          }
          return {
            subjectId: sub.id,
            subjectName: sub.name,
            totalRecorded: subResults.length,
            status,
          };
        });

        const classMaster = cls.teacherAssignments[0]?.user;

        return {
          classId: cls.id,
          className: cls.name,
          section: cls.section,
          classMasterName: classMaster ? `${classMaster.firstName} ${classMaster.lastName}` : 'Unassigned',
          enrolledStudents: enrollmentsCount,
          totalResults: results.length,
          drafts,
          submitted,
          approved,
          published,
          subjects: subjectStatus,
        };
      }),
    );

    return successResponse(pipeline);
  }

  async approveScores(
    data: { termId: string; classId?: string; subjectId?: string },
    schoolId: string,
    user: any,
  ) {
    if (!schoolId && data.termId) {
      const term = await this.prisma.term.findUnique({
        where: { id: data.termId },
        include: { session: true },
      });
      schoolId = term?.session?.schoolId || '';
    }

    await this.checkTeacherAccess(user, schoolId, data.classId || '', data.subjectId, 'approve');

    const where: any = {
      termId: data.termId,
      student: { schoolId },
    };

    if (data.classId) {
      where.student.classEnrollments = { some: { classId: data.classId } };
    }
    if (data.subjectId) {
      where.subjectId = data.subjectId;
    }

    const updated = await this.prisma.result.updateMany({
      where,
      data: {
        status: ResultStatus.APPROVED,
        isApproved: true,
        approvedBy: user.id,
        approvedAt: new Date(),
      },
    });

    if (data.classId) {
      await this.prisma.termReportCard.updateMany({
        where: { termId: data.termId, classId: data.classId, schoolId },
        data: {
          status: ResultStatus.APPROVED,
          approvedBy: user.id,
          approvedAt: new Date(),
        },
      });
    }

    return successResponse(null, `${updated.count} results officially approved by Principal.`);
  }

  async publishScores(
    data: { termId: string; classId?: string; subjectId?: string },
    schoolId: string,
    user: any,
  ) {
    if (!schoolId && data.termId) {
      const term = await this.prisma.term.findUnique({
        where: { id: data.termId },
        include: { session: true },
      });
      schoolId = term?.session?.schoolId || '';
    }

    await this.checkTeacherAccess(user, schoolId, data.classId || '', data.subjectId, 'publish');

    const where: any = {
      termId: data.termId,
      student: { schoolId },
    };

    if (data.classId) {
      where.student.classEnrollments = { some: { classId: data.classId } };
    }
    if (data.subjectId) {
      where.subjectId = data.subjectId;
    }

    const updated = await this.prisma.result.updateMany({
      where,
      data: {
        status: ResultStatus.PUBLISHED,
        isApproved: true,
        publishedBy: user.id,
        publishedAt: new Date(),
      },
    });

    if (data.classId) {
      await this.prisma.termReportCard.updateMany({
        where: { termId: data.termId, classId: data.classId, schoolId },
        data: {
          status: ResultStatus.PUBLISHED,
          publishedBy: user.id,
          publishedAt: new Date(),
        },
      });
    }

    return successResponse(
      null,
      `Results published officially. Scores are now locked from editing and visible to parents.`,
    );
  }

  async unpublishScores(
    data: { termId: string; classId: string; subjectId?: string; reason?: string },
    schoolId: string,
    user: any,
  ) {
    await this.checkTeacherAccess(user, schoolId, data.classId, data.subjectId, 'publish');

    const where: any = {
      termId: data.termId,
      student: { schoolId, classEnrollments: { some: { classId: data.classId } } },
    };
    if (data.subjectId) {
      where.subjectId = data.subjectId;
    }

    await this.prisma.result.updateMany({
      where,
      data: {
        status: ResultStatus.DRAFT,
      },
    });

    await this.prisma.termReportCard.updateMany({
      where: { termId: data.termId, classId: data.classId, schoolId },
      data: { status: ResultStatus.DRAFT },
    });

    return successResponse(
      null,
      `Results unlocked and reverted to DRAFT. Authorized teachers may now make revisions.`,
    );
  }

  // ─── 4. MASTER CLASS BROADSHEET ──────────────────────────────────────────────
  async getClassBroadsheet(classId: string, termId: string, schoolId: string, user: any) {
    await this.checkTeacherAccess(user, schoolId, classId, undefined, 'view');

    const [classData, termData, subjects] = await Promise.all([
      this.prisma.class.findUnique({
        where: { id: classId },
        include: {
          teacherAssignments: {
            where: { roleType: TeacherRoleType.CLASS_MASTER },
            include: { user: { select: { firstName: true, lastName: true } } },
          },
        },
      }),
      this.prisma.term.findUnique({
        where: { id: termId },
        include: { session: true },
      }),
      this.prisma.subject.findMany({
        where: { schoolId },
        orderBy: { name: 'asc' },
      }),
    ]);

    if (!classData || !termData) {
      throw new NotFoundException('Class or Term not found');
    }

    const enrollments = await this.prisma.classEnrollment.findMany({
      where: { classId, student: { schoolId } },
      include: {
        student: {
          include: {
            results: {
              where: { termId },
              include: { subject: true },
            },
            termReportCards: {
              where: { termId },
              take: 1,
            },
          },
        },
      },
      orderBy: [{ student: { lastName: 'asc' } }, { student: { firstName: 'asc' } }],
    });

    const activeSubjects = subjects.filter((sub) =>
      enrollments.some((e) => e.student.results.some((r) => r.subjectId === sub.id)),
    );

    // Calculate student aggregated rows
    const studentRows = enrollments.map((e) => {
      const student = e.student;
      const reportCard = student.termReportCards[0];
      const subjectScoresMap = new Map(student.results.map((r) => [r.subjectId, r]));

      const studentSubjects = activeSubjects.map((sub) => {
        const res = subjectScoresMap.get(sub.id);
        return {
          subjectId: sub.id,
          subjectCode: sub.code,
          caTotal: res ? (res.ca1Score || 0) + (res.ca2Score || 0) + (res.ca3Score || 0) : null,
          examScore: res?.examScore ?? null,
          totalScore: res?.totalScore ?? null,
          grade: res?.grade ?? '—',
          status: res?.status ?? ResultStatus.DRAFT,
        };
      });

      const recordedResults = student.results.filter((r) => r.totalScore !== null);
      const totalScore = recordedResults.reduce((sum, r) => sum + (r.totalScore || 0), 0);
      const averageScore = recordedResults.length > 0 ? totalScore / recordedResults.length : 0;

      return {
        studentId: student.id,
        admissionNumber: student.admissionNumber,
        name: `${student.lastName}, ${student.firstName} ${student.otherName || ''}`.trim(),
        gender: student.gender,
        subjects: studentSubjects,
        totalObtained: Math.round(totalScore * 10) / 10,
        averageScore: Math.round(averageScore * 100) / 100,
        subjectsCount: recordedResults.length,
        position: 0,
        promotionStatus: reportCard?.promotionStatus || 'PENDING',
        status: reportCard?.status || (student.results[0]?.status ?? ResultStatus.DRAFT),
      };
    });

    // Rank positions
    studentRows.sort((a, b) => b.totalObtained - a.totalObtained);
    studentRows.forEach((row, idx) => {
      row.position = idx + 1;
    });

    // Compute subject statistics
    const subjectStats = activeSubjects.map((sub) => {
      const allSubScores = enrollments
        .map((e) => e.student.results.find((r) => r.subjectId === sub.id)?.totalScore)
        .filter((s): s is number => typeof s === 'number');

      const highest = allSubScores.length > 0 ? Math.max(...allSubScores) : 0;
      const lowest = allSubScores.length > 0 ? Math.min(...allSubScores) : 0;
      const avg = allSubScores.length > 0 ? allSubScores.reduce((a, b) => a + b, 0) / allSubScores.length : 0;
      const passCount = allSubScores.filter((s) => s >= 50).length;

      return {
        subjectId: sub.id,
        name: sub.name,
        code: sub.code,
        highestScore: Math.round(highest * 10) / 10,
        lowestScore: Math.round(lowest * 10) / 10,
        averageScore: Math.round(avg * 100) / 100,
        passRate: allSubScores.length > 0 ? Math.round((passCount / allSubScores.length) * 100) : 0,
      };
    });

    const classMaster = classData.teacherAssignments[0]?.user;

    return successResponse({
      class: {
        id: classData.id,
        name: classData.name,
        section: classData.section,
        classMasterName: classMaster ? `${classMaster.firstName} ${classMaster.lastName}` : 'Unassigned',
      },
      term: {
        id: termData.id,
        name: termData.name,
        sessionName: termData.session?.name,
      },
      subjects: activeSubjects,
      students: studentRows,
      subjectStats,
      classSize: studentRows.length,
      classAverage:
        studentRows.length > 0
          ? Math.round(
              (studentRows.reduce((sum, s) => sum + s.averageScore, 0) / studentRows.length) * 100,
            ) / 100
          : 0,
    });
  }

  // ─── 5. OFFICIAL REPORT CARD & ENDORSEMENT ───────────────────────────────────
  async generateReportCard(studentId: string, termId: string, schoolId: string) {
    const student = await this.prisma.student.findFirst({
      where: { id: studentId, schoolId },
      include: {
        guardians: true,
      },
    });
    if (!student) throw new NotFoundException('Student not found');

    const [term, school] = await Promise.all([
      this.prisma.term.findUnique({
        where: { id: termId },
        include: { session: true },
      }),
      this.prisma.school.findUnique({
        where: { id: schoolId },
        include: { tenant: true },
      }),
    ]);
    if (!term || !school) throw new NotFoundException('Term or School not found');

    const enrollment = await this.prisma.classEnrollment.findFirst({
      where: { studentId, sessionId: term.sessionId },
      include: { class: true },
    });

    const classId = enrollment?.classId;

    // Fetch all student results for this term
    const results = await this.prisma.result.findMany({
      where: { studentId, termId },
      include: { subject: true },
      orderBy: { subject: { name: 'asc' } },
    });

    // Compute subject statistics (Highest, Lowest, Average, Position in Subject) for all classmates
    let classStudentsResults: any[] = [];
    let classSize = 1;
    if (classId) {
      classStudentsResults = await this.prisma.result.findMany({
        where: {
          termId,
          student: { classEnrollments: { some: { classId } } },
        },
      });
      classSize = await this.prisma.classEnrollment.count({
        where: { classId, student: { schoolId } },
      });
    }

    // Enhance each subject result with class performance analytics
    const enrichedResults = results.map((r) => {
      const allClassScores = classStudentsResults
        .filter((cr) => cr.subjectId === r.subjectId && cr.totalScore !== null)
        .map((cr) => cr.totalScore as number);

      const classHighest = allClassScores.length > 0 ? Math.max(...allClassScores) : r.totalScore || 0;
      const classLowest = allClassScores.length > 0 ? Math.min(...allClassScores) : r.totalScore || 0;
      const classAverage =
        allClassScores.length > 0
          ? Math.round((allClassScores.reduce((a, b) => a + b, 0) / allClassScores.length) * 10) / 10
          : r.totalScore || 0;

      // Subject ranking
      allClassScores.sort((a, b) => b - a);
      const subjectPosition = allClassScores.indexOf(r.totalScore || 0) + 1;

      return {
        ...r,
        classHighest,
        classLowest,
        classAverage,
        subjectPosition: subjectPosition > 0 ? subjectPosition : null,
      };
    });

    // Term Report Card record (Affective, Psychomotor, Remarks, Attendance)
    const reportCardRecord = await this.prisma.termReportCard.findUnique({
      where: { studentId_termId: { studentId, termId } },
    });

    // Attendance computation
    const attendanceRecords = await this.prisma.attendance.findMany({
      where: { studentId, termId },
    });
    const totalDaysRecorded = attendanceRecords.length;
    const daysPresent = attendanceRecords.filter((a) => a.status === 'PRESENT' || a.status === 'LATE').length;
    const daysAbsent = attendanceRecords.filter((a) => a.status === 'ABSENT').length;

    // Overall student aggregates
    const totalObtained = results.reduce((sum, r) => sum + (r.totalScore || 0), 0);
    const totalObtainable = results.length * 100;
    const studentAverage = results.length > 0 ? Math.round((totalObtained / results.length) * 100) / 100 : 0;
    const { grade: overallGrade, remark: overallRemark } = await this.resolveGrade(studentAverage, schoolId);

    // Compute overall position in class
    let classPosition: number | null = null;
    if (classId) {
      const broadsheet = await this.getClassBroadsheet(classId, termId, schoolId, { isSuperAdmin: true });
      const found = broadsheet.data.students.find((s: any) => s.studentId === studentId);
      if (found) classPosition = found.position;
    }

    // Default institutional affective domain ratings
    const defaultAffective = {
      punctuality: 4,
      neatness: 5,
      politeness: 5,
      honesty: 4,
      leadership: 4,
      attentiveness: 4,
      cooperation: 5,
      emotionalStability: 4,
    };

    // Default institutional psychomotor domain ratings
    const defaultPsychomotor = {
      handwriting: 4,
      sports: 4,
      crafts: 4,
      publicSpeaking: 3,
      toolsHandling: 4,
    };

    return successResponse({
      school: {
        id: school.id,
        name: school.name,
        code: school.code,
        type: school.type,
        address: school.address,
        phone: school.phone,
        email: school.email,
        logo: school.logo || school.tenant?.logo || null,
        motto: school.motto || school.tenant?.motto || 'Knowledge, Integrity, and Excellence',
        website: school.website || 'https://edunest.edu',
        principalSignature: school.principalSignature || null,
        stampSeal: school.stampSeal || null,
      },
      student: {
        id: student.id,
        admissionNumber: student.admissionNumber,
        firstName: student.firstName,
        lastName: student.lastName,
        otherName: student.otherName,
        fullName: `${student.lastName}, ${student.firstName} ${student.otherName || ''}`.trim(),
        gender: student.gender,
        dateOfBirth: student.dateOfBirth,
        bloodGroup: student.bloodGroup,
        genotype: student.genotype,
        photo: student.photo,
        class: enrollment?.class?.name || '—',
        section: enrollment?.class?.section || 'A',
      },
      term: {
        id: term.id,
        name: term.name,
        sessionName: term.session?.name,
      },
      attendance: {
        daysOpened: reportCardRecord?.attendanceDaysTotal || (totalDaysRecorded > 0 ? totalDaysRecorded : 110),
        daysPresent: reportCardRecord?.attendanceDaysPresent || (daysPresent > 0 ? daysPresent : 106),
        daysAbsent: reportCardRecord?.attendanceDaysAbsent || (daysAbsent > 0 ? daysAbsent : 4),
      },
      results: enrichedResults,
      academicSummary: {
        totalSubjects: results.length,
        totalObtained: Math.round(totalObtained * 10) / 10,
        totalObtainable,
        studentAverage,
        overallGrade,
        overallRemark,
        classPosition: classPosition || 1,
        classSize: classSize || 1,
        promotionStatus: reportCardRecord?.promotionStatus || (studentAverage >= 50 ? 'PROMOTED' : 'PENDING'),
      },
      affectiveDomain: reportCardRecord?.affectiveRatings || defaultAffective,
      psychomotorDomain: reportCardRecord?.psychomotorRatings || defaultPsychomotor,
      endorsements: {
        classTeacherRemark:
          reportCardRecord?.classTeacherRemark ||
          (studentAverage >= 70
            ? 'A very brilliant and exemplary performance. Consistently attentive and studious.'
            : studentAverage >= 50
            ? 'Satisfactory result with commendable potential. Encouraged to focus more on analytical subjects.'
            : 'Needs closer supervision and academic support to meet termly benchmarks.'),
        principalRemark:
          reportCardRecord?.principalRemark ||
          (studentAverage >= 70
            ? 'Outstanding termly achievement. Approved for honors list.'
            : studentAverage >= 50
            ? 'Good academic progress. Maintain this positive dedication next term.'
            : 'Academic conference with guardians recommended.'),
        nextTermResumption:
          reportCardRecord?.nextTermResumption || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
      status: reportCardRecord?.status || (results[0]?.status ?? ResultStatus.DRAFT),
    });
  }

  async endorseReportCard(
    data: {
      studentId: string;
      termId: string;
      classId: string;
      attendanceDaysTotal?: number;
      attendanceDaysPresent?: number;
      attendanceDaysAbsent?: number;
      classTeacherRemark?: string;
      principalRemark?: string;
      nextTermResumption?: string;
      promotionStatus?: string;
      affectiveRatings?: Record<string, number>;
      psychomotorRatings?: Record<string, number>;
    },
    schoolId: string,
    user: any,
  ) {
    await this.checkTeacherAccess(user, schoolId, data.classId, undefined, 'edit');

    const reportCard = await this.prisma.termReportCard.upsert({
      where: {
        studentId_termId: {
          studentId: data.studentId,
          termId: data.termId,
        },
      },
      create: {
        schoolId,
        studentId: data.studentId,
        termId: data.termId,
        classId: data.classId,
        attendanceDaysTotal: data.attendanceDaysTotal || 0,
        attendanceDaysPresent: data.attendanceDaysPresent || 0,
        attendanceDaysAbsent: data.attendanceDaysAbsent || 0,
        classTeacherRemark: data.classTeacherRemark,
        principalRemark: data.principalRemark,
        nextTermResumption: data.nextTermResumption ? new Date(data.nextTermResumption) : null,
        promotionStatus: data.promotionStatus || 'PENDING',
        affectiveRatings: data.affectiveRatings || undefined,
        psychomotorRatings: data.psychomotorRatings || undefined,
        status: ResultStatus.DRAFT,
      },
      update: {
        attendanceDaysTotal: data.attendanceDaysTotal,
        attendanceDaysPresent: data.attendanceDaysPresent,
        attendanceDaysAbsent: data.attendanceDaysAbsent,
        classTeacherRemark: data.classTeacherRemark,
        principalRemark: data.principalRemark,
        nextTermResumption: data.nextTermResumption ? new Date(data.nextTermResumption) : undefined,
        promotionStatus: data.promotionStatus,
        affectiveRatings: data.affectiveRatings || undefined,
        psychomotorRatings: data.psychomotorRatings || undefined,
      },
    });

    return successResponse(reportCard, 'Report card endorsements saved successfully.');
  }

  // ─── 6. GRADING SCALES CONFIGURATION ─────────────────────────────────────────
  async getGradingScales(schoolId: string) {
    let scales = await this.prisma.gradingScale.findMany({
      where: { schoolId },
      orderBy: { minScore: 'desc' },
    });

    if (scales.length === 0) {
      // Seed default scales for the school
      await Promise.all(
        DEFAULT_GRADE_SCALES.map((s, idx) =>
          this.prisma.gradingScale.create({
            data: {
              schoolId,
              name: 'Institutional Standard',
              minScore: s.minScore,
              maxScore: s.maxScore,
              grade: s.grade,
              gradePoint: s.gradePoint,
              remark: s.remark,
              isPass: s.grade !== 'F9',
              orderIndex: idx,
            },
          }),
        ),
      );
      scales = await this.prisma.gradingScale.findMany({
        where: { schoolId },
        orderBy: { minScore: 'desc' },
      });
    }

    return successResponse(scales);
  }

  async updateGradingScale(id: string, data: any, schoolId: string) {
    const updated = await this.prisma.gradingScale.update({
      where: { id },
      data,
    });
    return successResponse(updated, 'Grading scale updated.');
  }

  // ─── 7. LEGACY COMPATIBILITY ─────────────────────────────────────────────────
  async enterScore(data: any, schoolId: string) {
    return this.saveScoreMatrix(
      {
        classId: data.classId || '',
        subjectId: data.subjectId,
        termId: data.termId,
        scores: [data],
      },
      schoolId,
      { isSuperAdmin: true },
    );
  }

  async bulkEnterScores(scores: any[], schoolId: string) {
    if (!scores || scores.length === 0) return successResponse([], 'No scores provided');
    const first = scores[0];
    return this.saveScoreMatrix(
      {
        classId: first.classId || '',
        subjectId: first.subjectId,
        termId: first.termId,
        scores,
      },
      schoolId,
      { isSuperAdmin: true },
    );
  }

  async getClassResults(classId: string, termId: string, schoolId: string) {
    return this.getClassBroadsheet(classId, termId, schoolId, { isSuperAdmin: true });
  }

  async getResultStatistics(schoolId: string, termId: string) {
    const results = await this.prisma.result.findMany({
      where: { termId, student: { schoolId } },
    });

    const passed = results.filter((r) => (r.totalScore || 0) >= 50).length;
    const failed = results.length - passed;
    const average = results.length
      ? results.reduce((s, r) => s + (r.totalScore || 0), 0) / results.length
      : 0;

    const scales = await this.getGradingScales(schoolId);
    const gradeDistribution = (scales.data || DEFAULT_GRADE_SCALES).map((scale: any) => ({
      grade: scale.grade,
      count: results.filter(
        (r) => (r.totalScore || 0) >= scale.minScore && (r.totalScore || 0) <= scale.maxScore,
      ).length,
    }));

    return successResponse({
      total: results.length,
      passed,
      failed,
      passRate: results.length ? Math.round((passed / results.length) * 100) : 0,
      averageScore: Math.round(average * 100) / 100,
      gradeDistribution,
    });
  }

  private async recalculatePositions(subjectId: string, termId: string) {
    const results = await this.prisma.result.findMany({
      where: { subjectId, termId },
      orderBy: { totalScore: 'desc' },
    });

    await Promise.all(
      results.map((r, i) =>
        this.prisma.result.update({
          where: { id: r.id },
          data: { position: i + 1 },
        }),
      ),
    );
  }
}
