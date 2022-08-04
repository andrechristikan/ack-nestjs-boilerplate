import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
} from '@nestjs/common';
import { HttpArgumentsHost } from '@nestjs/common/interfaces';
import { ValidationError } from 'class-validator';
import { Response } from 'express';
import { DebuggerService } from 'src/common/debugger/services/debugger.service';
import { IMessage } from 'src/common/message/message.interface';
import { MessageService } from 'src/common/message/services/message.service';
import { IRequestApp } from 'src/common/request/request.interface';
import { ERROR_TYPE } from '../constants/error.constant';
import {
    IErrorException,
    IErrorHttpFilter,
    IErrorHttpFilterMetadata,
    IErrors,
    IErrorsImport,
    IValidationErrorImport,
} from '../error.interface';

// If we throw error with HttpException, there will always return object
// The exception filter only catch HttpException
@Catch(HttpException)
export class ErrorHttpFilter implements ExceptionFilter {
    constructor(
        private readonly messageService: MessageService,
        private readonly debuggerService: DebuggerService
    ) {}

    async catch(exception: HttpException, host: ArgumentsHost): Promise<void> {
        const ctx: HttpArgumentsHost = host.switchToHttp();
        const statusHttp: number = exception.getStatus();
        const request = ctx.getRequest<IRequestApp>();
        const responseExpress: Response = ctx.getResponse<Response>();

        // get request headers
        const reqCustomLang = request.header('x-custom-lang');

        // get metadata

        const __class = request.__class;
        const __function = request.__function;
        const __path = request.path;
        const __requestId = request.id;
        const __timestamp = request.timestamp;
        const __timezone = request.timezone;

        // message base in language
        const { customLang } = ctx.getRequest<IRequestApp>();

        // Debugger
        this.debuggerService.error(
            request && request.id ? request.id : ErrorHttpFilter.name,
            {
                description: exception.message,
                class: __class,
                function: __function,
                path: __path,
            },
            exception
        );

        // Restructure
        const response = exception.getResponse();

        if (!this.isErrorException(response)) {
            responseExpress.status(statusHttp).json(response);

            return;
        }

        const responseException = response as IErrorException;
        const {
            statusCode,
            message,
            error,
            errorType,
            data,
            properties,
            metadata,
        } = responseException;

        let { errors } = responseException;
        if (errors && errors.length > 0) {
            errors =
                errorType === ERROR_TYPE.IMPORT
                    ? await this.messageService.getImportErrorsMessage(
                          errors as IValidationErrorImport[],
                          customLang
                      )
                    : await this.messageService.getRequestErrorsMessage(
                          errors as ValidationError[],
                          customLang
                      );
        }

        const mapMessage: string | IMessage = await this.messageService.get(
            message,
            { customLanguages: customLang, properties }
        );

        const resMetadata: IErrorHttpFilterMetadata = {
            languages: customLang,
            timestamp: __timestamp,
            timezone: __timezone,
            requestId: __requestId,
            path: __path,
            ...metadata,
        };

        const resResponse: IErrorHttpFilter = {
            statusCode: statusCode || statusHttp,
            message: mapMessage,
            error,
            errors: errors as IErrors[] | IErrorsImport[],
            metadata: resMetadata,
            data,
        };

        responseExpress
            .setHeader('x-custom-lang', reqCustomLang)
            .setHeader('x-timestamp', __timestamp)
            .setHeader('x-timezone', __timezone)
            .setHeader('x-request-id', __requestId)
            .status(statusHttp)
            .json(resResponse);

        return;
    }

    isErrorException(obj: any): obj is IErrorException {
        return 'statusCode' in obj && 'message' in obj;
    }
}
