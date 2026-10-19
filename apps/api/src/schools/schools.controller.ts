import { Controller, Get, Put, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SchoolsService } from './schools.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Schools')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('schools')
export class SchoolsController {
  constructor(private schoolsService: SchoolsService) {}

  @Get('current')
  getCurrent(@CurrentUser('schoolId') schoolId: string) {
    return this.schoolsService.getCurrentSchool(schoolId);
  }

  @Put('current')
  @Roles('Super Admin')
  updateCurrent(@CurrentUser('schoolId') schoolId: string, @Body() body: any) {
    return this.schoolsService.updateCurrentSchool(schoolId, body);
  }

  @Public()
  @Get(':idOrSlug/branding')
  getBranding(@Param('idOrSlug') idOrSlug: string) {
    return this.schoolsService.getSchoolBranding(idOrSlug);
  }

  @Put(':idOrSlug/branding')
  @Roles('Super Admin')
  updateBranding(@Param('idOrSlug') idOrSlug: string, @Body() body: any) {
    return this.schoolsService.updateSchoolBranding(idOrSlug, body);
  }
}

