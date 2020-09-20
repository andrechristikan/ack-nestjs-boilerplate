import { NestFactory } from '@nestjs/core';
import { AppModule } from 'components/app/app.module';
import { ConfigService } from 'common/config/config.service';

async function bootstrap() {
    const configService = new ConfigService();
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
