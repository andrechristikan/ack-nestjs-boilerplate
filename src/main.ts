import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from 'src/app/app.module';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    const configService = app.get(ConfigService);
    const logger = new Logger();

    // Middleware
    app.setGlobalPrefix('/api');
    app.enableCors();

    await app.listen(
        configService.get('http.port') || 3000,
        configService.get('http.host') || 'localhost',
        () => {
            logger.log(
                `Database running on ${configService.get(
                    'database.url'
                )}/${configService.get('database.name')}`,
                'NestApplication'
            );
            logger.log(
                `Server running on http://${configService.get(
                    'http.host'
                )}:${configService.get('http.port')}`,
                'NestApplication'
            );
        }
    );
}
bootstrap();
