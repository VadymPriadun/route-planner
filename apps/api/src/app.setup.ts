import { INestApplication, ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { loadEnv } from './config/env';

export function configureApp(app: INestApplication): void {
  const env = loadEnv();
  app.use(helmet({ contentSecurityPolicy: false }));
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  app.enableCors({ origin: env.corsOrigin.split(',') });
}
