import { Controller, Get, Post, Body, Param, Query, UseGuards, Patch } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { FinanceService } from './finance.service';
import { PaginationDto } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Finance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('finance')
export class FinanceController {
  constructor(private financeService: FinanceService) {}

  @Get('dashboard')
  @Roles('Super Admin', 'Accountant')
  getDashboardStats(@CurrentUser('schoolId') schoolId: string) {
    return this.financeService.getDashboardStats(schoolId);
  }

  @Get('monthly-trend')
  @Roles('Super Admin', 'Accountant')
  getMonthlyTrend(
    @CurrentUser('schoolId') schoolId: string,
    @Query('year') year: number,
  ) {
    return this.financeService.getMonthlyTrend(schoolId, year || new Date().getFullYear());
  }

  @Get('fee-structures/catalogue')
  @Roles('Super Admin', 'Admin', 'School Admin', 'Accountant')
  @ApiOperation({ summary: 'Get standard reusable fee item catalogue' })
  getFeeCatalogue() {
    return this.financeService.getFeeCatalogue();
  }

  @Post('fee-structures')
  @Roles('Super Admin', 'Accountant')
  @ApiOperation({ summary: 'Create fee structure (supports classId, feeType, status)' })
  createFeeStructure(@Body() body: any, @CurrentUser('schoolId') schoolId: string) {
    return this.financeService.createFeeStructure(body, schoolId);
  }

  @Post('fee-structures/class/:classId')
  @Roles('Super Admin', 'Admin', 'School Admin', 'Accountant')
  @ApiOperation({ summary: 'Batch save or update fee schedule for a class' })
  saveClassFeeSchedule(
    @Param('classId') classId: string,
    @Body() body: any,
    @CurrentUser('schoolId') schoolId: string,
  ) {
    return this.financeService.createOrUpdateClassFeeSchedule(schoolId, { ...body, classId });
  }

  @Get('fee-structures/class/:classId/preview')
  @Roles('Super Admin', 'Admin', 'School Admin', 'Accountant')
  @ApiOperation({ summary: 'Preview fee schedule with New vs. Returning student totals' })
  getClassFeeSchedulePreview(
    @Param('classId') classId: string,
    @CurrentUser('schoolId') schoolId: string,
    @Query('sessionId') sessionId?: string,
    @Query('termId') termId?: string,
  ) {
    return this.financeService.getClassFeeSchedulePreview(classId, schoolId, { sessionId, termId });
  }

  @Get('fee-structures')
  @Roles('Super Admin', 'Accountant')
  @ApiOperation({ summary: 'Get all fee structures (supports classId and status filters)' })
  getFeeStructures(
    @CurrentUser('schoolId') schoolId: string,
    @Query() query: PaginationDto & { classId?: string; status?: string },
  ) {
    return this.financeService.getFeeStructures(schoolId, query);
  }

  @Patch('fee-structures/:id/publish')
  @Roles('Super Admin', 'Admin', 'School Admin', 'Accountant')
  @ApiOperation({ summary: 'Publish a fee structure — makes it visible to parents' })
  publishFeeStructure(@Param('id') id: string, @CurrentUser('schoolId') schoolId: string) {
    return this.financeService.publishFeeStructure(id, schoolId);
  }

  @Get('fee-structures/by-class/:classId')
  @ApiOperation({ summary: 'Get published fee structures for a specific class (visible to parents)' })
  getFeeStructuresByClass(@Param('classId') classId: string, @CurrentUser('schoolId') schoolId: string) {
    return this.financeService.getFeeStructuresByClass(classId, schoolId);
  }

  @Post('fee-structures/generate-invoices/:classId')
  @Roles('Super Admin', 'Admin', 'School Admin', 'Accountant')
  @ApiOperation({ summary: 'Generate invoices for all students in a class from published fee structures' })
  generateInvoices(
    @Param('classId') classId: string,
    @Body() body: any,
    @CurrentUser('schoolId') schoolId: string
  ) {
    return this.financeService.generateInvoicesFromClass(classId, schoolId, body);
  }

  @Post('students/:studentId/generate-invoice')
  @Roles('Super Admin', 'Admin', 'School Admin', 'Accountant')
  @ApiOperation({ summary: 'Generate an invoice for a specific student from class fee structure' })
  generateStudentInvoice(
    @Param('studentId') studentId: string,
    @Body() body: any,
    @CurrentUser('schoolId') schoolId: string
  ) {
    return this.financeService.generateInvoiceForStudent(studentId, schoolId, body);
  }

  @Get('students/:studentId/statement')
  @Roles('Super Admin', 'Admin', 'School Admin', 'Accountant', 'Principal', 'Parent')
  @ApiOperation({ summary: 'Get chronological financial statement / ledger for a student' })
  getStudentStatement(
    @Param('studentId') studentId: string,
    @CurrentUser('schoolId') schoolId: string
  ) {
    return this.financeService.getStudentStatement(studentId, schoolId);
  }

  @Post('invoices')
  @Roles('Super Admin', 'Admin', 'School Admin', 'Accountant')
  @ApiOperation({ summary: 'Create invoice' })
  createInvoice(@Body() body: any, @CurrentUser('schoolId') schoolId: string) {
    return this.financeService.createInvoice(body, schoolId);
  }

  @Get('invoices')
  @Roles('Super Admin', 'Admin', 'School Admin', 'Accountant', 'Principal')
  @ApiOperation({ summary: 'Get all invoices' })
  getInvoices(
    @CurrentUser('schoolId') schoolId: string,
    @Query() query: PaginationDto & { status?: string; studentId?: string },
  ) {
    return this.financeService.getInvoices(schoolId, query);
  }

  @Get('invoices/:id')
  @Roles('Super Admin', 'Admin', 'School Admin', 'Accountant', 'Principal', 'Parent')
  @ApiOperation({ summary: 'Get invoice details' })
  getInvoice(@Param('id') id: string, @CurrentUser('schoolId') schoolId: string) {
    return this.financeService.getInvoice(id, schoolId);
  }

  @Post('invoices/:id/payments')
  @Roles('Super Admin', 'Admin', 'School Admin', 'Accountant')
  @ApiOperation({ summary: 'Record payment for invoice' })
  recordPayment(
    @Param('id') invoiceId: string,
    @Body() body: any,
    @CurrentUser('schoolId') schoolId: string,
  ) {
    return this.financeService.recordPayment(invoiceId, body, schoolId);
  }
}
