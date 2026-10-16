import { Module } from '@nestjs/common';
import { AdmissionsService } from './admissions.service';
import { AdmissionsController, PublicController } from './admissions.controller';

@Module({
  providers: [AdmissionsService],
  controllers: [AdmissionsController, PublicController],
  exports: [AdmissionsService],
})
export class AdmissionsModule {}
