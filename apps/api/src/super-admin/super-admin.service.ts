import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { successResponse, paginate, PaginationDto, safeSkip, safeTake } from '../common/dto/pagination.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class SuperAdminService {
  constructor(private prisma: PrismaService) {}

  // ─── Platform Stats ───────────────────────────────────────────────────────────
  async getPlatformStats() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [total, active, pending, suspended, totalStudents, newThisMonth, planBreakdown, totalRevenue, monthlyRevenue] = await Promise.all([
      this.prisma.tenant.count(),
      this.prisma.tenant.count({ where: { subscriptionStatus: 'ACTIVE' } }),
      this.prisma.tenant.count({ where: { subscriptionStatus: 'PENDING_APPROVAL' } }),
      this.prisma.tenant.count({ where: { subscriptionStatus: 'SUSPENDED' } }),
      this.prisma.student.count({ where: { deletedAt: null } }),
      this.prisma.tenant.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      this.prisma.tenant.groupBy({ by: ['subscriptionPlan'], _count: { id: true } }),
      this.prisma.payment.aggregate({ _sum: { amount: true } }),
      this.prisma.payment.groupBy({
        by: ['paymentDate'],
        _sum: { amount: true },
        where: { paymentDate: { gte: new Date(now.getFullYear(), 0, 1) } },
      }),
    ]);

    const planMap: Record<string, number> = {};
    planBreakdown.forEach(p => { planMap[p.subscriptionPlan] = p._count.id; });

    // Build monthly revenue chart
    const monthlyData = Array.from({ length: 12 }, (_, i) => ({
      month: new Date(now.getFullYear(), i, 1).toLocaleString('default', { month: 'short' }),
      revenue: 0,
    }));
    monthlyRevenue.forEach(r => {
      const m = new Date(r.paymentDate).getMonth();
      monthlyData[m].revenue += r._sum.amount || 0;
    });

    return successResponse({
      totalTenants: total, activeTenants: active, pendingTenants: pending,
      suspendedTenants: suspended, totalStudents, newThisMonth,
      planBreakdown: planMap, totalRevenue: totalRevenue._sum.amount || 0,
      monthlyRevenue: monthlyData,
    });
  }

  // ─── List Tenants ────────────────────────────────────────────────────────────
  async listTenants(query: PaginationDto & { status?: string; plan?: string }) {
    const { search, status, plan } = query;
    const where: Prisma.TenantWhereInput = {
      ...(status && { subscriptionStatus: status as any }),
      ...(plan && { subscriptionPlan: plan as any }),
      ...(search && { OR: [{ name: { contains: search } }, { slug: { contains: search } }, { email: { contains: search } }] }),
    };
    const [tenants, total] = await Promise.all([
      this.prisma.tenant.findMany({
        where, skip: safeSkip(query), take: safeTake(query),
        include: {
          _count: { select: { schools: true, users: true } },
          schools: { select: { name: true }, take: 1 },
          marketer: { select: { firstName: true, lastName: true, referralCode: true } },
          users: { select: { firstName: true, lastName: true, email: true }, take: 1 },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.tenant.count({ where }),
    ]);
    return paginate(tenants, total, query);
  }

  // ─── Tenant Detail ────────────────────────────────────────────────────────────
  async getTenantDetail(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: {
        schools: true,
        users: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, createdAt: true }, take: 5 },
        marketer: { select: { firstName: true, lastName: true, referralCode: true, email: true } },
        _count: { select: { users: true } },
      },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');
    return successResponse(tenant);
  }

  // ─── Approve Tenant ───────────────────────────────────────────────────────────
  async approveTenant(id: string, durationDays = 365) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    const updated = await this.prisma.tenant.update({
      where: { id },
      data: {
        isActive: true,
        subscriptionStatus: 'ACTIVE',
        subscriptionExpiry: new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000),
      },
    });
    // Update marketer stats
    if (tenant.marketerId) {
      await this.prisma.marketer.update({
        where: { id: tenant.marketerId },
        data: { totalReferrals: { increment: 1 } },
      }).catch(() => {});
    }
    return successResponse(updated, 'School approved and activated');
  }

  // ─── Suspend Tenant ───────────────────────────────────────────────────────────
  async suspendTenant(id: string, reason?: string) {
    const updated = await this.prisma.tenant.update({
      where: { id },
      data: { isActive: false, subscriptionStatus: 'SUSPENDED' },
    });
    return successResponse(updated, 'School suspended');
  }

  // ─── Reactivate Tenant ────────────────────────────────────────────────────────
  async reactivateTenant(id: string) {
    const updated = await this.prisma.tenant.update({
      where: { id },
      data: { isActive: true, subscriptionStatus: 'ACTIVE', subscriptionExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) },
    });
    return successResponse(updated, 'School reactivated');
  }

  // ─── Update Plan ──────────────────────────────────────────────────────────────
  async updateTenantPlan(id: string, data: { plan: string; expiryDate?: string }) {
    const updated = await this.prisma.tenant.update({
      where: { id },
      data: { subscriptionPlan: data.plan as any, ...(data.expiryDate && { subscriptionExpiry: new Date(data.expiryDate) }) },
    });
    return successResponse(updated, 'Plan updated');
  }

  // ─── Marketers CRUD ───────────────────────────────────────────────────────────
  async createMarketer(data: { firstName: string; lastName: string; email: string; phone?: string; password: string; commissionRate?: number }) {
    const existing = await this.prisma.marketer.findUnique({ where: { email: data.email } });
    if (existing) throw new ConflictException('Email already registered');
    const hashed = await bcrypt.hash(data.password, 12);
    const referralCode = `MKT-${data.firstName.toUpperCase().slice(0, 3)}${uuidv4().split('-')[0].toUpperCase()}`;
    const marketer = await this.prisma.marketer.create({
      data: { ...data, password: hashed, referralCode, commissionRate: data.commissionRate || 5.0 },
    });
    const { password, ...safe } = marketer;
    return successResponse(safe, 'Marketer created');
  }

  async listMarketers(query: PaginationDto) {
    const { search } = query;
    const where: Prisma.MarketerWhereInput = search
      ? { OR: [{ firstName: { contains: search } }, { lastName: { contains: search } }, { email: { contains: search } }] }
      : {};
    const [marketers, total] = await Promise.all([
      this.prisma.marketer.findMany({
        where, skip: safeSkip(query), take: safeTake(query),
        select: { id: true, firstName: true, lastName: true, email: true, phone: true, referralCode: true, commissionRate: true, totalReferrals: true, totalEarnings: true, isActive: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.marketer.count({ where }),
    ]);
    return paginate(marketers, total, query);
  }

  async getMarketerDetail(id: string) {
    const marketer = await this.prisma.marketer.findUnique({
      where: { id },
      include: { referredTenants: { select: { id: true, name: true, slug: true, subscriptionPlan: true, subscriptionStatus: true, createdAt: true } } },
    });
    if (!marketer) throw new NotFoundException('Marketer not found');
    const { password, ...safe } = marketer;
    return successResponse(safe);
  }

  async updateMarketer(id: string, data: any) {
    if (data.password) data.password = await bcrypt.hash(data.password, 12);
    const marketer = await this.prisma.marketer.update({ where: { id }, data });
    const { password, ...safe } = marketer;
    return successResponse(safe, 'Marketer updated');
  }

  async toggleMarketerStatus(id: string) {
    const m = await this.prisma.marketer.findUnique({ where: { id } });
    if (!m) throw new NotFoundException('Marketer not found');
    const updated = await this.prisma.marketer.update({ where: { id }, data: { isActive: !m.isActive } });
    return successResponse({ isActive: updated.isActive });
  }

  // ─── Pending Registrations ────────────────────────────────────────────────────
  async getPendingRegistrations() {
    const tenants = await this.prisma.tenant.findMany({
      where: { subscriptionStatus: 'PENDING_APPROVAL' },
      include: { users: { select: { firstName: true, lastName: true, email: true }, take: 1 } },
      orderBy: { createdAt: 'desc' },
    });
    return successResponse(tenants.map(t => ({
      ...t,
      adminName: t.users[0] ? `${t.users[0].firstName} ${t.users[0].lastName}` : 'N/A',
      adminEmail: t.users[0]?.email,
    })));
  }

  // ─── Broadcast ────────────────────────────────────────────────────────────────
  async broadcast(data: { title: string; message: string; plan?: string }) {
    const where: any = { isActive: true };
    if (data.plan) where.subscriptionPlan = data.plan;
    const tenants = await this.prisma.tenant.findMany({ where, include: { users: { take: 1 } } });
    const notifications: any[] = [];
    tenants.forEach(t => {
      t.users.forEach(u => {
        notifications.push({ userId: u.id, title: data.title, message: data.message, type: 'SYSTEM' });
      });
    });
    if (notifications.length > 0) {
      await this.prisma.notification.createMany({ data: notifications });
    }
    return successResponse({ sent: notifications.length }, 'Broadcast sent');
  }

  // ─── Platform Users (SaaS Admins) ──────────────────────────────────────────
  async listPlatformUsers(query: PaginationDto) {
    const { search } = query;
    const where: Prisma.UserWhereInput = {
      isSuperAdmin: true,
      ...(search && {
        OR: [
          { email: { contains: search } },
          { firstName: { contains: search } },
          { lastName: { contains: search } },
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
          phone: true,
          isActive: true,
          createdAt: true,
          lastLoginAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);
    return paginate(users, total, query);
  }

  async createPlatformUser(data: { email: string; password?: string; firstName: string; lastName: string; phone?: string }) {
    const existing = await this.prisma.user.findFirst({ where: { email: data.email } });
    if (existing) throw new ConflictException('A user with this email already exists');
    const hashedPassword = await bcrypt.hash(data.password || 'password123', 12);
    const id = uuidv4();
    await this.prisma.$executeRaw`
      INSERT INTO User (id, email, password, firstName, lastName, phone, isSuperAdmin, isActive, isEmailVerified, createdAt, updatedAt)
      VALUES (${id}, ${data.email}, ${hashedPassword}, ${data.firstName}, ${data.lastName}, ${data.phone || null}, 1, 1, 1, NOW(), NOW())
    `;
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, firstName: true, lastName: true, phone: true, isActive: true, createdAt: true },
    });
    return successResponse(user, 'Platform administrator created successfully');
  }

  async deletePlatformUser(id: string) {
    const count = await this.prisma.user.count({ where: { isSuperAdmin: true } });
    if (count <= 1) {
      throw new ConflictException('Cannot delete the last remaining Platform Super Admin');
    }
    await this.prisma.user.delete({ where: { id } });
    return successResponse({ id }, 'Platform user removed');
  }

  // ─── SaaS Pricing Plans ───────────────────────────────────────────────────
  private saasPlans = {
    BASIC: {
      plan: 'BASIC',
      name: 'Starter School',
      tagline: 'Ideal for small primary and nursery schools',
      pricePerTerm: 75000,
      pricePerYear: 200000,
      maxStudents: 250,
      maxStaff: 25,
      features: ['Student Admissions & Biodata', 'Class & Subject Management', 'Daily Attendance Tracking', 'Terminal Report Cards', 'Parent Portal Access'],
    },
    STANDARD: {
      plan: 'STANDARD',
      name: 'Growth Campus',
      tagline: 'For growing secondary schools and colleges',
      pricePerTerm: 150000,
      pricePerYear: 400000,
      maxStudents: 600,
      maxStaff: 60,
      features: ['All Starter Features', 'Finance & Invoice Billing', 'CBT Online Examination', 'Timetable Management', 'SMS & Email Notifications', 'Paystack Online Fee Collection'],
    },
    PREMIUM: {
      plan: 'PREMIUM',
      name: 'Enterprise Academy',
      tagline: 'For established institutions with advanced requirements',
      pricePerTerm: 250000,
      pricePerYear: 650000,
      maxStudents: 1500,
      maxStaff: 150,
      features: ['All Growth Features', 'Human Resources & Payroll', 'Hostel & Dormitory Management', 'Library Circulation Tracking', 'Student Health Clinic Records', 'Advanced Financial Auditing & Analytics'],
    },
    ENTERPRISE: {
      plan: 'ENTERPRISE',
      name: 'Multi-Campus Network',
      tagline: 'Custom group of schools or nationwide network',
      pricePerTerm: 500000,
      pricePerYear: 1200000,
      maxStudents: 999999,
      maxStaff: 999999,
      features: ['All Features Included', 'Unlimited Students & Campuses', 'Custom Domain & Custom Branding', 'Dedicated Database Replication', 'Priority SLA 24/7 Account Manager', 'Custom SIS/LMS API Integrations'],
    },
  };

  async getSaaSPlans() {
    const counts = await this.prisma.tenant.groupBy({
      by: ['subscriptionPlan'],
      _count: { id: true },
    });
    const countMap: Record<string, number> = {};
    counts.forEach(c => { countMap[c.subscriptionPlan] = c._count.id; });

    const plans = Object.values(this.saasPlans).map(p => ({
      ...p,
      activeSubscribers: countMap[p.plan] || 0,
      estimatedAnnualRevenue: (countMap[p.plan] || 0) * p.pricePerYear,
    }));
    return successResponse(plans);
  }

  async updateSaaSPlan(planKey: string, data: Partial<any>) {
    const key = planKey.toUpperCase();
    if (!this.saasPlans[key]) throw new NotFoundException(`Plan ${planKey} not found`);
    this.saasPlans[key] = { ...this.saasPlans[key], ...data };
    return successResponse(this.saasPlans[key], 'Plan updated successfully');
  }

  // ─── Platform-Wide Payments & Transactions ────────────────────────────────
  async listPlatformPayments(query: PaginationDto & { search?: string; status?: string; method?: string }) {
    const { search, status, method } = query;
    const where: Prisma.PaymentWhereInput = {
      ...(method && { method: method as any }),
      ...(search && {
        OR: [
          { receiptNo: { contains: search } },
          { reference: { contains: search } },
          { invoice: { student: { firstName: { contains: search } } } },
          { invoice: { student: { lastName: { contains: search } } } },
          { invoice: { student: { admissionNumber: { contains: search } } } },
          { invoice: { student: { school: { name: { contains: search } } } } },
        ],
      }),
    };

    const [payments, total, totalVolume] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        skip: safeSkip(query),
        take: safeTake(query),
        include: {
          invoice: {
            select: {
              invoiceNo: true,
              total: true,
              amountPaid: true,
              balance: true,
              status: true,
              student: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  admissionNumber: true,
                  school: {
                    select: {
                      id: true,
                      name: true,
                      tenant: {
                        select: {
                          id: true,
                          name: true,
                          slug: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: { paymentDate: 'desc' },
      }),
      this.prisma.payment.count({ where }),
      this.prisma.payment.aggregate({ _sum: { amount: true } }),
    ]);

    const formatted = payments.map(p => ({
      id: p.id,
      receiptNo: p.receiptNo,
      amount: p.amount,
      paymentDate: p.paymentDate,
      method: p.method,
      reference: p.reference,
      notes: p.notes,
      invoiceNo: p.invoice?.invoiceNo,
      invoiceTotal: p.invoice?.total,
      invoiceStatus: p.invoice?.status,
      studentName: p.invoice?.student ? `${p.invoice.student.firstName} ${p.invoice.student.lastName}` : 'N/A',
      admissionNumber: p.invoice?.student?.admissionNumber || 'N/A',
      schoolName: p.invoice?.student?.school?.name || 'N/A',
      tenantSlug: p.invoice?.student?.school?.tenant?.slug || 'N/A',
      tenantName: p.invoice?.student?.school?.tenant?.name || 'N/A',
    }));

    const result = paginate(formatted, total, query);
    return {
      ...result,
      meta: {
        ...result.meta,
        totalVolume: totalVolume._sum.amount || 0,
      },
    };
  }
}
