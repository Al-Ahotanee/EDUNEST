import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ResultsService } from './results.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { TeacherRoleType } from '@prisma/client';

@ApiTags('Results')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('results')
export class ResultsController {
  constructor(private resultsService: ResultsService) {}

  // ─── TEACHER ASSIGNMENTS & ROLES ───────────────────────────────────────────
  @Get('my-assignments')
  @ApiOperation({ summary: 'Get current logged-in teacher classes and subject assignments' })
  getMyAssignments(@CurrentUser() user: any, @CurrentUser('schoolId') schoolId: string) {
    return this.resultsService.getMyAssignments(user, schoolId);
  }

  @Get('teacher-assignments')
  @ApiOperation({ summary: 'List all teacher assignments for the school (Admin/Principal)' })
  getTeacherAssignments(
    @CurrentUser('schoolId') schoolId: string,
    @Query('userId') userId?: string,
  ) {
    return this.resultsService.getTeacherAssignments(schoolId, userId);
  }

  @Post('teacher-assignments')
  @ApiOperation({ summary: 'Assign a teacher as Class Master or Subject Teacher' })
  assignTeacher(
    @Body() body: { userId: string; classId: string; subjectId?: string; roleType: TeacherRoleType },
    @CurrentUser('schoolId') schoolId: string,
  ) {
    return this.resultsService.assignTeacher(body, schoolId);
  }

  @Delete('teacher-assignments/:id')
  @ApiOperation({ summary: 'Remove a teacher assignment' })
  deleteTeacherAssignment(
    @Param('id') id: string,
    @CurrentUser('schoolId') schoolId: string,
  ) {
    return this.resultsService.deleteTeacherAssignment(id, schoolId);
  }

  // ─── SPREADSHEET MATRIX SCORE ENTRY ─────────────────────────────────────────
  @Get('matrix')
  @ApiOperation({ summary: 'Fetch interactive spreadsheet matrix for batch score entry' })
  getScoreMatrix(
    @Query('classId') classId: string,
    @Query('subjectId') subjectId: string,
    @Query('termId') termId: string,
    @CurrentUser('schoolId') schoolId: string,
    @CurrentUser() user: any,
  ) {
    return this.resultsService.getScoreMatrix(classId, subjectId, termId, schoolId, user);
  }

  @Post('matrix/save')
  @ApiOperation({ summary: 'Save draft scores or submit to Principal for approval' })
  saveScoreMatrix(
    @Body()
    body: {
      classId: string;
      subjectId: string;
      termId: string;
      scores: Array<{
        studentId: string;
        ca1Score?: number;
        ca2Score?: number;
        ca3Score?: number;
        examScore?: number;
      }>;
      submitForApproval?: boolean;
    },
    @CurrentUser('schoolId') schoolId: string,
    @CurrentUser() user: any,
  ) {
    return this.resultsService.saveScoreMatrix(body, schoolId, user);
  }

  // ─── APPROVAL & PUBLISHING PIPELINE ─────────────────────────────────────────
  @Get('pipeline/:termId')
  @ApiOperation({ summary: 'Get overview of submissions, approvals, and publication status by class' })
  getApprovalPipeline(
    @Param('termId') termId: string,
    @CurrentUser('schoolId') schoolId: string,
  ) {
    return this.resultsService.getApprovalPipelineOverview(termId, schoolId);
  }

  @Post('approve')
  @ApiOperation({ summary: 'Principal / Admin approves submitted scores' })
  approveScores(
    @Body() body: { termId: string; classId?: string; subjectId?: string },
    @CurrentUser('schoolId') schoolId: string,
    @CurrentUser() user: any,
  ) {
    return this.resultsService.approveScores(body, schoolId, user);
  }

  @Post('publish')
  @ApiOperation({ summary: 'Principal / Admin publishes approved scores (locks results permanently)' })
  publishScores(
    @Body() body: { termId: string; classId?: string; subjectId?: string },
    @CurrentUser('schoolId') schoolId: string,
    @CurrentUser() user: any,
  ) {
    return this.resultsService.publishScores(body, schoolId, user);
  }

  @Post('unpublish')
  @ApiOperation({ summary: 'Principal / Admin emergency unlock (reverts status to DRAFT for corrections)' })
  unpublishScores(
    @Body() body: { termId: string; classId: string; subjectId?: string; reason?: string },
    @CurrentUser('schoolId') schoolId: string,
    @CurrentUser() user: any,
  ) {
    return this.resultsService.unpublishScores(body, schoolId, user);
  }

  // ─── MASTER CLASS BROADSHEET ────────────────────────────────────────────────
  @Get('broadsheet/:classId/:termId')
  @ApiOperation({ summary: 'Generate master class broadsheet across all subjects with positions' })
  getClassBroadsheet(
    @Param('classId') classId: string,
    @Param('termId') termId: string,
    @CurrentUser('schoolId') schoolId: string,
    @CurrentUser() user: any,
  ) {
    return this.resultsService.getClassBroadsheet(classId, termId, schoolId, user);
  }

  // ─── OFFICIAL REPORT CARD & ENDORSEMENTS ────────────────────────────────────
  @Get('report-card/student/:studentId/term/:termId')
  @ApiOperation({ summary: 'Generate formal official report card with school crest, cognitive marks, and affective/psychomotor domains' })
  generateReportCard(
    @Param('studentId') studentId: string,
    @Param('termId') termId: string,
    @CurrentUser('schoolId') schoolId: string,
  ) {
    return this.resultsService.generateReportCard(studentId, termId, schoolId);
  }

  @Post('report-card/endorse')
  @ApiOperation({ summary: 'Save Class Master and Principal remarks, ratings, and next term resumption' })
  endorseReportCard(
    @Body()
    body: {
      studentId: string;
      termId: string;
      classId: string;
      attendanceDaysTotal?: number;
      attendanceDaysPresent?: number;
      attendanceDaysAbsent?: number;
      classTeacherRemark?: string;
      principalRemark?: string;
      nextTermResumption?: string;
      promotionStatus?: string;
      affectiveRatings?: Record<string, number>;
      psychomotorRatings?: Record<string, number>;
    },
    @CurrentUser('schoolId') schoolId: string,
    @CurrentUser() user: any,
  ) {
    return this.resultsService.endorseReportCard(body, schoolId, user);
  }

  // ─── GRADING SCALES ──────────────────────────────────────────────────────────
  @Get('grading-scales')
  @ApiOperation({ summary: 'Get school grading scale configurations' })
  getGradingScales(@CurrentUser('schoolId') schoolId: string) {
    return this.resultsService.getGradingScales(schoolId);
  }

  @Put('grading-scales/:id')
  @ApiOperation({ summary: 'Update a grading scale range or remark' })
  updateGradingScale(
    @Param('id') id: string,
    @Body() body: any,
    @CurrentUser('schoolId') schoolId: string,
  ) {
    return this.resultsService.updateGradingScale(id, body, schoolId);
  }

  // ─── LEGACY ROUTES (BACKWARDS COMPATIBILITY) ─────────────────────────────────
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

  @Post('approve/term/:termId')
  approveLegacy(
    @Param('termId') termId: string,
    @CurrentUser('schoolId') schoolId: string,
    @CurrentUser() user: any,
  ) {
    return this.resultsService.approveScores({ termId }, schoolId, user);
  }

  @Get('statistics/term/:termId')
  getStatistics(
    @Param('termId') termId: string,
    @CurrentUser('schoolId') schoolId: string,
  ) {
    return this.resultsService.getResultStatistics(schoolId, termId);
  }
}
