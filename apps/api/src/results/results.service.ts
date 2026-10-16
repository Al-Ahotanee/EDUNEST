import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { successResponse } from '../common/dto/pagination.dto';

const GRADE_SCALE = [
  { min: 90, max: 100, grade: 'A+', remark: 'Excellent' },
  { min: 80, max: 89, grade: 'A', remark: 'Very Good' },
  { min: 70, max: 79, grade: 'B', remark: 'Good' },
  { min: 60, max: 69, grade: 'C', remark: 'Average' },
  { min: 50, max: 59, grade: 'D', remark: 'Below Average' },
  { min: 0, max: 49, grade: 'F', remark: 'Fail' },
];

function getGrade(score: number) {
  const found = GRADE_SCALE.find((g) => score >= g.min && score <= g.max);
  return found || { grade: 'F', remark: 'Fail' };
}

@Injectable()
export class ResultsService {
  constructor(private prisma: PrismaService) {}

  async enterScore(data: {
    studentId: string;
    subjectId: string;
    termId: string;
    ca1Score?: number;
    ca2Score?: number;
    examScore?: number;
  }, schoolId: string) {
    const { studentId, subjectId, termId, ca1Score = 0, ca2Score = 0, examScore = 0 } = data;

    const student = await this.prisma.student.findFirst({ where: { id: studentId, schoolId } });
    if (!student) throw new NotFoundException('Student not found');

    const totalScore = ca1Score + ca2Score + examScore;
    const { grade, remark } = getGrade(totalScore);

    const result = await this.prisma.result.upsert({
      where: { studentId_subjectId_termId: { studentId, subjectId, termId } },
      create: { studentId, subjectId, termId, ca1Score, ca2Score, examScore, totalScore, grade, remark },
      update: { ca1Score, ca2Score, examScore, totalScore, grade, remark, isApproved: false },
      include: { subject: true, student: true },
    });

    // Recalculate positions for all students in this subject/term
    await this.recalculatePositions(subjectId, termId);

    return successResponse(result, 'Score entered successfully');
  }

  async bulkEnterScores(scores: any[], schoolId: string) {
    const results = await Promise.all(
      scores.map((score) => this.enterScore(score, schoolId)),
    );
    return successResponse(results, `${results.length} scores entered`);
  }

  async getClassResults(classId: string, termId: string, schoolId: string) {
    const enrollments = await this.prisma.classEnrollment.findMany({
      where: { classId, student: { schoolId } },
      include: {
        student: {
          include: {
            results: {
              where: { termId },
              include: { subject: true },
            },
          },
        },
      },
    });

    const studentResults = enrollments.map((e) => {
      const student = e.student;
      const totalScore = student.results.reduce((sum, r) => sum + (r.totalScore || 0), 0);
      const averageScore = student.results.length > 0 ? totalScore / student.results.length : 0;
      const { grade } = getGrade(averageScore);

      return {
        studentId: student.id,
        admissionNumber: student.admissionNumber,
        name: `${student.firstName} ${student.lastName}`,
        subjects: student.results,
        totalScore,
        averageScore: Math.round(averageScore * 100) / 100,
        grade,
        position: 0,
      };
    });

    // Calculate positions
    studentResults.sort((a, b) => b.totalScore - a.totalScore);
    studentResults.forEach((s, i) => (s.position = i + 1));

    return successResponse(studentResults);
  }

  async generateReportCard(studentId: string, termId: string, schoolId: string) {
    const student = await this.prisma.student.findFirst({
      where: { id: studentId, schoolId },
      include: { guardians: { take: 1 } },
    });
    if (!student) throw new NotFoundException('Student not found');

    const term = await this.prisma.term.findUnique({
      where: { id: termId },
      include: { session: true },
    });
    if (!term) throw new NotFoundException('Term not found');

    const results = await this.prisma.result.findMany({
      where: { studentId, termId },
      include: { subject: true },
      orderBy: { subject: { name: 'asc' } },
    });

    const enrollment = await this.prisma.classEnrollment.findFirst({
      where: { studentId, sessionId: term.sessionId },
      include: { class: true },
    });

    // Class performance for positions
    const classResults = enrollment
      ? await this.getClassResults(enrollment.classId, termId, schoolId)
      : null;

    const studentClassResult = classResults?.data?.find(
      (r: any) => r.studentId === studentId,
    );

    const totalScore = results.reduce((sum, r) => sum + (r.totalScore || 0), 0);
    const averageScore = results.length > 0 ? totalScore / results.length : 0;
    const { grade, remark } = getGrade(averageScore);

    return successResponse({
      student: {
        ...student,
        class: enrollment?.class?.name,
      },
      term: { name: term.name, session: term.session.name },
      results,
      summary: {
        totalSubjects: results.length,
        totalScore,
        averageScore: Math.round(averageScore * 100) / 100,
        grade,
        remark,
        position: studentClassResult?.position || null,
        classSize: classResults?.data?.length || null,
      },
    });
  }

  async approveResults(termId: string, schoolId: string, approvedBy: string) {
    await this.prisma.result.updateMany({
      where: { termId, student: { schoolId } },
      data: { isApproved: true, approvedBy, approvedAt: new Date() },
    });
    return successResponse(null, 'Results approved successfully');
  }

  async getResultStatistics(schoolId: string, termId: string) {
    const results = await this.prisma.result.findMany({
      where: { termId, student: { schoolId } },
    });

    const passed = results.filter((r) => (r.totalScore || 0) >= 50).length;
    const failed = results.length - passed;
    const average = results.length
      ? results.reduce((s, r) => s + (r.totalScore || 0), 0) / results.length
      : 0;

    const gradeDistribution = GRADE_SCALE.map((scale) => ({
      grade: scale.grade,
      count: results.filter(
        (r) => (r.totalScore || 0) >= scale.min && (r.totalScore || 0) <= scale.max,
      ).length,
    }));

    return successResponse({
      total: results.length,
      passed,
      failed,
      passRate: results.length ? Math.round((passed / results.length) * 100) : 0,
      averageScore: Math.round(average * 100) / 100,
      gradeDistribution,
    });
  }

  private async recalculatePositions(subjectId: string, termId: string) {
    const results = await this.prisma.result.findMany({
      where: { subjectId, termId },
      orderBy: { totalScore: 'desc' },
    });

    await Promise.all(
      results.map((r, i) =>
        this.prisma.result.update({
          where: { id: r.id },
          data: { position: i + 1 },
        }),
      ),
    );
  }
}
