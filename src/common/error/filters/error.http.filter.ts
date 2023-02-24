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
import { ValidationError } from 'class-validator';
import { Response } from 'express';
import { DatabaseDefaultUUID } from 'src/common/database/constants/database.function.constant';
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
    private readonly appDefaultLanguage: string[];

    constructor(
        @Optional() private readonly debuggerService: DebuggerService,
        private readonly configService: ConfigService,
        private readonly messageService: MessageService,
        private readonly helperDateService: HelperDateService
    ) {
        this.appDefaultLanguage =
            this.configService.get<string[]>('app.language');
    }

    async catch(exception: unknown, host: ArgumentsHost): Promise<void> {
        const ctx: HttpArgumentsHost = host.switchToHttp();
        const request = ctx.getRequest<IRequestApp>();

        // get request headers
        const customLang: string[] =
            ctx.getRequest<IRequestApp>().customLang ?? this.appDefaultLanguage;

        // get _metadata
        const __class = request.__class ?? ErrorHttpFilter.name;
        const __function = request.__function ?? this.catch.name;
        const __requestId = request.id ?? DatabaseDefaultUUID();
        const __path = request.path;
        const __timestamp =
            request.timestamp ?? this.helperDateService.timestamp();
        const __timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const __version =
            request.version ??
            this.configService.get<string>('app.versioning.version');
        const __repoVersion =
            request.repoVersion ??
            this.configService.get<string>('app.repoVersion');

        // Debugger
        try {
            this.debuggerService.error(
                request?.id ? request.id : ErrorHttpFilter.name,
                {
                    description:
                        exception instanceof Error
                            ? exception.message
                            : exception.toString(),
                    class: __class ?? ErrorHttpFilter.name,
                    function: __function ?? this.catch.name,
                    path: __path,
                },
                exception
            );
        } catch (err: unknown) {}

        let statusHttp: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
        if (exception instanceof HttpException) {
            statusHttp = exception.getStatus();
            const responseExpress: Response = ctx.getResponse<Response>();

            // Restructure
            const response = exception.getResponse();
            if (this.isErrorException(response)) {
                const responseException = response as IErrorException;
                const {
                    statusCode,
                    message,
                    _errorType,
                    data,
                    properties,
                    _metadata,
                } = responseException;

                let { errors, _error } = responseException;
                if (errors?.length > 0) {
                    errors =
                        _errorType === ERROR_TYPE.IMPORT
                            ? await this.messageService.getImportErrorsMessage(
                                  errors as IValidationErrorImport[],
                                  customLang
                              )
                            : await this.messageService.getRequestErrorsMessage(
                                  errors as ValidationError[],
                                  customLang
                              );
                }

                if (!_error) {
                    _error =
                        'message' in exception ? exception.message : undefined;
                } else if (typeof _error !== 'string') {
                    _error = JSON.stringify(_error);
                }

                const mapMessage: string | IMessage =
                    await this.messageService.get(message, {
                        customLanguages: customLang,
                        properties,
                    });

                const resMetadata: IErrorHttpFilterMetadata = {
                    languages: customLang,
                    timestamp: __timestamp,
                    timezone: __timezone,
                    requestId: __requestId,
                    path: __path,
                    version: __version,
                    repoVersion: __repoVersion,
                    ..._metadata,
                };

                const resResponse: IErrorHttpFilter = {
                    statusCode: statusCode ?? statusHttp,
                    message: mapMessage,
                    _error,
                    errors: errors as IErrors[] | IErrorsImport[],
                    _metadata: resMetadata,
                    data,
                };

                responseExpress
                    .setHeader('x-custom-lang', customLang)
                    .setHeader('x-timestamp', __timestamp)
                    .setHeader('x-timezone', __timezone)
                    .setHeader('x-request-id', __requestId)
                    .setHeader('x-version', __version)
                    .setHeader('x-repo-version', __repoVersion)
                    .status(statusHttp)
                    .json(resResponse);

                return;
            }
        }

        // In certain situations `httpAdapter` might not be available in the
        // constructor method, thus we should resolve it here.
        const message: string = await this.messageService.get(
            `http.${statusHttp}`
        );

        const _metadata: IErrorHttpFilterMetadata = {
            languages: customLang,
            timestamp: __timestamp,
            timezone: __timezone,
            requestId: __requestId,
            path: __path,
            version: __version,
            repoVersion: __repoVersion,
        };

        const responseBody = {
            statusCode: statusHttp,
            message,
            _error:
                exception instanceof Error && 'message' in exception
                    ? exception.message
                    : exception,
            _metadata,
        };

        const responseExpress: Response = ctx.getResponse<Response>();
        responseExpress
            .setHeader('x-custom-lang', customLang)
            .setHeader('x-timestamp', __timestamp)
            .setHeader('x-timezone', __timezone)
            .setHeader('x-request-id', __requestId)
            .setHeader('x-version', __version)
            .setHeader('x-repo-version', __repoVersion)
            .status(HttpStatus.INTERNAL_SERVER_ERROR)
            .json(responseBody);

        return;
    }

    isErrorException(obj: any): obj is IErrorException {
        return typeof obj === 'object'
            ? 'statusCode' in obj && 'message' in obj
            : false;
    }
}
