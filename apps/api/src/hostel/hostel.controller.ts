import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { HostelService } from './hostel.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';

@ApiTags('Hostel')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('hostel')
export class HostelController {
  constructor(private hostelService: HostelService) {}
  @Post() createHostel(@Body() body: any, @CurrentUser('schoolId') schoolId: string) { return this.hostelService.createHostel(body, schoolId); }
  @Get() getHostels(@CurrentUser('schoolId') schoolId: string) { return this.hostelService.getHostels(schoolId); }
  @Put(':id') updateHostel(@Param('id') id: string, @CurrentUser('schoolId') schoolId: string, @Body() body: any) { return this.hostelService.updateHostel(id, schoolId, body); }
  @Delete(':id') deleteHostel(@Param('id') id: string, @CurrentUser('schoolId') schoolId: string) { return this.hostelService.deleteHostel(id, schoolId); }
  @Post(':id/rooms') createRoom(@Param('id') hostelId: string, @CurrentUser('schoolId') schoolId: string, @Body() body: any) { return this.hostelService.createRoom(hostelId, schoolId, body); }
  @Get(':id/rooms') getRooms(@Param('id') hostelId: string, @CurrentUser('schoolId') schoolId: string) { return this.hostelService.getRooms(hostelId, schoolId); }
  @Delete('rooms/:roomId') deleteRoom(@Param('roomId') roomId: string, @CurrentUser('schoolId') schoolId: string) { return this.hostelService.deleteRoom(roomId, schoolId); }
  @Post('allocate') allocate(@Body() body: any, @CurrentUser('schoolId') schoolId: string) { return this.hostelService.allocateRoom(body, schoolId); }
  @Get('allocations') getAllocations(@CurrentUser('schoolId') schoolId: string, @Query() q: PaginationDto & { hostelId?: string }) { return this.hostelService.getAllocations(schoolId, q); }
  @Delete('allocations/:id') vacate(@Param('id') id: string, @CurrentUser('schoolId') schoolId: string) { return this.hostelService.vacateRoom(id, schoolId); }
  @Get('stats') stats(@CurrentUser('schoolId') schoolId: string) { return this.hostelService.getStats(schoolId); }
}
