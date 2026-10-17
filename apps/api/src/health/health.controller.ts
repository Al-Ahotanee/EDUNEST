import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { HealthService } from './health.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';

@ApiTags('Health')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('health')
export class HealthController {
  constructor(private healthService: HealthService) {}
  @Post() @Roles('Super Admin') create(@Body() body: any, @CurrentUser('schoolId') schoolId: string) { return this.healthService.createRecord(body, schoolId); }
  @Get() @Roles('Super Admin') list(@CurrentUser('schoolId') schoolId: string, @Query() q: PaginationDto & { studentId?: string; fromDate?: string; toDate?: string }) { return this.healthService.getRecords(schoolId, q); }
  @Get('stats') @Roles('Super Admin') stats(@CurrentUser('schoolId') schoolId: string) { return this.healthService.getStats(schoolId); }
  @Get('follow-ups') @Roles('Super Admin') followUps(@CurrentUser('schoolId') schoolId: string) { return this.healthService.getFollowUps(schoolId); }
  @Get('student/:studentId') @Roles('Super Admin') studentHistory(@Param('studentId') id: string, @CurrentUser('schoolId') schoolId: string) { return this.healthService.getStudentHistory(id, schoolId); }
  @Get(':id') @Roles('Super Admin') getOne(@Param('id') id: string, @CurrentUser('schoolId') schoolId: string) { return this.healthService.getRecord(id, schoolId); }
  @Put(':id') @Roles('Super Admin') update(@Param('id') id: string, @CurrentUser('schoolId') schoolId: string, @Body() body: any) { return this.healthService.updateRecord(id, schoolId, body); }
  @Delete(':id') @Roles('Super Admin') remove(@Param('id') id: string, @CurrentUser('schoolId') schoolId: string) { return this.healthService.deleteRecord(id, schoolId); }
}
