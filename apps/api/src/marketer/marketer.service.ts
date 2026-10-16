import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { successResponse } from '../common/dto/pagination.dto';

@Injectable()
export class MarketerService {
  constructor(private prisma: PrismaService, private jwtService: JwtService) {}

  async login(email: string, password: string) {
    const marketer = await this.prisma.marketer.findUnique({ where: { email, isActive: true } });
    if (!marketer) throw new UnauthorizedException('Invalid credentials');
    const valid = await bcrypt.compare(password, marketer.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');
    const token = this.jwtService.sign(
      { sub: marketer.id, email: marketer.email, role: 'marketer' },
      { expiresIn: '7d' },
    );
    return {
      accessToken: token,
      marketer: {
        id: marketer.id, firstName: marketer.firstName, lastName: marketer.lastName,
        email: marketer.email, referralCode: marketer.referralCode,
        commissionRate: marketer.commissionRate,
      },
    };
  }

  async getDashboard(marketerId: string) {
    const marketer = await this.prisma.marketer.findUnique({
      where: { id: marketerId },
      include: { referredTenants: { select: { id: true, subscriptionStatus: true } } },
    });
    if (!marketer) throw new NotFoundException('Marketer not found');

    const active = marketer.referredTenants.filter(t => t.subscriptionStatus === 'ACTIVE').length;
    const pending = marketer.referredTenants.filter(t => t.subscriptionStatus === 'PENDING_APPROVAL').length;

    return successResponse({
      marketer: {
        id: marketer.id, firstName: marketer.firstName, lastName: marketer.lastName,
        referralCode: marketer.referralCode, commissionRate: marketer.commissionRate,
      },
      stats: {
        totalReferrals: marketer.totalReferrals,
        activeSchools: active,
        pendingSchools: pending,
        totalEarnings: marketer.totalEarnings,
        estimatedCommission: marketer.totalEarnings * (marketer.commissionRate / 100),
      },
    });
  }

  async getReferrals(marketerId: string) {
    const tenants = await this.prisma.tenant.findMany({
      where: { marketerId },
      select: {
        id: true, name: true, slug: true, subscriptionPlan: true,
        subscriptionStatus: true, createdAt: true,
        users: { select: { firstName: true, lastName: true, email: true }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
    });
    return successResponse(tenants);
  }
}
