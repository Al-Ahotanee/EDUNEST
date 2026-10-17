import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { successResponse } from '../common/dto/pagination.dto';

@Injectable()
export class SchoolsService {
  constructor(private prisma: PrismaService) {}

  async getCurrentSchool(schoolId: string) {
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
            domain: true,
            logo: true,
            motto: true,
            primaryColor: true,
            secondaryColor: true,
            subscriptionPlan: true,
            subscriptionStatus: true,
            isActive: true,
          },
        },
        _count: {
          select: {
            students: { where: { deletedAt: null } },
            staff: { where: { deletedAt: null } },
            classes: true,
          },
        },
      },
    });

    if (!school) throw new NotFoundException('School not found');
    return successResponse(school);
  }

  async updateCurrentSchool(schoolId: string, data: any) {
    const school = await this.prisma.school.findUnique({ where: { id: schoolId } });
    if (!school) throw new NotFoundException('School not found');

    const updated = await this.prisma.school.update({
      where: { id: schoolId },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.email !== undefined && { email: data.email }),
        ...(data.address !== undefined && { address: data.address }),
        ...(data.logo !== undefined && { logo: data.logo }),
        ...(data.type && { type: data.type }),
      },
      include: { tenant: true },
    });

    if (data.motto !== undefined || data.logo !== undefined || data.primaryColor !== undefined) {
      await this.prisma.tenant.update({
        where: { id: school.tenantId },
        data: {
          ...(data.motto !== undefined && { motto: data.motto }),
          ...(data.logo !== undefined && { logo: data.logo }),
          ...(data.primaryColor !== undefined && { primaryColor: data.primaryColor }),
          ...(data.secondaryColor !== undefined && { secondaryColor: data.secondaryColor }),
        },
      });
    }

    return successResponse(updated, 'School settings updated successfully');
  }
}
