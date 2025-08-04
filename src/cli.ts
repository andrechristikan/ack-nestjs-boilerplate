import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { CommandModule, CommandService } from 'nestjs-command';
import { ENUM_APP_ENVIRONMENT } from '@app/enums/app.enum';
import { MigrationModule } from '@migration/migration.module';
import { ConfigService } from '@nestjs/config';

async function bootstrap(): Promise<void> {
    process.env.APP_ENV = ENUM_APP_ENVIRONMENT.MIGRATION;

    const app = await NestFactory.createApplicationContext(MigrationModule, {
        logger: ['error', 'fatal'],
        abortOnError: true,
        bufferLogs: false,
    });

    const configService = app.get(ConfigService);
    const appName: string = configService.get<string>('app.name');

    const logger = new Logger(`${appName}-Migration`);

    try {
        await app.select(CommandModule).get(CommandService).exec();
        process.exit(0);
    } catch (err: unknown) {
        logger.error(err);

        process.exit(1);
    }
}

bootstrap();
