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
import { IAppException } from '@app/interfaces/app.interface';
import { MessageService } from '@common/message/services/message.service';
import { IRequestApp } from '@common/request/interfaces/request.interface';
import { ResponseMetadataDto } from '@common/response/dtos/response.dto';
import { ResponseErrorDto } from '@common/response/dtos/response.error.dto';
import { IMessageProperties } from '@common/message/interfaces/message.interface';
import { ResponseMetadataService } from '@common/response/services/response.metadata.service';
import * as Sentry from '@sentry/nestjs';

/**
 * Handles `HttpException`: redirects off-prefix paths, builds the standard error envelope,
 * and reports 5xx to Sentry.
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

        let messagePath: string;
        let statusCode: number;
        let messageProperties: IMessageProperties | undefined;
        let data: unknown;

        let metadata: ResponseMetadataDto =
            this.responseMetadataService.create();

        const responseException = exception.getResponse();
        const statusHttp: HttpStatus = exception.getStatus();
        statusCode = statusHttp;
        messagePath = `http.${statusHttp}`;

        if (this.isErrorException(responseException)) {
            statusCode = responseException.statusCode;
            messagePath = responseException.message;
            messageProperties = responseException.messageProperties;
            data = responseException.data;

            metadata = {
                ...responseException.metadata,
                ...metadata,
            };
        }

        const message: string = this.messageService.setMessage(messagePath, {
            customLanguage: metadata.language,
            properties: messageProperties,
        });

        const responseBody: ResponseErrorDto = {
            statusCode,
            message,
            metadata,
            data,
        };

        this.responseMetadataService.setHeaders(response, metadata);
        response.status(statusHttp).json(responseBody);

        return;
    }

    isErrorException(obj: unknown): obj is IAppException<unknown> {
        return obj && typeof obj === 'object'
            ? 'statusCode' in obj && 'message' in obj
            : false;
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
