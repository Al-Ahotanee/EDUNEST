import {
  Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Req,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { FinancialWorkflowService } from './financial-workflow.service';
import { FinancialReportsService } from './financial-reports.service';

/**
 * FinancialWorkflowController — endpoints for the payment approval workflow,
 * receipt management, payment reversal, and tenant financial policy.
 *
 * All endpoints enforce:
 *   - Authentication (JwtAuthGuard)
 *   - Role-based authorization (RolesGuard + @Roles decorator)
 *   - Tenant isolation (schoolId resolved from trusted auth context, never client input)
 *   - Class-level access for Class Masters (resolved from TeacherAssignment records)
 */
@ApiTags('Finance — Workflow')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('finance/workflow')
export class FinancialWorkflowController {
  constructor(
    private prisma: PrismaService,
    private workflowService: FinancialWorkflowService,
    private reportsService: FinancialReportsService,
  ) {}

  // ─── PAYMENT SUBMISSION ─────────────────────────────────────────────────────

  @Post('payments/submit')
  @ApiOperation({ summary: 'Submit a payment (Class Master → pending, Accountant → posted, Parent → pending verification)' })
  async submitPayment(
    @Body() body: any,
    @CurrentUser() currentUser: any,
    @CurrentUser('schoolId') schoolId: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    const userRole = currentUser.roles?.[0]?.name || '';
    const isClassMaster = userRole === 'Class Master' || userRole === 'Teacher';

    // Resolve assigned class IDs for Class Masters
    let assignedClassIds: string[] = [];
    if (isClassMaster && currentUser.id) {
      const assignments = await this.prisma.teacherAssignment.findMany({
        where: { userId: currentUser.id },
        select: { classId: true },
      });
      assignedClassIds = assignments.map(a => a.classId);
    }

    return this.workflowService.submitPayment(body, {
      schoolId,
      tenantId,
      userId: currentUser.id,
      userRole,
      isClassMaster,
      assignedClassIds,
    });
  }

  // ─── PAYMENT APPROVAL ───────────────────────────────────────────────────────

  @Patch('payments/:id/approve')
  @Roles('Super Admin', 'Accountant')
  @ApiOperation({ summary: 'Approve a pending payment (School Accountant only — cannot approve own submission)' })
  approvePayment(
    @Param('id') id: string,
    @CurrentUser() currentUser: any,
    @CurrentUser('schoolId') schoolId: string,
  ) {
    return this.workflowService.approvePayment(id, {
      schoolId,
      userId: currentUser.id,
      userRole: currentUser.roles?.[0]?.name || '',
    });
  }

  @Patch('payments/:id/reject')
  @Roles('Super Admin', 'Accountant')
  @ApiOperation({ summary: 'Reject a pending payment (requires reason)' })
  rejectPayment(
    @Param('id') id: string,
    @Body() body: { reason: string },
    @CurrentUser() currentUser: any,
    @CurrentUser('schoolId') schoolId: string,
  ) {
    return this.workflowService.rejectPayment(id, body.reason, {
      schoolId,
      userId: currentUser.id,
      userRole: currentUser.roles?.[0]?.name || '',
    });
  }

  @Patch('payments/:id/reverse')
  @Roles('Super Admin', 'Accountant')
  @ApiOperation({ summary: 'Reverse a posted payment (creates compensating entry, preserves audit trail)' })
  reversePayment(
    @Param('id') id: string,
    @Body() body: { reason: string },
    @CurrentUser() currentUser: any,
    @CurrentUser('schoolId') schoolId: string,
  ) {
    return this.workflowService.reversePayment(id, body.reason, {
      schoolId,
      userId: currentUser.id,
      userRole: currentUser.roles?.[0]?.name || '',
    });
  }

  // ─── PENDING PAYMENTS QUEUE ─────────────────────────────────────────────────

  @Get('payments/pending')
  @Roles('Super Admin', 'Accountant')
  @ApiOperation({ summary: 'List pending payments awaiting Accountant approval' })
  listPendingPayments(
    @CurrentUser('schoolId') schoolId: string,
    @Query('classId') classId?: string,
    @Query('method') method?: string,
  ) {
    return this.workflowService.listPendingPayments(schoolId, { classId, method });
  }

  // ─── RECEIPTS ───────────────────────────────────────────────────────────────

  @Get('receipts/:id')
  @ApiOperation({ summary: 'Get a receipt by ID (scoped to caller school)' })
  async getReceipt(
    @Param('id') id: string,
    @CurrentUser('schoolId') schoolId: string,
  ) {
    const receipt = await this.prisma.receipt.findFirst({
      where: { id, schoolId },
      include: { payment: { include: { invoice: { include: { student: true } } } } },
    });
    if (!receipt) return { data: null, message: 'Receipt not found' };
    return { data: receipt };
  }

  @Patch('receipts/:id/reprint')
  @Roles('Super Admin', 'Accountant')
  @ApiOperation({ summary: 'Reprint a receipt (audited — increments reprint count)' })
  reprintReceipt(
    @Param('id') id: string,
    @CurrentUser() currentUser: any,
    @CurrentUser('schoolId') schoolId: string,
  ) {
    return this.workflowService.reprintReceipt(id, {
      schoolId,
      userId: currentUser.id,
      userRole: currentUser.roles?.[0]?.name || '',
    });
  }

  // ─── TENANT FINANCIAL POLICY ────────────────────────────────────────────────

  @Get('policy')
  @Roles('Super Admin', 'Accountant')
  @ApiOperation({ summary: 'Get the tenant financial policy (auto-creates if missing)' })
  async getPolicy(
    @CurrentUser('tenantId') tenantId: string,
  ) {
    const policy = await this.workflowService.getOrCreatePolicy(tenantId);
    return { data: policy };
  }

  @Patch('policy')
  @Roles('Super Admin')
  @ApiOperation({ summary: 'Update tenant financial policy (School Admin only)' })
  updatePolicy(
    @Body() body: any,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser() currentUser: any,
    @CurrentUser('schoolId') schoolId: string,
  ) {
    return this.workflowService.updatePolicy(tenantId, body, {
      schoolId,
      userId: currentUser.id,
      userRole: currentUser.roles?.[0]?.name || '',
    });
  }

  // ─── PARENT-STUDENT LINKS ───────────────────────────────────────────────────

  @Post('parent-links')
  @Roles('Super Admin', 'Accountant')
  @ApiOperation({ summary: 'Link a parent User account to a Student (admin operation)' })
  createParentStudentLink(
    @Body() body: { userId: string; studentId: string; relationship?: string },
    @CurrentUser() currentUser: any,
    @CurrentUser('schoolId') schoolId: string,
  ) {
    return this.workflowService.createParentStudentLink(body, {
      schoolId,
      userId: currentUser.id,
      userRole: currentUser.roles?.[0]?.name || '',
    });
  }
}

/**
 * FinancialReportsController — role-scoped dashboards and reports.
 */
@ApiTags('Finance — Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('finance/reports')
export class FinancialReportsController {
  constructor(
    private prisma: PrismaService,
    private reportsService: FinancialReportsService,
  ) {}

  // ─── DASHBOARDS ─────────────────────────────────────────────────────────────

  @Get('accountant-dashboard')
  @Roles('Super Admin', 'Accountant')
  @ApiOperation({ summary: 'School Accountant dashboard — pending approvals, collections, exceptions' })
  getAccountantDashboard(
    @CurrentUser('schoolId') schoolId: string,
    @Query('sessionId') sessionId?: string,
    @Query('termId') termId?: string,
    @Query('classId') classId?: string,
  ) {
    return this.reportsService.getAccountantDashboard(schoolId, { sessionId, termId, classId });
  }

  @Get('class-master-dashboard')
  @ApiOperation({ summary: 'Class Master dashboard — scoped to assigned classes only' })
  async getClassMasterDashboard(
    @CurrentUser() currentUser: any,
    @CurrentUser('schoolId') schoolId: string,
  ) {
    const assignments = await this.prisma.teacherAssignment.findMany({
      where: { userId: currentUser.id },
      select: { classId: true },
    });
    return this.reportsService.getClassMasterDashboard(schoolId, assignments.map(a => a.classId));
  }

  @Get('parent-summary')
  @ApiOperation({ summary: 'Parent portal financial summary — scoped to linked children only' })
  getParentFinancialSummary(
    @CurrentUser('id') userId: string,
    @CurrentUser('schoolId') schoolId: string,
  ) {
    return this.reportsService.getParentFinancialSummary(userId, schoolId);
  }

  // ─── REPORTS ─────────────────────────────────────────────────────────────────

  @Get('outstanding-fees')
  @Roles('Super Admin', 'Accountant', 'Principal')
  @ApiOperation({ summary: 'Outstanding fees / debtor report' })
  getOutstandingFeesReport(
    @CurrentUser('schoolId') schoolId: string,
    @Query('classId') classId?: string,
    @Query('sessionId') sessionId?: string,
    @Query('minAmount') minAmount?: string,
  ) {
    return this.reportsService.getOutstandingFeesReport(schoolId, {
      classId, sessionId,
      minAmount: minAmount ? Number(minAmount) : undefined,
    });
  }

  @Get('daily-collection')
  @Roles('Super Admin', 'Accountant')
  @ApiOperation({ summary: 'Daily collection report — POSTED payments only' })
  getDailyCollectionReport(
    @CurrentUser('schoolId') schoolId: string,
    @Query('date') date: string,
  ) {
    return this.reportsService.getDailyCollectionReport(schoolId, date);
  }

  @Get('collection-by-user')
  @Roles('Super Admin', 'Accountant', 'Principal')
  @ApiOperation({ summary: 'Collection-by-user report — which staff member collected what' })
  getCollectionByUserReport(
    @CurrentUser('schoolId') schoolId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.reportsService.getCollectionByUserReport(schoolId, { startDate, endDate });
  }

  @Get('audit-log')
  @Roles('Super Admin', 'Principal')
  @ApiOperation({ summary: 'Financial audit log (read-only)' })
  getAuditLog(
    @CurrentUser('schoolId') schoolId: string,
    @Query('action') action?: string,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('userId') userId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getAuditLog(schoolId, {
      action, entityType, entityId, userId, startDate, endDate,
    });
  }
}
