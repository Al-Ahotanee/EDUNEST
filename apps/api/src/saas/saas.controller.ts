import { Controller, Get, Post, Patch, Body, Param, Query, Headers } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SaasService } from './saas.service';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('SaaS')
@Controller('saas')
export class SaasController {
  constructor(private saasService: SaasService) {}

  @Public()
  @Post('register')
  registerSchool(@Body() body: any) { return this.saasService.registerSchool(body); }

  @Public()
  @Get('school/:slug')
  getSchoolInfo(@Param('slug') slug: string) { return this.saasService.getPublicSchoolInfo(slug); }

  @Public()
  @Post('school/:slug/apply')
  applyAdmission(@Param('slug') slug: string, @Body() body: any) { return this.saasService.submitAdmissionApplication(slug, body); }

  @Public()
  @Post('webhook/paystack')
  paystackWebhook(@Body() body: any, @Headers('x-paystack-signature') signature?: string) {
    return this.saasService.handlePaystackWebhook(body, signature);
  }
}
