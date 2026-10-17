import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { HostelService } from './hostel.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';

@ApiTags('Hostel')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('hostel')
export class HostelController {
  constructor(private hostelService: HostelService) {}
  @Post() @Roles('Super Admin') createHostel(@Body() body: any, @CurrentUser('schoolId') schoolId: string) { return this.hostelService.createHostel(body, schoolId); }
  @Get() @Roles('Super Admin') getHostels(@CurrentUser('schoolId') schoolId: string) { return this.hostelService.getHostels(schoolId); }
  @Put(':id') @Roles('Super Admin') updateHostel(@Param('id') id: string, @CurrentUser('schoolId') schoolId: string, @Body() body: any) { return this.hostelService.updateHostel(id, schoolId, body); }
  @Delete(':id') @Roles('Super Admin') deleteHostel(@Param('id') id: string, @CurrentUser('schoolId') schoolId: string) { return this.hostelService.deleteHostel(id, schoolId); }
  @Post(':id/rooms') @Roles('Super Admin') createRoom(@Param('id') hostelId: string, @CurrentUser('schoolId') schoolId: string, @Body() body: any) { return this.hostelService.createRoom(hostelId, schoolId, body); }
  @Get(':id/rooms') @Roles('Super Admin') getRooms(@Param('id') hostelId: string, @CurrentUser('schoolId') schoolId: string) { return this.hostelService.getRooms(hostelId, schoolId); }
  @Delete('rooms/:roomId') @Roles('Super Admin') deleteRoom(@Param('roomId') roomId: string, @CurrentUser('schoolId') schoolId: string) { return this.hostelService.deleteRoom(roomId, schoolId); }
  @Post('allocate') @Roles('Super Admin') allocate(@Body() body: any, @CurrentUser('schoolId') schoolId: string) { return this.hostelService.allocateRoom(body, schoolId); }
  @Get('allocations') @Roles('Super Admin') getAllocations(@CurrentUser('schoolId') schoolId: string, @Query() q: PaginationDto & { hostelId?: string }) { return this.hostelService.getAllocations(schoolId, q); }
  @Delete('allocations/:id') @Roles('Super Admin') vacate(@Param('id') id: string, @CurrentUser('schoolId') schoolId: string) { return this.hostelService.vacateRoom(id, schoolId); }
  @Get('stats') @Roles('Super Admin') stats(@CurrentUser('schoolId') schoolId: string) { return this.hostelService.getStats(schoolId); }
}
