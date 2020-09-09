import { NestFactory } from '@nestjs/core';
import { AppModule } from 'app/app.module';
import { ConfigService } from 'config/config.service';
import { ErrorService } from 'error/error.service';
import { SystemErrorStatusCode } from 'error/error.constant';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    const configService = new ConfigService();
    const errorService = new ErrorService();

    app.enableCors();
    // app.useGlobalPipes(new ValidationPipe());

    process.on('unhandledRejection', (reason: string, p: Promise<any>) => {
        // I just caught an unhandled promise rejection,
        // since we already have fallback handler for unhandled errors (see below),
        // let throw and let him handle that
        throw reason;
    });

    process.on('uncaughtException', (error: Error) => {
        // I just received an error that was never handled, time to handle it and then decide whether a restart is needed
        errorService.apiError(SystemErrorStatusCode.GENERAL_ERROR, error.message);
        process.exit(1);
    });


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
