import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ParentService } from './parent.service';
import { Public } from '../common/decorators/public.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Parent Portal')
@Controller('parent')
export class ParentController {
  constructor(private service: ParentService) {}

  @Public()
  @Post('auth/login')
  login(@Body() body: { email: string; password: string; tenantSlug?: string }) {
    return this.service.login(body.email, body.password, body.tenantSlug);
  }

  @UseGuards(JwtAuthGuard)
  @Get('dashboard')
  dashboard(@CurrentUser('id') userId: string) { return this.service.getDashboard(userId); }

  @UseGuards(JwtAuthGuard)
  @Get('results')
  results(@CurrentUser('id') userId: string) { return this.service.getResults(userId); }

  @UseGuards(JwtAuthGuard)
  @Get('attendance')
  attendance(@CurrentUser('id') userId: string) { return this.service.getAttendance(userId); }

  @UseGuards(JwtAuthGuard)
  @Get('fees')
  fees(@CurrentUser('id') userId: string) { return this.service.getFees(userId); }

  @UseGuards(JwtAuthGuard)
  @Get('notifications')
  notifications(@CurrentUser('id') userId: string) { return this.service.getNotifications(userId); }

  @UseGuards(JwtAuthGuard)
  @Patch('notifications/:id/read')
  markRead(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.service.markNotificationRead(userId, id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  profile(@CurrentUser('id') userId: string) { return this.service.getProfile(userId); }
}
