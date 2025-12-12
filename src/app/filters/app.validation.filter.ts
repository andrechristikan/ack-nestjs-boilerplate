import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { HttpArgumentsHost } from '@nestjs/common/interfaces';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { HelperService } from '@common/helper/services/helper.service';
import { IMessageValidationError } from '@common/message/interfaces/message.interface';
import { MessageService } from '@common/message/services/message.service';
import { RequestValidationException } from '@common/request/exceptions/request.validation.exception';
import { IRequestApp } from '@common/request/interfaces/request.interface';
import { ResponseMetadataDto } from '@common/response/dtos/response.dto';
import { ResponseErrorDto } from '@common/response/dtos/response.error.dto';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';

/**
 * Exception filter specifically for handling request validation errors.
 * Formats RequestValidationException into standardized error responses with detailed validation messages.
 */
@Catch(RequestValidationException)
export class AppValidationFilter implements ExceptionFilter {
    constructor(
        private readonly messageService: MessageService,
        private readonly configService: ConfigService,
        private readonly helperService: HelperService
    ) {}

    /**
     * Handles RequestValidationException and formats validation errors into standardized responses.
     * Processes field-specific validation messages with metadata and localization support.
     * @param {RequestValidationException} exception - The request validation exception to handle
     * @param {ArgumentsHost} host - Arguments host containing request/response context
     * @returns {Promise<void>}
     */
    async catch(
        exception: RequestValidationException,
        host: ArgumentsHost
    ): Promise<void> {
        const ctx: HttpArgumentsHost = host.switchToHttp();
        const response: Response = ctx.getResponse<Response>();
        const request: IRequestApp = ctx.getRequest<IRequestApp>();

        const today = this.helperService.dateCreate();
        const xLanguage: EnumMessageLanguage =
            (request.__language as EnumMessageLanguage) ??
            this.configService.get<EnumMessageLanguage>('message.language');
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

        const message = this.messageService.setMessage(exception.message, {
            customLanguage: xLanguage,
        });
        const errors: IMessageValidationError[] =
            this.messageService.setValidationMessage(exception.errors, {
                customLanguage: xLanguage,
            });

        const responseBody: ResponseErrorDto = {
            statusCode: exception.statusCode,
            message,
            errors,
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
            .status(exception.httpStatus)
            .json(responseBody);

        return;
    }
}
