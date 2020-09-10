import { NestFactory } from '@nestjs/core';
import { AppModule } from 'app/app.module';
import { ConfigService } from 'config/config.service';
import { LoggerService } from 'logger/logger.service';

async function bootstrap() {
    const configService = new ConfigService();
    const loggerService = new LoggerService();
    const app = await NestFactory.create(AppModule);

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
