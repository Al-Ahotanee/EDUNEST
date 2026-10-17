import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SchoolsService } from './schools.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Schools')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('schools')
export class SchoolsController {
  constructor(private schoolsService: SchoolsService) {}

  @Get('current')
  getCurrent(@CurrentUser('schoolId') schoolId: string) {
    return this.schoolsService.getCurrentSchool(schoolId);
  }

  @Put('current')
  @Roles('Super Admin')
  updateCurrent(@CurrentUser('schoolId') schoolId: string, @Body() body: any) {
    return this.schoolsService.updateCurrentSchool(schoolId, body);
  }
}
