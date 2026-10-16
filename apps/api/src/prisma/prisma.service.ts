import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
    });
  }

  async onModuleInit() {
    await this.$connect();
    console.log('✅ Database connected');
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async cleanDatabase() {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('CleanDatabase not allowed in production');
    }
    const tablenames = await this.$queryRaw<Array<{ Tables_in_db: string }>>`SHOW TABLES`;
    for (const { Tables_in_db: tableName } of tablenames) {
      await this.$executeRawUnsafe(`TRUNCATE TABLE \`${tableName}\``);
    }
  }
}
