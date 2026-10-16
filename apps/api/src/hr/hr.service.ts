import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { successResponse, PaginationDto, paginate, safeSkip, safeTake } from '../common/dto/pagination.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class HrService {
  constructor(private prisma: PrismaService) {}

  // ─── STAFF ───────────────────────────────────────────────────────────────────

  async createStaff(data: any, schoolId: string) {
    const existing = await this.prisma.staff.findFirst({
      where: { schoolId, staffId: data.staffId },
    });
    if (existing) throw new ConflictException('Staff ID already exists');

    const staff = await this.prisma.staff.create({
      data: {
        ...data,
        schoolId,
        salary: data.salary ? Number(data.salary) : null,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        employmentDate: data.employmentDate ? new Date(data.employmentDate) : null,
      },
      include: { department: true },
    });
    return successResponse(staff, 'Staff created');
  }

  async getStaff(schoolId: string, query: PaginationDto & { departmentId?: string }) {
    const {  search, sortBy, sortOrder, departmentId } = query;

    const where: Prisma.StaffWhereInput = {
      schoolId,
      deletedAt: null,
      ...(departmentId && { departmentId }),
      ...(search && {
        OR: [
          { firstName: { contains: search } },
          { lastName: { contains: search } },
          { staffId: { contains: search } },
          { designation: { contains: search } },
        ],
      }),
    };

    const [staff, total] = await Promise.all([
      this.prisma.staff.findMany({
        where, skip: safeSkip(query), take: safeTake(query),
        orderBy: sortBy ? { [sortBy]: sortOrder || 'asc' } : { createdAt: 'desc' },
        include: { department: true },
      }),
      this.prisma.staff.count({ where }),
    ]);

    return paginate(staff, total, query);
  }

  async getOneStaff(id: string, schoolId: string) {
    const staff = await this.prisma.staff.findFirst({
      where: { id, schoolId, deletedAt: null },
      include: { department: true, leaves: { orderBy: { createdAt: 'desc' }, take: 5 }, appraisals: true },
    });
    if (!staff) throw new NotFoundException('Staff not found');
    return successResponse(staff);
  }

  async updateStaff(id: string, schoolId: string, data: any) {
    await this.getOneStaff(id, schoolId);
    const updated = await this.prisma.staff.update({
      where: { id },
      data: {
        ...data,
        salary: data.salary ? Number(data.salary) : undefined,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
      },
      include: { department: true },
    });
    return successResponse(updated, 'Staff updated');
  }

  async deleteStaff(id: string, schoolId: string) {
    await this.getOneStaff(id, schoolId);
    await this.prisma.staff.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
    return successResponse(null, 'Staff removed');
  }

  // ─── DEPARTMENTS ─────────────────────────────────────────────────────────────

  async getDepartments(schoolId: string) {
    const depts = await this.prisma.department.findMany({
      where: { schoolId },
      include: { _count: { select: { staff: true } } },
      orderBy: { name: 'asc' },
    });
    return successResponse(depts);
  }

  async createDepartment(data: any, schoolId: string) {
    const dept = await this.prisma.department.create({ data: { ...data, schoolId } });
    return successResponse(dept, 'Department created');
  }

  // ─── LEAVES ──────────────────────────────────────────────────────────────────

  async getLeaves(schoolId: string, query: PaginationDto & { status?: string }) {
    const {  status } = query;

    const where: Prisma.LeaveWhereInput = {
      staff: { schoolId },
      ...(status && { status: status as any }),
    };

    const [leaves, total] = await Promise.all([
      this.prisma.leave.findMany({
        where, skip: safeSkip(query), take: safeTake(query),
        include: { staff: { select: { firstName: true, lastName: true, staffId: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.leave.count({ where }),
    ]);

    return paginate(leaves, total, query);
  }

  async applyLeave(data: any, schoolId: string) {
    const staff = await this.prisma.staff.findFirst({ where: { id: data.staffId, schoolId } });
    if (!staff) throw new NotFoundException('Staff not found');

    const leave = await this.prisma.leave.create({
      data: {
        ...data,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
      },
      include: { staff: { select: { firstName: true, lastName: true } } },
    });
    return successResponse(leave, 'Leave application submitted');
  }

  async approveLeave(id: string, approvedBy: string) {
    const leave = await this.prisma.leave.findUnique({ where: { id } });
    if (!leave) throw new NotFoundException('Leave not found');

    const updated = await this.prisma.leave.update({
      where: { id },
      data: { status: 'APPROVED', approvedBy, approvedAt: new Date() },
    });
    return successResponse(updated, 'Leave approved');
  }

  async rejectLeave(id: string) {
    const leave = await this.prisma.leave.update({
      where: { id },
      data: { status: 'REJECTED' },
    });
    return successResponse(leave, 'Leave rejected');
  }

  // ─── PAYROLL ─────────────────────────────────────────────────────────────────

  async getPayrolls(schoolId: string, query: PaginationDto) {
    
    const [data, total] = await Promise.all([
      this.prisma.payroll.findMany({
        where: { schoolId },
        skip: safeSkip(query), take: safeTake(query),
        include: { _count: { select: { items: true } } },
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
      }),
      this.prisma.payroll.count({ where: { schoolId } }),
    ]);
    return paginate(data, total, query);
  }

  async generatePayroll(data: { month: number; year: number }, schoolId: string) {
    const existing = await this.prisma.payroll.findFirst({
      where: { schoolId, month: data.month, year: data.year },
    });
    if (existing) throw new ConflictException('Payroll for this month already exists');

    const staff = await this.prisma.staff.findMany({
      where: { schoolId, isActive: true, deletedAt: null },
    });

    const payroll = await this.prisma.payroll.create({
      data: {
        schoolId,
        month: data.month,
        year: data.year,
        items: {
          create: staff.map((s) => {
            const basic = s.salary || 0;
            const allowances = basic * 0.1;
            const tax = basic * 0.075;
            const net = basic + allowances - tax;
            return {
              staffId: s.id,
              basicSalary: basic,
              allowances,
              tax,
              deductions: 0,
              netSalary: net,
            };
          }),
        },
      },
      include: { items: { include: { staff: { select: { firstName: true, lastName: true, staffId: true } } } } },
    });

    return successResponse(payroll, 'Payroll generated');
  }

  async processPayroll(id: string) {
    const payroll = await this.prisma.payroll.update({
      where: { id },
      data: { status: 'COMPLETED', processedAt: new Date() },
    });
    await this.prisma.payrollItem.updateMany({
      where: { payrollId: id },
      data: { status: 'PAID' },
    });
    return successResponse(payroll, 'Payroll processed');
  }
}
