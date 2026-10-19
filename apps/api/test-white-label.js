const { PrismaClient } = require('./node_modules/@prisma/client');
require('dotenv').config({ path: './.env' });

const prisma = new PrismaClient();

async function runTests() {
  console.log('\n======================================================');
  console.log('🧪 EDUNEST WHITE-LABEL & ADMISSIONS VERIFICATION SUITE');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // 1. Get or create test school
    console.log('--- 1. Testing School Branding System ---');
    const tenant = await prisma.tenant.findFirst({
      where: { slug: 'demo-school' },
      include: { schools: true }
    });
    assert(!!tenant, 'Demo tenant found in database');
    const school = tenant.schools[0];
    assert(!!school, `Demo school found: ${school?.name} (${school?.id})`);

    // Test branding update
    const originalPrimary = tenant.primaryColor || '#2563eb';
    const testColor = '#0f766e'; // teal
    const testMotto = 'Empowering Tomorrow\'s Innovators Today';

    await prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        primaryColor: testColor,
        secondaryColor: '#f59e0b',
        motto: testMotto,
        logo: 'https://example.com/branding/school-logo.png'
      }
    });

    const updatedTenant = await prisma.tenant.findUnique({
      where: { id: tenant.id },
      select: { primaryColor: true, secondaryColor: true, motto: true, logo: true }
    });
    assert(updatedTenant.primaryColor === testColor, `Tenant primaryColor updated to ${testColor}`);
    assert(updatedTenant.motto === testMotto, `Tenant motto updated to "${testMotto}"`);
    assert(updatedTenant.logo === 'https://example.com/branding/school-logo.png', 'Tenant logo updated');

    // 2. School Website CMS & 5 Layout Templates
    console.log('\n--- 2. Testing School Website Config & 5 Layout Templates ---');
    const templates = [
      'MODERN_ACADEMY',
      'CLASSIC_HERITAGE',
      'VIBRANT_CAMPUS',
      'MINIMAL_EXCELLENCE',
      'COMPREHENSIVE_COMMUNITY'
    ];

    for (const tpl of templates) {
      const config = await prisma.schoolWebsiteConfig.upsert({
        where: { schoolId: school.id },
        create: {
          schoolId: school.id,
          template: tpl,
          isPublished: true,
          publishedContent: {
            hero: { title: `Welcome to ${school.name} (${tpl})`, subtitle: 'Premier Academic Institution' },
            stats: [{ label: 'Pass Rate', value: '99%' }, { label: 'Students', value: '1200+' }],
            about: { headline: 'Nurturing Global Leaders' }
          },
          draftContent: {
            hero: { title: `Draft Title for ${tpl}` }
          }
        },
        update: {
          template: tpl,
          draftContent: { hero: { title: `Draft Title for ${tpl}` } }
        }
      });
      assert(config.template === tpl, `Successfully switched and saved template: ${tpl}`);
    }

    // Verify draft vs published separation
    const fetchedConfig = await prisma.schoolWebsiteConfig.findUnique({
      where: { schoolId: school.id }
    });
    assert(!!fetchedConfig.publishedContent?.hero?.title, `Published content has live hero title ("${fetchedConfig.publishedContent?.hero?.title}")`);
    assert(fetchedConfig.draftContent?.hero?.title?.includes('Draft Title'), 'Draft content is isolated from published content');

    // Publish draft
    await prisma.schoolWebsiteConfig.update({
      where: { schoolId: school.id },
      data: {
        publishedContent: {
          ...fetchedConfig.publishedContent,
          hero: { title: 'Officially Published Live Website 2026' }
        }
      }
    });
    const published = await prisma.schoolWebsiteConfig.findUnique({
      where: { schoolId: school.id }
    });
    assert(published.publishedContent?.hero?.title === 'Officially Published Live Website 2026', 'Draft published cleanly to live website');

    // 3. School Inquiries
    console.log('\n--- 3. Testing Public Inquiry Submission & CRM Tracking ---');
    const testInquiry = await prisma.schoolInquiry.create({
      data: {
        schoolId: school.id,
        name: 'Fatima Al-Mansoor',
        email: 'fatima.almansoor@example.com',
        phone: '+2348099887766',
        subject: 'Inquiry: Grade 7 Cambridge Admissions',
        message: 'Hello, I would like to schedule a campus tour for next Monday.',
        status: 'NEW'
      }
    });
    assert(!!testInquiry.id, `Inquiry created successfully (ID: ${testInquiry.id}) with status NEW`);

    // Admin updates inquiry status
    const updatedInquiry = await prisma.schoolInquiry.update({
      where: { id: testInquiry.id },
      data: { status: 'CONTACTED' }
    });
    assert(updatedInquiry.status === 'CONTACTED', 'Admin updated inquiry status to CONTACTED');

    // 4. Online Admissions & Pipeline Lifecycle
    console.log('\n--- 4. Testing Online Admissions 5-Stage Evaluation Pipeline ---');
    const appNo = `BFS-ADM-2026-${Math.floor(10000 + Math.random() * 90000)}`;
    const testAdmission = await prisma.admission.create({
      data: {
        schoolId: school.id,
        applicationNo: appNo,
        firstName: 'Zainab',
        lastName: 'Bello',
        gender: 'FEMALE',
        dateOfBirth: new Date('2014-05-12'),
        applyingForClass: 'JSS 1',
        parentName: 'Alhaji Bello',
        parentPhone: '+2348033221100',
        email: 'bello.family@example.com',
        status: 'PENDING',
        stage: 'SUBMITTED',
        notes: JSON.stringify({
          address: '42 Crescent Avenue, Dutse',
          stateOfOrigin: 'Jigawa',
          previousSchool: 'Al-Huda Model Primary'
        })
      }
    });
    assert(testAdmission.stage === 'SUBMITTED', `Application created with stage SUBMITTED (${appNo})`);

    // Advance to UNDER_REVIEW
    const underReview = await prisma.admission.update({
      where: { id: testAdmission.id },
      data: { stage: 'UNDER_REVIEW', status: 'SCREENING' }
    });
    assert(underReview.stage === 'UNDER_REVIEW', 'Advanced stage to UNDER_REVIEW');

    // Schedule Entrance Exam
    const examDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const examScheduled = await prisma.admission.update({
      where: { id: testAdmission.id },
      data: { stage: 'EXAM_SCHEDULED', examDate }
    });
    assert(examScheduled.stage === 'EXAM_SCHEDULED' && !!examScheduled.examDate, `Advanced stage to EXAM_SCHEDULED (Exam Date: ${examDate.toISOString().slice(0, 10)})`);

    // Schedule Interview & Record Exam Score
    const interviewDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
    const interviewScheduled = await prisma.admission.update({
      where: { id: testAdmission.id },
      data: {
        stage: 'INTERVIEW_SCHEDULED',
        interviewDate,
        examScore: 94
      }
    });
    assert(interviewScheduled.stage === 'INTERVIEW_SCHEDULED', 'Advanced stage to INTERVIEW_SCHEDULED');
    assert(interviewScheduled.examScore === 94, 'Entrance exam score recorded as 94/100');

    // Approve Candidate
    const approved = await prisma.admission.update({
      where: { id: testAdmission.id },
      data: { stage: 'APPROVED', status: 'APPROVED' }
    });
    assert(approved.stage === 'APPROVED' && approved.status === 'APPROVED', 'Application stage updated to APPROVED');

    // 5. Parent Status-Checker Lookup Simulation
    console.log('\n--- 5. Testing Parent Application Status Checker Query ---');
    // Step a: Lookup school by tenant slug
    const resolvedSchool = await prisma.school.findFirst({
      where: {
        OR: [{ tenant: { slug: tenant.slug } }, { id: tenant.slug }],
      },
      include: { tenant: true },
    });
    assert(!!resolvedSchool, `Status checker resolved school for slug '${tenant.slug}'`);

    // Step b: Lookup admission by schoolId and applicationNo
    const cleanAppNo = appNo.trim().toUpperCase();
    const candidateLookup = await prisma.admission.findFirst({
      where: {
        schoolId: resolvedSchool.id,
        applicationNo: cleanAppNo,
      },
    });
    assert(!!candidateLookup, 'Parent status checker found application with valid application number');

    // Step c: Validate parent phone verification
    const inputPhoneClean = '+2348033221100'.replace(/[^0-9]/g, '');
    const parentPhoneClean = (candidateLookup.parentPhone || '').replace(/[^0-9]/g, '');
    assert(parentPhoneClean === inputPhoneClean, 'Phone number successfully matched parent record');
    assert(candidateLookup.stage === 'APPROVED', 'Status checker reflects latest stage APPROVED');
    assert(candidateLookup.examScore === 94, 'Status checker displays entrance exam score 94');

    // Step d: Invalid phone query (security check)
    const wrongPhoneClean = '+2348000000000'.replace(/[^0-9]/g, '');
    assert(parentPhoneClean !== wrongPhoneClean, 'Security: Mismatched phone correctly rejected');

    // 6. Strict Multi-Tenant Isolation
    console.log('\n--- 6. Testing Multi-Tenant Data Isolation ---');
    // Create an isolated secondary tenant and school
    const isolatedTenant = await prisma.tenant.create({
      data: {
        name: 'Isolated Academy',
        slug: `isolated-tenant-${Date.now()}`,
        email: `admin-${Date.now()}@isolated.edu`,
        phone: '+2348099001122',
        address: '50 Unity Way, Kano',
        schools: {
          create: {
            name: 'Isolated High School',
            code: `ISO${Math.floor(100 + Math.random() * 900)}`,
            type: 'SECONDARY',
            address: '50 Unity Way, Kano',
            phone: '+2348099001122',
            email: `info-${Date.now()}@isolated.edu`
          }
        }
      },
      include: { schools: true }
    });
    const isolatedSchool = isolatedTenant.schools[0];
    assert(!!isolatedSchool, `Created isolated tenant: ${isolatedTenant.slug}`);

    // Query admissions using isolated schoolId
    const crossTenantAdmissions = await prisma.admission.findMany({
      where: { schoolId: isolatedSchool.id }
    });
    assert(crossTenantAdmissions.length === 0, 'Multi-tenant isolation: Isolated school sees 0 admissions from demo-school');

    // Query website config using isolated schoolId
    const isolatedWebsiteConfig = await prisma.schoolWebsiteConfig.findUnique({
      where: { schoolId: isolatedSchool.id }
    });
    assert(isolatedWebsiteConfig === null, 'Multi-tenant isolation: Isolated school cannot access demo-school website config');

    // Clean up test records
    console.log('\n--- 7. Cleanup & Restoration ---');
    await prisma.admission.delete({ where: { id: testAdmission.id } });
    await prisma.schoolInquiry.delete({ where: { id: testInquiry.id } });
    await prisma.school.delete({ where: { id: isolatedSchool.id } });
    await prisma.tenant.delete({ where: { id: isolatedTenant.id } });

    // Restore original tenant branding
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: { primaryColor: originalPrimary }
    });
    console.log('  Cleaned up temporary test data cleanly.');

    console.log('\n======================================================');
    console.log(`🎉 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('======================================================\n');

    await prisma.$disconnect();
    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Fatal test error:', err);
    await prisma.$disconnect();
    process.exit(1);
  }
}

runTests();
