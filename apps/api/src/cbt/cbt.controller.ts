import { Controller, Get, Post, Put, Delete, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CbtService } from './cbt.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';

@ApiTags('CBT')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cbt')
export class CbtController {
  constructor(private cbtService: CbtService) {}

  @Post('examinations')
  create(@Body() body: any, @CurrentUser('schoolId') schoolId: string) {
    return this.cbtService.createExam(body, schoolId);
  }

  @Get('examinations')
  list(@CurrentUser('schoolId') schoolId: string, @Query() q: PaginationDto) {
    return this.cbtService.listExams(schoolId, q);
  }

  @Get('examinations/:id')
  getOne(@Param('id') id: string, @CurrentUser('schoolId') schoolId: string) {
    return this.cbtService.getExam(id, schoolId);
  }

  @Put('examinations/:id')
  update(@Param('id') id: string, @CurrentUser('schoolId') schoolId: string, @Body() body: any) {
    return this.cbtService.updateExam(id, schoolId, body);
  }

  @Delete('examinations/:id')
  remove(@Param('id') id: string, @CurrentUser('schoolId') schoolId: string) {
    return this.cbtService.deleteExam(id, schoolId);
  }

  @Patch('examinations/:id/publish')
  publish(@Param('id') id: string, @CurrentUser('schoolId') schoolId: string) {
    return this.cbtService.publishExam(id, schoolId);
  }

  @Patch('examinations/:id/unpublish')
  unpublish(@Param('id') id: string, @CurrentUser('schoolId') schoolId: string) {
    return this.cbtService.unpublishExam(id, schoolId);
  }

  @Get('examinations/:id/questions')
  getQuestions(@Param('id') id: string, @CurrentUser('schoolId') schoolId: string) {
    return this.cbtService.getQuestions(id, schoolId);
  }

  @Post('examinations/:id/questions')
  addQuestion(@Param('id') id: string, @CurrentUser('schoolId') schoolId: string, @Body() body: any) {
    return this.cbtService.addQuestion(id, schoolId, body);
  }

  @Put('examinations/:id/questions/:qId')
  updateQuestion(@Param('qId') qId: string, @CurrentUser('schoolId') schoolId: string, @Body() body: any) {
    return this.cbtService.updateQuestion(qId, schoolId, body);
  }

  @Delete('examinations/:id/questions/:qId')
  deleteQuestion(@Param('qId') qId: string, @CurrentUser('schoolId') schoolId: string) {
    return this.cbtService.deleteQuestion(qId, schoolId);
  }

  @Get('examinations/:id/attempts')
  getAttempts(@Param('id') id: string, @CurrentUser('schoolId') schoolId: string) {
    return this.cbtService.getAttempts(id, schoolId);
  }

  @Get('examinations/:id/stats')
  getStats(@Param('id') id: string, @CurrentUser('schoolId') schoolId: string) {
    return this.cbtService.getExamStats(id, schoolId);
  }
}
