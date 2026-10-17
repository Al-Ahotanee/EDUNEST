import { Module } from '@nestjs/common';
import { CbtService } from './cbt.service';
import { CbtController } from './cbt.controller';
@Module({ providers: [CbtService], controllers: [CbtController], exports: [CbtService] })
export class CbtModule {}
