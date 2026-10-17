import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class MarketerGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest();
    if (!user || user.role !== 'marketer') {
      throw new ForbiddenException('Access denied. Marketers only.');
    }
    return true;
  }
}
