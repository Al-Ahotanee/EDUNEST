import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get('overview')
  overview(@CurrentUser('schoolId') schoolId: string) {
    return this.reportsService.getOverview(schoolId);
  }

  @Get('enrollment')
  enrollment(@CurrentUser('schoolId') schoolId: string) {
    return this.reportsService.getEnrollment(schoolId);
  }

  @Get('attendance')
  attendance(@CurrentUser('schoolId') schoolId: string, @Query() query: any) {
    return this.reportsService.getAttendance(schoolId, query);
  }

  @Get('finance')
  finance(@CurrentUser('schoolId') schoolId: string, @Query() query: any) {
    return this.reportsService.getFinance(schoolId, query);
  }
}
