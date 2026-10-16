import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { successResponse, paginate, safeSkip, safeTake, PaginationDto } from '../common/dto/pagination.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class CbtService {
  constructor(private prisma: PrismaService) {}

  async createExam(data: any, schoolId: string) {
    // Get latest term for this school
    const term = await this.prisma.term.findFirst({
      where: { session: { schoolId }, isCurrent: true },
    }) || await this.prisma.term.findFirst({
      where: { session: { schoolId } },
      orderBy: { createdAt: 'desc' },
    });

    const exam = await this.prisma.examination.create({
      data: {
        termId: data.termId || term?.id,
        title: data.title,
        description: data.description,
        duration: Number(data.duration),
        totalMarks: Number(data.totalMarks),
        passMark: Number(data.passMark),
        startTime: data.startTime ? new Date(data.startTime) : new Date(),
        endTime: data.endTime ? new Date(data.endTime) : new Date(Date.now() + 3600000),
        isRandomized: data.isRandomized ?? true,
      },
    });
    return successResponse(exam, 'Exam created');
  }

  async listExams(schoolId: string, query: PaginationDto) {
    
    const termIds = await this.prisma.term.findMany({
      where: { session: { schoolId } },
      select: { id: true },
    });
    const ids = termIds.map(t => t.id);

    const [data, total] = await Promise.all([
      this.prisma.examination.findMany({
        where: { termId: { in: ids } },
        skip: safeSkip(query), take: safeTake(query),
        include: {
          term: { include: { session: true } },
          _count: { select: { questions: true, attempts: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.examination.count({ where: { termId: { in: ids } } }),
    ]);
    return paginate(data, total, query);
  }

  private async verifyExam(examId: string, schoolId: string) {
    const exam = await this.prisma.examination.findFirst({
      where: { id: examId, term: { session: { schoolId } } },
    });
    if (!exam) throw new NotFoundException('Exam not found');
    return exam;
  }

  async getExam(id: string, schoolId: string) {
    const exam = await this.prisma.examination.findFirst({
      where: { id, term: { session: { schoolId } } },
      include: {
        term: { include: { session: true } },
        _count: { select: { questions: true, attempts: true } },
      },
    });
    if (!exam) throw new NotFoundException('Exam not found');
    return successResponse(exam);
  }

  async updateExam(id: string, schoolId: string, data: any) {
    await this.verifyExam(id, schoolId);
    const exam = await this.prisma.examination.update({
      where: { id },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.duration && { duration: Number(data.duration) }),
        ...(data.totalMarks && { totalMarks: Number(data.totalMarks) }),
        ...(data.passMark && { passMark: Number(data.passMark) }),
        ...(data.startTime && { startTime: new Date(data.startTime) }),
        ...(data.endTime && { endTime: new Date(data.endTime) }),
        ...(data.isRandomized !== undefined && { isRandomized: data.isRandomized }),
      },
    });
    return successResponse(exam, 'Exam updated');
  }

  async deleteExam(id: string, schoolId: string) {
    await this.verifyExam(id, schoolId);
    await this.prisma.question.deleteMany({ where: { examinationId: id } });
    await this.prisma.examAttempt.deleteMany({ where: { examinationId: id } });
    await this.prisma.examination.delete({ where: { id } });
    return successResponse(null, 'Exam deleted');
  }

  async publishExam(id: string, schoolId: string) {
    await this.verifyExam(id, schoolId);
    const count = await this.prisma.question.count({ where: { examinationId: id } });
    if (count === 0) throw new BadRequestException('Cannot publish exam with no questions');
    const exam = await this.prisma.examination.update({ where: { id }, data: { isPublished: true } });
    return successResponse(exam, 'Exam published successfully');
  }

  async unpublishExam(id: string, schoolId: string) {
    await this.verifyExam(id, schoolId);
    const exam = await this.prisma.examination.update({ where: { id }, data: { isPublished: false } });
    return successResponse(exam, 'Exam unpublished');
  }

  async addQuestion(examId: string, schoolId: string, data: any) {
    await this.verifyExam(examId, schoolId);

    const q = await this.prisma.question.create({
      data: {
        examinationId: examId,
        subjectId: data.subjectId,
        type: data.type,
        content: data.content,
        options: data.options !== undefined ? data.options : undefined,
        answer: data.answer,
        explanation: data.explanation,
        marks: Number(data.marks || 1),
      },
      include: { subject: { select: { name: true, code: true } } },
    });
    return successResponse(q, 'Question added');
  }

  async getQuestions(examId: string, schoolId: string) {
    await this.verifyExam(examId, schoolId);
    const questions = await this.prisma.question.findMany({
      where: { examinationId: examId },
      include: { subject: { select: { name: true, code: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return successResponse(questions);
  }

  async updateQuestion(questionId: string, schoolId: string, data: any) {
    const qExists = await this.prisma.question.findFirst({
      where: { id: questionId, examination: { term: { session: { schoolId } } } },
    });
    if (!qExists) throw new NotFoundException('Question not found');

    const q = await this.prisma.question.update({
      where: { id: questionId },
      data: {
        ...(data.content && { content: data.content }),
        ...(data.type && { type: data.type }),
        ...(data.options !== undefined && { options: data.options }),
        ...(data.answer && { answer: data.answer }),
        ...(data.explanation !== undefined && { explanation: data.explanation }),
        ...(data.marks && { marks: Number(data.marks) }),
      },
    });
    return successResponse(q, 'Question updated');
  }

  async deleteQuestion(questionId: string, schoolId: string) {
    const qExists = await this.prisma.question.findFirst({
      where: { id: questionId, examination: { term: { session: { schoolId } } } },
    });
    if (!qExists) throw new NotFoundException('Question not found');

    await this.prisma.question.delete({ where: { id: questionId } });
    return successResponse(null, 'Question deleted');
  }

  async getAttempts(examId: string, schoolId: string) {
    await this.verifyExam(examId, schoolId);
    const attempts = await this.prisma.examAttempt.findMany({
      where: { examinationId: examId },
      include: {
        student: { select: { firstName: true, lastName: true, admissionNumber: true } },
        responses: true,
      },
      orderBy: { startedAt: 'desc' },
    });
    return successResponse(attempts);
  }

  async getExamStats(examId: string, schoolId: string) {
    await this.verifyExam(examId, schoolId);
    const [total, passed, failed, avg] = await Promise.all([
      this.prisma.examAttempt.count({ where: { examinationId: examId, status: 'SUBMITTED' } }),
      this.prisma.examAttempt.count({ where: { examinationId: examId, isPassed: true } }),
      this.prisma.examAttempt.count({ where: { examinationId: examId, isPassed: false } }),
      this.prisma.examAttempt.aggregate({ where: { examinationId: examId, status: 'SUBMITTED' }, _avg: { score: true } }),
    ]);
    return successResponse({ total, passed, failed, averageScore: Math.round((avg._avg.score || 0) * 100) / 100, passRate: total > 0 ? Math.round((passed / total) * 100) : 0 });
  }
}
