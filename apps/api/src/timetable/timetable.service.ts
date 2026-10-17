import { Injectable, NotFoundException } from '@nestjs/common';
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
}
