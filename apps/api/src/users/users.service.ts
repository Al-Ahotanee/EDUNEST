import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { successResponse, paginate, PaginationDto, safeSkip, safeTake } from '../common/dto/pagination.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async listUsers(schoolId: string, query: PaginationDto & { role?: string; status?: string }) {
    const { search, role, status } = query;
    const where: Prisma.UserWhereInput = {
      schoolId,
      ...(status === 'active' && { isActive: true }),
      ...(status === 'inactive' && { isActive: false }),
      ...(role && { userRoles: { some: { role: { name: role } } } }),
      ...(search && {
        OR: [
          { firstName: { contains: search } },
          { lastName: { contains: search } },
          { email: { contains: search } },
        ],
      }),
    };

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: safeSkip(query),
        take: safeTake(query),
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          avatar: true,
          phone: true,
          isActive: true,
          createdAt: true,
          lastLoginAt: true,
          userRoles: {
            include: {
              role: { select: { id: true, name: true, description: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    const formatted = users.map(u => ({
      ...u,
      roles: u.userRoles.map(ur => ur.role.name),
    }));

    return paginate(formatted, total, query);
  }

  async getUser(id: string, schoolId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, schoolId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatar: true,
        phone: true,
        isActive: true,
        createdAt: true,
        lastLoginAt: true,
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: { include: { permission: true } },
              },
            },
          },
        },
      },
    });

    if (!user) throw new NotFoundException('User not found');
    return successResponse({
      ...user,
      roles: user.userRoles.map(ur => ur.role.name),
    });
  }

  async createUser(data: any, schoolId: string, tenantId: string, caller?: any) {
    const { email, password, firstName, lastName, phone, roleIds = [] } = data;

    if (!email || !password || !firstName || !lastName) {
      throw new BadRequestException('Email, password, first name, and last name are required');
    }

    // Role privilege escalation guard (R3-N08):
    if (roleIds.length > 0) {
      const rolesToAssign = await this.prisma.role.findMany({
        where: { id: { in: roleIds } },
        select: { id: true, name: true },
      });
      const hasSuperAdminRole = rolesToAssign.some(r => r.name === 'Super Admin');
      const hasAdminRole = rolesToAssign.some(r => r.name === 'Admin' || r.name === 'School Admin');

      if (hasSuperAdminRole && !caller?.isSuperAdmin) {
        throw new ForbiddenException('Only a Super Admin can assign the Super Admin role');
      }
      if (hasAdminRole && !caller?.isSuperAdmin && !caller?.roles?.some((r: any) => r.name === 'Super Admin' || r.name === 'Admin')) {
        throw new ForbiddenException('Only Administrators can assign Admin roles');
      }
    }

    const existing = await this.prisma.user.findFirst({ where: { email } });
    if (existing) throw new BadRequestException('Email already in use');

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        phone,
        schoolId,
        tenantId,
        isActive: true,
        ...(roleIds.length > 0 && {
          userRoles: {
            create: roleIds.map((roleId: string) => ({ roleId })),
          },
        }),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        isActive: true,
        createdAt: true,
        userRoles: {
          include: {
            role: { select: { id: true, name: true } },
          },
        },
      },
    });

    return successResponse({
      ...user,
      roles: user.userRoles.map(ur => ur.role.name),
    }, 'User created successfully');
  }

  async updateUser(id: string, schoolId: string, data: any, caller?: any) {
    const existing = await this.prisma.user.findFirst({ where: { id, schoolId } });
    if (!existing) throw new NotFoundException('User not found');

    const { firstName, lastName, phone, isActive, password, roleIds } = data;

    if (roleIds && caller && !caller.isSuperAdmin) {
      const callerRoles = (caller.roles || []).map((r: string) => r.toLowerCase());
      const isCallerSuper = callerRoles.includes('super admin');
      if (!isCallerSuper) {
        const adminRoles = await this.prisma.role.findMany({
          where: { id: { in: roleIds }, name: { in: ['Super Admin', 'Admin'] } },
        });
        if (adminRoles.length > 0) {
          throw new BadRequestException('Only Super Admin can assign administrative roles');
        }
      }
    }

    let hashedPassword: string | undefined;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 12);
    }

    if (roleIds) {
      await this.prisma.userRole.deleteMany({ where: { userId: id } });
      if (roleIds.length > 0) {
        await this.prisma.userRole.createMany({
          data: roleIds.map((roleId: string) => ({ userId: id, roleId })),
        });
      }
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(phone !== undefined && { phone }),
        ...(isActive !== undefined && { isActive }),
        ...(hashedPassword && { password: hashedPassword }),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        isActive: true,
      },
    });

    return successResponse(updated, 'User updated successfully');
  }

  async deleteUser(id: string, schoolId: string, caller?: any) {
    const existing = await this.prisma.user.findFirst({
      where: { id, schoolId },
      include: { userRoles: { include: { role: true } } },
    });
    if (!existing) throw new NotFoundException('User not found');

    if (caller && caller.id === id) {
      throw new BadRequestException('You cannot deactivate your own account');
    }

    const targetIsAdmin =
      existing.isSuperAdmin ||
      existing.userRoles?.some((ur: any) => ur.role.name === 'Super Admin' || ur.role.name === 'Admin');

    if (targetIsAdmin && !caller?.isSuperAdmin) {
      throw new ForbiddenException('Only a Super Admin can deactivate an administrative account');
    }

    await this.prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    return successResponse(null, 'User deactivated successfully');
  }

  async getRoles(tenantId: string) {
    const roles = await this.prisma.role.findMany({
      where: { tenantId },
      include: { _count: { select: { userRoles: true } } },
    });
    return successResponse(roles);
  }
}
