import { Catch, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import type { Response } from 'express';
import Case from 'case';
import { MessageService } from '@common/message/services/message.service';
import type { ResponseMetadataDto } from '@common/response/dtos/response.metadata.dto';
import type { ResponseErrorDto } from '@common/response/dtos/response.error.dto';
import { ResponseMetadataService } from '@common/response/services/response.metadata.service';
import { SentryService } from '@common/sentry/services/sentry.service';

/**
 * Handles framework `HttpException`: builds the standard error envelope from the HTTP status
 * and reports 5xx to Sentry.
 */
@Catch(HttpException)
export class AppHttpFilter implements ExceptionFilter {
    private readonly logger = new Logger(AppHttpFilter.name);

    constructor(
        private readonly messageService: MessageService,
        private readonly responseMetadataService: ResponseMetadataService,
        private readonly sentryService: SentryService
    ) {}

    private sendToSentry(exception: HttpException): void {
        if (exception.getStatus() < 500) {
            return;
        }

        this.logger.error(exception, 'An unhandled exception occurred');
        this.sentryService.captureException(exception);
    }

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
}
