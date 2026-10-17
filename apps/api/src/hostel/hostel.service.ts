import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { successResponse, paginate, safeSkip, safeTake, PaginationDto } from '../common/dto/pagination.dto';

@Injectable()
export class HostelService {
  constructor(private prisma: PrismaService) {}

  async createHostel(data: any, schoolId: string) {
    const hostel = await this.prisma.hostel.create({
      data: { name: data.name, schoolId, gender: data.gender, capacity: Number(data.capacity || 50), warden: data.warden },
    });
    return successResponse(hostel, 'Hostel created');
  }

  async getHostels(schoolId: string) {
    const hostels = await this.prisma.hostel.findMany({
      where: { schoolId },
      include: {
        rooms: {
          include: {
            allocations: { where: { isActive: true }, include: { student: { select: { firstName: true, lastName: true, admissionNumber: true } } } },
          },
        },
        _count: { select: { rooms: true } },
      },
      orderBy: { name: 'asc' },
    });
    // Compute occupancy per hostel
    const enriched = hostels.map(h => ({
      ...h,
      totalRooms: h._count.rooms,
      totalBeds: h.rooms.reduce((s, r) => s + r.capacity, 0),
      occupied: h.rooms.reduce((s, r) => s + r.allocations.length, 0),
    }));
    return successResponse(enriched);
  }

  async updateHostel(id: string, schoolId: string, data: any) {
    const existing = await this.prisma.hostel.findFirst({ where: { id, schoolId } });
    if (!existing) throw new NotFoundException('Hostel not found');
    const hostel = await this.prisma.hostel.update({ where: { id }, data });
    return successResponse(hostel, 'Hostel updated');
  }

  async deleteHostel(id: string, schoolId: string) {
    const existing = await this.prisma.hostel.findFirst({ where: { id, schoolId } });
    if (!existing) throw new NotFoundException('Hostel not found');
    const rooms = await this.prisma.hostelRoom.count({ where: { hostelId: id } });
    if (rooms > 0) throw new BadRequestException('Remove all rooms before deleting the hostel');
    await this.prisma.hostel.delete({ where: { id } });
    return successResponse(null, 'Hostel deleted');
  }

  async createRoom(hostelId: string, schoolId: string, data: any) {
    const hostel = await this.prisma.hostel.findFirst({ where: { id: hostelId, schoolId } });
    if (!hostel) throw new NotFoundException('Hostel not found');
    const room = await this.prisma.hostelRoom.create({
      data: { hostelId, number: data.number, capacity: Number(data.capacity || 4), floor: data.floor ? Number(data.floor) : null },
    });
    return successResponse(room, 'Room created');
  }

  async getRooms(hostelId: string, schoolId: string) {
    const hostel = await this.prisma.hostel.findFirst({ where: { id: hostelId, schoolId } });
    if (!hostel) throw new NotFoundException('Hostel not found');
    const rooms = await this.prisma.hostelRoom.findMany({
      where: { hostelId },
      include: {
        allocations: {
          where: { isActive: true },
          include: { student: { select: { firstName: true, lastName: true, admissionNumber: true, gender: true } } },
        },
      },
      orderBy: { number: 'asc' },
    });
    return successResponse(rooms.map(r => ({ ...r, occupied: r.allocations.length, available: r.capacity - r.allocations.length })));
  }

  async deleteRoom(roomId: string, schoolId: string) {
    const room = await this.prisma.hostelRoom.findFirst({
      where: { id: roomId, hostel: { schoolId } },
    });
    if (!room) throw new NotFoundException('Room not found');
    const active = await this.prisma.hostelAllocation.count({ where: { roomId, isActive: true } });
    if (active > 0) throw new BadRequestException('Vacate all students before deleting this room');
    await this.prisma.hostelRoom.delete({ where: { id: roomId } });
    return successResponse(null, 'Room deleted');
  }

  async allocateRoom(data: { studentId: string; roomId: string }, schoolId: string) {
    const student = await this.prisma.student.findFirst({ where: { id: data.studentId, schoolId } });
    if (!student) throw new NotFoundException('Student not found');

    const room = await this.prisma.hostelRoom.findUnique({
      where: { id: data.roomId },
      include: { allocations: { where: { isActive: true } }, hostel: true },
    });
    if (!room) throw new NotFoundException('Room not found');
    if (room.allocations.length >= room.capacity) throw new BadRequestException(`Room ${room.number} is at full capacity (${room.capacity})`);

    // Check gender match
    if (room.hostel.gender !== student.gender) {
      throw new BadRequestException(`This is a ${room.hostel.gender} hostel but student is ${student.gender}`);
    }

    // Deactivate previous allocation
    const existing = await this.prisma.hostelAllocation.findFirst({ where: { studentId: data.studentId, isActive: true } });
    if (existing) {
      await this.prisma.hostelAllocation.update({ where: { id: existing.id }, data: { isActive: false, vacatedAt: new Date() } });
    }

    const allocation = await this.prisma.hostelAllocation.create({
      data: { studentId: data.studentId, roomId: data.roomId },
      include: {
        room: { include: { hostel: { select: { name: true, gender: true } } } },
        student: { select: { firstName: true, lastName: true, admissionNumber: true } },
      },
    });
    return successResponse(allocation, 'Student allocated to room');
  }

  async getAllocations(schoolId: string, query: PaginationDto & { hostelId?: string }) {
    const {  search, hostelId } = query;
    const where: any = {
      student: { schoolId },
      isActive: true,
      ...(hostelId && { room: { hostelId } }),
      ...(search && { student: { OR: [{ firstName: { contains: search } }, { lastName: { contains: search } }, { admissionNumber: { contains: search } }] } }),
    };
    const [data, total] = await Promise.all([
      this.prisma.hostelAllocation.findMany({
        where, skip: safeSkip(query), take: safeTake(query),
        include: {
          student: { select: { firstName: true, lastName: true, admissionNumber: true, gender: true } },
          room: { include: { hostel: { select: { name: true, gender: true } } } },
        },
        orderBy: { allocatedAt: 'desc' },
      }),
      this.prisma.hostelAllocation.count({ where }),
    ]);
    return paginate(data, total, query);
  }

  async vacateRoom(id: string, schoolId: string) {
    const allocation = await this.prisma.hostelAllocation.findFirst({
      where: { id, student: { schoolId } },
    });
    if (!allocation) throw new NotFoundException('Allocation not found');
    const updated = await this.prisma.hostelAllocation.update({ where: { id }, data: { isActive: false, vacatedAt: new Date() } });
    return successResponse(updated, 'Student vacated successfully');
  }

  async getStats(schoolId: string) {
    const [hostels, allocations] = await Promise.all([
      this.prisma.hostel.findMany({ where: { schoolId }, include: { rooms: { select: { capacity: true } } } }),
      this.prisma.hostelAllocation.count({ where: { student: { schoolId }, isActive: true } }),
    ]);
    const totalCapacity = hostels.reduce((s, h) => s + h.rooms.reduce((rs, r) => rs + r.capacity, 0), 0);
    const totalRooms = hostels.reduce((s, h) => s + h.rooms.length, 0);
    return successResponse({
      totalHostels: hostels.length,
      totalRooms,
      totalCapacity,
      currentOccupants: allocations,
      availableSpaces: totalCapacity - allocations,
      occupancyRate: totalCapacity > 0 ? Math.round((allocations / totalCapacity) * 100) : 0,
    });
  }
}
