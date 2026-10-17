import { Controller, Get, Post, Body, Query, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AttendanceService } from './attendance.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';

@ApiTags('Attendance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('attendance')
export class AttendanceController {
  constructor(private attendanceService: AttendanceService) {}
  @Post() mark(@Body() body: any, @CurrentUser('schoolId') schoolId: string) { return this.attendanceService.markAttendance(body, schoolId); }
  @Post('bulk') bulkMark(@Body() body: any, @CurrentUser('schoolId') schoolId: string) { return this.attendanceService.bulkMarkAttendance(body, schoolId); }
  @Get() list(@CurrentUser('schoolId') schoolId: string, @Query() query: PaginationDto & { classId?: string; termId?: string; date?: string; studentId?: string }) { return this.attendanceService.getAttendance(schoolId, query); }
  @Get('statistics') stats(@CurrentUser('schoolId') schoolId: string, @Query() query: { classId?: string; termId?: string }) { return this.attendanceService.getStatistics(schoolId, query); }
  @Get('student/:studentId') studentSummary(@Param('studentId') studentId: string, @Query('termId') termId?: string) { return this.attendanceService.getStudentAttendanceSummary(studentId, termId); }
}
