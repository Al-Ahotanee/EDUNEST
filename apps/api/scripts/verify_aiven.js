require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const [
    userCount,
    tenantCount,
    schoolCount,
    studentCount,
    resultCount,
    reportCardCount,
    assignmentCount,
    gradingScaleCount,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.tenant.count(),
    prisma.school.count(),
    prisma.student.count(),
    prisma.result.count(),
    prisma.termReportCard.count(),
    prisma.teacherAssignment.count(),
    prisma.gradingScale.count(),
  ]);

  const publishedResults = await prisma.result.findMany({
    where: { status: 'PUBLISHED' },
    select: {
      student: { select: { firstName: true, lastName: true } },
      subject: { select: { name: true } },
      ca1Score: true,
      ca2Score: true,
      ca3Score: true,
      examScore: true,
      totalScore: true,
      grade: true,
      status: true,
      publishedAt: true,
    },
  });

  const reportCard = await prisma.termReportCard.findFirst({
    select: {
      student: { select: { firstName: true, lastName: true, admissionNumber: true } },
      term: { select: { name: true } },
      totalScore: true,
      averageScore: true,
      position: true,
      status: true,
      classTeacherRemark: true,
      principalRemark: true,
    },
  });

  console.log('=== AIVEN DATABASE STATS & VERIFICATION ===');
  console.log(JSON.stringify({
    tenants: tenantCount,
    schools: schoolCount,
    users: userCount,
    students: studentCount,
    gradingScales: gradingScaleCount,
    teacherAssignments: assignmentCount,
    totalResults: resultCount,
    reportCards: reportCardCount,
    samplePublishedResults: publishedResults,
    sampleReportCard: reportCard,
  }, null, 2));

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
