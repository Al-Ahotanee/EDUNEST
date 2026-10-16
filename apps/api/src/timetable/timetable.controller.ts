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
  @Get('school') getSchool(@CurrentUser('schoolId') schoolId: string) { return this.timetableService.getSchoolTimetable(schoolId); }
  @Get('class/:classId') getByClass(@Param('classId') classId: string) { return this.timetableService.getByClass(classId); }
  @Get('staff/:staffId') getByStaff(@Param('staffId') staffId: string) { return this.timetableService.getByStaff(staffId); }
  @Delete(':id') remove(@Param('id') id: string, @CurrentUser('schoolId') schoolId: string) { return this.timetableService.deleteSlot(id, schoolId); }
}
