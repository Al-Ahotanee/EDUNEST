import { IsOptional, IsInt, Min, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class PaginationDto {
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';
}

export function safeSkip(query: PaginationDto): number {
  const page = Math.max(1, query.page || 1);
  const limit = Math.max(1, Math.min(100, query.limit || 20));
  return (page - 1) * limit;
}

export function safeTake(query: PaginationDto): number {
  return Math.max(1, Math.min(100, query.limit || 20));
}

export function paginate<T>(data: T[], total: number, query: PaginationDto) {
  const page = Math.max(1, query.page || 1);
  const limit = safeTake(query);
  const totalPages = Math.ceil(total / limit);
  return {
    data,
    meta: {
      total,
      page,
      limit,
      totalPages,
      hasPreviousPage: page > 1,
      hasNextPage: page < totalPages,
    },
  };
}

export function successResponse<T>(data: T, message = 'Success') {
  return { success: true, message, data };
}

export function errorResponse(message: string, statusCode = 400) {
  return { success: false, message, statusCode };
}
