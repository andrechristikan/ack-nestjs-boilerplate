import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { CommandModule, CommandService } from 'nestjs-command';
import { ENUM_APP_ENVIRONMENT } from 'src/app/enums/app.enum';
import { MigrationModule } from 'src/migration/migration.module';

async function bootstrap() {
    process.env.APP_ENV = ENUM_APP_ENVIRONMENT.MIGRATION;

    const app = await NestFactory.createApplicationContext(MigrationModule, {
        logger: ['error', 'fatal'],
        abortOnError: true,
        bufferLogs: false,
    });

    const logger = new Logger('NestJs-Seed');

    try {
        await app.select(CommandModule).get(CommandService).exec();
        process.exit(0);
    } catch (err: unknown) {
        logger.error(err);

        process.exit(1);
    }
}

bootstrap();
