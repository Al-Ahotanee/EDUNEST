import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MarketerController } from './marketer.controller';
import { MarketerService } from './marketer.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule, JwtModule.register({ secret: process.env.JWT_SECRET || 'school-erp-secret-key' })],
  controllers: [MarketerController],
  providers: [MarketerService],
})
export class MarketerModule {}
