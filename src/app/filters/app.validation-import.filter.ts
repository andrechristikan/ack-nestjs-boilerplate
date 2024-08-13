import { ExceptionFilter, Catch, ArgumentsHost, Logger } from '@nestjs/common';
import { HttpArgumentsHost } from '@nestjs/common/interfaces';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { IAppImportException } from 'src/app/interfaces/app.interface';
import { FileImportException } from 'src/common/file/exceptions/file.import.exception';
import { HelperDateService } from 'src/common/helper/services/helper.date.service';
import {
    IMessageValidationImportError,
    IMessageValidationImportErrorParam,
} from 'src/common/message/interfaces/message.interface';
import { MessageService } from 'src/common/message/services/message.service';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';
import { ResponseMetadataDto } from 'src/common/response/dtos/response.dto';

@Catch(FileImportException)
export class AppValidationImportFilter implements ExceptionFilter {
    private readonly debug: boolean;
    private readonly logger = new Logger(AppValidationImportFilter.name);

    constructor(
        private readonly messageService: MessageService,
        private readonly configService: ConfigService,
        private readonly helperDateService: HelperDateService
    ) {
        this.debug = this.configService.get<boolean>('app.debug');
    }

    async catch(
        exception: FileImportException,
        host: ArgumentsHost
    ): Promise<void> {
        const ctx: HttpArgumentsHost = host.switchToHttp();
        const response: Response = ctx.getResponse<Response>();
        const request: IRequestApp = ctx.getRequest<IRequestApp>();

        if (this.debug) {
            this.logger.error(exception);
        }

        // metadata
        const xLanguage: string =
            request.__language ?? this.messageService.getLanguage();
        const xTimestamp = this.helperDateService.createTimestamp();
        const xTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const xVersion =
            request.__version ??
            this.configService.get<string>('app.urlVersion.version');
        const xRepoVersion = this.configService.get<string>('app.repoVersion');
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
