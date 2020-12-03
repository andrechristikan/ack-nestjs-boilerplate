import { NestFactory } from '@nestjs/core';
import { AppModule } from 'app/app.module';
import { ConfigService } from 'config/config.service';

async function bootstrap() {
    const configService = new ConfigService();
    const app = await NestFactory.create(AppModule);

    app.enableCors();

    await app.listen(
        configService.getEnv('APP_PORT') || 'localhost',
        configService.getEnv('APP_URL') || '3000',
        () => {
            console.log(
                `Database running on ${configService.getEnv(
                    'DB_HOST'
                )}/${configService.getEnv('DB_NAME')}`
            );
            console.log(
                `Server running on http://${configService.getEnv(
                    'APP_URL'
                )}:${configService.getEnv('APP_PORT')}`
            );
        }
    );
}
bootstrap();
