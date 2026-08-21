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
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  // multer's diskStorage does not create its destination — must exist before
  // the first upload request, not just before useStaticAssets below.
  mkdirSync(join(process.cwd(), 'uploads', 'landing'), { recursive: true });
  mkdirSync(join(process.cwd(), 'uploads', 'tickets'), { recursive: true });
  mkdirSync(join(process.cwd(), 'uploads', 'events'), { recursive: true });
  mkdirSync(join(process.cwd(), 'uploads', 'sponsors'), { recursive: true });
  mkdirSync(join(process.cwd(), 'uploads', 'content'), { recursive: true });
  // Résumés are personal data — deliberately NOT under `uploads/` (which
  // useStaticAssets serves to the world below); careers.service.ts streams
  // them only through its guarded route.
  mkdirSync(process.env.RESUME_DIR ?? join(process.cwd(), 'resumes'), { recursive: true });

  // `rawBody: true` keeps the raw request bytes available on `req.rawBody`
  // (alongside the normal parsed `req.body`) — needed by the Razorpay
  // webhook handler to verify `X-Razorpay-Signature`, which is computed
  // over the exact bytes Razorpay sent, not a re-serialized JSON object.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true });
  // Express's default JSON body limit (100kb) is too small for event saves —
  // a populated venue layout (tables/seats/scheduled spaces/speaker zones/
  // annotations) plus speakers/sponsors/gallery routinely exceeds it, which
  // makes "Update event" fail with an opaque 413 that never reaches the
  // eventsh proxy. Raise it so real event payloads go through.
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ extended: true, limit: '10mb' }));
  // Must come BEFORE useStaticAssets: Express's static middleware answers a
  // matching request itself and never reaches later-registered middleware,
  // so CORS headers were never being attached to /uploads/* responses —
  // harmless for plain <img>/<video> tags (no CORS needed to just display
  // them) but breaks any fetch()/XHR read of an uploaded file from the SPA's
  // origin (a different origin than the Backend in local dev).
  app.enableCors(); // tighten to an explicit origin allow-list before this leaves scaffold stage
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads' });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.listen(process.env.PORT ?? 4000);
}
bootstrap();
