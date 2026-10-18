import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { successResponse } from '../common/dto/pagination.dto';

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday'];

@Injectable()
export class TimetableService {
  constructor(private prisma: PrismaService) {}

  async createSlot(data: any, schoolId: string) {
    const slot = await this.prisma.timetableSlot.create({
      data: { ...data, dayOfWeek: Number(data.dayOfWeek) },
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
}
