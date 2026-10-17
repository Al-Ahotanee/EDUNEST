import { Controller, Get, Post, Put, Delete, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';

@ApiTags('Inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private inventoryService: InventoryService) {}
  @Post() create(@Body() body: any, @CurrentUser('schoolId') schoolId: string) { return this.inventoryService.create(body, schoolId); }
  @Get() list(@CurrentUser('schoolId') schoolId: string, @Query() q: PaginationDto & { category?: string }) { return this.inventoryService.list(schoolId, q); }
  @Get('stats') stats(@CurrentUser('schoolId') schoolId: string) { return this.inventoryService.getStats(schoolId); }
  @Put(':id') update(@Param('id') id: string, @CurrentUser('schoolId') schoolId: string, @Body() body: any) { return this.inventoryService.update(id, schoolId, body); }
  @Delete(':id') remove(@Param('id') id: string, @CurrentUser('schoolId') schoolId: string) { return this.inventoryService.delete(id, schoolId); }
  @Patch(':id/stock') adjustStock(@Param('id') id: string, @CurrentUser('schoolId') schoolId: string, @Body() body: { quantity: number; type: 'ADD' | 'REMOVE' }) { return this.inventoryService.adjustStock(id, schoolId, body.quantity, body.type); }
}
