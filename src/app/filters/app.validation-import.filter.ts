import { ExceptionFilter, Catch, ArgumentsHost, Logger } from '@nestjs/common';
import { HttpArgumentsHost } from '@nestjs/common/interfaces';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { IAppImportException } from 'src/app/interfaces/app.interface';
import { FileImportException } from 'src/common/file/exceptions/file.import.exception';
import { HelperDateService } from 'src/common/helper/services/helper.date.service';
import { ENUM_MESSAGE_LANGUAGE } from 'src/common/message/enums/message.enum';
import {
    IMessageValidationImportError,
    IMessageValidationImportErrorParam,
} from 'src/common/message/interfaces/message.interface';
import { MessageService } from 'src/common/message/services/message.service';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';
import { ResponseMetadataDto } from 'src/common/response/dtos/response.dto';

@Catch(FileImportException)
export class AppValidationImportFilter implements ExceptionFilter {
    private readonly logger = new Logger(AppValidationImportFilter.name);

    constructor(
        private readonly messageService: MessageService,
        private readonly configService: ConfigService,
        private readonly helperDateService: HelperDateService
    ) {}

    async catch(
        exception: FileImportException,
        host: ArgumentsHost
    ): Promise<void> {
        const ctx: HttpArgumentsHost = host.switchToHttp();
        const response: Response = ctx.getResponse<Response>();
        const request: IRequestApp = ctx.getRequest<IRequestApp>();

        // metadata
        const today = this.helperDateService.create();
        const xLanguage: string =
            request.__language ??
            this.configService.get<ENUM_MESSAGE_LANGUAGE>('message.language');
        const xTimestamp = this.helperDateService.getTimestamp(today);
        const xTimezone = this.helperDateService.getZone(today);
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
            this.messageService.setValidationImportMessage(
                exception.errors as IMessageValidationImportErrorParam[],
                {
                    customLanguage: xLanguage,
                }
            );

        const responseBody: IAppImportException = {
            statusCode: exception.statusCode,
            message,
            errors,
            _metadata: metadata,
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
