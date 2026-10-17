import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Patch } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AcademicService } from './academic.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Academic')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('academic')
export class AcademicController {
  constructor(private academicService: AcademicService) {}

  @Post('sessions') createSession(@Body() body: any, @CurrentUser('schoolId') schoolId: string) { return this.academicService.createSession(body, schoolId); }
  @Get('sessions') getSessions(@CurrentUser('schoolId') schoolId: string) { return this.academicService.getSessions(schoolId); }
  @Patch('sessions/:id/current') setCurrentSession(@Param('id') id: string, @CurrentUser('schoolId') schoolId: string) { return this.academicService.setCurrentSession(id, schoolId); }

  @Post('sessions/:sessionId/terms') createTerm(@Param('sessionId') sessionId: string, @Body() body: any) { return this.academicService.createTerm(sessionId, body); }
  @Get('sessions/:sessionId/terms') getTerms(@Param('sessionId') sessionId: string) { return this.academicService.getTermsBySession(sessionId); }
  @Patch('terms/:termId/current') setCurrentTerm(@Param('termId') termId: string, @Query('sessionId') sessionId: string) { return this.academicService.setCurrentTerm(termId, sessionId); }

  @Post('classes') createClass(@Body() body: any, @CurrentUser('schoolId') schoolId: string) { return this.academicService.createClass(body, schoolId); }
  @Get('classes') getClasses(@CurrentUser('schoolId') schoolId: string) { return this.academicService.getClasses(schoolId); }
  @Put('classes/:id') updateClass(@Param('id') id: string, @CurrentUser('schoolId') schoolId: string, @Body() body: any) { return this.academicService.updateClass(id, schoolId, body); }
  @Delete('classes/:id') deleteClass(@Param('id') id: string, @CurrentUser('schoolId') schoolId: string) { return this.academicService.deleteClass(id, schoolId); }

  @Post('subjects') createSubject(@Body() body: any, @CurrentUser('schoolId') schoolId: string) { return this.academicService.createSubject(body, schoolId); }
  @Get('subjects') getSubjects(@CurrentUser('schoolId') schoolId: string) { return this.academicService.getSubjects(schoolId); }
  @Put('subjects/:id') updateSubject(@Param('id') id: string, @CurrentUser('schoolId') schoolId: string, @Body() body: any) { return this.academicService.updateSubject(id, schoolId, body); }

  @Post('enroll') enrollStudent(@Body() body: any, @CurrentUser('schoolId') schoolId: string) { return this.academicService.enrollStudent(body, schoolId); }
  @Get('classes/:classId/enrollments') getEnrollments(@Param('classId') classId: string, @Query('sessionId') sessionId: string) { return this.academicService.getClassEnrollments(classId, sessionId); }
  @Post('promote') promoteStudents(@Body() body: any, @CurrentUser('schoolId') schoolId: string) { return this.academicService.promoteStudents(body.fromClassId, body.toClassId, body.sessionId, schoolId); }
}
