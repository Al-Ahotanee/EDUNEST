import { Controller, Get, Post, Put, Delete, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';

@ApiTags('Inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private inventoryService: InventoryService) {}
  @Post() @Roles('Super Admin') create(@Body() body: any, @CurrentUser('schoolId') schoolId: string) { return this.inventoryService.create(body, schoolId); }
  @Get() @Roles('Super Admin') list(@CurrentUser('schoolId') schoolId: string, @Query() q: PaginationDto & { category?: string }) { return this.inventoryService.list(schoolId, q); }
  @Get('stats') @Roles('Super Admin') stats(@CurrentUser('schoolId') schoolId: string) { return this.inventoryService.getStats(schoolId); }
  @Put(':id') @Roles('Super Admin') update(@Param('id') id: string, @CurrentUser('schoolId') schoolId: string, @Body() body: any) { return this.inventoryService.update(id, schoolId, body); }
  @Delete(':id') @Roles('Super Admin') remove(@Param('id') id: string, @CurrentUser('schoolId') schoolId: string) { return this.inventoryService.delete(id, schoolId); }
  @Patch(':id/stock') @Roles('Super Admin') adjustStock(@Param('id') id: string, @CurrentUser('schoolId') schoolId: string, @Body() body: { quantity: number; type: 'ADD' | 'REMOVE' }) { return this.inventoryService.adjustStock(id, schoolId, body.quantity, body.type); }
}
