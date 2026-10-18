import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AdmissionsService } from './admissions.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';

@ApiTags('Admissions')
@Controller('admissions')
export class AdmissionsController {
  constructor(private admissionsService: AdmissionsService) {}

  // ─── Admin routes (require auth) ────────────────────────────────────────────
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
  approve(@Param('id') id: string, @CurrentUser('schoolId') schoolId: string, @Body() body?: { classId?: string }) {
    return this.admissionsService.approveApplication(id, schoolId, body);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch(':id/reject')
  reject(@Param('id') id: string, @CurrentUser('schoolId') schoolId: string, @Body() body: { reason?: string }) {
    return this.admissionsService.rejectApplication(id, schoolId, body.reason);
  }
}

// ─── NOTE ────────────────────────────────────────────────────────────────────
// The previous PublicController exposed duplicate /public/school/:slug and
// /public/admissions/:slug endpoints that conflicted with the canonical
// /saas/school/:slug and /saas/school/:slug/apply routes in SaasController.
// The duplicate routes used a different field mapping (parentFirstName +
// parentLastName) and a broken getSchool() helper that bypassed the SaaS
// service. Public admission submission is now exclusively handled by
// SaasController → SaasService.submitAdmissionApplication(slug, data).
// This resolves EDN-005 (slug resolution inconsistency).
