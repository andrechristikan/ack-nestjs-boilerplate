import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { CommandModule, CommandService } from 'nestjs-command';
import { MigrationModule } from './migration/migration.module';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(MigrationModule, {
        logger: ['error'],
    });

    const logger = new Logger();

    try {
        await app.select(CommandModule).get(CommandService).exec();
        await app.close();
    } catch (err: any) {
        logger.error(err, 'Migration');
        await app.close();
        process.exit(1);
    }
}

bootstrap();
