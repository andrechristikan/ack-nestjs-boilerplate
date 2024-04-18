import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
} from '@nestjs/common';
import { HttpArgumentsHost } from '@nestjs/common/interfaces';
import { Response } from 'express';
import { IErrorException } from 'src/common/error/interfaces/error.interface';
import {
    IMessageOptionsProperties,
    IMessageValidationError,
} from 'src/common/message/interfaces/message.interface';
import { MessageService } from 'src/common/message/services/message.service';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';
import { ResponseMetadataDto } from 'src/common/response/dtos/response.dto';

@Catch(HttpException)
export class ErrorHttpFilter implements ExceptionFilter {
    constructor(private readonly messageService: MessageService) {}

    async catch(exception: HttpException, host: ArgumentsHost): Promise<void> {
        const ctx: HttpArgumentsHost = host.switchToHttp();
        const response: Response = ctx.getResponse<Response>();
        const request: IRequestApp = ctx.getRequest<IRequestApp>();

        // get request headers
        const __language: string =
            request.__language ?? this.messageService.getLanguage();

        // set default
        let statusHttp: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
        let messagePath = `http.${statusHttp}`;
        let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
        const errors: IMessageValidationError[] = undefined;
        let messageProperties: IMessageOptionsProperties = undefined;
        let data: Record<string, any> = undefined;
        let metadata: ResponseMetadataDto = {
            language: __language,
            timestamp: request.__timestamp,
            timezone: request.__timezone,
            requestId: request.__id,
            path: request.path,
            version: request.__version,
            repoVersion: request.__repoVersion,
        };

        // Restructure
        const responseException = exception.getResponse();
        statusHttp = exception.getStatus();
        messagePath = `http.${statusHttp}`;
        statusCode = exception.getStatus();

        if (this.isErrorException(responseException)) {
            const { _metadata } = responseException;

            statusCode = responseException.statusCode;
            messagePath = responseException.message;
            data = responseException.data;
            messageProperties = _metadata?.customProperty?.messageProperties;
            delete _metadata?.customProperty;

            metadata = {
                ...metadata,
                ..._metadata,
            };
        }

        const message: string = this.messageService.setMessage(messagePath, {
            customLanguage: __language,
            properties: messageProperties,
        });

        const responseBody: IErrorException = {
            statusCode,
            message,
            errors,
            _metadata: metadata,
            data,
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

    isErrorException(obj: any): obj is IErrorException {
        return typeof obj === 'object'
            ? 'statusCode' in obj && 'message' in obj
            : false;
    }
}
