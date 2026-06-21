import {
    ArgumentsHost,
    Catch,
    ExceptionFilter,
    Logger,
} from '@nestjs/common';
import { HttpArgumentsHost } from '@nestjs/common/interfaces';
import { Response } from 'express';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { MessageService } from '@common/message/services/message.service';
import { ResponseMetadataDto } from '@common/response/dtos/response.dto';
import { ResponseErrorDto } from '@common/response/dtos/response.error.dto';
import { ResponseMetadataService } from '@common/response/services/response.metadata.service';
import * as Sentry from '@sentry/nestjs';

/**
 * Renders any `AppBaseException` into the standard error envelope and reports 5xx to Sentry.
 */
@Catch(AppBaseException)
export class AppBaseExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(AppBaseExceptionFilter.name);

    constructor(
        private readonly messageService: MessageService,
        private readonly responseMetadataService: ResponseMetadataService
    ) {}

    async catch(
        exception: AppBaseException,
        host: ArgumentsHost
    ): Promise<void> {
        const ctx: HttpArgumentsHost = host.switchToHttp();
        const response: Response = ctx.getResponse<Response>();

        this.sendToSentry(exception);

        const metadata: ResponseMetadataDto = {
            ...exception.metadata,
            ...this.responseMetadataService.create(),
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

    sendToSentry(exception: AppBaseException): void {
        if (exception.httpStatus < 500) {
            return;
        }

        const reported = exception.rawError ?? exception;

        try {
            this.logger.error(reported, 'An unhandled exception occurred');
            Sentry.captureException(reported);
        } catch (error: unknown) {
            this.logger.error(error, 'Failed to send exception to Sentry');
        }

        return;
    }
}
