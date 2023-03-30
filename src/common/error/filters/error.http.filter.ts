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
    IErrorMetadataFinal,
    IErrors,
    IErrorsImport,
    IValidationErrorImport,
} from 'src/common/error/interfaces/error.interface';
import { HelperDateService } from 'src/common/helper/services/helper.date.service';
import { MessageService } from 'src/common/message/services/message.service';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';
import { ResponseMetadataSerialization } from 'src/common/response/serializations/response.default.serialization';

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
        const __customLang: string[] =
            request.__customLang ?? this.appDefaultLanguage;
        const __class = request.__class ?? ErrorHttpFilter.name;
        const __function = request.__function ?? this.catch.name;
        const __requestId = request.__id ?? DatabaseDefaultUUID();
        const __path = request.path;
        const __timestamp =
            request.__xTimestamp ??
            request.__timestamp ??
            this.helperDateService.timestamp();
        const __timezone =
            request.__timezone ??
            Intl.DateTimeFormat().resolvedOptions().timeZone;
        const __version =
            request.__version ??
            this.configService.get<string>('app.versioning.version');
        const __repoVersion =
            request.__repoVersion ??
            this.configService.get<string>('app.repoVersion');

        // Debugger
        try {
            this.debuggerService.error(
                request?.__id ? request.__id : ErrorHttpFilter.name,
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

        // set default
        let statusHttp: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
        let message: string = await this.messageService.get(
            `http.${statusHttp}`,
            {
                customLanguages: __customLang,
            }
        );
        const _metadata: ResponseMetadataSerialization = {
            languages: __customLang,
            timestamp: __timestamp,
            timezone: __timezone,
            requestId: __requestId,
            path: __path,
            version: __version,
            repoVersion: __repoVersion,
        };
        if (exception instanceof HttpException) {
            const responseExpress: Response = ctx.getResponse<Response>();

            // Restructure
            const response = ctx.getResponse<Response>();

            if (this.isErrorException(response)) {
                const responseException = response as IErrorException;
                const {
                    statusCode,
                    message: messagePath,
                    _errorType,
                    _metadata,
                    data,
                } = responseException;
                statusHttp = exception.getStatus();

                let { errors, _error } = responseException;
                if (errors?.length > 0) {
                    errors =
                        _errorType === ERROR_TYPE.IMPORT
                            ? await this.messageService.getImportErrorsMessage(
                                  errors as IValidationErrorImport[],
                                  __customLang
                              )
                            : await this.messageService.getRequestErrorsMessage(
                                  errors as ValidationError[],
                                  __customLang
                              );
                }

                if (!_error && typeof _error !== 'string') {
                    _error = JSON.stringify(_error);
                }

                message = await this.messageService.get(messagePath, {
                    customLanguages: __customLang,
                });
                if (_metadata?.customProperty?.messageProperties) {
                    message = await this.messageService.get(message, {
                        customLanguages: __customLang,
                        properties:
                            _metadata?.customProperty?.messageProperties,
                    });
                }

                delete _metadata?.customProperty;

                const metadata: IErrorMetadataFinal = {
                    languages: __customLang,
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
                    message,
                    errors: errors as IErrors[] | IErrorsImport[],
                    _error,
                    _metadata: metadata,
                    data,
                };

                responseExpress
                    .setHeader('x-custom-lang', __customLang)
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
        responseExpress.status(statusHttp).json(responseBody);

        return;
    }

    isErrorException(obj: any): obj is IErrorException {
        return typeof obj === 'object'
            ? 'statusCode' in obj && 'message' in obj
            : false;
    }
}
