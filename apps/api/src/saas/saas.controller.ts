import { Controller, Get, Post, Patch, Body, Param, Query, Headers, Ip, BadRequestException, Req } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SaasService } from './saas.service';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('SaaS')
@Controller('saas')
export class SaasController {
  constructor(private saasService: SaasService) {}

  @Public()
  @Post('register')
  registerSchool(@Body() body: any) { return this.saasService.registerSchool(body); }

  // EDN-slug fix: live availability check used by the registration form
  // so users can see whether a slug is taken BEFORE submitting. Returns
  // { available: boolean, slug: string, suggestion?: string }.
  @Public()
  @Get('check-slug/:slug')
  @ApiOperation({ summary: 'Check if a school slug (subdomain) is available' })
  checkSlug(@Param('slug') slug: string) { return this.saasService.checkSlugAvailability(slug); }

  @Public()
  @Get('school/:slug')
  getSchoolInfo(@Param('slug') slug: string) { return this.saasService.getPublicSchoolInfo(slug); }

  // EDN-001: Public admission submission endpoint. Uses honeypot field
  // (`website` — must be empty for humans) to filter bots. Combined with
  // NestJS rate-limit middleware (configured in main.ts), this prevents
  // automated spam submissions without blocking legitimate parents.
  @Public()
  @Post('school/:slug/apply')
  @ApiOperation({ summary: 'Submit a public admission application' })
  applyAdmission(
    @Param('slug') slug: string,
    @Body() body: any,
    @Ip() ip: string,
  ) {
    // Honeypot: real users never fill the hidden `website` field.
    // Bots that auto-fill all form fields will trip this.
    if (body?.website && body.website.trim().length > 0) {
      throw new BadRequestException('Invalid submission');
    }
    // Strip honeypot + internal metadata before persistence
    const { website, _csrf, _honeypot, ...clean } = body;
    return this.saasService.submitAdmissionApplication(slug, clean);
  }

  @Public()
  @Post('webhook/paystack')
  paystackWebhook(
    @Body() body: any,
    @Headers('x-paystack-signature') signature?: string,
    @Req() req?: any,
  ) {
    const rawBody = req?.rawBody;
    return this.saasService.handlePaystackWebhook(body, signature, rawBody);
  }
}
