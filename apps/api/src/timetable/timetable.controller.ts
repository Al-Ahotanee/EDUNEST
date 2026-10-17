import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, Patch } from '@nestjs/common';
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

  // ─── RELIEF / SUBSTITUTE TEACHER ENDPOINTS (P0-18 fix) ─────────────────────
  @Get('relief')
  listRelief(@CurrentUser('schoolId') schoolId: string, @Query('from') from?: string, @Query('to') to?: string) {
    return this.timetableService.listReliefAssignments(schoolId, from, to);
  }

  @Post('relief')
  createRelief(@Body() body: any, @CurrentUser('schoolId') schoolId: string) {
    return this.timetableService.createReliefAssignment(body, schoolId);
  }

  @Patch('relief/:id')
  updateRelief(@Param('id') id: string, @Body() body: any, @CurrentUser('schoolId') schoolId: string) {
    return this.timetableService.updateReliefAssignment(id, body, schoolId);
  }

  @Delete('relief/:id')
  deleteRelief(@Param('id') id: string, @CurrentUser('schoolId') schoolId: string) {
    return this.timetableService.deleteReliefAssignment(id, schoolId);
  }

  @Delete(':id') remove(@Param('id') id: string, @CurrentUser('schoolId') schoolId: string) { return this.timetableService.deleteSlot(id, schoolId); }
}
