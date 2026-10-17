import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { HealthService } from './health.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';

@ApiTags('Health')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('health')
export class HealthController {
  constructor(private healthService: HealthService) {}
  @Post() create(@Body() body: any, @CurrentUser('schoolId') schoolId: string) { return this.healthService.createRecord(body, schoolId); }
  @Get() list(@CurrentUser('schoolId') schoolId: string, @Query() q: PaginationDto & { studentId?: string; fromDate?: string; toDate?: string }) { return this.healthService.getRecords(schoolId, q); }
  @Get('stats') stats(@CurrentUser('schoolId') schoolId: string) { return this.healthService.getStats(schoolId); }
  @Get('follow-ups') followUps(@CurrentUser('schoolId') schoolId: string) { return this.healthService.getFollowUps(schoolId); }
  @Get('student/:studentId') studentHistory(@Param('studentId') id: string, @CurrentUser('schoolId') schoolId: string) { return this.healthService.getStudentHistory(id, schoolId); }
  @Get(':id') getOne(@Param('id') id: string, @CurrentUser('schoolId') schoolId: string) { return this.healthService.getRecord(id, schoolId); }
  @Put(':id') update(@Param('id') id: string, @CurrentUser('schoolId') schoolId: string, @Body() body: any) { return this.healthService.updateRecord(id, schoolId, body); }
  @Delete(':id') remove(@Param('id') id: string, @CurrentUser('schoolId') schoolId: string) { return this.healthService.deleteRecord(id, schoolId); }
}
