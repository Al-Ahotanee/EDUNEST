import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class SystemAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest();
    if (!user || !user.isSuperAdmin) {
      throw new ForbiddenException('Access denied. Platform administrators only.');
    }
    return true;
  }
}
