import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Patch } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AcademicService } from './academic.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Academic')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('academic')
export class AcademicController {
  constructor(private academicService: AcademicService) {}

  @Post('sessions')
  @Roles('Super Admin', 'Admin', 'School Admin', 'Principal')
  createSession(@Body() body: any, @CurrentUser('schoolId') schoolId: string) { return this.academicService.createSession(body, schoolId); }

  @Get('sessions')
  getSessions(@CurrentUser('schoolId') schoolId: string) { return this.academicService.getSessions(schoolId); }

  @Patch('sessions/:id/current')
  @Roles('Super Admin', 'Admin', 'School Admin', 'Principal')
  setCurrentSession(@Param('id') id: string, @CurrentUser('schoolId') schoolId: string) { return this.academicService.setCurrentSession(id, schoolId); }

  @Post('sessions/:sessionId/terms')
  @Roles('Super Admin', 'Admin', 'School Admin', 'Principal')
  createTerm(@Param('sessionId') sessionId: string, @Body() body: any) { return this.academicService.createTerm(sessionId, body); }

  @Get('sessions/:sessionId/terms')
  getTerms(@Param('sessionId') sessionId: string) { return this.academicService.getTermsBySession(sessionId); }

  @Patch('terms/:termId/current')
  @Roles('Super Admin', 'Admin', 'School Admin', 'Principal')
  setCurrentTerm(@Param('termId') termId: string, @Query('sessionId') sessionId: string) { return this.academicService.setCurrentTerm(termId, sessionId); }

  @Post('classes')
  @Roles('Super Admin', 'Admin', 'School Admin', 'Principal')
  createClass(@Body() body: any, @CurrentUser('schoolId') schoolId: string) { return this.academicService.createClass(body, schoolId); }

  @Get('classes')
  getClasses(@CurrentUser('schoolId') schoolId: string) { return this.academicService.getClasses(schoolId); }

  @Put('classes/:id')
  @Roles('Super Admin', 'Admin', 'School Admin', 'Principal')
  updateClass(@Param('id') id: string, @CurrentUser('schoolId') schoolId: string, @Body() body: any) { return this.academicService.updateClass(id, schoolId, body); }

  @Delete('classes/:id')
  @Roles('Super Admin', 'Admin', 'School Admin', 'Principal')
  deleteClass(@Param('id') id: string, @CurrentUser('schoolId') schoolId: string) { return this.academicService.deleteClass(id, schoolId); }

  @Post('subjects')
  @Roles('Super Admin', 'Admin', 'School Admin', 'Principal')
  createSubject(@Body() body: any, @CurrentUser('schoolId') schoolId: string) { return this.academicService.createSubject(body, schoolId); }

  @Get('subjects')
  getSubjects(@CurrentUser('schoolId') schoolId: string) { return this.academicService.getSubjects(schoolId); }

  @Put('subjects/:id')
  @Roles('Super Admin', 'Admin', 'School Admin', 'Principal')
  updateSubject(@Param('id') id: string, @CurrentUser('schoolId') schoolId: string, @Body() body: any) { return this.academicService.updateSubject(id, schoolId, body); }

  @Post('enroll')
  @Roles('Super Admin', 'Admin', 'School Admin', 'Principal')
  enrollStudent(@Body() body: any, @CurrentUser('schoolId') schoolId: string) { return this.academicService.enrollStudent(body, schoolId); }

  @Get('classes/:classId/enrollments')
  getEnrollments(@Param('classId') classId: string, @Query('sessionId') sessionId: string) { return this.academicService.getClassEnrollments(classId, sessionId); }

  @Post('promote')
  @Roles('Super Admin', 'Admin', 'School Admin', 'Principal')
  promoteStudents(@Body() body: any, @CurrentUser('schoolId') schoolId: string) { return this.academicService.promoteStudents(body.fromClassId, body.toClassId, body.sessionId, schoolId); }
}
