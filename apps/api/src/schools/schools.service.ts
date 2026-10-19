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

    if (data.motto !== undefined || data.logo !== undefined || data.primaryColor !== undefined || data.secondaryColor !== undefined) {
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

  async getSchoolBranding(idOrSlug: string) {
    let school = await this.prisma.school.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { tenant: { slug: idOrSlug } }, { tenant: { domain: idOrSlug } }],
      },
      include: {
        tenant: true,
      },
    });

    if (!school) {
      throw new NotFoundException(`School '${idOrSlug}' not found`);
    }

    const branding = {
      schoolId: school.id,
      tenantId: school.tenantId,
      name: school.name || school.tenant.name,
      slug: school.tenant.slug,
      domain: school.tenant.domain,
      logo: school.logo || school.tenant.logo,
      motto: school.motto || school.tenant.motto,
      primaryColor: school.tenant.primaryColor || '#1a56db',
      secondaryColor: school.tenant.secondaryColor || '#7e3af2',
      address: school.address || school.tenant.address,
      phone: school.phone || school.tenant.phone,
      email: school.email || school.tenant.email,
      website: school.website || school.tenant.website,
      type: school.type,
      yearEstablished: school.tenant.yearEstablished,
      principalSignature: school.principalSignature,
      stampSeal: school.stampSeal,
      isActive: school.isActive && school.tenant.isActive,
    };

    return successResponse(branding);
  }

  async updateSchoolBranding(idOrSlug: string, data: any) {
    const school = await this.prisma.school.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { tenant: { slug: idOrSlug } }],
      },
    });

    if (!school) throw new NotFoundException('School not found');

    const updatedSchool = await this.prisma.school.update({
      where: { id: school.id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.email !== undefined && { email: data.email }),
        ...(data.address !== undefined && { address: data.address }),
        ...(data.logo !== undefined && { logo: data.logo }),
        ...(data.motto !== undefined && { motto: data.motto }),
        ...(data.principalSignature !== undefined && { principalSignature: data.principalSignature }),
        ...(data.stampSeal !== undefined && { stampSeal: data.stampSeal }),
      },
    });

    const updatedTenant = await this.prisma.tenant.update({
      where: { id: school.tenantId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.motto !== undefined && { motto: data.motto }),
        ...(data.logo !== undefined && { logo: data.logo }),
        ...(data.primaryColor !== undefined && { primaryColor: data.primaryColor }),
        ...(data.secondaryColor !== undefined && { secondaryColor: data.secondaryColor }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.email !== undefined && { email: data.email }),
        ...(data.address !== undefined && { address: data.address }),
      },
    });

    return successResponse({
      school: updatedSchool,
      tenant: updatedTenant,
    }, 'School branding updated successfully');
  }
}

