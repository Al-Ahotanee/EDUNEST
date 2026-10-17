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

  @Post('fee-structures')
  @Roles('Super Admin', 'Accountant')
  @ApiOperation({ summary: 'Create fee structure (supports classId, feeType, status)' })
  createFeeStructure(@Body() body: any, @CurrentUser('schoolId') schoolId: string) {
    return this.financeService.createFeeStructure(body, schoolId);
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
  @Roles('Super Admin')
  @ApiOperation({ summary: 'Publish a fee structure — makes it visible to parents' })
  publishFeeStructure(@Param('id') id: string, @CurrentUser('schoolId') schoolId: string) {
    return this.financeService.publishFeeStructure(id, schoolId);
  }

  @Get('fee-structures/by-class/:classId')
  @ApiOperation({ summary: 'Get published fee structures for a specific class (visible to parents)' })
  getFeeStructuresByClass(@Param('classId') classId: string, @CurrentUser('schoolId') schoolId: string) {
    return this.financeService.getFeeStructuresByClass(classId, schoolId);
  }

  @Post('invoices')
  @Roles('Super Admin', 'Accountant')
  @ApiOperation({ summary: 'Create invoice' })
  createInvoice(@Body() body: any, @CurrentUser('schoolId') schoolId: string) {
    return this.financeService.createInvoice(body, schoolId);
  }

  @Get('invoices')
  @Roles('Super Admin', 'Accountant')
  @ApiOperation({ summary: 'Get all invoices' })
  getInvoices(
    @CurrentUser('schoolId') schoolId: string,
    @Query() query: PaginationDto & { status?: string; studentId?: string },
  ) {
    return this.financeService.getInvoices(schoolId, query);
  }

  @Get('invoices/:id')
  @Roles('Super Admin', 'Accountant')
  @ApiOperation({ summary: 'Get invoice details' })
  getInvoice(@Param('id') id: string, @CurrentUser('schoolId') schoolId: string) {
    return this.financeService.getInvoice(id, schoolId);
  }

  @Post('invoices/:id/payments')
  @Roles('Super Admin', 'Accountant')
  @ApiOperation({ summary: 'Record payment for invoice' })
  recordPayment(
    @Param('id') invoiceId: string,
    @Body() body: any,
    @CurrentUser('schoolId') schoolId: string,
  ) {
    return this.financeService.recordPayment(invoiceId, body, schoolId);
  }
}
