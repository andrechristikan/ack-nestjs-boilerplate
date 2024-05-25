import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { CommandModule, CommandService } from 'nestjs-command';
import { AppModule } from 'src/app/app.module';
import { MigrationModule } from 'src/migration/migration.module';

async function bootstrap() {
    let app = await NestFactory.createApplicationContext(MigrationModule, {
        logger: ['error'],
    });
    const configService = app.get(ConfigService);
    const migration: string = configService.get<string>('app.migration');

    const logger = new Logger();

    if (migration) {
        logger.log('On migrating schema', 'Migration');
        app = await NestFactory.create(AppModule);

        logger.log('Successfully migrate schema', 'Migration');
        process.exit(0);
    }

    try {
        await app.select(CommandModule).get(CommandService).exec();
        process.exit(0);
    } catch (err: unknown) {
        logger.error(err, 'Migration');
        process.exit(1);
    }
}

bootstrap();
