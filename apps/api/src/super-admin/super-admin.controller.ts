import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SuperAdminService } from './super-admin.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { SystemAdminGuard } from '../common/guards/system-admin.guard';
import { PaginationDto } from '../common/dto/pagination.dto';

@ApiTags('Super Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SystemAdminGuard)
@Controller('super-admin')
export class SuperAdminController {
  constructor(private service: SuperAdminService) {}

  @Get('stats')
  getStats() { return this.service.getPlatformStats(); }

  @Get('tenants')
  listTenants(@Query() query: PaginationDto & { status?: string; plan?: string }) { return this.service.listTenants(query); }

  @Get('tenants/pending')
  getPending() { return this.service.getPendingRegistrations(); }

  @Get('tenants/:id')
  getTenant(@Param('id') id: string) { return this.service.getTenantDetail(id); }

  @Patch('tenants/:id/approve')
  approve(@Param('id') id: string, @Body() body: { durationDays?: number }) { return this.service.approveTenant(id, body.durationDays); }

  @Patch('tenants/:id/suspend')
  suspend(@Param('id') id: string, @Body() body: { reason?: string }) { return this.service.suspendTenant(id, body.reason); }

  @Patch('tenants/:id/reactivate')
  reactivate(@Param('id') id: string) { return this.service.reactivateTenant(id); }

  @Patch('tenants/:id/plan')
  updatePlan(@Param('id') id: string, @Body() body: any) { return this.service.updateTenantPlan(id, body); }

  // ─── Platform Users (SaaS Admins) ───
  @Get('users')
  listUsers(@Query() query: PaginationDto) { return this.service.listPlatformUsers(query); }

  @Post('users')
  createUser(@Body() body: any) { return this.service.createPlatformUser(body); }

  @Delete('users/:id')
  deleteUser(@Param('id') id: string) { return this.service.deletePlatformUser(id); }

  // ─── SaaS Pricing Plans ───
  @Get('plans')
  getPlans() { return this.service.getSaaSPlans(); }

  @Patch('plans/:plan')
  updatePlanConfig(@Param('plan') plan: string, @Body() body: any) { return this.service.updateSaaSPlan(plan, body); }

  // ─── Platform Transactions & Payments ───
  @Get('payments')
  listPayments(@Query() query: PaginationDto & { search?: string; status?: string; method?: string }) {
    return this.service.listPlatformPayments(query);
  }

  // ─── Marketers ───
  @Get('marketers')
  listMarketers(@Query() query: PaginationDto) { return this.service.listMarketers(query); }

  @Post('marketers')
  createMarketer(@Body() body: any) { return this.service.createMarketer(body); }

  @Get('marketers/:id')
  getMarketer(@Param('id') id: string) { return this.service.getMarketerDetail(id); }

  @Patch('marketers/:id')
  updateMarketer(@Param('id') id: string, @Body() body: any) { return this.service.updateMarketer(id, body); }

  @Patch('marketers/:id/toggle')
  toggleMarketer(@Param('id') id: string) { return this.service.toggleMarketerStatus(id); }

  // ─── Broadcast ───
  @Post('broadcast')
  broadcast(@Body() body: { title: string; message: string; plan?: string }) { return this.service.broadcast(body); }
}
