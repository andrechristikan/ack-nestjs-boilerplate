import { CommandFactory } from 'nest-commander';
import { MigrationModule } from '@migration/migration.module';
import { Logger as LoggerPino } from 'nestjs-pino';

async function bootstrap(): Promise<void> {
    const app = await CommandFactory.createWithoutRunning(MigrationModule, {
        abortOnError: true,
        bufferLogs: false,
    });

    app.useLogger(app.get(LoggerPino));

    await CommandFactory.runApplication(app);

    await app.close();
    process.exit(0);
}

bootstrap();
