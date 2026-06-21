import {
    ArgumentsHost,
    Catch,
    ExceptionFilter,
    HttpException,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import { HttpArgumentsHost } from '@nestjs/common/interfaces';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import Case from 'case';
import { MessageService } from '@common/message/services/message.service';
import { IRequestApp } from '@common/request/interfaces/request.interface';
import { ResponseMetadataDto } from '@common/response/dtos/response.dto';
import { ResponseErrorDto } from '@common/response/dtos/response.error.dto';
import { ResponseMetadataService } from '@common/response/services/response.metadata.service';
import * as Sentry from '@sentry/nestjs';

/**
 * Handles framework `HttpException`: redirects off-prefix paths, builds the standard error
 * envelope from the HTTP status, and reports 5xx to Sentry.
 */
@Catch(HttpException)
export class AppHttpFilter implements ExceptionFilter {
    private readonly logger = new Logger(AppHttpFilter.name);

    private readonly globalPrefix: string;
    private readonly docPrefix: string;

    private readonly directPermanentToPath: string = '/public/hello';
    private readonly directPermanentTo: string;

    constructor(
        private readonly messageService: MessageService,
        private readonly configService: ConfigService,
        private readonly responseMetadataService: ResponseMetadataService
    ) {
        this.globalPrefix = this.configService.get<string>('app.globalPrefix')!;
        this.docPrefix = this.configService.get<string>('doc.prefix')!;
        this.directPermanentTo = `${this.globalPrefix}${this.directPermanentToPath}`;
    }

    async catch(exception: HttpException, host: ArgumentsHost): Promise<void> {
        const ctx: HttpArgumentsHost = host.switchToHttp();
        const response: Response = ctx.getResponse<Response>();
        const request: IRequestApp = ctx.getRequest<IRequestApp>();

        if (
            !request.path.startsWith(this.globalPrefix) &&
            !request.path.startsWith(this.docPrefix)
        ) {
            response.redirect(
                HttpStatus.PERMANENT_REDIRECT,
                this.directPermanentTo
            );
            return;
        }

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
                (statusName ? Case.camel(statusName) : 'unknown'),
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
