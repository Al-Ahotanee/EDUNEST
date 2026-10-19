import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { successResponse } from '../common/dto/pagination.dto';

export const DEFAULT_WEBSITE_SECTIONS = {
  enabledSections: {
    hero: true,
    stats: true,
    about: true,
    programs: true,
    facilities: true,
    studentLife: true,
    faculty: true,
    news: true,
    events: true,
    gallery: true,
    testimonials: true,
    faq: true,
    contact: true,
  },
  sectionOrder: [
    'hero',
    'stats',
    'about',
    'programs',
    'facilities',
    'studentLife',
    'faculty',
    'news',
    'events',
    'gallery',
    'testimonials',
    'faq',
    'contact',
  ],
  hero: {
    headline: 'Nurturing Global Leaders with Academic Excellence & Moral Integrity',
    subtitle: 'Providing world-class modern education, personalized mentorship, and holistic character formation for tomorrow’s leaders.',
    badgeText: 'Now Enrolling for Next Academic Session',
    ctaPrimaryText: 'Apply for Admission',
    ctaPrimaryLink: '/apply',
    ctaSecondaryText: 'Explore Campus',
    ctaSecondaryLink: '#about',
    bgImage: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=1800&q=80',
    overlayOpacity: 0.65,
  },
  stats: [
    { label: 'Years of Excellence', value: '25+', icon: 'Award' },
    { label: 'Qualified Educators', value: '120+', icon: 'Users' },
    { label: 'Enrolled Students', value: '1,800+', icon: 'GraduationCap' },
    { label: 'Exam Success Rate', value: '99.4%', icon: 'CheckCircle2' },
  ],
  about: {
    title: 'About Our Institution',
    subtitle: 'Inspiring young minds to discover purpose, pursue excellence, and transform communities.',
    history: 'Founded with a profound vision to raise a distinctive generation of scholars, our school has grown from a humble beginning into a premier benchmark institution recognized for academic distinction, sports excellence, and moral fortitude.',
    mission: 'To provide a stimulating learning environment where every learner develops intellect, moral rectitude, creativity, and self-confidence to excel in an interconnected global community.',
    vision: 'To be the benchmark center of academic distinction, technological innovation, and ethical leadership.',
    values: ['Academic Excellence', 'Integrity & Honor', 'Innovation & Discovery', 'Compassion & Service', 'Discipline & Resilience'],
    principalName: 'Dr. (Mrs.) Adebayo Adesina',
    principalTitle: 'Principal / Head of Institution',
    principalMessage: 'Welcome to our vibrant academic family. Here, every child is seen, known, and championed to achieve their highest divine and intellectual potential. We partner with parents to foster not just intellectual prowess, but rounded, grounded character.',
    principalPhoto: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=600&q=80',
  },
  programs: [
    {
      name: 'Early Years & Creche',
      ageRange: '3 months – 5 years',
      description: 'Montessori-inspired play-based discovery fostering curiosity, language development, motor coordination, and social confidence in a safe, loving haven.',
      subjects: ['Phonics & Early Reading', 'Numeracy Discovery', 'Sensory Play', 'Creative Arts', 'Music & Movement'],
    },
    {
      name: 'Primary Education',
      ageRange: '6 – 11 years',
      description: 'Strong foundational academics integrating the British and Nigerian National Curricula with coding, STEM robotics, and critical thinking.',
      subjects: ['English & Literacy', 'Mathematics & Logic', 'Basic Science & Tech', 'Coding & Robotics', 'Social Studies', 'French & Languages'],
    },
    {
      name: 'Junior Secondary (JSS 1–3)',
      ageRange: '11 – 14 years',
      description: 'Comprehensive secondary transition developing analytical reasoning, experimental sciences, digital creativity, and BECE/NECO excellence.',
      subjects: ['Mathematics', 'English Studies', 'Basic Technology', 'Agricultural Science', 'Business Studies', 'Creative Arts', 'Civic Education'],
    },
    {
      name: 'Senior Secondary (SSS 1–3)',
      ageRange: '14 – 17 years',
      description: 'Rigorous pre-university preparatory programs divided into Science, Arts, and Commercial streams with targeted WAEC, NECO, and Cambridge IGCSE track record.',
      subjects: ['Pure Sciences (Physics, Chem, Bio)', 'Commercial (Accounts, Commerce, Econ)', 'Arts & Humanities (Lit, Govt, History)', 'Further Mathematics', 'Data Processing'],
    },
  ],
  facilities: [
    {
      title: 'Advanced STEM & Robotics Lab',
      description: 'Ultra-modern computer lab equipped with high-speed fiber internet, 3D printers, micro-controllers, and interactive smartboards.',
      image: 'https://images.unsplash.com/photo-1581092921461-eab62e97a780?auto=format&fit=crop&w=800&q=80',
      badge: 'Technology',
    },
    {
      title: 'Digital & Research Library',
      description: 'Over 15,000 physical volumes complemented with subscriptions to global e-libraries, audiobooks, and quiet study alcoves.',
      image: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=800&q=80',
      badge: 'Academics',
    },
    {
      title: 'Olympic Sports Arena & Pool',
      description: 'Full-size football pitch, standard running tracks, basketball and tennis courts, and a temperature-controlled swimming pool with certified lifesavers.',
      image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=800&q=80',
      badge: 'Athletics',
    },
    {
      title: 'Modern Science Theatres',
      description: 'Dedicated Physics, Chemistry, and Biology laboratories equipped with modern diagnostic reagents, fume cupboards, and individual workstations.',
      image: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=800&q=80',
      badge: 'Science',
    },
  ],
  studentLife: {
    clubs: ['Robotics & Coding Club', 'Literary & Debating Society', 'Music & Brass Orchestra', 'Press & Media Club', 'Junior Engineers (JETS)', 'Scouts & Red Cross'],
    sports: ['Football League', 'Basketball', 'Swimming', 'Track & Field', 'Table Tennis', 'Chess & Scrabble Masters'],
  },
  faculty: [
    {
      name: 'Mr. Babatunde Williams',
      title: 'Dean of Sciences & STEM Coordinator',
      department: 'Pure & Applied Sciences',
      qualification: 'M.Sc. Physics (Distinction), PGDE',
      photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    },
    {
      name: 'Mrs. Chioma Okonkwo',
      title: 'Head of Humanities & Literary Arts',
      department: 'English & Modern Languages',
      qualification: 'B.A. English (First Class), M.Ed.',
      photo: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=400&q=80',
    },
    {
      name: 'Mr. Emmanuel Danladi',
      title: 'Director of ICT & Digital Learning',
      department: 'Computer Science',
      qualification: 'B.Sc. Computer Engineering, Certified Google Educator',
      photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
    },
  ],
  news: [
    {
      title: 'EduNest Scholars Clinch Gold at National Olympiad',
      date: 'October 12, 2026',
      category: 'Academic Honor',
      summary: 'Our senior science delegation represented the state and emerged champions at the 2026 National STEM & Innovation Olympiad.',
    },
    {
      title: 'New Solar Power Infrastructure Commissioned',
      date: 'September 28, 2026',
      category: 'Campus Facilities',
      summary: 'The institution transitions to 100% clean, uninterruptible renewable solar energy to power laboratories and digital classrooms round-the-clock.',
    },
  ],
  events: [
    {
      title: 'Annual Inter-House Athletics Championship',
      date: 'November 15, 2026',
      time: '9:00 AM – 3:30 PM',
      location: 'School Main Sports Arena',
      description: 'A day of friendly rivalry, athletic excellence, parent races, and celebration of sportsmanship.',
    },
    {
      title: 'Parents-Teachers Association (PTA) General Assembly',
      date: 'November 22, 2026',
      time: '11:00 AM – 1:00 PM',
      location: 'School Multipurpose Auditorium',
      description: 'Strategic review of school initiatives, academic performance review, and infrastructure milestones.',
    },
    {
      title: 'Annual Science, Arts & Cultural Exposition',
      date: 'December 05, 2026',
      time: '10:00 AM – 4:00 PM',
      location: 'Exhibition Grounds',
      description: 'Interactive showcase of student inventions, robotics projects, dramatic presentations, and cultural culinary delights.',
    },
  ],
  gallery: [
    { title: 'Interactive Smart Classroom Session', category: 'Academics', image: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=800&q=80' },
    { title: 'STEM Robotics Championship Finalists', category: 'Technology', image: 'https://images.unsplash.com/photo-1581092921461-eab62e97a780?auto=format&fit=crop&w=800&q=80' },
    { title: 'Inter-House Sports Relay Race', category: 'Sports', image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=800&q=80' },
    { title: 'Orchestra & Choir Rehearsal', category: 'Arts', image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80' },
    { title: 'Modern Library Study Hall', category: 'Campus', image: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=800&q=80' },
    { title: 'Biology Lab Microscopy Session', category: 'Academics', image: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=800&q=80' },
  ],
  testimonials: [
    {
      name: 'Engr. & Mrs. Farouk Ibrahim',
      role: 'Parents of JSS 2 and SSS 1 Students',
      quote: 'Enrolling our children here has been one of our proudest family decisions. The balance between academic discipline and warm spiritual values is extraordinary.',
      photo: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80',
    },
    {
      name: 'Dr. Michael Chen',
      role: 'Parent of Primary 5 Pupil',
      quote: 'The teachers do not just instruct; they ignite a love for learning. My daughter built her first coding game at age 9 through the school STEM club!',
      photo: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=200&q=80',
    },
    {
      name: 'Zainab Al-Hassan',
      role: 'Valedictorian (Class of 2025)',
      quote: 'The leadership opportunities and university preparation here gave me the confidence to win a full scholarship to study Aerospace Engineering.',
      photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    },
  ],
  faq: [
    {
      question: 'How do I apply for admission for my child?',
      answer: 'You can apply directly online through our website under the "Apply Now" tab. Complete the 5-step application, upload required documents, and you will receive a unique Application Slip instantly.',
    },
    {
      question: 'What curricula does the school offer?',
      answer: 'We operate an enriched dual curriculum blending the British National Curriculum (Cambridge Checkpoint & IGCSE) with the Nigerian Basic and Senior Secondary Curricula (BECE & WAEC/NECO).',
    },
    {
      question: 'Do you offer boarding facilities?',
      answer: 'Yes, we provide comfortable, secure, and air-conditioned boarding facilities for students from JSS 1 through SSS 3 with dedicated houseparents, evening tutorials, and 24/7 infirmary support.',
    },
    {
      question: 'What co-curricular activities are available?',
      answer: 'Over 20 clubs and sporting teams spanning Robotics, Coding, Chess, Drama, Brass Band, Football, Swimming, Basketball, Debating, and French immersion.',
    },
  ],
  contact: {
    address: 'Plot 12, EduNest Boulevard, Victoria Island, Lagos, Nigeria',
    phone: '+234 800 EDUNEST, +234 812 345 6789',
    email: 'admissions@edunest.edu.ng',
    openingHours: 'Monday – Friday: 7:30 AM – 4:30 PM',
  },
  footer: {
    copyright: `© ${new Date().getFullYear()} All Rights Reserved. Accredited by Ministry of Education.`,
  },
};

@Injectable()
export class SchoolWebsiteService {
  constructor(private prisma: PrismaService) {}

  private async resolveSchool(idOrSlug: string) {
    const school = await this.prisma.school.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { tenant: { slug: idOrSlug } }, { tenant: { domain: idOrSlug } }],
      },
      include: {
        tenant: true,
        websiteConfig: true,
      },
    });

    if (!school) {
      throw new NotFoundException(`School '${idOrSlug}' not found`);
    }

    return school;
  }

  async getPublicWebsite(idOrSlug: string) {
    const school = await this.resolveSchool(idOrSlug);
    let config = school.websiteConfig;

    if (!config) {
      // Create initial default website config on first visit
      config = await this.prisma.schoolWebsiteConfig.create({
        data: {
          schoolId: school.id,
          template: 'MODERN_ACADEMY',
          isPublished: true,
          publishedContent: DEFAULT_WEBSITE_SECTIONS,
          draftContent: DEFAULT_WEBSITE_SECTIONS,
          metaTitle: `${school.name} — Inspiring Excellence`,
          metaDescription: school.motto || 'Welcome to our vibrant academic community.',
        },
      });
    }

    const branding = {
      schoolId: school.id,
      tenantId: school.tenantId,
      name: school.name || school.tenant.name,
      slug: school.tenant.slug,
      domain: school.tenant.domain,
      logo: school.logo || school.tenant.logo,
      motto: school.motto || school.tenant.motto,
      primaryColor: school.tenant.primaryColor || '#1a56db',
      secondaryColor: school.tenant.secondaryColor || '#7e3af2',
      address: school.address || school.tenant.address,
      phone: school.phone || school.tenant.phone,
      email: school.email || school.tenant.email,
      website: school.website || school.tenant.website,
      type: school.type,
      yearEstablished: school.tenant.yearEstablished,
    };

    const publishedFees = await this.prisma.feeStructure.findMany({
      where: { schoolId: school.id, status: 'PUBLISHED' },
      include: { class: { select: { id: true, name: true, level: true } } },
      orderBy: { createdAt: 'asc' },
    });

    return successResponse({
      id: config.id,
      schoolId: school.id,
      template: config.template,
      isPublished: config.isPublished,
      publishedAt: config.publishedAt,
      content: config.publishedContent || DEFAULT_WEBSITE_SECTIONS,
      metaTitle: config.metaTitle,
      metaDescription: config.metaDescription,
      ogImage: config.ogImage,
      branding,
      feeSchedules: publishedFees,
    });
  }

  async getPublicFeeSchedules(idOrSlug: string) {
    const school = await this.resolveSchool(idOrSlug);
    const fees = await this.prisma.feeStructure.findMany({
      where: { schoolId: school.id, status: 'PUBLISHED' },
      include: { class: { select: { id: true, name: true, level: true } } },
      orderBy: { createdAt: 'asc' },
    });

    // Group fees by class
    const classMap: Record<string, any> = {};
    for (const f of fees) {
      const clsKey = f.classId || 'GENERAL';
      const clsName = f.class?.name || 'All Classes / General Charges';
      if (!classMap[clsKey]) {
        classMap[clsKey] = {
          classId: f.classId,
          className: clsName,
          items: [],
          newStudentTotal: 0,
          returningStudentTotal: 0,
        };
      }
      classMap[clsKey].items.push(f);
      if (f.applicableTo === 'ALL' || f.applicableTo === 'NEW_STUDENT') {
        classMap[clsKey].newStudentTotal += (f.amount || 0);
      }
      if ((f.applicableTo === 'ALL' || f.applicableTo === 'RETURNING_STUDENT') && f.feeType !== 'ONE_TIME') {
        classMap[clsKey].returningStudentTotal += (f.amount || 0);
      }
    }

    return successResponse({
      school: {
        id: school.id,
        name: school.name || school.tenant.name,
        code: school.code,
        logo: school.logo || school.tenant.logo,
      },
      schedulesByClass: Object.values(classMap),
      allFees: fees,
    });
  }

  async getAdminWebsiteConfig(idOrSlug: string) {
    const school = await this.resolveSchool(idOrSlug);
    let config = school.websiteConfig;

    if (!config) {
      config = await this.prisma.schoolWebsiteConfig.create({
        data: {
          schoolId: school.id,
          template: 'MODERN_ACADEMY',
          isPublished: true,
          publishedContent: DEFAULT_WEBSITE_SECTIONS,
          draftContent: DEFAULT_WEBSITE_SECTIONS,
          metaTitle: `${school.name} — Inspiring Excellence`,
          metaDescription: school.motto || 'Welcome to our vibrant academic community.',
        },
      });
    }

    return successResponse({
      config,
      school: {
        id: school.id,
        name: school.name,
        slug: school.tenant.slug,
        primaryColor: school.tenant.primaryColor,
        secondaryColor: school.tenant.secondaryColor,
        logo: school.logo || school.tenant.logo,
        motto: school.motto || school.tenant.motto,
      },
    });
  }

  async updateWebsiteConfig(idOrSlug: string, dto: any) {
    const school = await this.resolveSchool(idOrSlug);
    const existing = school.websiteConfig;

    const template = dto.template || existing?.template || 'MODERN_ACADEMY';
    const isPublished = dto.isPublished !== undefined ? dto.isPublished : true;
    const contentToSave = dto.content || dto.draftContent || existing?.draftContent || DEFAULT_WEBSITE_SECTIONS;

    const updated = await this.prisma.schoolWebsiteConfig.upsert({
      where: { schoolId: school.id },
      create: {
        schoolId: school.id,
        template,
        isPublished,
        publishedAt: isPublished ? new Date() : null,
        draftContent: contentToSave,
        publishedContent: isPublished ? contentToSave : (existing?.publishedContent || contentToSave),
        metaTitle: dto.metaTitle || `${school.name} — Official Website`,
        metaDescription: dto.metaDescription,
        ogImage: dto.ogImage,
      },
      update: {
        template,
        ...(dto.isPublished !== undefined && { isPublished: dto.isPublished }),
        ...(isPublished && { publishedAt: new Date() }),
        ...(dto.draftContent !== undefined && { draftContent: dto.draftContent }),
        ...(dto.content !== undefined && { draftContent: dto.content }),
        ...(isPublished && dto.content && { publishedContent: dto.content }),
        ...(dto.metaTitle !== undefined && { metaTitle: dto.metaTitle }),
        ...(dto.metaDescription !== undefined && { metaDescription: dto.metaDescription }),
        ...(dto.ogImage !== undefined && { ogImage: dto.ogImage }),
      },
    });

    return successResponse(updated, 'Website configuration updated successfully');
  }

  async submitInquiry(idOrSlug: string, dto: any) {
    const school = await this.resolveSchool(idOrSlug);

    if (!dto.name || !dto.email || !dto.message) {
      throw new BadRequestException('Name, email, and message are required.');
    }

    const inquiry = await this.prisma.schoolInquiry.create({
      data: {
        schoolId: school.id,
        name: dto.name.trim(),
        email: dto.email.trim().toLowerCase(),
        phone: dto.phone ? dto.phone.trim() : null,
        subject: dto.subject ? dto.subject.trim() : 'General Inquiry',
        message: dto.message.trim(),
        status: 'NEW',
      },
    });

    return successResponse(
      { id: inquiry.id, createdAt: inquiry.createdAt },
      'Thank you for contacting us. Your message has been received and our team will get in touch with you shortly.'
    );
  }

  async listInquiries(idOrSlug: string, query: any) {
    const school = await this.resolveSchool(idOrSlug);
    const { status, search } = query;

    const where: any = { schoolId: school.id };
    if (status && status !== 'ALL') {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
        { subject: { contains: search } },
        { message: { contains: search } },
      ];
    }

    const inquiries = await this.prisma.schoolInquiry.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return successResponse(inquiries);
  }

  async updateInquiry(idOrSlug: string, inquiryId: string, dto: any) {
    const school = await this.resolveSchool(idOrSlug);

    const inquiry = await this.prisma.schoolInquiry.findFirst({
      where: { id: inquiryId, schoolId: school.id },
    });

    if (!inquiry) throw new NotFoundException('Inquiry not found');

    const updated = await this.prisma.schoolInquiry.update({
      where: { id: inquiryId },
      data: {
        ...(dto.status && { status: dto.status }),
        ...(dto.adminNotes !== undefined && { adminNotes: dto.adminNotes }),
      },
    });

    return successResponse(updated, 'Inquiry updated successfully');
  }
}
