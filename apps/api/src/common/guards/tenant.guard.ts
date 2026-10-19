import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Unauthenticated or public requests are handled by JwtAuthGuard / Public decorator
    if (!user) {
      return true;
    }

    // Platform Super Admin bypasses tenant isolation
    if (user.isSuperAdmin) {
      return true;
    }

    // Marketers have their own dedicated paths and guard
    if (user.role === 'marketer') {
      return true;
    }

    // Check URL parameters for explicit tenant or school mismatch
    const params = request.params || {};
    const query = request.query || {};
    const body = request.body || {};

    const targetSchoolId = params.schoolId || params.id;
    const targetTenantId = params.tenantId;

    if (targetSchoolId && request.route?.path?.includes('/schools/') && user.schoolId && targetSchoolId !== user.schoolId) {
      // Allow if it's the school's own ID
      if (targetSchoolId !== user.schoolId) {
        throw new ForbiddenException('Access denied: cross-tenant access prohibited');
      }
    }

    if (targetTenantId && user.tenantId && targetTenantId !== user.tenantId) {
      throw new ForbiddenException('Access denied: cross-tenant access prohibited');
    }

    return true;
  }
}
