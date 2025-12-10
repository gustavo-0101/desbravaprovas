import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(helmet());

  app.enableCors({
    origin: process.env.FRONTEND_URL || ['http://localhost:5173', 'http://localhost:3001'],
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Desbrava Provas API')
    .setDescription(
      'API para gerenciamento de provas e avaliações de clubes de desbravadores. ' +
      'Sistema completo com geração de questões por IA, correção automática, OCR e gestão de membros.',
    )
    .setVersion('0.1.0-beta')
    .addTag('auth', 'Autenticação e autorização')
    .addTag('usuarios', 'Gestão de usuários e perfis')
    .addTag('clubes', 'Gestão de clubes e unidades')
    .addTag('membros', 'Gestão de membros e aprovações')
    .addTag('especialidades', 'Especialidades de desbravadores')
    .addTag('provas', 'Criação e gestão de provas')
    .addTag('questoes', 'Gestão de questões')
    .addTag('respostas', 'Respostas e correção de provas')
    .addTag('ia', 'Geração de questões por IA')
    .addTag('ocr', 'Leitura de provas físicas')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Token JWT obtido no endpoint de login',
        in: 'header',
      },
      'JWT-auth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document, {
    customSiteTitle: 'Desbrava Provas API - Documentação',
    customCss: '.swagger-ui .topbar { display: none }',
  });

  await app.listen(process.env.PORT ?? 3000);

  console.log(`Application is running on: http://localhost:${process.env.PORT ?? 3000}`);
  console.log(`Swagger documentation: http://localhost:${process.env.PORT ?? 3000}/api-docs`);
}
bootstrap();
