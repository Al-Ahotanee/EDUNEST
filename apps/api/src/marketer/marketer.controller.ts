import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { MarketerService } from './marketer.service';
import { Public } from '../common/decorators/public.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { MarketerGuard } from '../common/guards/marketer.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Marketer Portal')
@Controller('marketer')
export class MarketerController {
  constructor(private service: MarketerService) {}

  @Public()
  @Post('auth/login')
  login(@Body() body: { email: string; password: string }) {
    return this.service.login(body.email, body.password);
  }

  @UseGuards(JwtAuthGuard, MarketerGuard)
  @Get('dashboard')
  dashboard(@CurrentUser('id') id: string) { return this.service.getDashboard(id); }

  @UseGuards(JwtAuthGuard, MarketerGuard)
  @Get('referrals')
  referrals(@CurrentUser('id') id: string) { return this.service.getReferrals(id); }
}
