import {
  Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { StudentsService } from './students.service';
import { CreateStudentDto, UpdateStudentDto, CreateGuardianDto } from './students.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Students')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('students')
export class StudentsController {
  constructor(private studentsService: StudentsService) {}

  @Post()
  @Roles('Super Admin')
  @ApiOperation({ summary: 'Create a new student' })
  create(@Body() dto: CreateStudentDto, @CurrentUser('schoolId') schoolId: string) {
    return this.studentsService.create(dto, schoolId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all students with pagination — teachers see only assigned-class students with limited fields' })
  findAll(
    @CurrentUser('schoolId') schoolId: string,
    @CurrentUser() currentUser: any,
    @Query() query: PaginationDto & { status?: string; classId?: string },
  ) {
    return this.studentsService.findAllScoped(schoolId, currentUser, query);
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get student statistics' })
  getStatistics(@CurrentUser('schoolId') schoolId: string) {
    return this.studentsService.getStatistics(schoolId);
  }

  @Get('promotion-results')
  @ApiOperation({ summary: 'Get latest term results for all students (used by Promotions page)' })
  getPromotionResults(@CurrentUser('schoolId') schoolId: string) {
    return this.studentsService.getPromotionResults(schoolId);
  }

  @Get('generate-admission-number')
  @Roles('Super Admin')
  @ApiOperation({ summary: 'Generate next admission number' })
  generateAdmissionNumber(@CurrentUser('schoolId') schoolId: string) {
    return this.studentsService.generateAdmissionNumber(schoolId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get student by ID' })
  findOne(@Param('id') id: string, @CurrentUser('schoolId') schoolId: string) {
    return this.studentsService.findOne(id, schoolId);
  }

  @Post(':id/promote')
  @Roles('Super Admin')
  @ApiOperation({ summary: 'Promote, hold back, or graduate a student' })
  promote(
    @Param('id') id: string,
    @CurrentUser('schoolId') schoolId: string,
    @Body() body: { action: 'PROMOTED' | 'REPEATED' | 'GRADUATED'; targetClassId?: string },
  ) {
    return this.studentsService.promoteStudent(id, schoolId, body);
  }

  @Put(':id')
  @Roles('Super Admin')
  @ApiOperation({ summary: 'Update student' })
  update(
    @Param('id') id: string,
    @CurrentUser('schoolId') schoolId: string,
    @Body() dto: UpdateStudentDto,
  ) {
    return this.studentsService.update(id, schoolId, dto);
  }

  @Delete(':id')
  @Roles('Super Admin')
  @ApiOperation({ summary: 'Remove student' })
  remove(@Param('id') id: string, @CurrentUser('schoolId') schoolId: string) {
    return this.studentsService.softDelete(id, schoolId);
  }

  @Post(':id/guardians')
  @Roles('Super Admin')
  @ApiOperation({ summary: 'Add guardian to student' })
  addGuardian(
    @Param('id') studentId: string,
    @CurrentUser('schoolId') schoolId: string,
    @Body() dto: CreateGuardianDto,
  ) {
    return this.studentsService.addGuardian(studentId, schoolId, dto);
  }

  @Get(':id/results')
  @ApiOperation({ summary: 'Get student results' })
  getResults(
    @Param('id') studentId: string,
    @CurrentUser('schoolId') schoolId: string,
    @Query('termId') termId?: string,
  ) {
    return this.studentsService.getStudentResults(studentId, schoolId, termId);
  }

  @Get(':id/attendance')
  @ApiOperation({ summary: 'Get student attendance' })
  getAttendance(
    @Param('id') studentId: string,
    @CurrentUser('schoolId') schoolId: string,
    @Query('termId') termId?: string,
  ) {
    return this.studentsService.getStudentAttendance(studentId, schoolId, termId);
  }
}
