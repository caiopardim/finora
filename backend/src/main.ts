import ws from 'ws';
(global as any).WebSocket = ws;

import * as Sentry from '@sentry/node';

// Monitoramento de erros (inerte até definir SENTRY_DSN)
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'production',
    tracesSampleRate: 0.1,
  });
}

import { NestFactory, HttpAdapterHost } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { SentryExceptionFilter } from './common/sentry-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const allowedOrigins = [
    process.env.FRONTEND_URL,
    'https://meufinora.com.br',
    'https://www.meufinora.com.br',
    'http://localhost:3000',
  ].filter(Boolean);

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, mobile apps) and any vercel preview deploy
      if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
  });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  const { httpAdapter } = app.get(HttpAdapterHost);
  app.useGlobalFilters(new SentryExceptionFilter(httpAdapter));

  const config = new DocumentBuilder()
    .setTitle('Finora API')
    .setDescription('API de organização financeira')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, config));

  await app.listen(process.env.PORT || 3001);
  console.log(`Finora backend running on port ${process.env.PORT || 3001}`);
}

bootstrap();
