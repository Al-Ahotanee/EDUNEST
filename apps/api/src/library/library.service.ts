import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { successResponse, paginate, safeSkip, safeTake, PaginationDto } from '../common/dto/pagination.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class LibraryService {
  constructor(private prisma: PrismaService) {}

  async createBook(data: any, schoolId: string) {
    // EDN-026 fix: Validate ISBN format (basic check — 10 or 13 digits with optional hyphens)
    if (data.isbn && data.isbn.trim()) {
      const cleanIsbn = data.isbn.replace(/[-\s]/g, '');
      if (!/^\d{10}$/.test(cleanIsbn) && !/^\d{13}$/.test(cleanIsbn)) {
        throw new BadRequestException('ISBN must be a valid 10 or 13 digit number (hyphens allowed)');
      }
    }

    const book = await this.prisma.book.create({
      data: {
        schoolId,
        title: data.title,
        author: data.author,
        isbn: data.isbn,
        category: data.category,
        publisher: data.publisher,
        year: data.year ? Number(data.year) : null,
        copies: Number(data.copies || 1),
        available: Number(data.copies || 1),
        shelfNumber: data.shelfNumber,
      },
    });
    return successResponse(book, 'Book added to library');
  }

  async getBooks(schoolId: string, query: PaginationDto & { category?: string }) {
    const {  search, category } = query;
    const where: Prisma.BookWhereInput = {
      schoolId,
      ...(category && { category }),
      ...(search && {
        OR: [
          { title: { contains: search } },
          { author: { contains: search } },
          { isbn: { contains: search } },
          { category: { contains: search } },
        ],
      }),
    };
    const [data, total] = await Promise.all([
      this.prisma.book.findMany({ where, skip: safeSkip(query), take: safeTake(query), orderBy: { title: 'asc' } }),
      this.prisma.book.count({ where }),
    ]);
    return paginate(data, total, query);
  }

  async updateBook(id: string, schoolId: string, data: any) {
    const book = await this.prisma.book.findFirst({ where: { id, schoolId } });
    if (!book) throw new NotFoundException('Book not found');
    const copiesDiff = data.copies ? Number(data.copies) - book.copies : 0;
    const updated = await this.prisma.book.update({
      where: { id },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.author && { author: data.author }),
        ...(data.isbn !== undefined && { isbn: data.isbn }),
        ...(data.category && { category: data.category }),
        ...(data.publisher !== undefined && { publisher: data.publisher }),
        ...(data.year && { year: Number(data.year) }),
        ...(data.copies && { copies: Number(data.copies), available: Math.max(0, book.available + copiesDiff) }),
        ...(data.shelfNumber !== undefined && { shelfNumber: data.shelfNumber }),
      },
    });
    return successResponse(updated, 'Book updated');
  }

  async deleteBook(id: string, schoolId: string) {
    const book = await this.prisma.book.findFirst({ where: { id, schoolId } });
    if (!book) throw new NotFoundException('Book not found');
    const active = await this.prisma.borrowing.count({ where: { bookId: id, status: 'BORROWED' } });
    if (active > 0) throw new BadRequestException('Cannot delete a book with active borrowings');
    await this.prisma.borrowing.deleteMany({ where: { bookId: id } });
    await this.prisma.book.delete({ where: { id } });
    return successResponse(null, 'Book deleted');
  }

  async borrowBook(data: { bookId: string; borrowerType: string; borrowerId: string; dueDate: string }, schoolId: string) {
    const book = await this.prisma.book.findFirst({ where: { id: data.bookId, schoolId } });
    if (!book) throw new NotFoundException('Book not found');
    if (book.available <= 0) throw new BadRequestException('No copies of this book are currently available');

    const [borrowing] = await this.prisma.$transaction([
      this.prisma.borrowing.create({
        data: {
          bookId: data.bookId,
          borrowerType: data.borrowerType,
          borrowerId: data.borrowerId,
          dueDate: new Date(data.dueDate),
          status: 'BORROWED',
        },
        include: { book: { select: { title: true, author: true } } },
      }),
      this.prisma.book.update({ where: { id: data.bookId }, data: { available: { decrement: 1 } } }),
    ]);
    return successResponse(borrowing, 'Book issued successfully');
  }

  async returnBook(id: string, schoolId: string) {
    const borrowing = await this.prisma.borrowing.findFirst({
      where: { id, book: { schoolId } },
      include: { book: true },
    });
    if (!borrowing) throw new NotFoundException('Borrowing record not found');
    if (borrowing.status === 'RETURNED') throw new BadRequestException('This book has already been returned');

    const now = new Date();
    const dueDate = new Date(borrowing.dueDate);
    let fine = 0;
    if (now > dueDate) {
      const daysLate = Math.ceil((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      fine = daysLate * 50; // ₦50 per day overdue
    }

    const [updated] = await this.prisma.$transaction([
      this.prisma.borrowing.update({
        where: { id },
        data: { returnDate: now, status: 'RETURNED', fine },
        include: { book: { select: { title: true } } },
      }),
      this.prisma.book.update({ where: { id: borrowing.bookId }, data: { available: { increment: 1 } } }),
    ]);
    return successResponse(updated, fine > 0 ? `Book returned. Fine charged: ₦${fine}` : 'Book returned successfully');
  }

  async getBorrowings(schoolId: string, query: PaginationDto & { status?: string }) {
    const {  search, status } = query;
    const where: Prisma.BorrowingWhereInput = {
      book: { schoolId },
      ...(status && { status: status as any }),
      ...(search && { OR: [{ borrowerId: { contains: search } }, { book: { title: { contains: search } } }] }),
    };
    const [data, total] = await Promise.all([
      this.prisma.borrowing.findMany({
        where, skip: safeSkip(query), take: safeTake(query),
        include: { book: { select: { title: true, author: true, shelfNumber: true } } },
        orderBy: { borrowDate: 'desc' },
      }),
      this.prisma.borrowing.count({ where }),
    ]);
    return paginate(data, total, query);
  }

  async getOverdueBorrowings(schoolId: string) {
    const overdues = await this.prisma.borrowing.findMany({
      where: { book: { schoolId }, status: 'BORROWED', dueDate: { lt: new Date() } },
      include: { book: { select: { title: true, author: true } } },
      orderBy: { dueDate: 'asc' },
    });
    // Update status to OVERDUE
    if (overdues.length > 0) {
      await this.prisma.borrowing.updateMany({
        where: { id: { in: overdues.map(o => o.id) } },
        data: { status: 'OVERDUE' },
      });
    }
    return successResponse(overdues);
  }

  async getCategories(schoolId: string) {
    const cats = await this.prisma.book.groupBy({
      by: ['category'],
      where: { schoolId, category: { not: null } },
      _count: { id: true },
      _sum: { copies: true, available: true },
    });
    return successResponse(cats.map(c => ({ name: c.category, count: c._count.id, copies: c._sum.copies, available: c._sum.available })));
  }

  async getStats(schoolId: string) {
    const [totalBooks, totalCopies, borrowedBooks, overdueBooks] = await Promise.all([
      this.prisma.book.count({ where: { schoolId } }),
      this.prisma.book.aggregate({ where: { schoolId }, _sum: { copies: true, available: true } }),
      this.prisma.borrowing.count({ where: { book: { schoolId }, status: 'BORROWED' } }),
      this.prisma.borrowing.count({ where: { book: { schoolId }, status: { in: ['BORROWED', 'OVERDUE'] }, dueDate: { lt: new Date() } } }),
    ]);
    return successResponse({
      totalBooks,
      totalCopies: totalCopies._sum.copies || 0,
      availableCopies: totalCopies._sum.available || 0,
      borrowedBooks,
      overdueBooks,
    });
  }
}
