import { Module } from '@nestjs/common';
import { FinanceService } from './finance.service';
import { FinanceController } from './finance.controller';
import { FinancialWorkflowService } from './financial-workflow.service';
import { FinancialReportsService } from './financial-reports.service';
import {
  FinancialWorkflowController,
  FinancialReportsController,
} from './financial-workflow.controller';

@Module({
  providers: [FinanceService, FinancialWorkflowService, FinancialReportsService],
  controllers: [FinanceController, FinancialWorkflowController, FinancialReportsController],
  exports: [FinanceService, FinancialWorkflowService, FinancialReportsService],
})
export class FinanceModule {}
