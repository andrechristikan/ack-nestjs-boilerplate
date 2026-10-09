import { Logger } from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';
import { CommandFactory } from 'nest-commander';
import { AppBootstrapSentryFlushTimeoutInMs } from '@app/constants/app.constant';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { MigrationModule } from '@migration/migration.module';
import { Logger as LoggerPino } from 'nestjs-pino';

async function bootstrap(): Promise<void> {
    const app = await CommandFactory.createWithoutRunning(MigrationModule, {
        abortOnError: false,
        bufferLogs: true,
        logger: ['fatal'],
        serviceErrorHandler: (error: Error): never => {
            if (error instanceof AppBaseException) {
                throw error;
            }

            throw new AppUnknownException(
                error,
                'Running the migration command failed'
            );
        },
    });

    app.useLogger(app.get(LoggerPino));
    app.flushLogs();

    await CommandFactory.runApplication(app);

    await app.close();
    process.exit(0);
}

bootstrap().catch(async (error: unknown) => {
    const logger = new Logger('Bootstrap');

    logger.fatal(error);
    Logger.flush();

    Sentry.captureException(error);
    await Sentry.flush(AppBootstrapSentryFlushTimeoutInMs);

    process.exit(1);
});
