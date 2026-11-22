import { Injectable, Logger } from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';
import type { CaptureContext, Log, SeverityLevel } from '@sentry/nestjs';
import { EnumLoggerLevel } from '@common/logger/enums/logger.enum';

@Injectable()
export class SentryService {
    private readonly logger = new Logger(SentryService.name);

    captureException(
        exception: unknown,
        captureContext?: CaptureContext
    ): void {
        try {
            Sentry.captureException(exception, captureContext);
        } catch (error: unknown) {
            this.logger.error(error, 'Failed to send exception to Sentry');
        }
    }

    captureMessage(message: string, level: SeverityLevel): void {
        try {
            Sentry.captureMessage(message, level);
        } catch (error: unknown) {
            this.logger.error(error, 'Failed to send message to Sentry');
        }
    }

    log(
        level: EnumLoggerLevel,
        message: string,
        attributes?: Log['attributes']
    ): void {
        try {
            Sentry.logger[level](message, attributes);
        } catch (error: unknown) {
            this.logger.error(error, 'Failed to send log to Sentry');
        }
    }
}
