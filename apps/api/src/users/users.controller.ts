import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('Super Admin', 'Admin')
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
    @CurrentUser() caller: any,
  ) {
    return this.usersService.createUser(body, schoolId, tenantId, caller);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @CurrentUser('schoolId') schoolId: string,
    @Body() body: any,
    @CurrentUser() caller: any,
  ) {
    return this.usersService.updateUser(id, schoolId, body, caller);
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @CurrentUser('schoolId') schoolId: string,
    @CurrentUser() caller: any,
  ) {
    return this.usersService.deleteUser(id, schoolId, caller);
  }
}
