import { Catch, HttpStatus, Logger } from '@nestjs/common';
import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import type { Response } from 'express';
import { EnumAppStatusCodeError } from '@app/enums/app.status-code.enum';
import { MessageService } from '@common/message/services/message.service';
import { SentryService } from '@common/sentry/services/sentry.service';
import type { ResponseErrorDto } from '@common/response/dtos/response.error.dto';
import { ResponseMetadataService } from '@common/response/services/response.metadata.service';

/**
 * Catches all unhandled exceptions, returns the standard error envelope, and reports to Sentry.
 */
@Catch()
export class AppGeneralFilter implements ExceptionFilter {
    private readonly logger = new Logger(AppGeneralFilter.name);

    constructor(
        private readonly messageService: MessageService,
        private readonly responseMetadataService: ResponseMetadataService,
        private readonly sentryService: SentryService
    ) {}

    private sendToSentry(exception: unknown): void {
        this.logger.error(exception, 'An unhandled exception occurred');
        this.sentryService.captureException(exception);
    }

    async catch(exception: unknown, host: ArgumentsHost): Promise<void> {
        const ctx = host.switchToHttp();
        const response: Response = ctx.getResponse<Response>();

        this.sendToSentry(exception);

        const statusHttp: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
        const messagePath = 'http.serverError.internalServerError';
        const statusCode = EnumAppStatusCodeError.unknown;

        const metadata = this.responseMetadataService.create();

        const message: string = this.messageService.setMessage(messagePath, {
            customLanguage: metadata.language,
        });

        const responseBody: ResponseErrorDto = {
            statusCode,
            statusCodeKey: EnumAppStatusCodeError[statusCode],
            module: 'app',
            message,
            metadata,
        };

        this.responseMetadataService.setHeaders(response, metadata);
        response.status(statusHttp).json(responseBody);

        return;
    }
}
