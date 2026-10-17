import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { successResponse, PaginationDto, paginate, safeSkip, safeTake } from '../common/dto/pagination.dto';
import { Prisma } from '@prisma/client';

// Allowlist of writable fields (prevents accidental mass-assignment of relations / read-only fields)
const STAFF_WRITABLE_FIELDS = new Set([
  'staffId', 'firstName', 'lastName', 'gender', 'dateOfBirth', 'phone', 'email',
  'address', 'photo', 'departmentId', 'designation', 'employmentType', 'employmentDate',
  'salary', 'bankName', 'accountNumber', 'qualification', 'trcnLicense', 'isActive',
]);

const LEAVE_WRITABLE_FIELDS = new Set([
  'staffId', 'type', 'startDate', 'endDate', 'reason',
]);

const DEPARTMENT_WRITABLE_FIELDS = new Set([
  'name', 'description', 'headId',
]);

function pickAllowed(data: any, allowed: Set<string>): Record<string, any> {
  if (!data || typeof data !== 'object') return {};
  const out: Record<string, any> = {};
  for (const k of Object.keys(data)) {
    if (allowed.has(k) && data[k] !== undefined && data[k] !== null && data[k] !== '') {
      out[k] = data[k];
    }
  }
  return out;
}

@Injectable()
export class HrService {
  constructor(private prisma: PrismaService) {}

  // ─── STAFF ───────────────────────────────────────────────────────────────────

  async createStaff(data: any, schoolId: string) {
    if (!data?.firstName || !data?.lastName || !data?.staffId) {
      throw new BadRequestException('firstName, lastName, and staffId are required');
    }

    // Validate departmentId if provided
    if (data.departmentId) {
      const dept = await this.prisma.department.findFirst({
        where: { id: data.departmentId, schoolId },
      });
      if (!dept) {
        throw new BadRequestException('Selected department does not exist in this school');
      }
    }

    const existing = await this.prisma.staff.findFirst({
      where: { schoolId, staffId: data.staffId },
    });
    if (existing) throw new ConflictException('Staff ID already exists');

    const cleanData = pickAllowed(data, STAFF_WRITABLE_FIELDS);
    const staff = await this.prisma.staff.create({
      data: {
        ...cleanData,
        schoolId,
        salary: cleanData.salary ? Number(cleanData.salary) : null,
        dateOfBirth: cleanData.dateOfBirth ? new Date(cleanData.dateOfBirth) : null,
        employmentDate: cleanData.employmentDate ? new Date(cleanData.employmentDate) : null,
      } as any,
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
    const cleanData = pickAllowed(data, STAFF_WRITABLE_FIELDS);
    // Never allow staffId or schoolId to change
    delete cleanData.staffId;
    const updated = await this.prisma.staff.update({
      where: { id },
      data: {
        ...cleanData,
        salary: cleanData.salary !== undefined ? Number(cleanData.salary) : undefined,
        dateOfBirth: cleanData.dateOfBirth ? new Date(cleanData.dateOfBirth) : undefined,
        employmentDate: cleanData.employmentDate ? new Date(cleanData.employmentDate) : undefined,
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
    if (!data?.name) throw new BadRequestException('Department name is required');
    const cleanData = pickAllowed(data, DEPARTMENT_WRITABLE_FIELDS);
    try {
      const dept = await this.prisma.department.create({ data: { ...cleanData, schoolId } as any });
      return successResponse(dept, 'Department created');
    } catch (err: any) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('A department with this name already exists');
      }
      throw err;
    }
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
    if (!data?.staffId || !data?.type || !data?.startDate || !data?.endDate || !data?.reason) {
      throw new BadRequestException('staffId, type, startDate, endDate, and reason are required');
    }
    const staff = await this.prisma.staff.findFirst({ where: { id: data.staffId, schoolId } });
    if (!staff) throw new NotFoundException('Staff not found');

    const cleanData = pickAllowed(data, LEAVE_WRITABLE_FIELDS);
    const startDate = new Date(cleanData.startDate);
    const endDate = new Date(cleanData.endDate);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new BadRequestException('Invalid startDate or endDate');
    }
    if (endDate < startDate) {
      throw new BadRequestException('End date must be after start date');
    }

    const leave = await this.prisma.leave.create({
      data: {
        ...cleanData,
        startDate,
        endDate,
      } as any,
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
    if (!data?.month || !data?.year) {
      throw new BadRequestException('month and year are required');
    }
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
