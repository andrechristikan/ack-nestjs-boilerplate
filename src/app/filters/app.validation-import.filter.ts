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
import { ENUM_MESSAGE_LANGUAGE } from '@common/message/enums/message.enum';

/**
 * AppValidationImportFilter is an exception filter that handles excel file import validation errors
 * and formats the response according to the application's standards.
 * It sets the appropriate headers and response body based on the exception details.
 */
@Catch(FileImportException)
export class AppValidationImportFilter implements ExceptionFilter {
    constructor(
        private readonly messageService: MessageService,
        private readonly configService: ConfigService,
        private readonly helperService: HelperService
    ) {}

    async catch(
        exception: FileImportException,
        host: ArgumentsHost
    ): Promise<void> {
        const ctx: HttpArgumentsHost = host.switchToHttp();
        const response: Response = ctx.getResponse<Response>();
        const request: IRequestApp = ctx.getRequest<IRequestApp>();

        // metadata
        const today = this.helperService.dateCreate();
        const xLanguage: string =
            request.__language ??
            this.configService.get<ENUM_MESSAGE_LANGUAGE>('message.language');
        const xTimestamp = this.helperService.dateGetTimestamp(today);
        const xTimezone = this.helperService.dateGetZone(today);
        const xVersion =
            request.__version ??
            this.configService.get<string>('app.urlVersion.version');
        const xRepoVersion = this.configService.get<string>('app.version');
        const metadata: ResponseMetadataDto = {
            language: xLanguage,
            timestamp: xTimestamp,
            timezone: xTimezone,
            path: request.path,
            version: xVersion,
            repoVersion: xRepoVersion,
        };

        // set response
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
            .status(exception.httpStatus)
            .json(responseBody);

        return;
    }
}
