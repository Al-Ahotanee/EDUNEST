import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Patch } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { HrService } from './hr.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';

@ApiTags('HR')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('hr')
export class HrController {
  constructor(private hrService: HrService) {}
  @Post('staff') create(@Body() body: any, @CurrentUser('schoolId') schoolId: string) { return this.hrService.createStaff(body, schoolId); }
  @Get('staff') list(@CurrentUser('schoolId') schoolId: string, @Query() q: PaginationDto & { departmentId?: string }) { return this.hrService.getStaff(schoolId, q); }
  @Get('staff/:id') getOne(@Param('id') id: string, @CurrentUser('schoolId') schoolId: string) { return this.hrService.getOneStaff(id, schoolId); }
  @Put('staff/:id') update(@Param('id') id: string, @CurrentUser('schoolId') schoolId: string, @Body() body: any) { return this.hrService.updateStaff(id, schoolId, body); }
  @Delete('staff/:id') remove(@Param('id') id: string, @CurrentUser('schoolId') schoolId: string) { return this.hrService.deleteStaff(id, schoolId); }
  @Get('departments') getDepts(@CurrentUser('schoolId') schoolId: string) { return this.hrService.getDepartments(schoolId); }
  @Post('departments') createDept(@Body() body: any, @CurrentUser('schoolId') schoolId: string) { return this.hrService.createDepartment(body, schoolId); }
  @Get('leaves') getLeaves(@CurrentUser('schoolId') schoolId: string, @Query() q: PaginationDto & { status?: string }) { return this.hrService.getLeaves(schoolId, q); }
  @Post('leaves') applyLeave(@Body() body: any, @CurrentUser('schoolId') schoolId: string) { return this.hrService.applyLeave(body, schoolId); }
  @Patch('leaves/:id/approve') approveLeave(@Param('id') id: string, @CurrentUser('id') userId: string) { return this.hrService.approveLeave(id, userId); }
  @Patch('leaves/:id/reject') rejectLeave(@Param('id') id: string) { return this.hrService.rejectLeave(id); }
  @Get('payroll') getPayrolls(@CurrentUser('schoolId') schoolId: string, @Query() q: PaginationDto) { return this.hrService.getPayrolls(schoolId, q); }
  @Post('payroll/generate') generatePayroll(@Body() body: any, @CurrentUser('schoolId') schoolId: string) { return this.hrService.generatePayroll(body, schoolId); }
  @Patch('payroll/:id/process') processPayroll(@Param('id') id: string) { return this.hrService.processPayroll(id); }
}
