import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from 'app/app.module';
import { ConfigService } from 'config/config.service';

async function bootstrap() {
    const configService = new ConfigService();
    const app = await NestFactory.create(AppModule);
    const logger = new Logger();

    app.enableCors();

    await app.listen(
        configService.getEnv('APP_PORT') || 'localhost',
        configService.getEnv('APP_URL') || '3000',
        () => {
            logger.log(
                `Database running on ${configService.getEnv(
                    'DB_HOST'
                )}/${configService.getEnv('DB_NAME')}`,
                'NestApplication'
            );
            logger.log(
                `Server running on http://${configService.getEnv(
                    'APP_URL'
                )}:${configService.getEnv('APP_PORT')}`,
                'NestApplication'
            );
        }
    );
}
bootstrap();
