import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'school-erp-secret-key',
    });
  }

  async validate(payload: any) {
    // Platform super admin — no tenant lookup needed
    if (payload.isSuperAdmin) {
      const user = await this.prisma.user.findFirst({
        where: { id: payload.sub, isSuperAdmin: true, isActive: true },
      });
      if (!user) throw new UnauthorizedException('Super admin not found or inactive');
      return {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isSuperAdmin: true,
        tenantId: null,
        schoolId: null,
        roles: [],
      };
    }

    // Marketer
    if (payload.role === 'marketer') {
      const marketer = await this.prisma.marketer.findFirst({
        where: { id: payload.sub, isActive: true },
      });
      if (!marketer) throw new UnauthorizedException('Marketer not found or inactive');
      return {
        id: marketer.id,
        email: marketer.email,
        firstName: marketer.firstName,
        lastName: marketer.lastName,
        role: 'marketer',
        isSuperAdmin: false,
        tenantId: null,
        schoolId: null,
        roles: [{ name: 'marketer', permissions: [] }],
      };
    }

    // Regular tenant user
    const user = await this.prisma.user.findFirst({
      where: { id: payload.sub, isActive: true },
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
      },
    });

    if (!user) throw new UnauthorizedException('User not found or inactive');

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      tenantId: user.tenantId,
      schoolId: user.schoolId,
      isSuperAdmin: false,
      roles: user.userRoles.map((ur) => ({
        id: ur.role.id,
        name: ur.role.name,
        permissions: ur.role.rolePermissions.map((rp) => ({
          module: rp.permission.module,
          action: rp.permission.action,
        })),
      })),
    };
  }
}
