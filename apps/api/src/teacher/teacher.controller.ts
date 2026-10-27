import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TeacherService } from './teacher.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Teacher')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('teacher')
export class TeacherController {
  constructor(private teacherService: TeacherService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get aggregated dashboard summary for Class Master and Subject Teacher' })
  getDashboard(
    @CurrentUser() user: any,
    @CurrentUser('schoolId') schoolId: string,
  ) {
    return this.teacherService.getDashboardSummary(user, schoolId);
  }

  @Get('my-class')
  @ApiOperation({ summary: 'Get Class Master assigned class details, student roster, and today attendance' })
  getMyClass(
    @CurrentUser() user: any,
    @CurrentUser('schoolId') schoolId: string,
    @Query('classId') classId?: string,
  ) {
    return this.teacherService.getMyClass(user, schoolId, classId);
  }

  @Get('my-schedule')
  @ApiOperation({ summary: 'Get timetable slots and daily teaching schedule for the authenticated teacher' })
  getMySchedule(
    @CurrentUser() user: any,
    @CurrentUser('schoolId') schoolId: string,
  ) {
    return this.teacherService.getMySchedule(user, schoolId);
  }
}
