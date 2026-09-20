import { Injectable, Logger } from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';
import type { Log, Scope, SeverityLevel } from '@sentry/nestjs';
import { EnumLoggerLevel } from '@common/logger/enums/logger.enum';

/**
 * Reports exceptions, messages and structured logs to Sentry without ever throwing.
 */
@Injectable()
export class SentryService {
    private readonly logger = new Logger(SentryService.name);

    captureException(exception: unknown): void {
        try {
            Sentry.captureException(exception);
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

    /**
     * Sends a structured log to Sentry Logs. `attributes` skip the pino redaction and are scrubbed
     * only by `beforeSendLog` in `instrument.ts`, a safety net, so they must never carry a credential.
     */
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

    withScope(callback: (scope: Scope) => void): void {
        try {
            Sentry.withScope(callback);
        } catch (error: unknown) {
            this.logger.error(error, 'Failed to run Sentry withScope');
        }
    }
}
