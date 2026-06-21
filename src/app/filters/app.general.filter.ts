import {
    ArgumentsHost,
    Catch,
    ExceptionFilter,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import { HttpArgumentsHost } from '@nestjs/common/interfaces';
import { Response } from 'express';
import { MessageService } from '@common/message/services/message.service';
import * as Sentry from '@sentry/nestjs';
import { ResponseErrorDto } from '@common/response/dtos/response.error.dto';
import { ResponseMetadataService } from '@common/response/services/response.metadata.service';

/**
 * Catches all unhandled exceptions, returns the standard error envelope, and reports to Sentry.
 */
@Catch()
export class AppGeneralFilter implements ExceptionFilter {
    private readonly logger = new Logger(AppGeneralFilter.name);

    constructor(
        private readonly messageService: MessageService,
        private readonly responseMetadataService: ResponseMetadataService
    ) {}

    async catch(exception: unknown, host: ArgumentsHost): Promise<void> {
        const ctx: HttpArgumentsHost = host.switchToHttp();
        const response: Response = ctx.getResponse<Response>();

        this.sendToSentry(exception);

        const statusHttp: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
        const messagePath = `http.${statusHttp}`;
        const statusCode = HttpStatus.INTERNAL_SERVER_ERROR;

        const metadata = this.responseMetadataService.create();

        const message: string = this.messageService.setMessage(messagePath, {
            customLanguage: metadata.language,
        });

        const responseBody: ResponseErrorDto = {
            statusCode,
            statusCodeKey: 'unknown',
            module: 'app',
            message,
            metadata,
        };

        this.responseMetadataService.setHeaders(response, metadata);
        response.status(statusHttp).json(responseBody);

        return;
    }

    sendToSentry(exception: unknown): void {
        try {
            this.logger.error(exception, 'An unhandled exception occurred');
            Sentry.captureException(exception);
        } catch (error: unknown) {
            this.logger.error(error, 'Failed to send exception to Sentry');
        }

        return;
    }
}
