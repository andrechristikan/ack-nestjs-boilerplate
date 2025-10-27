import { NestFactory } from '@nestjs/core';
import { CommandModule, CommandService } from 'nestjs-command';
import { ENUM_APP_ENVIRONMENT } from '@app/enums/app.enum';
import { MigrationModule } from '@migration/migration.module';
import { Logger as PinoLogger } from 'nestjs-pino';

async function bootstrap(): Promise<void> {
    process.env.APP_ENV = ENUM_APP_ENVIRONMENT.MIGRATION;

    const app = await NestFactory.createApplicationContext(MigrationModule, {
        logger: ['error', 'fatal'],
        abortOnError: true,
        bufferLogs: false,
    });

    app.useLogger(app.get(PinoLogger));

    try {
        await app.select(CommandModule).get(CommandService).exec();
        process.exit(0);
    } catch (_) {
        await app.close();
        process.exit(1);
    }
}

bootstrap();
