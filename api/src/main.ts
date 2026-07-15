import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

/**
 * Application bootstrap. The cross-cutting concerns wired here (validation,
 * error formatting, CORS) apply to every route, so no controller repeats them.
 */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  // Validate & strip every incoming body against its DTO. `whitelist` drops
  // unknown properties; `forbidNonWhitelisted` rejects them outright;
  // `transform` coerces payloads into DTO class instances.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // One consistent JSON error shape for the whole API.
  app.useGlobalFilters(new AllExceptionsFilter());

  // Allow the Next.js dev server to call the API from the browser.
  app.enableCors({
    origin: config.get<string>('CORS_ORIGIN', 'http://localhost:3000'),
  });

  const port = Number(config.get('PORT', 3001));
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`MeowPay API listening on http://localhost:${port}`);
}

bootstrap();
