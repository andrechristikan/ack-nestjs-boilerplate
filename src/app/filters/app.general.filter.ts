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
import { EnumMessageLanguage } from '@common/message/enums/message.enum';

/**
 * Catches all unhandled exceptions, returns the standard error envelope, and reports to Sentry.
 */
@Catch()
export class AppGeneralFilter implements ExceptionFilter {
    private readonly logger = new Logger(AppGeneralFilter.name);

    private readonly defaultLanguage: EnumMessageLanguage;
    private readonly urlVersion: string;
    private readonly repoVersion: string;

    constructor(
        private readonly messageService: MessageService,
        private readonly configService: ConfigService,
        private readonly helperService: HelperService
    ) {
        this.defaultLanguage =
            this.configService.get<EnumMessageLanguage>('message.language')!;
        this.urlVersion = this.configService.get<string>(
            'app.urlVersion.version'
        )!;
        this.repoVersion = this.configService.get<string>('app.version')!;
    }

    async catch(exception: unknown, host: ArgumentsHost): Promise<void> {
        const ctx: HttpArgumentsHost = host.switchToHttp();
        const response: Response = ctx.getResponse<Response>();
        const request: IRequestApp = ctx.getRequest<IRequestApp>();

        this.sendToSentry(exception);

        const statusHttp: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
        const messagePath = `http.${statusHttp}`;
        const statusCode = HttpStatus.INTERNAL_SERVER_ERROR;

        const today = this.helperService.dateCreate();
        const xLanguage: EnumMessageLanguage =
            (request.language as EnumMessageLanguage) ?? this.defaultLanguage;
        const xTimestamp = this.helperService.dateGetTimestamp(today);
        const xTimezone = this.helperService.dateGetZone(today);
        const xVersion = request.version ?? this.urlVersion;
        const xRepoVersion = this.repoVersion;
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
