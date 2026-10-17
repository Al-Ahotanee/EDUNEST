import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { TimetableService } from './timetable.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Timetable')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('timetable')
export class TimetableController {
  constructor(private timetableService: TimetableService) {}
  @Post() create(@Body() body: any, @CurrentUser('schoolId') schoolId: string) { return this.timetableService.createSlot(body, schoolId); }
  @Post('batch') createBatch(@Body() body: { slots: any[]; classIds?: string[] }, @CurrentUser('schoolId') schoolId: string) { return this.timetableService.createBatch(body, schoolId); }
  @Post('clear-class/:classId') clearClass(@Param('classId') classId: string, @CurrentUser('schoolId') schoolId: string) { return this.timetableService.clearClassSlots(classId, schoolId); }
  @Post('clear-school') clearSchool(@CurrentUser('schoolId') schoolId: string) { return this.timetableService.clearSchoolSlots(schoolId); }
  @Get('school') getSchool(@CurrentUser('schoolId') schoolId: string) { return this.timetableService.getSchoolTimetable(schoolId); }
  @Get('class/:classId') getByClass(@Param('classId') classId: string) { return this.timetableService.getByClass(classId); }
  @Get('staff/:staffId') getByStaff(@Param('staffId') staffId: string) { return this.timetableService.getByStaff(staffId); }
  @Delete(':id') remove(@Param('id') id: string, @CurrentUser('schoolId') schoolId: string) { return this.timetableService.deleteSlot(id, schoolId); }
}
