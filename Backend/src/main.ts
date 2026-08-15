// Must load first: AuthModule's JwtModule.register() reads
// process.env.JWT_ACCESS_SECRET at import time, which is BEFORE
// ConfigModule.forRoot() would otherwise get to load .env — if this import
// moves below `AppModule`, the JWT gets silently signed with the hardcoded
// fallback secret instead of the real one.
import 'dotenv/config';
import { mkdirSync } from 'fs';
import { join } from 'path';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  // multer's diskStorage does not create its destination — must exist before
  // the first upload request, not just before useStaticAssets below.
  mkdirSync(join(process.cwd(), 'uploads', 'landing'), { recursive: true });
  mkdirSync(join(process.cwd(), 'uploads', 'tickets'), { recursive: true });
  mkdirSync(join(process.cwd(), 'uploads', 'events'), { recursive: true });
  mkdirSync(join(process.cwd(), 'uploads', 'sponsors'), { recursive: true });

  // `rawBody: true` keeps the raw request bytes available on `req.rawBody`
  // (alongside the normal parsed `req.body`) — needed by the Razorpay
  // webhook handler to verify `X-Razorpay-Signature`, which is computed
  // over the exact bytes Razorpay sent, not a re-serialized JSON object.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true });
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads' });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors(); // tighten to an explicit origin allow-list before this leaves scaffold stage
  await app.listen(process.env.PORT ?? 4000);
}
bootstrap();
