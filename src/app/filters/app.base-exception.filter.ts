import { Catch, Logger } from '@nestjs/common';
import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import type { Response } from 'express';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { MessageService } from '@common/message/services/message.service';
import type { ResponseMetadataDto } from '@common/response/dtos/response.metadata.dto';
import type { ResponseErrorDto } from '@common/response/dtos/response.error.dto';
import { ResponseMetadataService } from '@common/response/services/response.metadata.service';
import { SentryService } from '@common/sentry/services/sentry.service';

/**
 * Renders any `AppBaseException` into the standard error envelope and reports 5xx to Sentry.
 */
@Catch(AppBaseException)
export class AppBaseExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(AppBaseExceptionFilter.name);

    constructor(
        private readonly messageService: MessageService,
        private readonly responseMetadataService: ResponseMetadataService,
        private readonly sentryService: SentryService
    ) {}

    private sendToSentry(exception: AppBaseException): void {
        if (exception.httpStatus < 500) {
            return;
        }

        const reported = exception.rawError ?? exception;

        this.logger.error(reported, 'An unhandled exception occurred');
        this.sentryService.captureException(reported);
    }

    async catch(
        exception: AppBaseException,
        host: ArgumentsHost
    ): Promise<void> {
        const ctx = host.switchToHttp();
        const response: Response = ctx.getResponse<Response>();

        this.sendToSentry(exception);

        const responseMetadata = this.responseMetadataService.create();
        const metadata: ResponseMetadataDto = {
            ...exception.metadata,
            ...responseMetadata,
        };

        const message: string = this.messageService.setMessage(
            exception.messagePath,
            {
                customLanguage: metadata.language,
                properties: exception.messageProperties,
            }
        );

        const responseBody: ResponseErrorDto = {
            statusCode: exception.statusCode,
            statusCodeKey: exception.statusCodeKey,
            module: exception.module,
            message,
            metadata,
            data: exception.data,
        };

        this.responseMetadataService.setHeaders(response, metadata);
        response.status(exception.httpStatus).json(responseBody);

        return;
    }
}
