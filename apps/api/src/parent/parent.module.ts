import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ParentController } from './parent.controller';
import { ParentService } from './parent.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({ secret: process.env.JWT_SECRET || 'school-erp-secret-key' }),
  ],
  controllers: [ParentController],
  providers: [ParentService],
})
export class ParentModule {}
