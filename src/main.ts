import { NestFactory } from '@nestjs/core';
import { AppModule } from './main/app.module';
import { setup as setupSwagger } from './swagger/swagger';
import { ConfigService } from './config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = new ConfigService();

  setupSwagger(app);
  app.enableCors();
  // app.useGlobalPipes(new ValidationPipe());
  await app.listen(
    configService.getEnv('APP_PORT'),
    configService.getEnv('APP_URL'),
    () => {
      console.log(
        `Server running on http://${configService.getEnv(
          'APP_URL',
        )}:${configService.getEnv('APP_PORT')}`,
      );
    },
  );
}
bootstrap();
