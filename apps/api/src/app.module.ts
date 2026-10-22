import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { StudentsModule } from './students/students.module';
import { AcademicModule } from './academic/academic.module';
import { AttendanceModule } from './attendance/attendance.module';
import { ResultsModule } from './results/results.module';
import { FinanceModule } from './finance/finance.module';
import { HrModule } from './hr/hr.module';
import { ReportsModule } from './reports/reports.module';
import { SaasModule } from './saas/saas.module';
import { AdmissionsModule } from './admissions/admissions.module';
import { ParentModule } from './parent/parent.module';
import { SuperAdminModule } from './super-admin/super-admin.module';
import { MarketerModule } from './marketer/marketer.module';
import { TenantMiddleware } from './common/middleware/tenant.middleware';
import { CbtModule } from './cbt/cbt.module';
import { LibraryModule } from './library/library.module';
import { HostelModule } from './hostel/hostel.module';
import { HealthModule } from './health/health.module';
import { InventoryModule } from './inventory/inventory.module';
import { TimetableModule } from './timetable/timetable.module';
import { NotificationsModule } from './notifications/notifications.module';
import { SchoolsModule } from './schools/schools.module';
import { UsersModule } from './users/users.module';
import { SchoolWebsiteModule } from './school-website/school-website.module';
import { UploadModule } from './upload/upload.module';
import { PingController } from './health.controller';

@Module({
  controllers: [PingController],
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // ─── RATE LIMITING (env-configurable for bulk ops / UAT) ───────────────────────
    // Default: 1000 req/min per IP (was 100 — too restrictive for school ERPs).
    // Override via env: THROTTLE_SHORT_TTL_MS, THROTTLE_SHORT_LIMIT
    // Auth routes are stricter (10/min) to slow brute-force attempts.
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: Number(process.env.THROTTLE_SHORT_TTL_MS) || 60000,
        limit: Number(process.env.THROTTLE_SHORT_LIMIT) || 1000,
      },
      {
        name: 'auth',
        ttl: Number(process.env.THROTTLE_AUTH_TTL_MS) || 60000,
        limit: Number(process.env.THROTTLE_AUTH_LIMIT) || 5,
      },
    ]),
    PrismaModule, AuthModule, StudentsModule, AcademicModule,
    AttendanceModule, ResultsModule, FinanceModule, HrModule,
    ReportsModule, SaasModule, AdmissionsModule, ParentModule,
    SuperAdminModule, MarketerModule,
    CbtModule, LibraryModule, HostelModule, HealthModule,
    InventoryModule, TimetableModule, NotificationsModule,
    SchoolsModule, UsersModule, SchoolWebsiteModule, UploadModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TenantMiddleware)
      .exclude(
        { path: 'api/v1/auth/login', method: RequestMethod.POST },
        { path: 'api/v1/saas/register', method: RequestMethod.POST },
        { path: 'api/v1/saas/webhook/paystack', method: RequestMethod.POST },
        { path: 'api/v1/saas/school/(.*)', method: RequestMethod.ALL },
        { path: 'api/v1/public/(.*)', method: RequestMethod.ALL },
        { path: 'api/v1/parent/auth/login', method: RequestMethod.POST },
        { path: 'api/v1/marketer/auth/login', method: RequestMethod.POST },
        { path: 'api/v1/ping', method: RequestMethod.GET },
        { path: 'api/v1/health-check', method: RequestMethod.GET },
        { path: 'api/v1/health', method: RequestMethod.GET },
        { path: 'api/v1/super-admin/(.*)', method: RequestMethod.ALL },
      )
      .forRoutes('*');
  }
}
