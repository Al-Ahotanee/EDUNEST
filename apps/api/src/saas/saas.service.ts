import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { successResponse, PaginationDto, paginate, safeSkip, safeTake } from '../common/dto/pagination.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class SaasService {
  constructor(private prisma: PrismaService) {}

  async registerSchool(body: any) {
    const { school, admin, plan, referralCode, documents } = body;
    const existing = await this.prisma.tenant.findUnique({ where: { slug: school.slug } });
    if (existing) throw new ConflictException('School URL slug already taken. Choose a different name.');

    // Validate referral code
    let marketerId: string | null = null;
    if (referralCode) {
      const marketer = await this.prisma.marketer.findUnique({ where: { referralCode, isActive: true } });
      if (marketer) marketerId = marketer.id;
    }

    const hashedPassword = await bcrypt.hash(admin.password, 12);
    const isBasic = plan === 'BASIC';

    const result = await this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: school.schoolName,
          slug: school.slug,
          email: school.email,
          phone: school.phone,
          address: school.address,
          city: school.city,
          state: school.state,
          lga: school.lga,
          logo: school.logo,
          motto: school.motto,
          yearEstablished: school.yearEstablished ? parseInt(school.yearEstablished) : null,
          subscriptionPlan: plan as any,
          subscriptionStatus: isBasic ? 'ACTIVE' : 'PENDING_APPROVAL',
          isActive: isBasic,
          ministryApprovalDoc: documents?.ministryApprovalDoc || null,
          cacDocument: documents?.cacDocument || null,
          proofOfAddress: documents?.proofOfAddress || null,
          otherDocuments: documents?.otherDocuments || null,
          referralCode: referralCode || null,
          ...(marketerId && { marketerId }),
        },
      });

      const newSchool = await tx.school.create({
        data: {
          tenantId: tenant.id,
          name: school.schoolName,
          code: school.slug.toUpperCase().slice(0, 10),
          type: school.schoolType || 'SECONDARY',
          address: school.address,
          phone: school.phone,
          email: school.email,
        },
      });

      const modules = ['students','admissions','academic','attendance','results','finance','hr','cbt','library','hostel','health','inventory','timetable','notifications','reports','users','schools','settings'];
      const actions = ['create','read','update','delete','export','approve'];
      await tx.permission.createMany({
        data: modules.flatMap(m => actions.map(a => ({ module: m, action: a }))),
        skipDuplicates: true,
      });
      const allPerms = await tx.permission.findMany({});

      const role = await tx.role.create({
        data: {
          tenantId: tenant.id, name: 'Super Admin', isSystem: true,
          rolePermissions: { create: allPerms.map(p => ({ permissionId: p.id })) },
        },
      });

      const user = await tx.user.create({
        data: {
          tenantId: tenant.id, schoolId: newSchool.id,
          email: admin.email, password: hashedPassword,
          firstName: admin.firstName, lastName: admin.lastName,
          phone: admin.phone, isEmailVerified: true,
          userRoles: { create: { roleId: role.id } },
        },
      });

      return { tenant, school: newSchool, user };
    });

    return successResponse({
      tenantId: result.tenant.id, schoolId: result.school.id,
      message: isBasic
        ? 'School registered! You can login immediately.'
        : 'Registration successful! Your account will be reviewed and activated within 24 hours.',
    }, 'School registered successfully');
  }

  async getPublicSchoolInfo(slug: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug },
      include: {
        schools: {
          select: { id: true, name: true, type: true, logo: true, classes: { select: { name: true } } },
          take: 1,
        },
      },
    });
    if (!tenant) throw new NotFoundException('School not found');

    const school = tenant.schools[0];
    return successResponse({
      id: tenant.id, name: school?.name || tenant.name,
      slug: tenant.slug, logo: tenant.logo || school?.logo,
      motto: tenant.motto, type: school?.type, address: tenant.address,
      city: tenant.city, state: tenant.state, phone: tenant.phone,
      email: tenant.email, website: tenant.website,
      yearEstablished: tenant.yearEstablished,
      primaryColor: tenant.primaryColor, secondaryColor: tenant.secondaryColor,
      isActive: tenant.isActive,
      classes: school?.classes?.map(c => c.name) || [],
    });
  }

  async submitAdmissionApplication(slug: string, data: any) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug, isActive: true },
      include: { schools: { take: 1 } },
    });
    if (!tenant) throw new NotFoundException('School not found or inactive');
    const schoolId = tenant.schools[0]?.id;
    if (!schoolId) throw new NotFoundException('School not configured');

    const applicationNo = `APP-${new Date().getFullYear()}-${uuidv4().split('-')[0].toUpperCase()}`;

    const admission = await this.prisma.admission.create({
      data: {
        schoolId, applicationNo,
        firstName: data.firstName, lastName: data.lastName, otherName: data.otherName,
        gender: data.gender, dateOfBirth: new Date(data.dateOfBirth),
        email: data.email, phone: data.phone,
        parentName: data.parentName, parentPhone: data.parentPhone,
        parentEmail: data.parentEmail, parentOccupation: data.parentOccupation,
        applyingForClass: data.applyingForClass,
        boardingDay: data.boardingDay, stateOfOrigin: data.stateOfOrigin,
        religion: data.religion, bloodGroup: data.bloodGroup,
        medicalCondition: data.medicalCondition, previousSchool: data.previousSchool,
        emergencyContact: data.emergencyContact, emergencyPhone: data.emergencyPhone,
        photo: data.photo, birthCertificate: data.birthCertificate,
        lastReportCard: data.lastReportCard,
        status: 'PENDING',
      },
    });

    return successResponse({ applicationNo: admission.applicationNo, id: admission.id }, 'Application submitted successfully');
  }

  async handlePaystackWebhook(payload: any, signature?: string) {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (secret && signature) {
      const crypto = await import('crypto');
      const hash = crypto.createHmac('sha512', secret).update(JSON.stringify(payload)).digest('hex');
      if (hash !== signature) {
        throw new BadRequestException('Invalid webhook signature');
      }
    }

    const event = payload?.event;
    const data = payload?.data;

    if (event === 'charge.success' && data) {
      const metadata = data.metadata || {};

      if (metadata.tenantId) {
        await this.prisma.tenant.update({
          where: { id: metadata.tenantId },
          data: {
            subscriptionStatus: 'ACTIVE',
            isActive: true,
            subscriptionExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          },
        });
      }

      if (metadata.invoiceId) {
        const invoice = await this.prisma.invoice.findUnique({ where: { id: metadata.invoiceId } });
        if (invoice) {
          const paidAmount = Number(data.amount) / 100;
          const newAmountPaid = invoice.amountPaid + paidAmount;
          const newBalance = Math.max(0, invoice.total - newAmountPaid);
          const newStatus = newBalance <= 0 ? 'PAID' : 'PARTIAL';

          await this.prisma.$transaction([
            this.prisma.payment.create({
              data: {
                invoice: { connect: { id: invoice.id } },
                amount: paidAmount,
                method: 'ONLINE',
                receiptNo: `RCP-${Date.now()}-${uuidv4().slice(0, 6).toUpperCase()}`,
                reference: data.reference || uuidv4(),
              },
            }),
            this.prisma.invoice.update({
              where: { id: invoice.id },
              data: {
                amountPaid: newAmountPaid,
                balance: newBalance,
                status: newStatus,
              },
            }),
          ]);
        }
      }
    }

    return { received: true };
  }
}
