import { NestFactory } from '@nestjs/core';
import { CommandModule, CommandService } from 'nestjs-command';
import { MigrationModule } from 'src/migration/migration.module';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(MigrationModule, {
        logger: ['error'],
    });

    try {
        await app.select(CommandModule).get(CommandService).exec();
        process.exit(0);
    } catch (err: unknown) {
        process.exit(1);
    }
}

bootstrap();
