import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { FinanceService } from './finance.service';
import { PaginationDto } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Finance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('finance')
export class FinanceController {
  constructor(private financeService: FinanceService) {}

  @Get('dashboard')
  getDashboardStats(@CurrentUser('schoolId') schoolId: string) {
    return this.financeService.getDashboardStats(schoolId);
  }

  @Get('monthly-trend')
  getMonthlyTrend(
    @CurrentUser('schoolId') schoolId: string,
    @Query('year') year: number,
  ) {
    return this.financeService.getMonthlyTrend(schoolId, year || new Date().getFullYear());
  }

  @Post('fee-structures')
  @ApiOperation({ summary: 'Create fee structure' })
  createFeeStructure(@Body() body: any, @CurrentUser('schoolId') schoolId: string) {
    return this.financeService.createFeeStructure(body, schoolId);
  }

  @Get('fee-structures')
  @ApiOperation({ summary: 'Get all fee structures' })
  getFeeStructures(@CurrentUser('schoolId') schoolId: string, @Query() query: PaginationDto) {
    return this.financeService.getFeeStructures(schoolId, query);
  }

  @Post('invoices')
  @ApiOperation({ summary: 'Create invoice' })
  createInvoice(@Body() body: any, @CurrentUser('schoolId') schoolId: string) {
    return this.financeService.createInvoice(body, schoolId);
  }

  @Get('invoices')
  @ApiOperation({ summary: 'Get all invoices' })
  getInvoices(
    @CurrentUser('schoolId') schoolId: string,
    @Query() query: PaginationDto & { status?: string; studentId?: string },
  ) {
    return this.financeService.getInvoices(schoolId, query);
  }

  @Get('invoices/:id')
  @ApiOperation({ summary: 'Get invoice details' })
  getInvoice(@Param('id') id: string, @CurrentUser('schoolId') schoolId: string) {
    return this.financeService.getInvoice(id, schoolId);
  }

  @Post('invoices/:id/payments')
  @ApiOperation({ summary: 'Record payment for invoice' })
  recordPayment(
    @Param('id') invoiceId: string,
    @Body() body: any,
    @CurrentUser('schoolId') schoolId: string,
  ) {
    return this.financeService.recordPayment(invoiceId, body, schoolId);
  }
}
