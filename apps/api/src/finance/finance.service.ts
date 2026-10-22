import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationDto, paginate, safeSkip, safeTake, successResponse } from '../common/dto/pagination.dto';
import { Prisma } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class FinanceService {
  constructor(private prisma: PrismaService) {}

  // ─── FEE STRUCTURES ──────────────────────────────────────────────────────────

  // ─── FEE CATALOGUE & STRUCTURES ──────────────────────────────────────────────

  getFeeCatalogue() {
    return successResponse([
      { category: 'TUITION', name: 'School Fees / Tuition', defaultFrequency: 'TERM', applicableTo: 'ALL', description: 'Core academic instruction and tuition fee' },
      { category: 'APPLICATION', name: 'Application Fee', defaultFrequency: 'ONE_TIME', applicableTo: 'NEW_STUDENT', description: 'Admission application processing fee' },
      { category: 'ADMISSION', name: 'Admission / Registration Fee', defaultFrequency: 'ONE_TIME', applicableTo: 'NEW_STUDENT', description: 'One-time admission registration fee' },
      { category: 'UNIFORM', name: 'School Uniform', defaultFrequency: 'ONE_TIME', applicableTo: 'NEW_STUDENT', description: 'Standard school uniform set (shirts, trousers/skirts, tie, badge)' },
      { category: 'SPORTSWEAR', name: 'Sportswear / PE Kit', defaultFrequency: 'ONE_TIME', applicableTo: 'NEW_STUDENT', description: 'Inter-house sportswear and physical education kit' },
      { category: 'BOOKS', name: 'Textbooks & Learning Materials', defaultFrequency: 'TERM', applicableTo: 'ALL', description: 'Prescribed textbooks, workbooks and stationery' },
      { category: 'LAB', name: 'Laboratory Equipment & STEM Fee', defaultFrequency: 'TERM', applicableTo: 'ALL', description: 'Science laboratory chemicals, apparatus and digital computing access' },
      { category: 'EXAM', name: 'Examination & Assessment Fee', defaultFrequency: 'TERM', applicableTo: 'ALL', description: 'Continuous assessment and termly examination materials' },
      { category: 'PTA', name: 'PTA Levy', defaultFrequency: 'TERM', applicableTo: 'ALL', description: 'Parents-Teachers Association statutory development contribution' },
      { category: 'DEVELOPMENT', name: 'Development Levy', defaultFrequency: 'ANNUAL', applicableTo: 'ALL', description: 'School infrastructure and facilities development levy' },
      { category: 'FACILITY', name: 'Utility & Facility Maintenance', defaultFrequency: 'TERM', applicableTo: 'ALL', description: 'Clean power, sanitation and campus facilities maintenance' },
      { category: 'OTHER', name: 'Other Authorized Charge', defaultFrequency: 'TERM', applicableTo: 'ALL', description: 'Miscellaneous school-approved charges' },
    ]);
  }

  async createFeeStructure(data: any, schoolId: string) {
    if (!data?.name?.trim()) {
      throw new BadRequestException('Fee structure name is required');
    }
    const amount = Number(data.amount);
    if (isNaN(amount) || amount <= 0) {
      throw new BadRequestException('Fee amount must be a positive number greater than 0');
    }

    // Validate classId if provided
    if (data.classId) {
      const cls = await this.prisma.class.findFirst({ where: { id: data.classId, schoolId } });
      if (!cls) throw new BadRequestException('Selected class does not exist');
    }

    const fee = await this.prisma.feeStructure.create({
      data: {
        name: data.name.trim(),
        amount,
        description: data.description || null,
        termBased: data.termBased !== undefined ? Boolean(data.termBased) : true,
        schoolId,
        classId: data.classId || null,
        sessionId: data.sessionId || null,
        termId: data.termId || null,
        feeType: (data.feeType || 'TERM').toUpperCase(),
        status: data.status || 'PUBLISHED',
        applicableTo: data.applicableTo || 'ALL',
        isCompulsory: data.isCompulsory !== undefined ? Boolean(data.isCompulsory) : true,
        category: data.category || null,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
      },
      include: { class: true },
    });
    return successResponse(fee, 'Fee structure created');
  }

  async createOrUpdateClassFeeSchedule(schoolId: string, data: {
    classId: string;
    sessionId?: string;
    termId?: string;
    status?: string;
    items: Array<{
      id?: string;
      name: string;
      amount: number;
      category?: string;
      feeType?: string;
      applicableTo?: string;
      isCompulsory?: boolean;
      description?: string;
      dueDate?: string;
    }>;
  }) {
    if (!data.classId) throw new BadRequestException('Class ID is required');
    const cls = await this.prisma.class.findFirst({ where: { id: data.classId, schoolId } });
    if (!cls) throw new BadRequestException('Selected class does not exist in this school');

    let sessionId = data.sessionId;
    let termId = data.termId;

    if (!sessionId) {
      const activeSession = await this.prisma.academicSession.findFirst({
        where: { schoolId, isCurrent: true },
      }) || await this.prisma.academicSession.findFirst({
        where: { schoolId },
        orderBy: { createdAt: 'desc' },
      });
      sessionId = activeSession?.id;
    }

    if (!termId && sessionId) {
      const activeTerm = await this.prisma.term.findFirst({
        where: { sessionId, isCurrent: true },
      }) || await this.prisma.term.findFirst({
        where: { sessionId },
        orderBy: { createdAt: 'desc' },
      });
      termId = activeTerm?.id;
    }

    const createdItems: any[] = [];

    // Save or update each item
    for (const item of (data.items || [])) {
      const amt = Number(item.amount);
      if (!item.name?.trim() || isNaN(amt) || amt <= 0) continue;

      if (item.id) {
        // Update existing item
        const updated = await this.prisma.feeStructure.update({
          where: { id: item.id },
          data: {
            name: item.name,
            amount: Number(item.amount),
            category: item.category || null,
            feeType: (item.feeType || 'TERM').toUpperCase(),
            applicableTo: item.applicableTo || 'ALL',
            isCompulsory: item.isCompulsory !== undefined ? Boolean(item.isCompulsory) : true,
            description: item.description || null,
            status: data.status || 'PUBLISHED',
            sessionId: sessionId || null,
            termId: termId || null,
            dueDate: item.dueDate ? new Date(item.dueDate) : null,
          },
        });
        createdItems.push(updated);
      } else {
        // Create new item
        const created = await this.prisma.feeStructure.create({
          data: {
            schoolId,
            classId: data.classId,
            sessionId: sessionId || null,
            termId: termId || null,
            name: item.name,
            amount: Number(item.amount),
            category: item.category || null,
            feeType: (item.feeType || 'TERM').toUpperCase(),
            applicableTo: item.applicableTo || 'ALL',
            isCompulsory: item.isCompulsory !== undefined ? Boolean(item.isCompulsory) : true,
            description: item.description || null,
            status: data.status || 'PUBLISHED',
            dueDate: item.dueDate ? new Date(item.dueDate) : null,
          },
        });
        createdItems.push(created);
      }
    }

    return successResponse(createdItems, `Fee schedule updated with ${createdItems.length} fee items for ${cls.name}`);
  }

  async getClassFeeSchedulePreview(classId: string, schoolId: string, options?: { sessionId?: string; termId?: string }) {
    const cls = await this.prisma.class.findFirst({ where: { id: classId, schoolId } });
    if (!cls) throw new NotFoundException('Class not found');

    const fees = await this.prisma.feeStructure.findMany({
      where: {
        schoolId,
        status: 'PUBLISHED',
        OR: [{ classId }, { classId: null }],
        AND: [
          options?.sessionId ? { OR: [{ sessionId: options.sessionId }, { sessionId: null }] } : {},
          options?.termId ? { OR: [{ termId: options.termId }, { termId: null }] } : {},
        ],
      },
      orderBy: { createdAt: 'asc' },
    });

    const newStudentItems = fees.filter(f => f.applicableTo === 'ALL' || f.applicableTo === 'NEW_STUDENT');
    const returningStudentItems = fees.filter(f => (f.applicableTo === 'ALL' || f.applicableTo === 'RETURNING_STUDENT') && f.feeType !== 'ONE_TIME');

    const newStudentTotal = newStudentItems.reduce((sum, f) => sum + (f.amount || 0), 0);
    const returningStudentTotal = returningStudentItems.reduce((sum, f) => sum + (f.amount || 0), 0);

    return successResponse({
      class: { id: cls.id, name: cls.name },
      fees,
      newStudentItems,
      returningStudentItems,
      newStudentTotal,
      returningStudentTotal,
      totalAllItems: fees.reduce((sum, f) => sum + (f.amount || 0), 0),
    });
  }

  async getFeeStructures(schoolId: string, query: PaginationDto & { classId?: string; status?: string }) {
    const { search, classId, status } = query;
    const where: Prisma.FeeStructureWhereInput = {
      schoolId,
      ...(search && { name: { contains: search } }),
      ...(classId && { classId }),
      ...(status && { status }),
    };

    const [data, total] = await Promise.all([
      this.prisma.feeStructure.findMany({
        where,
        skip: safeSkip(query), take: safeTake(query),
        include: { class: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.feeStructure.count({ where }),
    ]);
    return paginate(data, total, query);
  }

  async publishFeeStructure(id: string, schoolId: string) {
    const existing = await this.prisma.feeStructure.findFirst({ where: { id, schoolId } });
    if (!existing) throw new NotFoundException('Fee structure not found');
    const updated = await this.prisma.feeStructure.update({
      where: { id },
      data: { status: 'PUBLISHED' },
      include: { class: { select: { id: true, name: true } } },
    });
    return successResponse(updated, 'Fee structure published — now visible to parents');
  }

  async unpublishFeeStructure(id: string, schoolId: string) {
    const existing = await this.prisma.feeStructure.findFirst({ where: { id, schoolId } });
    if (!existing) throw new NotFoundException('Fee structure not found');
    const updated = await this.prisma.feeStructure.update({
      where: { id },
      data: { status: 'DRAFT' },
      include: { class: { select: { id: true, name: true } } },
    });
    return successResponse(updated, 'Fee structure unpublished');
  }

  async deleteFeeStructure(id: string, schoolId: string) {
    const existing = await this.prisma.feeStructure.findFirst({ where: { id, schoolId } });
    if (!existing) throw new NotFoundException('Fee structure not found');
    await this.prisma.feeStructure.delete({ where: { id } });
    return successResponse(null, 'Fee structure deleted');
  }

  async getFeeStructuresByClass(classId: string, schoolId: string) {
    // Get published fee structures for a specific class (or class-agnostic ones)
    const fees = await this.prisma.feeStructure.findMany({
      where: {
        schoolId,
        status: 'PUBLISHED',
        OR: [
          { classId },
          { classId: null }, // class-agnostic fees apply to all
        ],
      },
      include: { class: { select: { id: true, name: true } } },
      orderBy: { feeType: 'asc' },
    });
    // Calculate total
    const total = fees.reduce((sum, f) => sum + (f.amount || 0), 0);
    return successResponse({ fees, total });
  }

  // ─── Student Category Determination (New vs. Returning) ──────────────────
  async determineStudentCategory(
    studentId: string,
    schoolId: string,
    sessionId?: string,
    termId?: string,
  ): Promise<'NEW_STUDENT' | 'RETURNING_STUDENT'> {
    const student = await this.prisma.student.findFirst({
      where: { id: studentId, schoolId },
      include: {
        classEnrollments: { orderBy: { createdAt: 'asc' } },
        invoices: {
          where: { schoolId },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!student) return 'NEW_STUDENT';

    // 1. If student has 0 prior invoices in this school, they are a NEW student
    if (!student.invoices || student.invoices.length === 0) {
      return 'NEW_STUDENT';
    }

    // 2. Resolve target session
    let targetSessionId = sessionId;
    if (!targetSessionId) {
      const activeSession = await this.prisma.academicSession.findFirst({
        where: { schoolId, isCurrent: true },
      }) || await this.prisma.academicSession.findFirst({
        where: { schoolId },
        orderBy: { createdAt: 'desc' },
      });
      targetSessionId = activeSession?.id;
    }

    // 3. If student has invoices in a prior academic session, they are definitely RETURNING
    const priorSessionInvoices = student.invoices.filter(
      (inv) => inv.sessionId && targetSessionId && inv.sessionId !== targetSessionId
    );
    if (priorSessionInvoices.length > 0) {
      return 'RETURNING_STUDENT';
    }

    // 4. If in the same session: check if they were already invoiced for a prior term (e.g. First Term)
    if (targetSessionId && termId) {
      const priorTermInvoices = student.invoices.filter(
        (inv) => inv.sessionId === targetSessionId && inv.termId && inv.termId !== termId
      );
      if (priorTermInvoices.length > 0) {
        // They were billed in First Term; for Second/Third Term they are RETURNING
        return 'RETURNING_STUDENT';
      }
    }

    // 5. If student has more than 1 class enrollment, they have progressed -> RETURNING
    if (student.classEnrollments.length > 1) {
      return 'RETURNING_STUDENT';
    }

    // 6. Otherwise, for their initial term in the school, they are NEW_STUDENT
    return student.invoices.length === 0 ? 'NEW_STUDENT' : 'RETURNING_STUDENT';
  }

  // ─── Generate invoices from published fee structures ──────────────────────
  async generateInvoicesFromClass(
    classId: string,
    schoolId: string,
    options?: {
      sessionId?: string;
      termId?: string;
      isInitialEnrollment?: boolean;
      studentCategory?: 'ALL' | 'NEW_STUDENT' | 'RETURNING_STUDENT';
    }
  ) {
    // 1. Resolve session and term
    let sessionId = options?.sessionId;
    let termId = options?.termId;

    if (!sessionId) {
      const activeSession = await this.prisma.academicSession.findFirst({
        where: { schoolId, isCurrent: true },
      }) || await this.prisma.academicSession.findFirst({
        where: { schoolId },
        orderBy: { createdAt: 'desc' },
      });
      sessionId = activeSession?.id;
    }

    if (!termId && sessionId) {
      const activeTerm = await this.prisma.term.findFirst({
        where: { sessionId, isCurrent: true },
      }) || await this.prisma.term.findFirst({
        where: { sessionId },
        orderBy: { createdAt: 'desc' },
      });
      termId = activeTerm?.id;
    }

    // 2. Validate published fee structures exist
    const fees = await this.prisma.feeStructure.findMany({
      where: {
        schoolId,
        status: 'PUBLISHED',
        OR: [{ classId }, { classId: null }],
        AND: [
          sessionId ? { OR: [{ sessionId }, { sessionId: null }] } : {},
          termId ? { OR: [{ termId }, { termId: null }] } : {},
        ],
      },
      orderBy: { createdAt: 'asc' },
    });

    if (fees.length === 0) {
      throw new BadRequestException('No published fee structures found for this class. Please configure and publish fee items first.');
    }

    // 3. Get all active students enrolled in this class
    const enrollments = await this.prisma.classEnrollment.findMany({
      where: { classId, student: { status: 'ACTIVE', deletedAt: null } },
      include: {
        student: {
          include: {
            invoices: {
              include: { items: true },
            },
          },
        },
      },
    });

    if (enrollments.length === 0) {
      throw new BadRequestException('No active students found in this class.');
    }

    let invoicesCreated = 0;
    let duplicatesSkipped = 0;
    let totalGeneratedAmount = 0;

    for (const enrollment of enrollments) {
      const student = enrollment.student;

      // Determine category (NEW_STUDENT vs RETURNING_STUDENT)
      const detectedCategory = await this.determineStudentCategory(student.id, schoolId, sessionId, termId);

      // Filter by requested category if specified
      if (options?.studentCategory && options.studentCategory !== 'ALL' && detectedCategory !== options.studentCategory) {
        continue;
      }

      // Check if invoice already exists for this student for this session and term (Idempotency)
      const existingInvoice = student.invoices.find((inv: any) => {
        if (sessionId && termId && inv.sessionId === sessionId && inv.termId === termId) {
          return true;
        }
        if (inv.classId === classId && sessionId && inv.sessionId === sessionId) {
          return true;
        }
        return false;
      });

      if (existingInvoice) {
        duplicatesSkipped++;
        continue;
      }

      // Filter applicable fee items based on category and frequency
      const applicableFees = fees.filter((fee) => {
        // Category check
        const feeApplicableTo = fee.applicableTo || 'ALL';
        if (feeApplicableTo !== 'ALL' && feeApplicableTo !== detectedCategory) {
          return false;
        }

        const feeType = (fee.feeType || 'TERM').toUpperCase();

        if (feeType === 'ONE_TIME') {
          // Returning students do not pay one-time fees (e.g. uniform, application, admission)
          if (detectedCategory === 'RETURNING_STUDENT') {
            return false;
          }
          // If already billed for this fee item historically, skip
          const alreadyBilled = student.invoices.some((inv: any) =>
            inv.items.some((item: any) =>
              item.feeStructureId === fee.id || item.description?.toLowerCase() === fee.name.toLowerCase()
            )
          );
          if (alreadyBilled) return false;
        } else if (feeType === 'ANNUAL') {
          // Check if already billed in this academic session
          if (sessionId) {
            const billedThisSession = student.invoices.some((inv: any) =>
              inv.sessionId === sessionId &&
              inv.items.some((item: any) =>
                item.feeStructureId === fee.id || item.description?.toLowerCase() === fee.name.toLowerCase()
              )
            );
            if (billedThisSession) return false;
          }
        }

        return true;
      });

      if (applicableFees.length === 0) {
        continue;
      }

      const totalAmount = applicableFees.reduce((sum, f) => sum + (f.amount || 0), 0);
      const invoiceNo = await this.generateInvoiceNumber(schoolId);

      await this.prisma.invoice.create({
        data: {
          studentId: student.id,
          invoiceNo,
          subtotal: totalAmount,
          discount: 0,
          total: totalAmount,
          balance: totalAmount,
          amountPaid: 0,
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          status: 'UNPAID',
          schoolId,
          sessionId: sessionId || null,
          termId: termId || null,
          classId,
          items: {
            create: applicableFees.map((fee) => ({
              description: fee.name,
              amount: fee.amount,
              quantity: 1,
              subtotal: fee.amount,
              feeStructureId: fee.id,
            })),
          },
        },
      });

      invoicesCreated++;
      totalGeneratedAmount += totalAmount;
    }

    return successResponse(
      {
        invoicesCreated,
        duplicatesSkipped,
        totalStudents: enrollments.length,
        totalAmount: totalGeneratedAmount,
        feeItems: fees.length,
      },
      `Generated ${invoicesCreated} invoice(s) for ${enrollments[0]?.classId || classId}. Skipped ${duplicatesSkipped} duplicate(s).`
    );
  }

  // ─── Generate single student invoice (e.g. on admission or placement) ────────
  async generateInvoiceForStudent(
    studentId: string,
    schoolId: string,
    options?: {
      sessionId?: string;
      termId?: string;
      isInitialEnrollment?: boolean;
      studentCategory?: 'NEW_STUDENT' | 'RETURNING_STUDENT';
      skipApplicationFeeIfPaid?: boolean;
      dueDate?: Date;
    }
  ) {
    const student = await this.prisma.student.findFirst({
      where: { id: studentId, schoolId, deletedAt: null },
      include: {
        classEnrollments: { orderBy: { createdAt: 'desc' }, take: 1, include: { class: true } },
        invoices: { include: { items: true }, orderBy: { createdAt: 'desc' } },
        admissions: { take: 1, orderBy: { createdAt: 'desc' } },
      },
    });

    if (!student) throw new NotFoundException('Student not found');

    const enrollment = student.classEnrollments[0];
    if (!enrollment || !enrollment.classId) {
      throw new BadRequestException(
        `Student ${student.admissionNumber} (${student.firstName} ${student.lastName}) has no active class assignment. ` +
        `Assign the student to an approved class before generating fee invoices.`
      );
    }

    const classId = enrollment.classId;

    // Resolve session & term
    let sessionId = options?.sessionId || enrollment.sessionId;
    let termId = options?.termId;

    if (!sessionId) {
      const activeSession = await this.prisma.academicSession.findFirst({
        where: { schoolId, isCurrent: true },
      }) || await this.prisma.academicSession.findFirst({
        where: { schoolId },
        orderBy: { createdAt: 'desc' },
      });
      sessionId = activeSession?.id;
    }

    if (!termId && sessionId) {
      const activeTerm = await this.prisma.term.findFirst({
        where: { sessionId, isCurrent: true },
      }) || await this.prisma.term.findFirst({
        where: { sessionId },
        orderBy: { createdAt: 'desc' },
      });
      termId = activeTerm?.id;
    }

    // Idempotency: check if an active invoice already exists for this student + session + term
    const existingInvoice = student.invoices.find((inv: any) => {
      if (sessionId && termId && inv.sessionId === sessionId && inv.termId === termId) {
        return true;
      }
      return false;
    });

    if (existingInvoice) {
      return successResponse(
        existingInvoice,
        `Invoice ${existingInvoice.invoiceNo} already exists for this term (₦${existingInvoice.total.toLocaleString()}).`
      );
    }

    // Determine category: NEW_STUDENT vs RETURNING_STUDENT
    const studentCategory = options?.studentCategory || await this.determineStudentCategory(student.id, schoolId, sessionId, termId);

    // Get published fees for this class (or class-agnostic)
    const fees = await this.prisma.feeStructure.findMany({
      where: {
        schoolId,
        status: 'PUBLISHED',
        OR: [{ classId }, { classId: null }],
        AND: [
          sessionId ? { OR: [{ sessionId }, { sessionId: null }] } : {},
          termId ? { OR: [{ termId }, { termId: null }] } : {},
        ],
      },
      orderBy: { createdAt: 'asc' },
    });

    if (fees.length === 0) {
      throw new BadRequestException(`No published fee structures found for class ${enrollment.class?.name || classId}.`);
    }

    // Filter fees based on student category and frequency
    const applicableFees = fees.filter((fee) => {
      // 1. Applicability rule
      const feeApplicableTo = fee.applicableTo || 'ALL';
      if (feeApplicableTo !== 'ALL' && feeApplicableTo !== studentCategory) {
        return false;
      }

      const feeType = (fee.feeType || 'TERM').toUpperCase();

      if (feeType === 'ONE_TIME') {
        // Returning students do not pay one-time fees (Uniform, Application, Admission)
        if (studentCategory === 'RETURNING_STUDENT') {
          return false;
        }

        // Skip application fee if student already paid during admission application
        const isAppFee = fee.category === 'APPLICATION' || fee.name.toLowerCase().includes('application');
        if (isAppFee && options?.skipApplicationFeeIfPaid) {
          return false;
        }

        // Check if student was ever billed for this item
        const alreadyBilled = student.invoices.some((inv: any) =>
          inv.items.some((item: any) =>
            item.feeStructureId === fee.id || item.description?.toLowerCase() === fee.name.toLowerCase()
          )
        );
        if (alreadyBilled) return false;
      } else if (feeType === 'ANNUAL') {
        // Check if already billed in this academic session
        if (sessionId) {
          const billedThisSession = student.invoices.some((inv: any) =>
            inv.sessionId === sessionId &&
            inv.items.some((item: any) =>
              item.feeStructureId === fee.id || item.description?.toLowerCase() === fee.name.toLowerCase()
            )
          );
          if (billedThisSession) return false;
        }
      }

      return true;
    });

    if (applicableFees.length === 0) {
      throw new BadRequestException(`No applicable fee items to invoice for student (${studentCategory}).`);
    }

    const totalAmount = applicableFees.reduce((sum, f) => sum + (f.amount || 0), 0);
    const invoiceNo = await this.generateInvoiceNumber(schoolId);
    const dueDate = options?.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const invoice = await this.prisma.invoice.create({
      data: {
        studentId: student.id,
        invoiceNo,
        subtotal: totalAmount,
        discount: 0,
        total: totalAmount,
        balance: totalAmount,
        amountPaid: 0,
        dueDate,
        status: 'UNPAID',
        schoolId,
        sessionId: sessionId || null,
        termId: termId || null,
        classId,
        notes: `${studentCategory === 'NEW_STUDENT' ? 'New Student' : 'Returning Student'} ${enrollment.class?.name || ''} fee invoice`,
        items: {
          create: applicableFees.map((fee) => ({
            description: fee.name,
            amount: fee.amount,
            quantity: 1,
            subtotal: fee.amount,
            feeStructureId: fee.id,
          })),
        },
      },
      include: { items: true, student: true },
    });

    return successResponse(
      invoice,
      `Generated invoice ${invoiceNo} for ${student.firstName} ${student.lastName} (${studentCategory === 'NEW_STUDENT' ? 'New Student' : 'Returning Student'}, ₦${totalAmount.toLocaleString()})`
    );
  }

  // ─── Student Financial Statement (Chronological Ledger) ─────────────────────
  async getStudentStatement(studentId: string, schoolId: string) {
    const student = await this.prisma.student.findFirst({
      where: { id: studentId, schoolId },
      include: {
        classEnrollments: { include: { class: true }, orderBy: { createdAt: 'desc' }, take: 1 },
        invoices: {
          include: {
            items: true,
            payments: {
              where: { status: 'POSTED' },
              include: { receipt: true },
              orderBy: { paymentDate: 'asc' },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!student) throw new NotFoundException('Student not found');

    const creditNotes = await this.prisma.creditNote.findMany({
      where: { studentId, schoolId, status: 'POSTED' },
      orderBy: { createdAt: 'asc' },
    });

    let totalBilled = 0;
    let totalPaid = 0;
    let totalDiscounts = 0;
    let totalCredits = 0;

    const ledgerEntries: any[] = [];

    for (const inv of student.invoices) {
      totalBilled += inv.total;
      totalDiscounts += inv.discount || 0;

      ledgerEntries.push({
        date: inv.createdAt,
        type: 'INVOICE',
        reference: inv.invoiceNo,
        description: `Invoice: ${inv.items.map((i: any) => i.description).join(', ')}`,
        debit: inv.total,
        credit: 0,
        balance: 0, // will compute running balance
      });

      for (const p of inv.payments) {
        totalPaid += p.amount;
        ledgerEntries.push({
          date: p.paymentDate,
          type: 'PAYMENT',
          reference: p.receiptNo || p.reference || 'PAY',
          description: `Payment via ${p.method}${p.receipt?.receiptNo ? ` (Receipt: ${p.receipt.receiptNo})` : ''}`,
          debit: 0,
          credit: p.amount,
          balance: 0,
        });
      }
    }

    for (const cn of creditNotes) {
      totalCredits += cn.amount;
      ledgerEntries.push({
        date: cn.createdAt,
        type: 'CREDIT_NOTE',
        reference: cn.creditNoteNo,
        description: `Credit Note (${cn.type}): ${cn.reason}`,
        debit: 0,
        credit: cn.amount,
        balance: 0,
      });
    }

    // Sort chronologically and compute running balance
    ledgerEntries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let runningBalance = 0;
    for (const entry of ledgerEntries) {
      runningBalance += (entry.debit - entry.credit);
      entry.balance = Math.max(0, runningBalance);
    }

    const currentBalance = Math.max(0, totalBilled - totalPaid - totalCredits);

    return successResponse({
      student: {
        id: student.id,
        name: `${student.firstName} ${student.lastName}`,
        admissionNumber: student.admissionNumber,
        className: student.classEnrollments[0]?.class?.name || 'Unassigned',
      },
      summary: {
        totalBilled,
        totalPaid,
        totalDiscounts,
        totalCredits,
        outstandingBalance: currentBalance,
      },
      entries: ledgerEntries,
    });
  }

  // ─── INVOICES ────────────────────────────────────────────────────────────────

  async createInvoice(data: any, schoolId: string) {
    const { studentId, items, dueDate, discount = 0, notes } = data;

    const student = await this.prisma.student.findFirst({
      where: { id: studentId, schoolId },
      include: {
        classEnrollments: { orderBy: { createdAt: 'desc' }, take: 1, include: { class: true } },
      },
    });
    if (!student) throw new NotFoundException('Student not found');

    const enrollment = student.classEnrollments[0];
    if (!enrollment || !enrollment.classId) {
      throw new BadRequestException(
        `Student ${student.admissionNumber} (${student.firstName} ${student.lastName}) has no active class assignment. ` +
        `Assign the student to an approved class before generating fee invoices.`
      );
    }

    const subtotal = items.reduce((sum: number, item: any) => sum + item.amount * (item.quantity || 1), 0);
    const total = Math.max(0, subtotal - discount);
    const invoiceNo = await this.generateInvoiceNumber(schoolId);

    const invoice = await this.prisma.invoice.create({
      data: {
        studentId,
        invoiceNo,
        dueDate: new Date(dueDate),
        subtotal,
        discount,
        total,
        balance: total,
        amountPaid: 0,
        notes,
        schoolId,
        sessionId: data.sessionId || enrollment.sessionId || null,
        termId: data.termId || null,
        classId: enrollment.classId,
        status: 'UNPAID',
        items: {
          create: items.map((item: any) => ({
            description: item.description,
            amount: item.amount,
            quantity: item.quantity || 1,
            subtotal: item.amount * (item.quantity || 1),
            feeStructureId: item.feeStructureId || null,
          })),
        },
      },
      include: { items: true, student: true },
    });

    return successResponse(invoice, 'Invoice created successfully');
  }

  async getInvoices(schoolId: string, query: PaginationDto & { status?: string; studentId?: string }) {
    const { search, status, studentId } = query;

    const where: Prisma.InvoiceWhereInput = {
      student: { schoolId },
      ...(status && { status: status as any }),
      ...(studentId && { studentId }),
      ...(search && {
        OR: [
          { invoiceNo: { contains: search } },
          { student: { firstName: { contains: search } } },
          { student: { lastName: { contains: search } } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        skip: safeSkip(query), take: safeTake(query),
        include: {
          student: { select: { firstName: true, lastName: true, admissionNumber: true } },
          items: true,
          payments: { orderBy: { paymentDate: 'desc' }, take: 1 },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.invoice.count({ where }),
    ]);

    const mappedData = data.map((inv) => ({
      ...inv,
      items: (inv.items || []).map((item) => ({
        ...item,
        name: item.description || 'Fee Item',
      })),
    }));

    return paginate(mappedData, total, query);
  }

  async getInvoice(id: string, schoolId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, student: { schoolId } },
      include: {
        student: true,
        items: { include: { feeStructure: true } },
        payments: { orderBy: { paymentDate: 'desc' } },
      },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');

    const mappedInvoice = {
      ...invoice,
      items: (invoice.items || []).map((item) => ({
        ...item,
        name: item.feeStructure?.name || item.description || 'Fee Item',
      })),
    };

    return successResponse(mappedInvoice);
  }

  async recordPayment(invoiceId: string, data: any, schoolId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, student: { schoolId } },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    if (invoice.balance <= 0) throw new BadRequestException('Invoice already fully paid');

    const amount = Math.min(data.amount, invoice.balance);
    const receiptNo = await this.generateReceiptNumber(schoolId);

    const [payment] = await this.prisma.$transaction([
      this.prisma.payment.create({
        data: {
          invoiceId,
          amount,
          method: data.method,
          reference: data.reference,
          receiptNo,
          notes: data.notes,
          status: 'POSTED',
          paymentDate: data.paymentDate ? new Date(data.paymentDate) : new Date(),
        },
      }),
      this.prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          amountPaid: { increment: amount },
          balance: { decrement: amount },
          status: invoice.balance - amount <= 0 ? 'PAID' : invoice.amountPaid + amount > 0 ? 'PARTIAL' : 'UNPAID',
        },
      }),
    ]);

    return successResponse(payment, 'Payment recorded successfully');
  }

  // ─── ANALYTICS ───────────────────────────────────────────────────────────────

  async getDashboardStats(schoolId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const [
      totalInvoiced,
      totalCollected,
      monthlyCollected,
      yearlyCollected,
      unpaidCount,
      overdueCount,
      recentPayments,
    ] = await Promise.all([
      this.prisma.invoice.aggregate({
        where: { student: { schoolId } },
        _sum: { total: true },
      }),
      this.prisma.invoice.aggregate({
        where: { student: { schoolId } },
        _sum: { amountPaid: true },
      }),
      this.prisma.payment.aggregate({
        where: {
          invoice: { student: { schoolId } },
          status: 'POSTED',
          paymentDate: { gte: startOfMonth },
        },
        _sum: { amount: true },
      }),
      this.prisma.payment.aggregate({
        where: {
          invoice: { student: { schoolId } },
          status: 'POSTED',
          paymentDate: { gte: startOfYear },
        },
        _sum: { amount: true },
      }),
      this.prisma.invoice.count({
        where: { student: { schoolId }, status: 'UNPAID' },
      }),
      this.prisma.invoice.count({
        where: {
          student: { schoolId },
          status: { in: ['UNPAID', 'PARTIAL'] },
          dueDate: { lt: now },
        },
      }),
      this.prisma.payment.findMany({
        where: { invoice: { student: { schoolId } }, status: 'POSTED' },
        include: {
          invoice: {
            include: {
              student: { select: { firstName: true, lastName: true, admissionNumber: true } },
            },
          },
        },
        orderBy: { paymentDate: 'desc' },
        take: 10,
      }),
    ]);

    const totalInvoicedAmt = Math.max(0, totalInvoiced._sum.total || 0);
    const totalCollectedAmt = Math.max(0, totalCollected._sum.amountPaid || 0);
    const totalBalance = Math.max(0, totalInvoicedAmt - totalCollectedAmt);
    const rawRate = totalInvoicedAmt > 0 ? (totalCollectedAmt / totalInvoicedAmt) * 100 : 0;
    const collectionRate = Math.min(100, Math.max(0, rawRate));

    return successResponse({
      totalInvoiced: totalInvoicedAmt,
      totalCollected: totalCollectedAmt,
      totalBalance,
      monthlyCollected: monthlyCollected._sum.amount || 0,
      yearlyCollected: yearlyCollected._sum.amount || 0,
      collectionRate: Math.round(collectionRate * 100) / 100,
      unpaidCount,
      overdueCount,
      recentPayments,
    });
  }

  async getMonthlyTrend(schoolId: string, year: number) {
    const months = Array.from({ length: 12 }, (_, i) => i);
    const trends = await Promise.all(
      months.map(async (month) => {
        const start = new Date(year, month, 1);
        const end = new Date(year, month + 1, 0);
        const result = await this.prisma.payment.aggregate({
          where: {
            invoice: { student: { schoolId } },
            status: 'POSTED',
            paymentDate: { gte: start, lte: end },
          },
          _sum: { amount: true },
          _count: true,
        });
        return {
          month: start.toLocaleString('default', { month: 'short' }),
          collected: result._sum.amount || 0,
          transactions: result._count,
        };
      }),
    );
    return successResponse(trends);
  }

  private async generateInvoiceNumber(schoolId: string): Promise<string> {
    const school = await this.prisma.school.findUnique({ where: { id: schoolId } });
    const year = new Date().getFullYear().toString().slice(-2);
    const count = await this.prisma.invoice.count({ where: { student: { schoolId } } });
    return `INV-${school?.code || 'SCH'}-${year}-${String(count + 1).padStart(5, '0')}`;
  }

  private async generateReceiptNumber(schoolId: string): Promise<string> {
    const school = await this.prisma.school.findUnique({ where: { id: schoolId } });
    const count = await this.prisma.payment.count({ where: { invoice: { student: { schoolId } } } });
    return `RCP-${school?.code || 'SCH'}-${String(count + 1).padStart(6, '0')}`;
  }
}
