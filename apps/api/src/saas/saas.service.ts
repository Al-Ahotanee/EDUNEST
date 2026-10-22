import { Injectable, ConflictException, NotFoundException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { successResponse, PaginationDto, paginate, safeSkip, safeTake } from '../common/dto/pagination.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class SaasService {
  constructor(private prisma: PrismaService) {}

  // ─── SLUG VALIDATION ─────────────────────────────────────────────────────────
  // Slugs map directly to subdomains: <slug>.edunest.com
  // Rules:
  //   - 3 to 30 characters
  //   - lowercase alphanumeric + hyphens only
  //   - must start and end with a letter or digit (no leading/trailing hyphens)
  //   - no consecutive hyphens
  //   - reserved subdomains (www, api, app, admin, mail, ftp) are blocked
  private static readonly RESERVED_SLUGS = new Set([
    'www', 'api', 'app', 'admin', 'mail', 'ftp', 'smtp', 'imap',
    'ns1', 'ns2', 'cdn', 'assets', 'static', 'portal', 'login',
    'register', 'auth', 'edunest', 'support', 'help', 'blog',
    'docs', 'dev', 'staging', 'test', 'demo', 'sandbox',
  ]);

  private validateSlug(slug: string): { valid: boolean; reason?: string } {
    if (!slug || typeof slug !== 'string') {
      return { valid: false, reason: 'Slug is required' };
    }
    const s = slug.trim().toLowerCase();
    if (s.length < 3) return { valid: false, reason: 'Must be at least 3 characters' };
    if (s.length > 30) return { valid: false, reason: 'Must be 30 characters or fewer' };
    if (!/^[a-z0-9-]+$/.test(s)) {
      return { valid: false, reason: 'Only lowercase letters, digits, and hyphens allowed' };
    }
    if (!/^[a-z0-9]/.test(s) || !/[a-z0-9]$/.test(s)) {
      return { valid: false, reason: 'Must start and end with a letter or digit' };
    }
    if (s.includes('--')) {
      return { valid: false, reason: 'Consecutive hyphens not allowed' };
    }
    if (SaasService.RESERVED_SLUGS.has(s)) {
      return { valid: false, reason: `'${s}' is a reserved subdomain` };
    }
    return { valid: true };
  }

  // Public availability check — called by the registration form via debounce.
  // Always returns 200 with { available, slug, reason? } so the frontend can
  // render inline validation messages without distinguishing 4xx errors.
  async checkSlugAvailability(rawSlug: string) {
    const slug = (rawSlug || '').trim().toLowerCase();
    const validation = this.validateSlug(slug);
    if (!validation.valid) {
      return successResponse({
        available: false,
        slug,
        reason: validation.reason,
        suggestion: null,
      });
    }
    const existing = await this.prisma.tenant.findUnique({ where: { slug } });
    if (existing) {
      // Suggest an alternative by appending a digit
      let suggestion: string | null = null;
      for (let i = 2; i <= 9; i++) {
        const candidate = `${slug}-${i}`;
        const taken = await this.prisma.tenant.findUnique({ where: { slug: candidate } });
        if (!taken) { suggestion = candidate; break; }
      }
      return successResponse({
        available: false,
        slug,
        reason: 'This subdomain is already taken',
        suggestion,
      });
    }
    return successResponse({
      available: true,
      slug,
      reason: null,
      suggestion: null,
    });
  }

  async registerSchool(body: any) {
    const { school, admin, plan, referralCode, documents } = body;

    // EDN-slug fix: strict validation BEFORE checking the DB so we never
    // persist a malformed slug. The frontend also runs the same checks live
    // but the backend is the source of truth.
    const slugValidation = this.validateSlug(school.slug);
    if (!slugValidation.valid) {
      throw new BadRequestException(`Invalid school URL: ${slugValidation.reason}`);
    }

    const existing = await this.prisma.tenant.findUnique({ where: { slug: school.slug } });
    if (existing) throw new ConflictException('This subdomain is already taken. Choose a different name.');

    // Validate referral code
    let marketerId: string | null = null;
    if (referralCode) {
      const marketer = await this.prisma.marketer.findUnique({ where: { referralCode, isActive: true } });
      if (marketer) marketerId = marketer.id;
    }

    const hashedPassword = await bcrypt.hash(admin.password, 12);
    const isBasic = plan === 'BASIC';

    const result = await this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: school.schoolName,
          slug: school.slug,
          email: school.email,
          phone: school.phone,
          address: school.address,
          city: school.city,
          state: school.state,
          lga: school.lga,
          logo: school.logo,
          motto: school.motto,
          yearEstablished: school.yearEstablished ? parseInt(school.yearEstablished) : null,
          subscriptionPlan: plan as any,
          subscriptionStatus: isBasic ? 'ACTIVE' : 'PENDING_APPROVAL',
          isActive: isBasic,
          ministryApprovalDoc: documents?.ministryApprovalDoc || null,
          cacDocument: documents?.cacDocument || null,
          proofOfAddress: documents?.proofOfAddress || null,
          otherDocuments: documents?.otherDocuments || null,
          referralCode: referralCode || null,
          ...(marketerId && { marketerId }),
        },
      });

      const newSchool = await tx.school.create({
        data: {
          tenantId: tenant.id,
          name: school.schoolName,
          code: school.slug.toUpperCase().slice(0, 10),
          type: school.schoolType || 'SECONDARY',
          address: school.address,
          phone: school.phone,
          email: school.email,
        },
      });

      const modules = ['students','admissions','academic','attendance','results','finance','hr','cbt','library','hostel','health','inventory','timetable','notifications','reports','users','schools','settings'];
      const actions = ['create','read','update','delete','export','approve'];
      await tx.permission.createMany({
        data: modules.flatMap(m => actions.map(a => ({ module: m, action: a }))),
        skipDuplicates: true,
      });
      const allPerms = await tx.permission.findMany({});

      const role = await tx.role.create({
        data: {
          tenantId: tenant.id, name: 'Super Admin', isSystem: true,
          rolePermissions: { create: allPerms.map(p => ({ permissionId: p.id })) },
        },
      });

      const user = await tx.user.create({
        data: {
          tenantId: tenant.id, schoolId: newSchool.id,
          email: admin.email, password: hashedPassword,
          firstName: admin.firstName, lastName: admin.lastName,
          phone: admin.phone, isEmailVerified: true,
          userRoles: { create: { roleId: role.id } },
        },
      });

      return { tenant, school: newSchool, user };
    });

    return successResponse({
      tenantId: result.tenant.id, schoolId: result.school.id,
      message: isBasic
        ? 'School registered! You can login immediately.'
        : 'Registration successful! Your account will be reviewed and activated within 24 hours.',
    }, 'School registered successfully');
  }

  async getPublicSchoolInfo(slug: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug },
      include: {
        schools: {
          select: { id: true, name: true, type: true, logo: true, classes: { select: { name: true } } },
          take: 1,
        },
      },
    });
    if (!tenant) throw new NotFoundException('School not found');

    const school = tenant.schools[0];
    return successResponse({
      id: tenant.id, name: school?.name || tenant.name,
      slug: tenant.slug, logo: tenant.logo || school?.logo,
      motto: tenant.motto, type: school?.type, address: tenant.address,
      city: tenant.city, state: tenant.state, phone: tenant.phone,
      email: tenant.email, website: tenant.website,
      yearEstablished: tenant.yearEstablished,
      primaryColor: tenant.primaryColor, secondaryColor: tenant.secondaryColor,
      isActive: tenant.isActive,
      classes: school?.classes?.map(c => c.name) || [],
    });
  }

  async submitAdmissionApplication(slug: string, data: any) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug, isActive: true },
      include: { schools: { take: 1 } },
    });
    if (!tenant) throw new NotFoundException('School not found or inactive');
    const schoolId = tenant.schools[0]?.id;
    if (!schoolId) throw new NotFoundException('School not configured');

    const applicationNo = `APP-${new Date().getFullYear()}-${uuidv4().split('-')[0].toUpperCase()}`;

    const admission = await this.prisma.admission.create({
      data: {
        schoolId, applicationNo,
        firstName: data.firstName, lastName: data.lastName, otherName: data.otherName,
        gender: data.gender, dateOfBirth: new Date(data.dateOfBirth),
        email: data.email, phone: data.phone,
        parentName: data.parentName, parentPhone: data.parentPhone,
        parentEmail: data.parentEmail, parentOccupation: data.parentOccupation,
        applyingForClass: data.applyingForClass,
        boardingDay: data.boardingDay, stateOfOrigin: data.stateOfOrigin,
        religion: data.religion, bloodGroup: data.bloodGroup,
        medicalCondition: data.medicalCondition, previousSchool: data.previousSchool,
        emergencyContact: data.emergencyContact, emergencyPhone: data.emergencyPhone,
        photo: data.photo, birthCertificate: data.birthCertificate,
        lastReportCard: data.lastReportCard,
        status: 'PENDING',
      },
    });

    return successResponse({ applicationNo: admission.applicationNo, id: admission.id }, 'Application submitted successfully');
  }

  async handlePaystackWebhook(payload: any, signature?: string, rawBody?: Buffer | string) {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!signature) {
      throw new UnauthorizedException('Missing x-paystack-signature header');
    }
    if (!secret) {
      throw new UnauthorizedException('Paystack secret key is not configured on server');
    }

    const crypto = await import('crypto');
    const contentToHash = rawBody
      ? (Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody))
      : Buffer.from(JSON.stringify(payload));
    const hash = crypto.createHmac('sha512', secret).update(contentToHash).digest('hex');
    if (hash !== signature) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    const event = payload?.event;
    const data = payload?.data;

    if (event === 'charge.success' && data) {
      const metadata = data.metadata || {};

      // SaaS subscription payment (tenant activation)
      if (metadata.tenantId) {
        await this.prisma.tenant.update({
          where: { id: metadata.tenantId },
          data: {
            subscriptionStatus: 'ACTIVE',
            isActive: true,
            subscriptionExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          },
        });
      }

      // School fee invoice payment — P6 fix: use the new payment workflow
      // instead of the old direct invoice update. This ensures the payment
      // goes through the proper state machine + receipt generation + audit log.
      if (metadata.invoiceId) {
        const reference = data.reference;
        // Check if a payment with this reference already exists (idempotency)
        const existing = await this.prisma.payment.findFirst({
          where: { reference },
        });

        if (existing) {
          // Already processed — don't duplicate (webhook replay protection)
          if (existing.status === 'POSTED') {
            return { received: true, message: 'Payment already processed (idempotent)' };
          }
          // If it exists but isn't POSTED yet, post it through the workflow
          if (existing.status === 'INITIATED') {
            const paidAmount = Number(data.amount) / 100;

            // Verify amount matches
            if (Math.abs(paidAmount - existing.amount) > 0.01) {
              console.error(`[Paystack Webhook] Amount mismatch for ${reference}: expected ${existing.amount}, got ${paidAmount}`);
              return { received: true, message: 'Amount mismatch — payment flagged for review' };
            }

            // Post the payment
            const invoice = await this.prisma.invoice.findUnique({
              where: { id: existing.invoiceId },
              include: { items: true, student: { include: { classEnrollments: { take: 1, orderBy: { createdAt: 'desc' } } } } },
            });
            if (invoice) {
              // Update invoice balance
              const newAmountPaid = invoice.amountPaid + paidAmount;
              const newBalance = Math.max(0, invoice.total - newAmountPaid);
              const newStatus = newBalance <= 0.01 ? 'PAID' : 'PARTIAL';
              await this.prisma.invoice.update({
                where: { id: invoice.id },
                data: { amountPaid: newAmountPaid, balance: newBalance, status: newStatus as any },
              });

              // Create allocations (FIFO)
              let remaining = paidAmount;
              for (const item of invoice.items) {
                if (remaining <= 0) break;
                const allocAmount = Math.min(remaining, item.subtotal);
                await this.prisma.paymentAllocation.create({
                  data: { paymentId: existing.id, invoiceId: invoice.id, invoiceItemId: item.id, amount: allocAmount },
                });
                remaining -= allocAmount;
              }

              // Generate receipt
              const existingReceipt = await this.prisma.receipt.findUnique({ where: { paymentId: existing.id } });
              if (!existingReceipt) {
                const schoolId = invoice.student.schoolId;
                await this.prisma.receipt.create({
                  data: {
                    receiptNo: existing.receiptNo,
                    paymentId: existing.id,
                    schoolId,
                    studentName: `${invoice.student.firstName} ${invoice.student.lastName}`,
                    studentAdmissionNo: invoice.student.admissionNumber,
                    className: invoice.student.classEnrollments?.[0] ? (await this.prisma.class.findUnique({ where: { id: invoice.student.classEnrollments[0].classId } }))?.name : null,
                    amountInFigures: paidAmount,
                    amountInWords: this.numberToWords(paidAmount),
                    paymentDate: new Date(),
                    paymentMethod: 'ONLINE',
                    transactionRef: reference,
                    invoiceAllocations: JSON.stringify([{ invoiceNo: invoice.invoiceNo, amount: paidAmount }]),
                    issuedById: existing.recordedById || '',
                  },
                });
              }

              // Update payment to POSTED
              await this.prisma.payment.update({
                where: { id: existing.id },
                data: {
                  status: 'POSTED',
                  postedAt: new Date(),
                  verifiedAt: new Date(),
                  approvedAt: new Date(),
                },
              });

              // Write audit log
              await this.prisma.financialAuditLog.create({
                data: {
                  schoolId: invoice.student.schoolId,
                  action: 'PAYMENT_POSTED' as any,
                  entityType: 'Payment',
                  entityId: existing.id,
                  description: `Paystack webhook: payment of ₦${paidAmount.toLocaleString()} verified and posted for invoice ${invoice.invoiceNo}. Reference: ${reference}`,
                  metadata: JSON.stringify({ reference, amount: paidAmount, invoiceNo: invoice.invoiceNo }),
                },
              });
            }
          }
        } else {
          // Legacy path: create payment record directly (for payments initiated
          // before the new workflow was deployed). Still generates receipt + audit log.
          const invoice = await this.prisma.invoice.findUnique({
            where: { id: metadata.invoiceId },
            include: { student: true },
          });
          if (invoice) {
            const paidAmount = Number(data.amount) / 100;
            const newAmountPaid = invoice.amountPaid + paidAmount;
            const newBalance = Math.max(0, invoice.total - newAmountPaid);
            const newStatus = newBalance <= 0 ? 'PAID' : 'PARTIAL';

            const receiptNo = `RCP-${Date.now()}-${uuidv4().slice(0, 6).toUpperCase()}`;
            const [payment] = await this.prisma.$transaction([
              this.prisma.payment.create({
                data: {
                  invoiceId: invoice.id,
                  amount: paidAmount,
                  method: 'ONLINE',
                  reference: data.reference || uuidv4(),
                  receiptNo,
                  status: 'POSTED',
                  postedAt: new Date(),
                  verifiedAt: new Date(),
                  approvedAt: new Date(),
                  idempotencyKey: data.reference,
                },
              }),
              this.prisma.invoice.update({
                where: { id: invoice.id },
                data: { amountPaid: newAmountPaid, balance: newBalance, status: newStatus as any },
              }),
            ]);

            // Write audit log
            await this.prisma.financialAuditLog.create({
              data: {
                schoolId: invoice.student?.schoolId || '',
                action: 'PAYMENT_POSTED' as any,
                entityType: 'Payment',
                entityId: payment.id,
                description: `Paystack webhook (legacy path): payment of ₦${paidAmount.toLocaleString()} posted for invoice ${invoice.invoiceNo}. Reference: ${reference}`,
                metadata: JSON.stringify({ reference, amount: paidAmount, invoiceNo: invoice.invoiceNo }),
              },
            });
          }
        }
      }
    }

    return { received: true };
  }

  // Helper: convert number to words for receipt generation
  private numberToWords(amount: number): string {
    const naira = Math.floor(amount);
    const kobo = Math.round((amount - naira) * 100);
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
      'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const convert = (num: number): string => {
      if (num === 0) return 'Zero';
      if (num < 20) return ones[num];
      if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? '-' + ones[num % 10] : '');
      if (num < 1000) return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 ? ' ' + convert(num % 100) : '');
      if (num < 1000000) return convert(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 ? ' ' + convert(num % 1000) : '');
      if (num < 1000000000) return convert(Math.floor(num / 1000000)) + ' Million' + (num % 1000000 ? ' ' + convert(num % 1000000) : '');
      return convert(Math.floor(num / 1000000000)) + ' Billion' + (num % 1000000000 ? ' ' + convert(num % 1000000000) : '');
    };
    let result = convert(naira) + ' Naira';
    if (kobo > 0) result += ', ' + convert(kobo) + ' Kobo';
    return result + ' Only';
  }
}
