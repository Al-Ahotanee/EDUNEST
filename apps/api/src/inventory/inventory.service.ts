import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { successResponse, paginate, safeSkip, safeTake, PaginationDto } from '../common/dto/pagination.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  async create(data: any, schoolId: string) {
    const item = await this.prisma.inventoryItem.create({ data: { ...data, schoolId, quantity: Number(data.quantity || 0), unitPrice: data.unitPrice ? Number(data.unitPrice) : null, reorderLevel: data.reorderLevel ? Number(data.reorderLevel) : null } });
    return successResponse(item, 'Item created');
  }

  async list(schoolId: string, query: PaginationDto & { category?: string }) {
    const {  search, category } = query;
    const where: Prisma.InventoryItemWhereInput = {
      schoolId,
      ...(category && { category }),
      ...(search && { OR: [{ name: { contains: search } }, { category: { contains: search } }] }),
    };
    const [data, total] = await Promise.all([
      this.prisma.inventoryItem.findMany({ where, skip: safeSkip(query), take: safeTake(query), orderBy: { name: 'asc' } }),
      this.prisma.inventoryItem.count({ where }),
    ]);
    return paginate(data, total, query);
  }

  async update(id: string, schoolId: string, data: any) {
    const existing = await this.prisma.inventoryItem.findFirst({ where: { id, schoolId } });
    if (!existing) throw new NotFoundException('Inventory item not found');
    const item = await this.prisma.inventoryItem.update({ where: { id }, data });
    return successResponse(item, 'Item updated');
  }

  async delete(id: string, schoolId: string) {
    const existing = await this.prisma.inventoryItem.findFirst({ where: { id, schoolId } });
    if (!existing) throw new NotFoundException('Inventory item not found');
    await this.prisma.inventoryItem.delete({ where: { id } });
    return successResponse(null, 'Item deleted');
  }

  async adjustStock(id: string, schoolId: string, quantity: number, type: 'ADD' | 'REMOVE') {
    const existing = await this.prisma.inventoryItem.findFirst({ where: { id, schoolId } });
    if (!existing) throw new NotFoundException('Inventory item not found');
    const item = await this.prisma.inventoryItem.update({
      where: { id },
      data: { quantity: type === 'ADD' ? { increment: quantity } : { decrement: quantity } },
    });
    return successResponse(item, `Stock ${type === 'ADD' ? 'added' : 'removed'}`);
  }

  async getStats(schoolId: string) {
    const [totalItems, lowStock, totalValue] = await Promise.all([
      this.prisma.inventoryItem.count({ where: { schoolId } }),
      this.prisma.inventoryItem.count({ where: { schoolId, reorderLevel: { not: null } } }),
      this.prisma.inventoryItem.aggregate({ where: { schoolId }, _sum: { quantity: true } }),
    ]);
    const categories = await this.prisma.inventoryItem.groupBy({ by: ['category'], where: { schoolId }, _count: { id: true } });
    return successResponse({ totalItems, lowStock, totalQuantity: totalValue._sum.quantity || 0, categories: categories.map(c => ({ name: c.category, count: c._count.id })) });
  }
}
