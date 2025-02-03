import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { CommandModule, CommandService } from 'nestjs-command';
import { MigrationModule } from 'src/migration/migration.module';

async function bootstrap() {
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
