import {
    ArgumentsHost,
    Catch,
    ExceptionFilter,
    HttpException,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import { Response } from 'express';
import Case from 'case';
import { MessageService } from '@common/message/services/message.service';
import { ResponseMetadataDto } from '@common/response/dtos/response.metadata.dto';
import { ResponseErrorDto } from '@common/response/dtos/response.error.dto';
import { ResponseMetadataService } from '@common/response/services/response.metadata.service';
import * as Sentry from '@sentry/nestjs';

/**
 * Handles framework `HttpException`: builds the standard error envelope from the HTTP status
 * and reports 5xx to Sentry.
 */
@Catch(HttpException)
export class AppHttpFilter implements ExceptionFilter {
    private readonly logger = new Logger(AppHttpFilter.name);

    constructor(
        private readonly messageService: MessageService,
        private readonly responseMetadataService: ResponseMetadataService
    ) {}

    async catch(exception: HttpException, host: ArgumentsHost): Promise<void> {
        const ctx = host.switchToHttp();
        const response: Response = ctx.getResponse<Response>();

        this.sendToSentry(exception);

        const statusHttp: HttpStatus = exception.getStatus();
        const statusName: string = HttpStatus[statusHttp];
        const responseException: unknown = exception.getResponse();
        const extended =
            responseException && typeof responseException === 'object'
                ? (responseException as Record<string, unknown>)
                : undefined;

        const metadata: ResponseMetadataDto =
            this.responseMetadataService.create();

        const message: string = this.messageService.setMessage(
            `http.${statusHttp}`,
            {
                customLanguage: metadata.language,
            }
        );

        const responseBody: ResponseErrorDto = {
            statusCode: statusHttp,
            statusCodeKey:
                (extended?.statusCodeKey as string) ??
                (statusName ? Case.camel(statusName) : statusHttp.toString()),
            module: (extended?.module as string) ?? 'http',
            message,
            metadata,
            data: extended?.data,
        };

        this.responseMetadataService.setHeaders(response, metadata);
        response.status(statusHttp).json(responseBody);

        return;
    }

    sendToSentry(exception: HttpException): void {
        if (exception.getStatus() < 500) {
            return;
        }

        try {
            this.logger.error(exception, 'An unhandled exception occurred');
            Sentry.captureException(exception);
        } catch (error: unknown) {
            this.logger.error(error, 'Failed to send exception to Sentry');
        }

        return;
    }
}
