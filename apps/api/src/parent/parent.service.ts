import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { successResponse } from '../common/dto/pagination.dto';

@Injectable()
export class ParentService {
  constructor(private prisma: PrismaService, private jwtService: JwtService) {}

  async login(email: string, password: string, tenantSlug?: string) {
    const whereClause: any = { email, isActive: true };
    if (tenantSlug) {
      const tenant = await this.prisma.tenant.findUnique({ where: { slug: tenantSlug } });
      if (!tenant) throw new UnauthorizedException('Invalid school');
      whereClause.tenantId = tenant.id;
    }

    const user = await this.prisma.user.findFirst({
      where: { ...whereClause, userRoles: { some: { role: { name: { in: ['Parent', 'Guardian'] } } } } },
      include: {
        userRoles: { include: { role: true } },
        school: { select: { id: true, name: true, logo: true } },
        tenant: { select: { id: true, name: true, slug: true, logo: true, primaryColor: true, secondaryColor: true, motto: true } },
      },
    });

    if (!user) throw new UnauthorizedException('Invalid credentials or not a parent account');
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    const token = this.jwtService.sign(
      { sub: user.id, email: user.email, tenantId: user.tenantId, schoolId: user.schoolId, role: 'parent' },
      { expiresIn: '7d' },
    );

    return {
      accessToken: token,
      parent: {
        id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName,
        avatar: user.avatar, school: user.school, tenant: user.tenant,
      },
    };
  }

  async getDashboard(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { school: { select: { id: true, name: true } } },
    });
    if (!user) throw new NotFoundException('User not found');

    // Get guardians linked to this parent's email
    const guardians = await this.prisma.guardian.findMany({
      where: { email: user.email },
      include: {
        student: {
          include: {
            classEnrollments: { include: { class: true }, orderBy: { createdAt: 'desc' }, take: 1 },
            invoices: { where: { status: { not: 'PAID' } } },
            results: { where: { status: 'PUBLISHED' }, orderBy: { createdAt: 'desc' }, take: 10, include: { subject: true } },
            attendances: { orderBy: { date: 'desc' }, take: 30 },
          },
        },
      },
    });

    const children = guardians.map(g => {
      const s = g.student;
      const totalAttendance = s.attendances.length;
      const presentDays = s.attendances.filter(a => a.status === 'PRESENT').length;
      const totalScore = s.results.reduce((acc, r) => acc + (r.totalScore || 0), 0);
      const feeBalance = s.invoices.reduce((acc, inv) => acc + (inv.balance || 0), 0);
      return {
        id: s.id, firstName: s.firstName, lastName: s.lastName,
        admissionNumber: s.admissionNumber, photo: s.photo,
        currentClass: s.classEnrollments[0]?.class?.name || null,
        attendanceRate: totalAttendance > 0 ? Math.round((presentDays / totalAttendance) * 100) : 0,
        averageScore: s.results.length > 0 ? Math.round(totalScore / s.results.length) : 0,
        feeBalance,
      };
    });

    const notifications = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return successResponse({ children, notifications, school: user.school });
  }

  async getResults(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Not found');

    const guardians = await this.prisma.guardian.findMany({
      where: { email: user.email },
      select: { studentId: true },
    });
    const studentIds = guardians.map(g => g.studentId);

    const results = await this.prisma.result.findMany({
      where: { studentId: { in: studentIds }, status: 'PUBLISHED' },
      include: {
        student: { select: { firstName: true, lastName: true, admissionNumber: true } },
        subject: { select: { name: true, code: true } },
        term: { select: { name: true, session: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return successResponse(results);
  }

  async getAttendance(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Not found');

    const guardians = await this.prisma.guardian.findMany({
      where: { email: user.email },
      select: { studentId: true },
    });
    const studentIds = guardians.map(g => g.studentId);

    const records = await this.prisma.attendance.findMany({
      where: { studentId: { in: studentIds } },
      orderBy: { date: 'desc' },
      take: 90,
    });

    const total = records.length;
    const present = records.filter(r => r.status === 'PRESENT').length;
    const absent = records.filter(r => r.status === 'ABSENT').length;
    const late = records.filter(r => r.status === 'LATE').length;

    return successResponse({
      records,
      summary: { total, present, absent, late },
      attendanceRate: total > 0 ? Math.round((present / total) * 100) : 0,
    });
  }

  async getFees(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Not found');

    const guardians = await this.prisma.guardian.findMany({
      where: { email: user.email },
      select: { studentId: true },
    });
    const studentIds = guardians.map(g => g.studentId);

    const invoices = await this.prisma.invoice.findMany({
      where: { studentId: { in: studentIds } },
      include: {
        student: { select: { firstName: true, lastName: true } },
        items: true,
        payments: { orderBy: { paymentDate: 'desc' } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return successResponse(invoices);
  }

  async getNotifications(userId: string) {
    const notifications = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return successResponse(notifications);
  }

  async markNotificationRead(userId: string, notificationId: string) {
    await this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true, readAt: new Date() },
    });
    return successResponse(null, 'Marked as read');
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, firstName: true, lastName: true, email: true, phone: true, avatar: true, createdAt: true },
    });
    if (!user) throw new NotFoundException('Not found');
    return successResponse(user);
  }
}
