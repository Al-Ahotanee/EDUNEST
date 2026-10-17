import { Injectable, NestInterceptor, ExecutionContext, CallHandler, ForbiddenException } from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class TenantInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Skip for super admin and marketers
    if (!user || user.isSuperAdmin || user.role === 'marketer') {
      return next.handle();
    }

    // Inject tenantId/schoolId so services don't need to trust body params
    if (user.tenantId) {
      request.tenantId = user.tenantId;
      request.schoolId = user.schoolId;
    }

    return next.handle();
  }
}
