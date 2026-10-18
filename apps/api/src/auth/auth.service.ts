import { Injectable, UnauthorizedException, NotFoundException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwtService: JwtService) {}

  async login(dto: any, ip?: string, userAgent?: string) {
    const { email, password, tenantSlug } = dto;

    // Use raw SQL to bypass stale Prisma client types
    const rawUsers = await this.prisma.$queryRaw<any[]>`
      SELECT id, email, firstName, lastName, password, isActive, isSuperAdmin, tenantId, schoolId
      FROM User WHERE email = ${email} LIMIT 1
    `;

    const rawUser = rawUsers?.[0];

    if (!rawUser || !rawUser.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, rawUser.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Super admin login
    if (rawUser.isSuperAdmin == 1) {
      await this.prisma.$executeRaw`
        UPDATE User SET lastLoginAt = NOW(), lastLoginIp = ${ip || ''} WHERE id = ${rawUser.id}
      `;
      const tokens = await this.generateTokens(rawUser, true);
      return {
        user: {
          id: rawUser.id,
          email: rawUser.email,
          firstName: rawUser.firstName,
          lastName: rawUser.lastName,
          isSuperAdmin: true,
          roles: [],
        },
        ...tokens,
      };
    }

    // Tenant user login
    const user = await this.prisma.user.findFirst({
      where: { email, isActive: true },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: { include: { permission: true } },
              },
            },
          },
        },
        school: { select: { id: true, name: true, logo: true } },
        tenant: {
          select: {
            id: true, name: true, slug: true, logo: true,
            primaryColor: true, secondaryColor: true, motto: true, isActive: true,
          },
        },
      },
    });

    if (!user) throw new UnauthorizedException('Invalid credentials');

    if (tenantSlug) {
      const tenant = await this.prisma.tenant.findUnique({ where: { slug: tenantSlug } });
      if (!tenant) throw new UnauthorizedException('School not found');
      if (user.tenantId !== tenant.id) {
        throw new UnauthorizedException('Invalid credentials for this school');
      }
    }

    if (!user.tenant?.isActive) {
      throw new UnauthorizedException('Your school account is pending activation. Please contact support.');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), lastLoginIp: ip },
    });

    await this.prisma.loginHistory.create({
      data: { userId: user.id, ip, userAgent, success: true },
    });

    const tokens = await this.generateTokens(user, false);
    const roles = user.userRoles.map((ur) => ({
      id: ur.role.id,
      name: ur.role.name,
      permissions: ur.role.rolePermissions.map((rp) => ({
        module: rp.permission.module,
        action: rp.permission.action,
      })),
    }));

    return {
      user: {
        id: user.id, email: user.email,
        firstName: user.firstName, lastName: user.lastName,
        avatar: user.avatar, schoolId: user.schoolId,
        school: user.school, tenant: user.tenant,
        tenantId: user.tenantId, isSuperAdmin: false, roles,
      },
      ...tokens,
    };
  }

  async register(dto: any) {
    const { email, password, firstName, lastName, phone, schoolId, tenantId } = dto;
    if (!email || !password || !firstName || !lastName) {
      throw new BadRequestException('First name, last name, email, and password are required');
    }

    const existing = await this.prisma.user.findFirst({ where: { email } });
    if (existing) {
      throw new BadRequestException('A user with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        phone,
        tenantId,
        schoolId,
        isActive: true,
      },
      include: {
        school: { select: { id: true, name: true, logo: true } },
        tenant: {
          select: {
            id: true, name: true, slug: true, logo: true,
            primaryColor: true, secondaryColor: true, motto: true, isActive: true,
          },
        },
      },
    });

    const tokens = await this.generateTokens(user, false);
    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        schoolId: user.schoolId,
        school: user.school,
        tenant: user.tenant,
        tenantId: user.tenantId,
        isSuperAdmin: false,
        roles: [],
      },
      ...tokens,
    };
  }

  async refreshToken(dto: any) {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token: dto.refreshToken },
      include: { user: true },
    });
    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
    await this.prisma.refreshToken.delete({ where: { id: stored.id } });
    const rawUsers = await this.prisma.$queryRaw<any[]>`
      SELECT isSuperAdmin FROM User WHERE id = ${stored.userId} LIMIT 1
    `;
    const isSuperAdmin = rawUsers?.[0]?.isSuperAdmin == 1;
    return this.generateTokens(stored.user, isSuperAdmin);
  }

  async logout(userId: string) {
    await this.prisma.refreshToken.deleteMany({ where: { userId } });
    return { message: 'Logged out successfully' };
  }

  async changePassword(userId: string, dto: any) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    const isValid = await bcrypt.compare(dto.currentPassword, user.password);
    if (!isValid) throw new BadRequestException('Current password is incorrect');
    const hashed = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.user.update({ where: { id: userId }, data: { password: hashed } });
    await this.prisma.refreshToken.deleteMany({ where: { userId } });
    return { message: 'Password changed successfully' };
  }

  // ─── FORGOT PASSWORD FLOW ─────────────────────────────────────────────────────
  // Step 1: User submits their email → we look them up, generate a single-use
  // reset token (30 min expiry), and "send" it (in this build we return the
  // token in the response so the frontend can render a reset link — production
  // would dispatch via email/SMTP). The endpoint always returns success to
  // prevent email-enumeration attacks (revealing which emails are registered).
  async forgotPassword(email: string) {
    // Find by email — User has composite unique [email, tenantId], so we use
    // findFirst to locate the matching user across all tenants. If multiple
    // tenants share the same email (rare), we reset the most recently created.
    const user = await this.prisma.user.findFirst({
      where: { email: email?.toLowerCase().trim() },
      orderBy: { createdAt: 'desc' },
    });

    if (!user) {
      // Don't reveal that the email isn't registered — return generic success.
      return { message: 'If that email is registered, a reset link has been sent.' };
    }

    // Invalidate any prior unused tokens for this user
    await this.prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } });

    // Generate a cryptographically-strong token (URL-safe base64)
    const crypto = await import('crypto');
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    await this.prisma.passwordResetToken.create({
      data: { userId: user.id, token, expiresAt },
    });

    // NOTE: in production, send this via SMTP/SendGrid. For dev/demo we return
    // the token so the frontend can build a /reset-password?token=... link.
    return {
      message: 'If that email is registered, a reset link has been sent.',
      // Demo/dev only — production should drop this field and use SMTP.
      resetToken: token,
      resetUrl: `/reset-password?token=${token}`,
    };
  }

  // Step 2: User submits the new password + the token. We verify the token,
  // check expiry, ensure single-use, then update the password and revoke all
  // existing sessions (refresh tokens) for security.
  async resetPassword(token: string, newPassword: string) {
    if (!token || !newPassword) {
      throw new BadRequestException('Token and new password are required');
    }
    if (newPassword.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }

    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: { token },
    });
    if (!resetToken) throw new BadRequestException('Invalid or expired reset token');
    if (resetToken.usedAt) throw new BadRequestException('This reset link has already been used');
    if (resetToken.expiresAt < new Date()) throw new BadRequestException('This reset link has expired');

    const hashed = await bcrypt.hash(newPassword, 12);

    await this.prisma.$transaction([
      // Update the password
      this.prisma.user.update({
        where: { id: resetToken.userId },
        data: { password: hashed },
      }),
      // Mark the token as used
      this.prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
      // Revoke all existing sessions — force re-login everywhere
      this.prisma.refreshToken.deleteMany({ where: { userId: resetToken.userId } }),
    ]);

    return { message: 'Password reset successful. Please sign in with your new password.' };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          include: {
            role: { include: { rolePermissions: { include: { permission: true } } } },
          },
        },
        school: true,
        tenant: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');
    const { password, ...safeUser } = user;
    return safeUser;
  }

  async generateTokens(user: any, isSuperAdmin: boolean) {
    const payload: any = { sub: user.id, email: user.email, isSuperAdmin };
    if (user.tenantId) payload.tenantId = user.tenantId;
    if (user.schoolId) payload.schoolId = user.schoolId;
    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
    const refreshTokenValue = uuidv4();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await this.prisma.refreshToken.create({
      data: { userId: user.id, token: refreshTokenValue, expiresAt },
    });
    return { accessToken, refreshToken: refreshTokenValue };
  }
}