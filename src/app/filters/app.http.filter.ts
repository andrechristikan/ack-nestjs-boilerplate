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
import { HelperService } from '@common/helper/services/helper.service';
import { MessageService } from '@common/message/services/message.service';
import { IRequestApp } from '@common/request/interfaces/request.interface';
import { ResponseMetadataDto } from '@common/response/dtos/response.dto';
import { ResponseErrorDto } from '@common/response/dtos/response.error.dto';
import { IMessageProperties } from '@common/message/interfaces/message.interface';
import { ENUM_MESSAGE_LANGUAGE } from '@common/message/enums/message.enum';
import * as Sentry from '@sentry/nestjs';

/**
 * HTTP exception filter that handles HttpException instances.
 * Validates request paths, redirects invalid requests, and formats error responses with metadata.
 */
@Catch(HttpException)
export class AppHttpFilter implements ExceptionFilter {
    private readonly logger = new Logger(AppHttpFilter.name);

    private readonly globalPrefix: string;
    private readonly docPrefix: string;

    constructor(
        private readonly messageService: MessageService,
        private readonly configService: ConfigService,
        private readonly helperService: HelperService
    ) {
        this.globalPrefix = this.configService.get<string>('app.globalPrefix');
        this.docPrefix = this.configService.get<string>('doc.prefix');
    }

    /**
     * Handles HTTP exceptions with path validation and response formatting.
     * Redirects invalid paths and creates standardized error responses.
     * @param {HttpException} exception - The HTTP exception to handle
     * @param {ArgumentsHost} host - Arguments host containing request/response context
     * @returns {Promise<void>}
     */
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
                `${this.globalPrefix}/public/hello`
            );

            return;
        }

        this.sendToSentry(exception);

        let statusHttp: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
        let messagePath = `http.${statusHttp}`;
        let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
        let messageProperties: IMessageProperties;
        let data: unknown;

        const today = this.helperService.dateCreate();
        const xLanguage: ENUM_MESSAGE_LANGUAGE =
            (request.__language as ENUM_MESSAGE_LANGUAGE) ??
            this.configService.get<ENUM_MESSAGE_LANGUAGE>('message.language');
        const xTimestamp = this.helperService.dateGetTimestamp(today);
        const xTimezone = this.helperService.dateGetZone(today);
        const xVersion =
            request.__version ??
            this.configService.get<string>('app.urlVersion.version');
        const xRepoVersion = this.configService.get<string>('app.version');
        let metadata: ResponseMetadataDto = {
            language: xLanguage,
            timestamp: xTimestamp,
            timezone: xTimezone,
            path: request.path,
            version: xVersion,
            repoVersion: xRepoVersion,
        };

        const responseException = exception.getResponse();
        statusHttp = exception.getStatus();
        statusCode = exception.getStatus();
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
            customLanguage: xLanguage,
            properties: messageProperties,
        });

        const responseBody: ResponseErrorDto = {
            statusCode,
            message,
            metadata,
            data,
        };

        response
            .setHeader('x-custom-lang', xLanguage)
            .setHeader('x-timestamp', xTimestamp)
            .setHeader('x-timezone', xTimezone)
            .setHeader('x-version', xVersion)
            .setHeader('x-repo-version', xRepoVersion)
            .status(statusHttp)
            .json(responseBody);

        return;
    }

    /**
     * Type guard to check if exception response implements IAppException interface.
     * Validates object has required statusCode and message properties.
     * @param {unknown} obj - The object to check
     * @returns {boolean} True if object has statusCode and message properties
     */
    isErrorException(obj: unknown): obj is IAppException<unknown> {
        return typeof obj === 'object'
            ? 'statusCode' in obj && 'message' in obj
            : false;
    }

    /**
     * Sends exceptions with status >= 500 to Sentry for monitoring
     * @param {HttpException} exception - The HTTP exception to send to Sentry
     * @returns {void}
     */
    sendToSentry(exception: HttpException): void {
        if (exception.getStatus() < 500) {
            return;
        }

        try {
            this.logger.error(exception);
            Sentry.captureException(exception);
        } catch (error: unknown) {
            this.logger.error('Failed to send exception to Sentry', error);
        }

        return;
    }
}
