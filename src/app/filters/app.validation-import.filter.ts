import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { HttpArgumentsHost } from '@nestjs/common/interfaces';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { FileImportException } from '@common/file/exceptions/file.import.exception';
import { HelperService } from '@common/helper/services/helper.service';
import { IMessageValidationImportError } from '@common/message/interfaces/message.interface';
import { MessageService } from '@common/message/services/message.service';
import { IRequestApp } from '@common/request/interfaces/request.interface';
import { ResponseMetadataDto } from '@common/response/dtos/response.dto';
import { ResponseErrorDto } from '@common/response/dtos/response.error.dto';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';

/**
 * Formats `FileImportException` into the standard error envelope with localized per-row errors.
 */
@Catch(FileImportException)
export class AppValidationImportFilter implements ExceptionFilter {
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

    async catch(
        exception: FileImportException,
        host: ArgumentsHost
    ): Promise<void> {
        const ctx: HttpArgumentsHost = host.switchToHttp();
        const response: Response = ctx.getResponse<Response>();
        const request: IRequestApp = ctx.getRequest<IRequestApp>();

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

        const message = this.messageService.setMessage(exception.message, {
            customLanguage: xLanguage,
        });
        const errors: IMessageValidationImportError[] =
            this.messageService.setValidationImportMessage(exception.errors, {
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
