import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpStatus,
} from '@nestjs/common';
import { HttpArgumentsHost } from '@nestjs/common/interfaces';
import { Response } from 'express';
import { IErrorImportException } from 'src/common/error/interfaces/error.interface';
import { FileImportException } from 'src/common/file/exceptions/file.import.exception';
import {
    IMessageValidationImportError,
    IMessageValidationImportErrorParam,
} from 'src/common/message/interfaces/message.interface';
import { MessageService } from 'src/common/message/services/message.service';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';
import { ResponseMetadataDto } from 'src/common/response/dtos/response.dto';

@Catch(FileImportException)
export class ErrorValidationImportFilter implements ExceptionFilter {
    constructor(private readonly messageService: MessageService) {}

    async catch(
        exception: FileImportException,
        host: ArgumentsHost
    ): Promise<void> {
        const ctx: HttpArgumentsHost = host.switchToHttp();
        const response: Response = ctx.getResponse<Response>();
        const request: IRequestApp = ctx.getRequest<IRequestApp>();

        // get request headers
        const __language: string =
            request.__language ?? this.messageService.getLanguage();

        // set default
        const responseException =
            exception.getResponse() as IErrorImportException;
        const statusHttp: HttpStatus = exception.getStatus();
        const statusCode = responseException.statusCode;
        const metadata: ResponseMetadataDto = {
            language: __language,
            timestamp: request.__timestamp,
            timezone: request.__timezone,
            requestId: request.__id,
            path: request.path,
            version: request.__version,
            repoVersion: request.__repoVersion,
        };

        // set response

        const message = this.messageService.setMessage(
            responseException.message,
            {
                customLanguage: __language,
            }
        );
        const errors: IMessageValidationImportError[] =
            this.messageService.setValidationImportMessage(
                responseException.errors as IMessageValidationImportErrorParam[],
                {
                    customLanguage: __language,
                }
            );

        const responseBody: IErrorImportException = {
            statusCode,
            message,
            errors,
            _metadata: metadata,
        };

        response
            .setHeader('x-custom-lang', __language)
            .setHeader('x-timestamp', request.__timestamp)
            .setHeader('x-timezone', request.__timezone)
            .setHeader('x-request-id', request.__id)
            .setHeader('x-version', request.__version)
            .setHeader('x-repo-version', request.__repoVersion)
            .status(statusHttp)
            .json(responseBody);

        return;
    }
}
