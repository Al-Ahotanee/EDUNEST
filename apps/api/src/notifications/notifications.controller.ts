import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}
  @Get() list(@CurrentUser('id') userId: string, @Query() q: PaginationDto & { unread?: boolean }) { return this.notificationsService.getUserNotifications(userId, q); }
  @Get('stats') stats(@CurrentUser('id') userId: string) { return this.notificationsService.getStats(userId); }
  @Patch(':id/read') markRead(@Param('id') id: string, @CurrentUser('id') userId: string) { return this.notificationsService.markRead(id, userId); }
  @Patch('read-all') markAllRead(@CurrentUser('id') userId: string) { return this.notificationsService.markAllRead(userId); }
  @Post('send') send(@Body() body: any, @CurrentUser('tenantId') tenantId: string, @CurrentUser('schoolId') schoolId: string) { return this.notificationsService.sendNotification(body, tenantId, schoolId); }
}
