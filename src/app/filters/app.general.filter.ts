import { Catch, Logger } from '@nestjs/common';
import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import type { Response } from 'express';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { MessageService } from '@common/message/services/message.service';
import { RedisUtil } from '@common/redis/utils/redis.util';
import { SentryService } from '@common/sentry/services/sentry.service';
import type { ResponseMetadataDto } from '@common/response/dtos/response.metadata.dto';
import type { ResponseErrorDto } from '@common/response/dtos/response.error.dto';
import { ResponseMetadataService } from '@common/response/services/response.metadata.service';

/**
 * Translates every error no other filter claims into the standard error envelope: an `AppBaseException` as itself, a known database or Redis failure as its typed exception, anything else as a 500; reports 5xx to Sentry.
 */
@Catch()
export class AppGeneralFilter implements ExceptionFilter {
    private readonly logger = new Logger(AppGeneralFilter.name);

    constructor(
        private readonly messageService: MessageService,
        private readonly responseMetadataService: ResponseMetadataService,
        private readonly sentryService: SentryService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly redisUtil: RedisUtil
    ) {}

    private map(error: unknown): AppBaseException | null {
        const databaseException = this.databaseUtil.toException(error);
        const redisException = this.redisUtil.toException(error);

        return databaseException ?? redisException;
    }

    private resolve(exception: unknown): AppBaseException {
        if (exception instanceof AppUnknownException) {
            const mapped = this.map(exception.rawError);

            return mapped ?? exception;
        }

        if (exception instanceof AppBaseException) {
            return exception;
        }

        const mapped = this.map(exception);

        return mapped ?? new AppUnknownException(exception);
    }

    /**
     * A described `AppUnknownException` is reported as itself so Sentry shows the description with
     * the cause chained; any other `AppBaseException` reports its `rawError` when it has one.
     */
    private getReported(exception: unknown): unknown {
        if (
            exception instanceof AppUnknownException &&
            exception.description !== null
        ) {
            return exception;
        }

        if (exception instanceof AppBaseException) {
            return exception.rawError ?? exception;
        }

        return exception;
    }

    private sendToSentry(exception: unknown, resolved: AppBaseException): void {
        if (resolved.httpStatus < 500) {
            return;
        }

        const reported = this.getReported(exception);

        this.logger.error(reported, 'An unhandled exception occurred');
        this.sentryService.captureException(reported);
    }

    async catch(exception: unknown, host: ArgumentsHost): Promise<void> {
        const ctx = host.switchToHttp();
        const response: Response = ctx.getResponse<Response>();

        const resolved = this.resolve(exception);

        this.sendToSentry(exception, resolved);

        const responseMetadata = this.responseMetadataService.create();
        const metadata: ResponseMetadataDto = {
            ...resolved.metadata,
            ...responseMetadata,
        };

        const message: string = this.messageService.setMessage(
            resolved.messagePath,
            {
                customLanguage: metadata.language,
                ...(resolved.messageProperties !== null && {
                    properties: resolved.messageProperties,
                }),
            }
        );

        const responseBody: ResponseErrorDto = {
            statusCode: resolved.statusCode,
            statusCodeKey: resolved.statusCodeKey,
            module: resolved.module,
            message,
            metadata,
        };

        this.responseMetadataService.setHeaders(response, metadata);
        response.status(resolved.httpStatus).json(responseBody);

        return;
    }
}
