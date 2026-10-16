import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AdmissionsService } from './admissions.service';
import { Public } from '../common/decorators/public.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';

@ApiTags('Admissions')
@Controller('admissions')
export class AdmissionsController {
  constructor(private admissionsService: AdmissionsService) {}

  // Admin routes
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get()
  list(@CurrentUser('schoolId') schoolId: string, @Query() q: PaginationDto & { status?: string }) {
    return this.admissionsService.listApplications(schoolId, q);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('stats')
  stats(@CurrentUser('schoolId') schoolId: string) {
    return this.admissionsService.getAdmissionStats(schoolId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  getOne(@Param('id') id: string, @CurrentUser('schoolId') schoolId: string) {
    return this.admissionsService.getApplication(id, schoolId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch(':id/approve')
  approve(@Param('id') id: string, @CurrentUser('schoolId') schoolId: string) {
    return this.admissionsService.approveApplication(id, schoolId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch(':id/reject')
  reject(@Param('id') id: string, @CurrentUser('schoolId') schoolId: string, @Body() body: { reason?: string }) {
    return this.admissionsService.rejectApplication(id, schoolId, body.reason);
  }
}

@ApiTags('Public')
@Controller('public')
export class PublicController {
  constructor(private admissionsService: AdmissionsService) {}

  @Public()
  @Get('school/:slug')
  getSchool(@Param('slug') slug: string) {
    const saasService = (this.admissionsService as any).prisma;
    return (this.admissionsService as any).saasService?.getPublicSchoolInfo(slug)
      || this.admissionsService['prisma'].tenant.findUnique({ where: { slug, isActive: true } }).then((t: any) => ({ success: true, data: t }));
  }

  @Public()
  @Post('admissions/:slug')
  submit(@Param('slug') slug: string, @Body() body: any) {
    return this.admissionsService.submitApplication(slug, body);
  }
}
