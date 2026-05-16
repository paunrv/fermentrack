import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.setGlobalPrefix('api');
  const port = process.env.API_PORT ?? 3001;
  await app.listen(port);
  console.log(`Fermentrack API running on port ${port}`);
}

bootstrap();
