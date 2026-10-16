import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ResultsService } from './results.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Results')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('results')
export class ResultsController {
  constructor(private resultsService: ResultsService) {}

  @Post('score')
  enterScore(@Body() body: any, @CurrentUser('schoolId') schoolId: string) {
    return this.resultsService.enterScore(body, schoolId);
  }

  @Post('bulk-score')
  bulkEnterScores(@Body() body: { scores: any[] }, @CurrentUser('schoolId') schoolId: string) {
    return this.resultsService.bulkEnterScores(body.scores, schoolId);
  }

  @Get('class/:classId/term/:termId')
  getClassResults(
    @Param('classId') classId: string,
    @Param('termId') termId: string,
    @CurrentUser('schoolId') schoolId: string,
  ) {
    return this.resultsService.getClassResults(classId, termId, schoolId);
  }

  @Get('report-card/student/:studentId/term/:termId')
  generateReportCard(
    @Param('studentId') studentId: string,
    @Param('termId') termId: string,
    @CurrentUser('schoolId') schoolId: string,
  ) {
    return this.resultsService.generateReportCard(studentId, termId, schoolId);
  }

  @Post('approve/term/:termId')
  approveResults(
    @Param('termId') termId: string,
    @CurrentUser('schoolId') schoolId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.resultsService.approveResults(termId, schoolId, userId);
  }

  @Get('statistics/term/:termId')
  getStatistics(
    @Param('termId') termId: string,
    @CurrentUser('schoolId') schoolId: string,
  ) {
    return this.resultsService.getResultStatistics(schoolId, termId);
  }
}
