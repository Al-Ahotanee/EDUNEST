import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  list(
    @CurrentUser('schoolId') schoolId: string,
    @Query() query: PaginationDto & { role?: string; status?: string },
  ) {
    return this.usersService.listUsers(schoolId, query);
  }

  @Get('roles')
  getRoles(@CurrentUser('tenantId') tenantId: string) {
    return this.usersService.getRoles(tenantId);
  }

  @Get(':id')
  getOne(@Param('id') id: string, @CurrentUser('schoolId') schoolId: string) {
    return this.usersService.getUser(id, schoolId);
  }

  @Post()
  create(
    @Body() body: any,
    @CurrentUser('schoolId') schoolId: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.usersService.createUser(body, schoolId, tenantId);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @CurrentUser('schoolId') schoolId: string,
    @Body() body: any,
  ) {
    return this.usersService.updateUser(id, schoolId, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser('schoolId') schoolId: string) {
    return this.usersService.deleteUser(id, schoolId);
  }
}
