import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { successResponse } from '../common/dto/pagination.dto';
import { TeacherRoleType, ResultStatus, AttendanceStatus } from '@prisma/client';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

@Injectable()
export class TeacherService {
  constructor(private prisma: PrismaService) {}

  // ─── HELPER: RESOLVE CURRENT SESSION & TERM ────────────────────────────────
  private async getActiveSessionAndTerm(schoolId: string) {
    let session = await this.prisma.academicSession.findFirst({
      where: { schoolId, isCurrent: true },
      include: { terms: { orderBy: { startDate: 'asc' } } },
    });

    if (!session) {
      session = await this.prisma.academicSession.findFirst({
        where: { schoolId },
        orderBy: { startDate: 'desc' },
        include: { terms: { orderBy: { startDate: 'asc' } } },
      });
    }

    const term = session?.terms.find((t) => t.isCurrent) || session?.terms[0] || null;
    return { session, term };
  }

  // ─── 1. TEACHER DASHBOARD SUMMARY ──────────────────────────────────────────
  async getDashboardSummary(user: any, schoolId: string) {
    const isSuperAdmin = Boolean(user.isSuperAdmin);
    const roleNames = (user.roles || []).map((r: any) => (r.name || '').toLowerCase());
    const isPrivileged = isSuperAdmin || roleNames.some((n: string) =>
      ['admin', 'school admin', 'principal', 'proprietor', 'head of school', 'director'].some(t => n.includes(t))
    );

    const { session, term } = await this.getActiveSessionAndTerm(schoolId);

    // Fetch all assignments for this teacher
    const assignments = await this.prisma.teacherAssignment.findMany({
      where: { schoolId, userId: user.id },
      include: {
        class: { select: { id: true, name: true, section: true } },
        subject: { select: { id: true, name: true, code: true } },
      },
      orderBy: [{ class: { name: 'asc' } }, { roleType: 'asc' }],
    });

    const isClassMaster = isPrivileged || assignments.some((a) => a.roleType === TeacherRoleType.CLASS_MASTER);
    const isSubjectTeacher = isPrivileged || assignments.some((a) => a.roleType === TeacherRoleType.SUBJECT_TEACHER);

    // ─── Class Master Section ─────────────────────────────
    let classMasterData: any = null;
    const classMasterAssignment = assignments.find((a) => a.roleType === TeacherRoleType.CLASS_MASTER);

    // If privileged without explicit assignment, fall back to first class in school
    let targetClassId = classMasterAssignment?.classId;
    if (!targetClassId && isPrivileged) {
      const firstClass = await this.prisma.class.findFirst({ where: { schoolId }, orderBy: { name: 'asc' } });
      targetClassId = firstClass?.id;
    }

    if (targetClassId) {
      const targetClass = await this.prisma.class.findFirst({
        where: { id: targetClassId, schoolId },
      });

      if (targetClass) {
        // Enrolled count
        const enrolledCount = await this.prisma.classEnrollment.count({
          where: {
            classId: targetClass.id,
            ...(session && { sessionId: session.id }),
          },
        });

        // Today's attendance range (UTC midnight to 23:59:59)
        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
        const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

        const attendancesToday = await this.prisma.attendance.findMany({
          where: {
            student: {
              classEnrollments: {
                some: {
                  classId: targetClass.id,
                  ...(session && { sessionId: session.id }),
                },
              },
            },
            date: { gte: startOfDay, lte: endOfDay },
          },
        });

        const present = attendancesToday.filter((a) => a.status === AttendanceStatus.PRESENT).length;
        const absent = attendancesToday.filter((a) => a.status === AttendanceStatus.ABSENT).length;
        const late = attendancesToday.filter((a) => a.status === AttendanceStatus.LATE).length;
        const excused = attendancesToday.filter((a) => a.status === AttendanceStatus.EXCUSED).length;
        const unmarked = Math.max(0, enrolledCount - attendancesToday.length);
        const attendanceRate = enrolledCount > 0 ? Math.round((present / enrolledCount) * 100) : 0;

        // Class academic results stats for current term
        let resultsSummary = { total: 0, draft: 0, submitted: 0, approved: 0, published: 0 };
        if (term) {
          const classResults = await this.prisma.result.findMany({
            where: {
              termId: term.id,
              student: {
                classEnrollments: {
                  some: {
                    classId: targetClass.id,
                    sessionId: session?.id,
                  },
                },
              },
            },
            select: { status: true },
          });

          resultsSummary = {
            total: classResults.length,
            draft: classResults.filter((r) => r.status === ResultStatus.DRAFT).length,
            submitted: classResults.filter((r) => r.status === ResultStatus.SUBMITTED).length,
            approved: classResults.filter((r) => r.status === ResultStatus.APPROVED).length,
            published: classResults.filter((r) => r.status === ResultStatus.PUBLISHED).length,
          };
        }

        // Check school policy for cash collection
        const policy = await this.prisma.tenantFinancialPolicy.findFirst({
          where: { tenant: { schools: { some: { id: schoolId } } } },
        });

        const allowCashCollection = Boolean(
          policy && policy.classMasterCollectionMode && policy.classMasterCollectionMode !== 'DISABLED'
        );

        classMasterData = {
          classId: targetClass.id,
          className: targetClass.name,
          section: targetClass.section,
          enrolledCount,
          todayAttendance: {
            totalEnrolled: enrolledCount,
            marked: attendancesToday.length,
            present,
            absent,
            late,
            excused,
            unmarked,
            attendanceRate,
          },
          resultsSummary,
          allowCashCollection,
        };
      }
    }

    // ─── Subject Teacher Section ──────────────────────────
    const subjectAssignments = assignments.filter((a) => a.roleType === TeacherRoleType.SUBJECT_TEACHER && a.subject);

    const teachingClasses = await Promise.all(
      subjectAssignments.map(async (sa) => {
        const studentCount = await this.prisma.classEnrollment.count({
          where: {
            classId: sa.classId,
            ...(session && { sessionId: session.id }),
          },
        });

        let resultStatus: ResultStatus = ResultStatus.DRAFT;
        let recordedCount = 0;

        if (term && sa.subjectId) {
          const scores = await this.prisma.result.findMany({
            where: {
              termId: term.id,
              subjectId: sa.subjectId,
              student: {
                classEnrollments: {
                  some: { classId: sa.classId, sessionId: session?.id },
                },
              },
            },
            select: { status: true },
          });

          recordedCount = scores.length;
          if (scores.length > 0) {
            if (scores.every((s) => s.status === ResultStatus.PUBLISHED)) resultStatus = ResultStatus.PUBLISHED;
            else if (scores.every((s) => s.status === ResultStatus.APPROVED)) resultStatus = ResultStatus.APPROVED;
            else if (scores.some((s) => s.status === ResultStatus.SUBMITTED)) resultStatus = ResultStatus.SUBMITTED;
            else resultStatus = ResultStatus.DRAFT;
          }
        }

        return {
          assignmentId: sa.id,
          classId: sa.classId,
          className: sa.class?.name || 'Class',
          section: sa.class?.section || null,
          subjectId: sa.subjectId,
          subjectName: sa.subject?.name || 'Subject',
          subjectCode: sa.subject?.code || '',
          studentCount,
          recordedCount,
          resultStatus,
        };
      })
    );

    // ─── Today's Teaching Lessons ─────────────────────────
    const staffMatch = await this.prisma.staff.findFirst({
      where: { schoolId, OR: [{ userId: user.id }, { email: user.email }] },
      select: { id: true },
    });

    const jsDay = new Date().getDay();
    const currentDayOfWeek = jsDay === 0 ? 7 : jsDay;

    let todaySlots: any[] = [];
    if (staffMatch || subjectAssignments.length > 0) {
      const orConditions: any[] = [];
      if (staffMatch) {
        orConditions.push({ staffId: staffMatch.id });
      }
      subjectAssignments.forEach((sa) => {
        if (sa.subjectId) {
          orConditions.push({ classId: sa.classId, subjectId: sa.subjectId });
        }
      });

      if (orConditions.length > 0) {
        const slots = await this.prisma.timetableSlot.findMany({
          where: {
            class: { schoolId },
            dayOfWeek: currentDayOfWeek,
            OR: orConditions,
          },
          include: {
            class: { select: { id: true, name: true, section: true } },
            subject: { select: { id: true, name: true, code: true } },
          },
          orderBy: { startTime: 'asc' },
        });

        todaySlots = slots.map((s) => ({
          id: s.id,
          startTime: s.startTime,
          endTime: s.endTime,
          room: s.room || 'Room 1',
          className: `${s.class.name}${s.class.section ? ` (${s.class.section})` : ''}`,
          subjectName: s.subject.name,
          subjectCode: s.subject.code,
        }));
      }
    }

    return successResponse({
      teacher: {
        id: user.id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        isPrivileged,
      },
      roles: {
        isClassMaster,
        isSubjectTeacher,
        hasDualRole: isClassMaster && isSubjectTeacher,
      },
      academicState: {
        sessionName: session?.name || 'Current Session',
        termName: term?.name || 'Current Term',
        sessionId: session?.id || null,
        termId: term?.id || null,
      },
      classMaster: classMasterData,
      teaching: {
        assignmentsCount: subjectAssignments.length,
        classes: teachingClasses,
        todayLessons: todaySlots,
      },
    });
  }

  // ─── 2. CLASS MASTER: MY CLASS ROSTER & DETAILS ────────────────────────────
  async getMyClass(user: any, schoolId: string, classId?: string) {
    const isSuperAdmin = Boolean(user.isSuperAdmin);
    const roleNames = (user.roles || []).map((r: any) => (r.name || '').toLowerCase());
    const isPrivileged = isSuperAdmin || roleNames.some((n: string) =>
      ['admin', 'school admin', 'principal', 'proprietor'].some(t => n.includes(t))
    );

    const assignments = await this.prisma.teacherAssignment.findMany({
      where: { schoolId, userId: user.id, roleType: TeacherRoleType.CLASS_MASTER },
      include: { class: true },
    });

    let targetClassId = classId;
    if (!targetClassId) {
      if (assignments.length > 0) {
        targetClassId = assignments[0].classId;
      } else if (isPrivileged) {
        const first = await this.prisma.class.findFirst({ where: { schoolId }, orderBy: { name: 'asc' } });
        targetClassId = first?.id;
      }
    }

    if (!targetClassId) {
      throw new NotFoundException('No assigned class found for this Class Master.');
    }

    // Verify permission if not privileged
    if (!isPrivileged && !assignments.some((a) => a.classId === targetClassId)) {
      throw new ForbiddenException('Access denied: You are not assigned as Class Master for this class.');
    }

    const { session, term } = await this.getActiveSessionAndTerm(schoolId);

    const cls = await this.prisma.class.findFirst({
      where: { id: targetClassId, schoolId },
    });
    if (!cls) throw new NotFoundException('Class not found.');

    // Fetch enrolled students
    const enrollments = await this.prisma.classEnrollment.findMany({
      where: {
        classId: targetClassId,
        ...(session && { sessionId: session.id }),
      },
      include: {
        student: {
          include: {
            guardians: {
              where: { isPrimary: true },
              select: { firstName: true, lastName: true, phone: true, relationship: true },
            },
          },
        },
      },
      orderBy: [{ student: { lastName: 'asc' } }, { student: { firstName: 'asc' } }],
    });

    // Today's date range
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

    const todayAttendances = await this.prisma.attendance.findMany({
      where: {
        studentId: { in: enrollments.map((e) => e.studentId) },
        date: { gte: startOfDay, lte: endOfDay },
      },
    });

    const attendanceMap = new Map<string, any>();
    todayAttendances.forEach((a) => attendanceMap.set(a.studentId, a));

    const students = enrollments.map((e) => {
      const s = e.student;
      const att = attendanceMap.get(s.id);
      const primaryGuardian = s.guardians[0] || null;

      return {
        id: s.id,
        enrollmentId: e.id,
        admissionNumber: s.admissionNumber,
        firstName: s.firstName,
        lastName: s.lastName,
        otherName: s.otherName,
        fullName: `${s.lastName}, ${s.firstName} ${s.otherName || ''}`.trim(),
        gender: s.gender,
        photo: s.photo,
        guardianName: primaryGuardian ? `${primaryGuardian.firstName} ${primaryGuardian.lastName}` : null,
        guardianPhone: primaryGuardian?.phone || null,
        guardianRelationship: primaryGuardian?.relationship || null,
        todayAttendance: att
          ? { id: att.id, status: att.status, remarks: att.remarks }
          : { status: 'UNMARKED', remarks: '' },
      };
    });

    // Class timetable slots
    const timetableSlots = await this.prisma.timetableSlot.findMany({
      where: { classId: targetClassId },
      include: {
        subject: { select: { id: true, name: true, code: true } },
        staff: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });

    return successResponse({
      class: {
        id: cls.id,
        name: cls.name,
        section: cls.section,
        capacity: cls.capacity,
        level: cls.level,
      },
      session: { id: session?.id, name: session?.name },
      term: { id: term?.id, name: term?.name },
      enrolledCount: students.length,
      students,
      timetableSlots,
    });
  }

  // ─── 3. TEACHER TIMETABLE / SCHEDULE ───────────────────────────────────────
  async getMySchedule(user: any, schoolId: string) {
    const staffMatch = await this.prisma.staff.findFirst({
      where: { schoolId, OR: [{ userId: user.id }, { email: user.email }] },
      select: { id: true, firstName: true, lastName: true },
    });

    const assignments = await this.prisma.teacherAssignment.findMany({
      where: { schoolId, userId: user.id },
      select: { classId: true, subjectId: true },
    });

    const orConditions: any[] = [];
    if (staffMatch) {
      orConditions.push({ staffId: staffMatch.id });
    }
    assignments.forEach((a) => {
      if (a.subjectId) {
        orConditions.push({ classId: a.classId, subjectId: a.subjectId });
      }
    });

    let slots: any[] = [];
    if (orConditions.length > 0) {
      slots = await this.prisma.timetableSlot.findMany({
        where: {
          class: { schoolId },
          OR: orConditions,
        },
        include: {
          class: { select: { id: true, name: true, section: true } },
          subject: { select: { id: true, name: true, code: true } },
          staff: { select: { firstName: true, lastName: true } },
        },
        orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
      });
    }

    // Group by day of week
    const weeklySchedule = DAYS.reduce((acc, day, index) => {
      const dayNum = index + 1; // 1 = Monday
      acc[day] = slots.filter((s) => s.dayOfWeek === dayNum);
      return acc;
    }, {} as Record<string, any[]>);

    const jsDay = new Date().getDay();
    const currentDayOfWeek = jsDay === 0 ? 7 : jsDay;
    const todaySlots = slots.filter((s) => s.dayOfWeek === currentDayOfWeek);

    return successResponse({
      weekly: weeklySchedule,
      today: todaySlots,
      totalWeeklySlots: slots.length,
      staff: staffMatch ? `${staffMatch.firstName} ${staffMatch.lastName}` : null,
    });
  }
}
