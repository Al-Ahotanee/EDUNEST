import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { successResponse, paginate, safeSkip, safeTake, PaginationDto } from '../common/dto/pagination.dto';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async getUserNotifications(userId: string, query: PaginationDto & { unread?: boolean }) {
    const {  unread } = query;
    const where = { userId, ...(unread && { isRead: false }) };
    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({ where, skip: safeSkip(query), take: safeTake(query), orderBy: { createdAt: 'desc' } }),
      this.prisma.notification.count({ where }),
    ]);
    return paginate(data, total, query);
  }

  async markRead(id: string, userId: string) {
    const n = await this.prisma.notification.update({ where: { id }, data: { isRead: true, readAt: new Date() } });
    return successResponse(n, 'Marked as read');
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true, readAt: new Date() } });
    return successResponse(null, 'All marked as read');
  }

  async sendNotification(data: { title: string; message: string; type: string; targetRole?: string }, tenantId: string, schoolId: string) {
    // ─── VALIDATION ─────────────────────────────────────────────────────────────
    if (!data?.title || typeof data.title !== 'string' || data.title.trim().length < 1) {
      throw new BadRequestException('Notification title is required');
    }
    if (data.title.length > 200) {
      throw new BadRequestException('Notification title cannot exceed 200 characters');
    }
    if (!data?.message || typeof data.message !== 'string' || data.message.trim().length < 1) {
      throw new BadRequestException('Notification message is required');
    }
    if (data.message.length > 5000) {
      throw new BadRequestException('Notification message cannot exceed 5000 characters');
    }
    const allowedTypes = ['INFO', 'WARNING', 'SUCCESS', 'ERROR', 'SYSTEM'];
    if (data.type && !allowedTypes.includes(data.type)) {
      throw new BadRequestException(`Invalid notification type. Allowed: ${allowedTypes.join(', ')}`);
    }

    let users: any[] = [];
    if (data.targetRole) {
      users = await this.prisma.user.findMany({
        where: { tenantId, schoolId, isActive: true, userRoles: { some: { role: { name: data.targetRole } } } },
        select: { id: true },
      });
    } else {
      users = await this.prisma.user.findMany({ where: { tenantId, schoolId, isActive: true }, select: { id: true } });
    }
    await this.prisma.notification.createMany({
      data: users.map(u => ({ userId: u.id, title: data.title, message: data.message, type: data.type as any })),
    });
    return successResponse({ sent: users.length }, `Notification sent to ${users.length} users`);
  }

  async createNotification(userId: string, title: string, message: string, type: string = 'INFO', link?: string) {
    return this.prisma.notification.create({ data: { userId, title, message, type: type as any, link } });
  }

  async getStats(userId: string) {
    const [total, unread, today] = await Promise.all([
      this.prisma.notification.count({ where: { userId } }),
      this.prisma.notification.count({ where: { userId, isRead: false } }),
      this.prisma.notification.count({ where: { userId, createdAt: { gte: new Date(new Date().setHours(0,0,0,0)) } } }),
    ]);
    const system = await this.prisma.notification.count({ where: { userId, type: 'SYSTEM' } });
    return successResponse({ total, unread, today, system });
  }
}
