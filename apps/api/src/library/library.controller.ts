import { Controller, Get, Post, Put, Delete, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { LibraryService } from './library.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';

@ApiTags('Library')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('library')
export class LibraryController {
  constructor(private libraryService: LibraryService) {}
  @Post('books') create(@Body() body: any, @CurrentUser('schoolId') schoolId: string) { return this.libraryService.createBook(body, schoolId); }
  @Get('books') list(@CurrentUser('schoolId') schoolId: string, @Query() q: PaginationDto & { category?: string }) { return this.libraryService.getBooks(schoolId, q); }
  @Get('books/categories') categories(@CurrentUser('schoolId') schoolId: string) { return this.libraryService.getCategories(schoolId); }
  @Put('books/:id') update(@Param('id') id: string, @CurrentUser('schoolId') schoolId: string, @Body() body: any) { return this.libraryService.updateBook(id, schoolId, body); }
  @Delete('books/:id') remove(@Param('id') id: string, @CurrentUser('schoolId') schoolId: string) { return this.libraryService.deleteBook(id, schoolId); }
  @Post('borrow') borrow(@Body() body: any, @CurrentUser('schoolId') schoolId: string) { return this.libraryService.borrowBook(body, schoolId); }
  @Patch('borrowings/:id/return') returnBook(@Param('id') id: string, @CurrentUser('schoolId') schoolId: string) { return this.libraryService.returnBook(id, schoolId); }
  @Get('borrowings') getBorrowings(@CurrentUser('schoolId') schoolId: string, @Query() q: PaginationDto & { status?: string }) { return this.libraryService.getBorrowings(schoolId, q); }
  @Get('borrowings/overdue') getOverdue(@CurrentUser('schoolId') schoolId: string) { return this.libraryService.getOverdueBorrowings(schoolId); }
  @Get('stats') stats(@CurrentUser('schoolId') schoolId: string) { return this.libraryService.getStats(schoolId); }
}
