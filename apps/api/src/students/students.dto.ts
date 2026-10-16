// students.dto.ts
import {
  IsString, IsEnum, IsOptional, IsDateString,
  IsArray, ValidateNested, IsEmail, IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Gender, StudentStatus } from '@prisma/client';

export class CreateGuardianDto {
  @ApiProperty() @IsString() firstName: string;
  @ApiProperty() @IsString() lastName: string;
  @ApiProperty() @IsString() relationship: string;
  @ApiProperty() @IsString() phone: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() occupation?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isEmergency?: boolean;
}

export class CreateStudentDto {
  @ApiProperty() @IsString() admissionNumber: string;
  @ApiProperty() @IsString() firstName: string;
  @ApiProperty() @IsString() lastName: string;
  @ApiPropertyOptional() @IsOptional() @IsString() otherName?: string;
  @ApiProperty({ enum: Gender }) @IsEnum(Gender) gender: Gender;
  @ApiProperty() @IsDateString() dateOfBirth: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bloodGroup?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() stateOfOrigin?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() lga?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() religion?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() nationality?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() photo?: string;
  @ApiPropertyOptional({ enum: StudentStatus }) @IsOptional() @IsEnum(StudentStatus) status?: StudentStatus;
  @ApiPropertyOptional({ type: [CreateGuardianDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateGuardianDto)
  guardians?: CreateGuardianDto[];
}

export class UpdateStudentDto extends PartialType(CreateStudentDto) {}
