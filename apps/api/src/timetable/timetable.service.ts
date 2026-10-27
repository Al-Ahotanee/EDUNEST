import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { successResponse } from '../common/dto/pagination.dto';

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday'];

// ─── P1-TT6 fix: UUID format validation ──────────────────────────────────────
// Reject malformed UUIDs with a 400 Bad Request + actionable message instead
// of letting Prisma throw an opaque 500 Internal Server Error. Prisma's FK
// violation errors return no actionable context (just "Internal server error")
// which is unhelpful for API consumers.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;  // HH:MM or HH:MM:SS

@Injectable()
export class TimetableService {
  constructor(private prisma: PrismaService) {}

  // Validates a single timetable slot payload BEFORE the Prisma create call.
  // Throws BadRequestException with a specific message for each failure mode.
  private async validateSlotPayload(data: any, schoolId: string) {
    const errors: string[] = [];

    // Required fields
    if (!data?.classId) errors.push('classId is required');
    if (!data?.subjectId) errors.push('subjectId is required');
    if (data?.dayOfWeek === undefined || data?.dayOfWeek === null) errors.push('dayOfWeek is required');
    if (!data?.startTime) errors.push('startTime is required');
    if (!data?.endTime) errors.push('endTime is required');

    // Format validation (only if value is present)
    if (data?.classId && !UUID_RE.test(data.classId)) errors.push('classId must be a valid UUID');
    if (data?.subjectId && !UUID_RE.test(data.subjectId)) errors.push('subjectId must be a valid UUID');
    if (data?.staffId && !UUID_RE.test(data.staffId)) errors.push('staffId must be a valid UUID (or null)');
    if (data?.startTime && !TIME_RE.test(data.startTime)) errors.push('startTime must be in HH:MM format');
    if (data?.endTime && !TIME_RE.test(data.endTime)) errors.push('endTime must be in HH:MM format');

    // dayOfWeek range check (1 = Monday … 5 = Friday, 6/7 = Sat/Sun)
    const dow = Number(data?.dayOfWeek);
    if (data?.dayOfWeek !== undefined && data?.dayOfWeek !== null && (isNaN(dow) || dow < 1 || dow > 7)) {
      errors.push('dayOfWeek must be an integer 1-7 (1=Monday … 7=Sunday)');
    }

    // Logical: startTime must be before endTime
    if (data?.startTime && data?.endTime && data.startTime >= data.endTime) {
      errors.push('startTime must be earlier than endTime');
    }

    if (errors.length) {
      throw new BadRequestException(`Invalid timetable slot: ${errors.join('; ')}`);
    }

    // FK existence checks — verify classId, subjectId, staffId belong to this school
    // Run in parallel for performance.
    const [cls, subj] = await Promise.all([
      this.prisma.class.findFirst({ where: { id: data.classId, schoolId }, select: { id: true, name: true } }),
      this.prisma.subject.findFirst({ where: { id: data.subjectId, schoolId }, select: { id: true, name: true } }),
    ]);
    if (!cls) throw new BadRequestException(`Class with id ${data.classId} not found in this school`);
    if (!subj) throw new BadRequestException(`Subject with id ${data.subjectId} not found in this school`);

    if (data.staffId) {
      const staff = await this.prisma.staff.findFirst({ where: { id: data.staffId, schoolId }, select: { id: true, firstName: true, lastName: true } });
      if (!staff) throw new BadRequestException(`Staff with id ${data.staffId} not found in this school`);
    }
  }

  async createSlot(data: any, schoolId: string) {
    // P1-TT6 fix: validate BEFORE Prisma create so malformed input returns
    // 400 Bad Request with an actionable message, not 500 Internal Server Error.
    await this.validateSlotPayload(data, schoolId);

    const slot = await this.prisma.timetableSlot.create({
      data: {
        classId: data.classId,
        subjectId: data.subjectId,
        staffId: data.staffId || null,
        dayOfWeek: Number(data.dayOfWeek),
        startTime: data.startTime,
        endTime: data.endTime,
        room: data.room || null,
      },
      include: { class: true, subject: true, staff: { select: { firstName: true, lastName: true } } },
    });
    return successResponse(slot, 'Slot created');
  }

  async getByClass(classId: string) {
    const slots = await this.prisma.timetableSlot.findMany({
      where: { classId },
      include: { subject: { select: { name: true, code: true } }, staff: { select: { firstName: true, lastName: true } } },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
    // Group by day
    const grouped = DAYS.reduce((acc, day, i) => {
      acc[day] = slots.filter(s => s.dayOfWeek === i + 1);
      return acc;
    }, {} as Record<string, any[]>);
    return successResponse(grouped);
  }

  async getByStaff(staffId: string) {
    const slots = await this.prisma.timetableSlot.findMany({
      where: { staffId },
      include: { class: { select: { name: true } }, subject: { select: { name: true } } },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
    return successResponse(slots);
  }

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

    const grouped = DAYS.reduce((acc, day, i) => {
      acc[day] = slots.filter((s) => s.dayOfWeek === i + 1);
      return acc;
    }, {} as Record<string, any[]>);

    return successResponse({
      schedule: grouped,
      slots,
      totalSlots: slots.length,
      staff: staffMatch ? `${staffMatch.firstName} ${staffMatch.lastName}` : null,
    });
  }

  async deleteSlot(id: string, schoolId: string) {
    const slot = await this.prisma.timetableSlot.findFirst({
      where: { id, class: { schoolId } },
    });
    if (!slot) throw new NotFoundException('Slot not found');
    await this.prisma.timetableSlot.delete({ where: { id } });
    return successResponse(null, 'Slot deleted');
  }

  async createBatch(body: { slots: any[]; classIds?: string[] }, schoolId: string) {
    const { slots, classIds } = body;

    // P1-TT6 fix: validate EVERY slot before persisting. If any one is
    // malformed or references an unknown FK, reject the whole batch with a
    // 400 + actionable message. The frontend already confirms before the
    // batch fires (overwrite warning modal from Round 4), so a 400 here
    // means the user has to cancel and fix the inputs — no partial writes.
    if (slots && slots.length > 0) {
      for (let i = 0; i < slots.length; i++) {
        try {
          await this.validateSlotPayload(slots[i], schoolId);
        } catch (e: any) {
          // Re-throw with the slot index appended for easier debugging.
          throw new BadRequestException(`Slot #${i + 1}: ${e.response?.message || e.message}`);
        }
      }
    }

    if (classIds && classIds.length > 0) {
      await this.prisma.timetableSlot.deleteMany({
        where: { classId: { in: classIds } },
      });
    }
    if (slots && slots.length > 0) {
      const sanitized = slots.map(s => ({
        classId: s.classId,
        subjectId: s.subjectId,
        staffId: s.staffId || null,
        dayOfWeek: Number(s.dayOfWeek),
        startTime: s.startTime,
        endTime: s.endTime,
        room: s.room || null,
      }));
      await this.prisma.timetableSlot.createMany({
        data: sanitized,
      });
    }
    return successResponse({ count: slots?.length || 0 }, 'Timetable slots generated and saved successfully');
  }

  async clearClassSlots(classId: string, schoolId: string) {
    const deleted = await this.prisma.timetableSlot.deleteMany({
      where: { classId },
    });
    return successResponse(deleted, 'Class timetable cleared');
  }

  async clearSchoolSlots(schoolId: string) {
    const deleted = await this.prisma.timetableSlot.deleteMany({
      where: { class: { schoolId } },
    });
    return successResponse(deleted, 'School timetable cleared');
  }

  async getSchoolTimetable(schoolId: string) {
    const classes = await this.prisma.class.findMany({
      where: { schoolId },
      include: {
        timetableSlots: {
          include: { subject: { select: { name: true, code: true } }, staff: { select: { firstName: true, lastName: true } } },
          orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
        },
      },
      orderBy: { level: 'asc' },
    });
    return successResponse(classes);
  }

  // ─── RELIEF / SUBSTITUTE TEACHER ASSIGNMENTS (P0-18 fix) ─────────────────────

  async listReliefAssignments(schoolId: string, from?: string, to?: string) {
    const where: any = { schoolId };
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) where.date.lte = new Date(to);
    }
    const items = await this.prisma.reliefAssignment.findMany({
      where,
      orderBy: { date: 'desc' },
      take: 200,
    });
    return successResponse(items);
  }

  async createReliefAssignment(data: any, schoolId: string) {
    // ─── VALIDATION ─────────────────────────────────────────────────────────
    if (!data?.dayOfWeek || !data?.period || !data?.className) {
      throw new BadRequestException('dayOfWeek, period, and className are required');
    }
    if (!data?.absentTeacherName && !data?.absentStaffId) {
      throw new BadRequestException('Either absentTeacherName or absentStaffId is required');
    }
    if (!data?.reliefTeacherName && !data?.reliefStaffId) {
      throw new BadRequestException('Either reliefTeacherName or reliefStaffId is required');
    }

    // If both absent and relief staff IDs are provided, ensure they're not the same person
    if (data.absentStaffId && data.reliefStaffId && data.absentStaffId === data.reliefStaffId) {
      throw new BadRequestException('The absent teacher and the relief teacher cannot be the same person');
    }

    // If staff IDs are provided, verify they belong to this school
    if (data.absentStaffId) {
      const absent = await this.prisma.staff.findFirst({ where: { id: data.absentStaffId, schoolId } });
      if (!absent) throw new BadRequestException('Absent staff not found in this school');
    }
    if (data.reliefStaffId) {
      const relief = await this.prisma.staff.findFirst({ where: { id: data.reliefStaffId, schoolId } });
      if (!relief) throw new BadRequestException('Relief staff not found in this school');

      // EDN-008 fix: real scheduling conflict check — the relief teacher must
      // not already be teaching another class at the same day/period. We map
      // day name → dayOfWeek integer (1=Monday … 5=Friday) and look up the
      // relief teacher's existing timetable slots.
      const dayIndex = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']
        .indexOf(data.dayOfWeek) + 1;
      if (dayIndex > 0) {
        const conflict = await this.prisma.timetableSlot.findFirst({
          where: { staffId: data.reliefStaffId, dayOfWeek: dayIndex },
        });
        if (conflict) {
          throw new BadRequestException(
            `Scheduling conflict: ${relief.firstName} ${relief.lastName} is already teaching ` +
            `another class on ${data.dayOfWeek}. Choose a different relief teacher or day.`
          );
        }
      }
    }

    const assignment = await this.prisma.reliefAssignment.create({
      data: {
        schoolId,
        date: data.date ? new Date(data.date) : new Date(),
        dayOfWeek: data.dayOfWeek,
        period: data.period,
        classId: data.classId || null,
        className: data.className,
        subjectId: data.subjectId || null,
        subjectName: data.subjectName || '—',
        absentStaffId: data.absentStaffId || null,
        absentTeacherName: data.absentTeacherName || '—',
        reliefStaffId: data.reliefStaffId || null,
        reliefTeacherName: data.reliefTeacherName || '—',
        reason: data.reason || null,
        status: data.status || 'CONFIRMED',
      },
    });
    return successResponse(assignment, 'Relief assignment created and persisted');
  }

  async updateReliefAssignment(id: string, data: any, schoolId: string) {
    const existing = await this.prisma.reliefAssignment.findFirst({ where: { id, schoolId } });
    if (!existing) throw new NotFoundException('Relief assignment not found');
    const updated = await this.prisma.reliefAssignment.update({
      where: { id },
      data: {
        ...(data.status && { status: data.status }),
        ...(data.reliefStaffId && { reliefStaffId: data.reliefStaffId }),
        ...(data.reliefTeacherName && { reliefTeacherName: data.reliefTeacherName }),
        ...(data.reason && { reason: data.reason }),
      },
    });
    return successResponse(updated, 'Relief assignment updated');
  }

  async deleteReliefAssignment(id: string, schoolId: string) {
    const existing = await this.prisma.reliefAssignment.findFirst({ where: { id, schoolId } });
    if (!existing) throw new NotFoundException('Relief assignment not found');
    await this.prisma.reliefAssignment.delete({ where: { id } });
    return successResponse(null, 'Relief assignment cancelled');
  }

  // ─── PUBLISH / UNPUBLISH TIMETABLE ─────────────────────────────────────────
  // Persists the timetable's published state on the School record so the
  // student/parent portals can check it and only render published timetables.
  async getPublishState(schoolId: string) {
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: { timetablePublished: true },
    });
    if (!school) throw new NotFoundException('School not found');
    return successResponse({ published: school.timetablePublished });
  }

  async setPublishState(schoolId: string, published: boolean) {
    const updated = await this.prisma.school.update({
      where: { id: schoolId },
      data: { timetablePublished: published },
      select: { id: true, name: true, timetablePublished: true },
    });
    return successResponse(
      { published: updated.timetablePublished },
      published
        ? 'Timetable published to Student & Parent Portals'
        : 'Timetable unpublished from portals (now Draft)',
    );
  }

  // ─── ACADEMIC EVENTS (Academic Dates CRUD) ──────────────────────────────────
  async listAcademicEvents(schoolId: string, from?: string, to?: string) {
    const where: any = { schoolId };
    if (from || to) {
      where.startDate = {};
      if (from) where.startDate.gte = new Date(from);
      if (to) where.startDate.lte = new Date(to);
    }
    const events = await this.prisma.academicEvent.findMany({
      where,
      orderBy: { startDate: 'asc' },
      take: 500,
    });
    return successResponse(events);
  }

  async createAcademicEvent(schoolId: string, data: any) {
    if (!data?.title || !data?.startDate) {
      throw new BadRequestException('title and startDate are required');
    }
    const ev = await this.prisma.academicEvent.create({
      data: {
        schoolId,
        title: data.title,
        type: data.type || 'ACADEMIC',
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : null,
        description: data.description || null,
      },
    });
    return successResponse(ev, 'Academic event created');
  }

  async updateAcademicEvent(id: string, schoolId: string, data: any) {
    const existing = await this.prisma.academicEvent.findFirst({ where: { id, schoolId } });
    if (!existing) throw new NotFoundException('Academic event not found');
    const updated = await this.prisma.academicEvent.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.type !== undefined && { type: data.type }),
        ...(data.startDate !== undefined && { startDate: new Date(data.startDate) }),
        ...(data.endDate !== undefined && { endDate: data.endDate ? new Date(data.endDate) : null }),
        ...(data.description !== undefined && { description: data.description }),
      },
    });
    return successResponse(updated, 'Academic event updated');
  }

  async deleteAcademicEvent(id: string, schoolId: string) {
    const existing = await this.prisma.academicEvent.findFirst({ where: { id, schoolId } });
    if (!existing) throw new NotFoundException('Academic event not found');
    await this.prisma.academicEvent.delete({ where: { id } });
    return successResponse(null, 'Academic event deleted');
  }
}
