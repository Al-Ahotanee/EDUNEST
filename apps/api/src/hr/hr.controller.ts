import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Patch } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { HrService } from './hr.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';

@ApiTags('HR')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('hr')
export class HrController {
  constructor(private hrService: HrService) {}
  @Post('staff') @Roles('Super Admin', 'Admin', 'School Admin') create(@Body() body: any, @CurrentUser('schoolId') schoolId: string) { return this.hrService.createStaff(body, schoolId); }
  @Get('staff') @Roles('Super Admin', 'Admin', 'School Admin') list(@CurrentUser('schoolId') schoolId: string, @Query() q: PaginationDto & { departmentId?: string }) { return this.hrService.getStaff(schoolId, q); }
  @Get('staff/:id') @Roles('Super Admin', 'Admin', 'School Admin') getOne(@Param('id') id: string, @CurrentUser('schoolId') schoolId: string) { return this.hrService.getOneStaff(id, schoolId); }
  @Put('staff/:id') @Roles('Super Admin', 'Admin', 'School Admin') update(@Param('id') id: string, @CurrentUser('schoolId') schoolId: string, @Body() body: any) { return this.hrService.updateStaff(id, schoolId, body); }
  @Delete('staff/:id') @Roles('Super Admin', 'Admin', 'School Admin') remove(@Param('id') id: string, @CurrentUser('schoolId') schoolId: string) { return this.hrService.deleteStaff(id, schoolId); }

  @Get('staff/:id/documents') @Roles('Super Admin', 'Admin', 'School Admin') getDocuments(@Param('id') id: string, @CurrentUser('schoolId') schoolId: string) { return this.hrService.getStaffDocuments(id, schoolId); }
  @Post('staff/:id/documents') @Roles('Super Admin', 'Admin', 'School Admin') addDocument(@Param('id') id: string, @CurrentUser('schoolId') schoolId: string, @Body() body: any) { return this.hrService.addStaffDocument(id, schoolId, body); }
  @Delete('staff/:id/documents/:docId') @Roles('Super Admin', 'Admin', 'School Admin') deleteDocument(@Param('id') id: string, @Param('docId') docId: string, @CurrentUser('schoolId') schoolId: string) { return this.hrService.deleteStaffDocument(id, docId, schoolId); }

  @Get('departments') @Roles('Super Admin', 'Admin', 'School Admin') getDepts(@CurrentUser('schoolId') schoolId: string) { return this.hrService.getDepartments(schoolId); }
  @Post('departments') @Roles('Super Admin', 'Admin', 'School Admin') createDept(@Body() body: any, @CurrentUser('schoolId') schoolId: string) { return this.hrService.createDepartment(body, schoolId); }
  @Get('leaves') @Roles('Super Admin', 'Admin', 'School Admin') getLeaves(@CurrentUser('schoolId') schoolId: string, @Query() q: PaginationDto & { status?: string }) { return this.hrService.getLeaves(schoolId, q); }
  @Post('leaves') @Roles('Super Admin', 'Admin', 'School Admin') applyLeave(@Body() body: any, @CurrentUser('schoolId') schoolId: string) { return this.hrService.applyLeave(body, schoolId); }
  @Patch('leaves/:id/approve') @Roles('Super Admin', 'Admin', 'School Admin') approveLeave(@Param('id') id: string, @CurrentUser('id') userId: string) { return this.hrService.approveLeave(id, userId); }
  @Patch('leaves/:id/reject') @Roles('Super Admin', 'Admin', 'School Admin') rejectLeave(@Param('id') id: string) { return this.hrService.rejectLeave(id); }
  @Get('payroll') @Roles('Super Admin', 'Admin', 'School Admin') getPayrolls(@CurrentUser('schoolId') schoolId: string, @Query() q: PaginationDto) { return this.hrService.getPayrolls(schoolId, q); }
  @Post('payroll/generate') @Roles('Super Admin', 'Admin', 'School Admin') generatePayroll(@Body() body: any, @CurrentUser('schoolId') schoolId: string) { return this.hrService.generatePayroll(body, schoolId); }
  @Patch('payroll/:id/process') @Roles('Super Admin', 'Admin', 'School Admin') processPayroll(@Param('id') id: string) { return this.hrService.processPayroll(id); }
}
