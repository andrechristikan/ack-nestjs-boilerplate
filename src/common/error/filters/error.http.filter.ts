import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
    Optional,
} from '@nestjs/common';
import { HttpArgumentsHost } from '@nestjs/common/interfaces';
import { ConfigService } from '@nestjs/config';
import { HttpAdapterHost } from '@nestjs/core';
import { ValidationError } from 'class-validator';
import { Response } from 'express';
import { DebuggerService } from 'src/common/debugger/services/debugger.service';
import { ERROR_TYPE } from 'src/common/error/constants/error.enum.constant';
import {
    IErrorException,
    IErrorHttpFilter,
    IErrorHttpFilterMetadata,
    IErrors,
    IErrorsImport,
    IValidationErrorImport,
} from 'src/common/error/interfaces/error.interface';
import { HelperDateService } from 'src/common/helper/services/helper.date.service';
import { IMessage } from 'src/common/message/interfaces/message.interface';
import { MessageService } from 'src/common/message/services/message.service';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';

// If we throw error with HttpException, there will always return object
// The exception filter only catch HttpException
@Catch()
export class ErrorHttpFilter implements ExceptionFilter {
    constructor(
        @Optional() private readonly debuggerService: DebuggerService,
        private readonly configService: ConfigService,
        private readonly messageService: MessageService,
        private readonly httpAdapterHost: HttpAdapterHost,
        private readonly helperDateService: HelperDateService
    ) {}

    async catch(exception: unknown, host: ArgumentsHost): Promise<void> {
        const ctx: HttpArgumentsHost = host.switchToHttp();

        if (exception instanceof HttpException) {
            const statusHttp: number = exception.getStatus();
            const request = ctx.getRequest<IRequestApp>();
            const responseExpress: Response = ctx.getResponse<Response>();

            // get request headers
            const reqCustomLang =
                request.header('x-custom-lang') ||
                this.configService.get<string>('app.language');

            // get metadata
            const __class = request.__class;
            const __function = request.__function;
            const __path = request.path;
            const __requestId = request.id;
            const __timestamp =
                request.timestamp || this.helperDateService.timestamp();
            const __timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            const __version =
                request.version ||
                this.configService.get<string>('app.versioning.version');
            const __repoVersion =
                request.repoVersion ||
                this.configService.get<string>('app.repoVersion');

            // message base in language
            const { customLang } = ctx.getRequest<IRequestApp>();

            // Debugger
            try {
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
            } catch (err: any) {}

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
                version: __version,
                repoVersion: __repoVersion,
                ...metadata,
            };

            const resResponse: IErrorHttpFilter = {
                statusCode: statusCode || statusHttp,
                message: mapMessage,
                error:
                    error && Object.keys(error).length > 0
                        ? error
                        : exception.message,
                errors: errors as IErrors[] | IErrorsImport[],
                metadata: resMetadata,
                data,
            };

            responseExpress
                .setHeader('x-custom-lang', reqCustomLang)
                .setHeader('x-timestamp', __timestamp)
                .setHeader('x-timezone', __timezone)
                .setHeader('x-request-id', __requestId)
                .setHeader('x-version', __version)
                .setHeader('x-repo-version', __repoVersion)
                .status(statusHttp)
                .json(resResponse);
        } else {
            // In certain situations `httpAdapter` might not be available in the
            // constructor method, thus we should resolve it here.
            const { httpAdapter } = this.httpAdapterHost;
            const __path = httpAdapter.getRequestUrl(ctx.getRequest());
            const message: string = (await this.messageService.get(
                'http.serverError.internalServerError'
            )) as string;

            // Debugger
            try {
                this.debuggerService.error(
                    ErrorHttpFilter.name,
                    {
                        description: message,
                        class: ErrorHttpFilter.name,
                        function: 'catch',
                        path: __path,
                    },
                    exception
                );
            } catch (err: any) {}

            const responseBody = {
                statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
                message,
            };

            httpAdapter.reply(
                ctx.getResponse(),
                responseBody,
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }

        return;
    }

    isErrorException(obj: any): obj is IErrorException {
        return 'statusCode' in obj && 'message' in obj;
    }
}
