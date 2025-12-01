import {
    ArgumentsHost,
    Catch,
    ExceptionFilter,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import { HttpArgumentsHost } from '@nestjs/common/interfaces';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { HelperService } from '@common/helper/services/helper.service';
import { MessageService } from '@common/message/services/message.service';
import { IRequestApp } from '@common/request/interfaces/request.interface';
import { ResponseMetadataDto } from '@common/response/dtos/response.dto';
import * as Sentry from '@sentry/nestjs';
import { ResponseErrorDto } from '@common/response/dtos/response.error.dto';
import { ENUM_MESSAGE_LANGUAGE } from '@common/message/enums/message.enum';

/**
 * Global exception filter that handles all unhandled exceptions in the application.
 * Implements NestJS ExceptionFilter interface to catch and process unhandled errors,
 * format them as standardized error responses, and send them to Sentry for monitoring.
 */
@Catch()
export class AppGeneralFilter implements ExceptionFilter {
    private readonly logger = new Logger(AppGeneralFilter.name);

    constructor(
        private readonly messageService: MessageService,
        private readonly configService: ConfigService,
        private readonly helperService: HelperService
    ) {}

    /**
     * Handles all unhandled exceptions and formats them as standardized error responses.
     * Sets response headers and sends exceptions to Sentry for monitoring.
     * @param {unknown} exception - The unhandled exception that was thrown
     * @param {ArgumentsHost} host - Arguments host containing request/response context
     * @returns {Promise<void>}
     */
    async catch(exception: unknown, host: ArgumentsHost): Promise<void> {
        const ctx: HttpArgumentsHost = host.switchToHttp();
        const response: Response = ctx.getResponse<Response>();
        const request: IRequestApp = ctx.getRequest<IRequestApp>();

        this.sendToSentry(exception);

        const statusHttp: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
        const messagePath = `http.${statusHttp}`;
        const statusCode = HttpStatus.INTERNAL_SERVER_ERROR;

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
        const xRequestId = String(request.id);
        const xCorrelationId = String(request.correlationId);
        const metadata: ResponseMetadataDto = {
            language: xLanguage,
            timestamp: xTimestamp,
            timezone: xTimezone,
            path: request.path,
            version: xVersion,
            repoVersion: xRepoVersion,
            requestId: xRequestId,
            correlationId: xCorrelationId,
        };

        const message: string = this.messageService.setMessage(messagePath, {
            customLanguage: xLanguage,
        });

        const responseBody: ResponseErrorDto = {
            statusCode,
            message,
            metadata,
        };

        response
            .setHeader('x-custom-lang', xLanguage)
            .setHeader('x-timestamp', xTimestamp)
            .setHeader('x-timezone', xTimezone)
            .setHeader('x-version', xVersion)
            .setHeader('x-repo-version', xRepoVersion)
            .setHeader('x-request-id', xRequestId)
            .setHeader('x-correlation-id', xCorrelationId)
            .status(statusHttp)
            .json(responseBody);

        return;
    }

    /**
     * Sends exception to Sentry for error monitoring and logging.
     * Includes error handling for Sentry failures to prevent cascade errors.
     * @param {unknown} exception - The exception to send to Sentry
     * @returns {void}
     */
    sendToSentry(exception: unknown): void {
        try {
            this.logger.error(exception);
            Sentry.captureException(exception);
        } catch (error: unknown) {
            this.logger.error('Failed to send exception to Sentry', error);
        }

        return;
    }
}
