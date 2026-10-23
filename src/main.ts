import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { connectRedis } from './config/redis';
import { envVars } from './config/envVars';

async function bootstrap() {
  await connectRedis();
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();

  const allowedOrigins = envVars.CORS_ORIGIN.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  const port = Number(envVars.PORT) || 5000;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
}
void bootstrap();
