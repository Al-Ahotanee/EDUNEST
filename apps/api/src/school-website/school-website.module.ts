import { Module } from '@nestjs/common';
import { SchoolWebsiteController } from './school-website.controller';
import { SchoolWebsiteService } from './school-website.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SchoolWebsiteController],
  providers: [SchoolWebsiteService],
  exports: [SchoolWebsiteService],
})
export class SchoolWebsiteModule {}
