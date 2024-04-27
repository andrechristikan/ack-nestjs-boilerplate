import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpStatus,
} from '@nestjs/common';
import { HttpArgumentsHost } from '@nestjs/common/interfaces';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { IErrorImportException } from 'src/common/error/interfaces/error.interface';
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
export class ErrorValidationImportFilter implements ExceptionFilter {
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

        // set default
        const responseException =
            exception.getResponse() as IErrorImportException;
        const statusHttp: HttpStatus = exception.getStatus();
        const statusCode = responseException.statusCode;

        // metadata
        const xLanguage: string =
            request.__language ?? this.messageService.getLanguage();
        const xId = request.__id;
        const xTimestamp = this.helperDateService.createTimestamp();
        const xTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const xVersion = request.__version;
        const xRepoVersion = this.configService.get<string>('app.repoVersion');
        const metadata: ResponseMetadataDto = {
            language: xLanguage,
            timestamp: xTimestamp,
            timezone: xTimezone,
            requestId: xId,
            path: request.path,
            version: xVersion,
            repoVersion: xRepoVersion,
        };

        // set response
        const message = this.messageService.setMessage(
            responseException.message,
            {
                customLanguage: xLanguage,
            }
        );
        const errors: IMessageValidationImportError[] =
            this.messageService.setValidationImportMessage(
                responseException.errors as IMessageValidationImportErrorParam[],
                {
                    customLanguage: xLanguage,
                }
            );

        const responseBody: IErrorImportException = {
            statusCode,
            message,
            errors,
            _metadata: metadata,
        };

        response
            .setHeader('x-custom-lang', xLanguage)
            .setHeader('x-timestamp', xTimestamp)
            .setHeader('x-timezone', xTimezone)
            .setHeader('x-request-id', xId)
            .setHeader('x-version', xVersion)
            .setHeader('x-repo-version', xRepoVersion)
            .status(statusHttp)
            .json(responseBody);

        return;
    }
}
