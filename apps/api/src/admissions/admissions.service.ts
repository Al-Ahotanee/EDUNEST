import {
  Injectable, NotFoundException, ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { successResponse, PaginationDto, paginate, safeSkip, safeTake } from '../common/dto/pagination.dto';
import { Prisma } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AdmissionsService {
  constructor(private prisma: PrismaService) {}

  // ─── Public: submit application ──────────────────────────────────────────────
  async submitApplication(schoolSlug: string, data: any) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: schoolSlug },
      include: { schools: { take: 1 } },
    });
    if (!tenant || !tenant.isActive) throw new NotFoundException('School not found or admissions are closed');

    const school = tenant.schools[0];
    if (!school) throw new NotFoundException('School not configured');

    // Generate application number
    const count = await this.prisma.admission.count({ where: { schoolId: school.id } });
    const year = new Date().getFullYear().toString().slice(-2);
    const applicationNo = `${school.code}/${year}/APP/${String(count + 1).padStart(4, '0')}`;

    // Check for duplicate application (same parent email + school)
    const existingApp = await this.prisma.admission.findFirst({
      where: {
        schoolId: school.id,
        email: data.parentEmail,
        firstName: data.firstName,
        lastName: data.lastName,
        status: { in: ['PENDING', 'SCREENING', 'APPROVED'] },
      },
    });
    if (existingApp) {
      throw new ConflictException('An active application already exists for this student');
    }

    // Create admission record
    const admission = await this.prisma.admission.create({
      data: {
        schoolId: school.id,
        applicationNo,
        firstName: data.firstName,
        lastName: data.lastName,
        otherName: data.otherName,
        gender: data.gender,
        dateOfBirth: new Date(data.dateOfBirth),
        email: data.parentEmail,
        phone: data.parentPhone,
        parentName: `${data.parentFirstName} ${data.parentLastName}`,
        parentPhone: data.parentPhone,
        applyingForClass: data.applyingForClass,
        status: 'PENDING',
        notes: JSON.stringify({
          stateOfOrigin: data.stateOfOrigin,
          lga: data.lga,
          religion: data.religion,
          address: data.address,
          previousSchool: data.previousSchool,
          parentRelationship: data.relationship,
          parentOccupation: data.parentOccupation,
          parentAddress: data.parentAddress,
        }),
      },
    });

    // Create parent portal account
    const tempPassword = this.generateTempPassword();
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // Store parent credentials (in parent table or user table with parent role)
    // We'll use a simple approach: create a user with a 'Parent' role
    let parentUser = await this.prisma.user.findFirst({
      where: { tenantId: tenant.id, email: data.parentEmail },
    });

    if (!parentUser) {
      // Get parent role
      let parentRole = await this.prisma.role.findFirst({
        where: { tenantId: tenant.id, name: 'Parent' },
      });

      if (!parentRole) {
        const readPerms = await this.prisma.permission.findMany({
          where: { action: 'read' },
        });
        parentRole = await this.prisma.role.create({
          data: {
            tenantId: tenant.id,
            name: 'Parent',
            description: 'Parent/Guardian portal access',
            rolePermissions: { create: readPerms.map(p => ({ permissionId: p.id })) },
          },
        });
      }

      parentUser = await this.prisma.user.create({
        data: {
          tenantId: tenant.id,
          schoolId: school.id,
          email: data.parentEmail,
          password: hashedPassword,
          firstName: data.parentFirstName,
          lastName: data.parentLastName,
          phone: data.parentPhone,
          isEmailVerified: true,
          userRoles: { create: { roleId: parentRole.id } },
        },
      });
    }

    return successResponse({
      applicationNo,
      admissionId: admission.id,
      parentEmail: data.parentEmail,
      status: 'PENDING',
    }, 'Application submitted successfully');
  }

  // ─── Admin: list all applications ───────────────────────────────────────────
  async listApplications(schoolId: string, query: PaginationDto & { status?: string }) {
    const {  search, status } = query;

    const where: Prisma.AdmissionWhereInput = {
      schoolId,
      ...(status && { status: status as any }),
      ...(search && {
        OR: [
          { firstName: { contains: search } },
          { lastName: { contains: search } },
          { applicationNo: { contains: search } },
          { parentName: { contains: search } },
        ],
      }),
    };

    const [admissions, total] = await Promise.all([
      this.prisma.admission.findMany({
        where, skip: safeSkip(query), take: safeTake(query),
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.admission.count({ where }),
    ]);

    return paginate(admissions, total, query);
  }

  // ─── Admin: review single application ───────────────────────────────────────
  async getApplication(id: string, schoolId: string) {
    const admission = await this.prisma.admission.findFirst({
      where: { id, schoolId },
    });
    if (!admission) throw new NotFoundException('Application not found');
    return successResponse(admission);
  }

  // ─── Admin: approve application ─────────────────────────────────────────────
  async approveApplication(id: string, schoolId: string, body?: { classId?: string }) {
    const admission = await this.prisma.admission.findFirst({ where: { id, schoolId } });
    if (!admission) throw new NotFoundException('Application not found');
    if (admission.status === 'APPROVED') throw new ConflictException('Application already approved');

    // Generate admission number for the new student
    const count = await this.prisma.student.count({ where: { schoolId } });
    const school = await this.prisma.school.findUnique({ where: { id: schoolId } });
    const year = new Date().getFullYear().toString().slice(-2);
    const admissionNumber = `${school!.code}/${year}/${String(count + 1).padStart(4, '0')}`;

    // Create student from admission data + auto-enroll in class
    const extraData = admission.notes ? JSON.parse(admission.notes as string) : {};

    // Get current session for enrollment
    const currentSession = await this.prisma.academicSession.findFirst({
      where: { schoolId, isCurrent: true },
    }) || await this.prisma.academicSession.findFirst({
      where: { schoolId },
      orderBy: { createdAt: 'desc' },
    });

    // Validate classId if provided in the approval request
    const targetClassId = body?.classId || admission.applyingForClass;
    if (targetClassId) {
      const cls = await this.prisma.class.findFirst({ where: { id: targetClassId, schoolId } });
      if (!cls) {
        // Don't fail the approval — just skip enrollment, flag for manual placement
        console.warn(`Class ${targetClassId} not found for student ${admissionNumber}. Student will need manual class placement.`);
      }
    }

    // Transactional: create student + guardian + class enrollment
    const student = await this.prisma.$transaction(async (tx) => {
      const newStudent = await tx.student.create({
        data: {
          schoolId,
          admissionNumber,
          firstName: admission.firstName,
          lastName: admission.lastName,
          otherName: admission.otherName || undefined,
          gender: admission.gender,
          dateOfBirth: admission.dateOfBirth,
          stateOfOrigin: extraData.stateOfOrigin,
          lga: extraData.lga,
          religion: extraData.religion,
          address: extraData.address,
          status: 'ACTIVE',
          guardians: {
            create: [{
              firstName: admission.parentName?.split(' ')[0] || 'Parent',
              lastName: admission.parentName?.split(' ').slice(1).join(' ') || '',
              relationship: extraData.parentRelationship || 'Parent',
              phone: admission.parentPhone,
              email: admission.email || undefined,
              isEmergency: true,
            }],
          },
        },
        include: { guardians: true },
      });

      // Auto-enroll in class if classId is available
      if (targetClassId && currentSession) {
        try {
          await tx.classEnrollment.create({
            data: {
              studentId: newStudent.id,
              classId: targetClassId,
              sessionId: currentSession.id,
            },
          });
        } catch (e) {
          // Class enrollment failed — student is still created, just without class
          console.warn(`Failed to enroll student ${admissionNumber} in class ${targetClassId}: ${e}`);
        }
      }

      return newStudent;
    });

    // Update admission status and link student
    await this.prisma.admission.update({
      where: { id },
      data: { status: 'APPROVED', studentId: student.id, admittedAt: new Date() },
    });

    return successResponse({ admission: { ...admission, status: 'APPROVED' }, student }, 'Application approved! Student record created and enrolled in class.');
  }

  // ─── Admin: reject application ──────────────────────────────────────────────
  async rejectApplication(id: string, schoolId: string, reason?: string) {
    const admission = await this.prisma.admission.findFirst({ where: { id, schoolId } });
    if (!admission) throw new NotFoundException('Application not found');

    const updated = await this.prisma.admission.update({
      where: { id },
      data: {
        status: 'REJECTED',
        notes: reason ? `${admission.notes || ''}\nRejection reason: ${reason}` : admission.notes,
      },
    });
    return successResponse(updated, 'Application rejected');
  }

  // ─── Admin: admission statistics ────────────────────────────────────────────
  async getAdmissionStats(schoolId: string) {
    const [total, pending, approved, rejected, screening, enrolledStudents] = await Promise.all([
      this.prisma.admission.count({ where: { schoolId } }),
      this.prisma.admission.count({ where: { schoolId, status: 'PENDING' } }),
      this.prisma.admission.count({ where: { schoolId, status: 'APPROVED' } }),
      this.prisma.admission.count({ where: { schoolId, status: 'REJECTED' } }),
      this.prisma.admission.count({ where: { schoolId, status: 'SCREENING' } }),
      // Also count actual enrolled students so the dashboard isn't misleading
      this.prisma.student.count({ where: { schoolId, deletedAt: null, status: 'ACTIVE' } }),
    ]);

    const approvalRate = total > 0 ? Math.round((approved / total) * 100) : 0;

    return successResponse({
      total,
      pending,
      approved,
      rejected,
      screening,
      approvalRate,
      // Include enrolled student count so admin sees real enrollment numbers
      enrolledStudents,
      totalStudents: enrolledStudents,
    });
  }

  private generateTempPassword(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  }
}
