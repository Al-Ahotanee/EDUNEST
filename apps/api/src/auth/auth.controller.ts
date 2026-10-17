import { Controller, Post, Get, Body, Req, UseGuards, Patch } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Request } from 'express';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('login')
  login(@Body() body: any, @Req() req: Request) {
    return this.authService.login(body, req.ip, req.headers['user-agent']);
  }

  @Public()
  @Post('register')
  register(@Body() body: any) {
    return this.authService.register(body);
  }

  @Public()
  @Post('refresh')
  refresh(@Body() body: { refreshToken: string }) {
    return this.authService.refreshToken(body);
  }

  @Post('logout')
  @ApiBearerAuth()
  logout(@CurrentUser('id') userId: string) {
    return this.authService.logout(userId);
  }

  @Get('me')
  @ApiBearerAuth()
  getProfile(@CurrentUser('id') userId: string) {
    return this.authService.getProfile(userId);
  }

  @Patch('change-password')
  @ApiBearerAuth()
  changePassword(@CurrentUser('id') userId: string, @Body() body: any) {
    return this.authService.changePassword(userId, body);
  }
}
