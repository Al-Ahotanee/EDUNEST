import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as express from 'express';
import * as fs from 'fs';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // CORS
  app.enableCors({
    origin: process.env.FRONTEND_URL || '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-paystack-signature'],
  });

  // Serve uploaded files statically
  app.use('/uploads', express.static(join(process.cwd(), 'uploads')));

  // Global validation pipe — strips unknown fields, validates all DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Global exception filter
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Swagger API docs
  const config = new DocumentBuilder()
    .setTitle('EduNest Institutional OS API')
    .setDescription('Multi-tenant Educational Operating System API')
    .setVersion('2.4')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Serve frontend static build if available (supports unified single-service deployment)
  const candidateDists = [
    join(process.cwd(), '../web/dist'),
    join(process.cwd(), 'apps/web/dist'),
    join(__dirname, '../../web/dist'),
  ];
  for (const clientDist of candidateDists) {
    if (fs.existsSync(clientDist)) {
      app.use(express.static(clientDist));
      app.use((req: any, res: any, next: any) => {
        if (!req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
          res.sendFile(join(clientDist, 'index.html'));
        } else {
          next();
        }
      });
      console.log(`📦 Serving frontend static bundle from: ${clientDist}`);
      break;
    }
  }

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 EduNest API running on: http://0.0.0.0:${port}/api/v1`);
  console.log(`📚 API Docs: http://0.0.0.0:${port}/api/docs`);
}
bootstrap();
