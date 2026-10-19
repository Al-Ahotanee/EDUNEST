import {
  Controller,
  Get,
  Put,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SchoolWebsiteService } from './school-website.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('School Website')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('schools/:idOrSlug')
export class SchoolWebsiteController {
  constructor(private readonly websiteService: SchoolWebsiteService) {}

  @Public()
  @Get('website')
  getPublicWebsite(@Param('idOrSlug') idOrSlug: string) {
    return this.websiteService.getPublicWebsite(idOrSlug);
  }

  @Public()
  @Get('fee-schedules')
  getPublicFeeSchedules(@Param('idOrSlug') idOrSlug: string) {
    return this.websiteService.getPublicFeeSchedules(idOrSlug);
  }

  @Public()
  @Post('inquiries')
  submitInquiry(@Param('idOrSlug') idOrSlug: string, @Body() body: any) {
    return this.websiteService.submitInquiry(idOrSlug, body);
  }

  @ApiBearerAuth()
  @Roles('Super Admin')
  @Get('website/admin')
  getAdminWebsiteConfig(@Param('idOrSlug') idOrSlug: string) {
    return this.websiteService.getAdminWebsiteConfig(idOrSlug);
  }

  @ApiBearerAuth()
  @Roles('Super Admin')
  @Put('website')
  updateWebsiteConfig(@Param('idOrSlug') idOrSlug: string, @Body() body: any) {
    return this.websiteService.updateWebsiteConfig(idOrSlug, body);
  }

  @ApiBearerAuth()
  @Roles('Super Admin')
  @Get('inquiries')
  listInquiries(@Param('idOrSlug') idOrSlug: string, @Query() query: any) {
    return this.websiteService.listInquiries(idOrSlug, query);
  }

  @ApiBearerAuth()
  @Roles('Super Admin')
  @Patch('inquiries/:inquiryId')
  updateInquiry(
    @Param('idOrSlug') idOrSlug: string,
    @Param('inquiryId') inquiryId: string,
    @Body() body: any
  ) {
    return this.websiteService.updateInquiry(idOrSlug, inquiryId, body);
  }
}
