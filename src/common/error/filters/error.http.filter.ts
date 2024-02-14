import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
    Optional,
    InternalServerErrorException,
} from '@nestjs/common';
import { HttpArgumentsHost } from '@nestjs/common/interfaces';
import { ConfigService } from '@nestjs/config';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import { ValidationError } from 'class-validator';
import { Response } from 'express';
import { DatabaseDefaultUUID } from 'src/common/database/constants/database.function.constant';
import { ERROR_TYPE } from 'src/common/error/constants/error.enum.constant';
import {
    IErrorException,
    IErrorValidationImport,
    IErrors,
    IErrorsImport,
} from 'src/common/error/interfaces/error.interface';
import { ErrorMetadataSerialization } from 'src/common/error/serializations/error.serialization';
import { HelperDateService } from 'src/common/helper/services/helper.date.service';
import {
    IMessage,
    IMessageOptionsProperties,
} from 'src/common/message/interfaces/message.interface';
import { MessageService } from 'src/common/message/services/message.service';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';

// If we throw error with HttpException, there will always return object
// The exception filter only catch HttpException
@Catch()
export class ErrorHttpFilter implements ExceptionFilter {
    constructor(
        @Optional()
        @InjectSentry()
        private readonly sentryService: SentryService,
        private readonly configService: ConfigService,
        private readonly messageService: MessageService,
        private readonly helperDateService: HelperDateService
    ) {}

    async catch(exception: unknown, host: ArgumentsHost): Promise<void> {
        const ctx: HttpArgumentsHost = host.switchToHttp();
        const response: Response = ctx.getResponse<Response>();
        const request: IRequestApp = ctx.getRequest<IRequestApp>();

        this.sendToSentry(exception);

        // get request headers
        const __customLang: string[] = request.__customLang ?? [
            this.messageService.getLanguage(),
        ];
        const __requestId = request.__id ?? DatabaseDefaultUUID();
        const __path = request.path;
        const __timestamp =
            request.__xTimestamp ??
            request.__timestamp ??
            this.helperDateService.createTimestamp();
        const __timezone =
            request.__timezone ??
            Intl.DateTimeFormat().resolvedOptions().timeZone;
        const __version =
            request.__version ??
            this.configService.get<string>('app.versioning.version');
        const __repoVersion =
            request.__repoVersion ??
            this.configService.get<string>('app.repoVersion');

        // set default
        let statusHttp: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
        let messagePath = `http.${statusHttp}`;
        let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
        let _error: string = undefined;
        let errors: IErrors[] | IErrorsImport[] = undefined;
        let messageProperties: IMessageOptionsProperties = undefined;
        let data: Record<string, any> = undefined;
        let metadata: ErrorMetadataSerialization = {
            languages: __customLang,
            timestamp: __timestamp,
            timezone: __timezone,
            requestId: __requestId,
            path: __path,
            version: __version,
            repoVersion: __repoVersion,
        };
        if (exception instanceof HttpException) {
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
                messageProperties =
                    _metadata?.customProperty?.messageProperties;
                delete _metadata?.customProperty;

                metadata = {
                    ...metadata,
                    ..._metadata,
                };

                if (responseException.errors?.length > 0) {
                    errors =
                        responseException._errorType === ERROR_TYPE.IMPORT
                            ? this.messageService.getImportErrorsMessage(
                                  responseException.errors as IErrorValidationImport[],
                                  { customLanguages: __customLang }
                              )
                            : this.messageService.getRequestErrorsMessage(
                                  responseException.errors as ValidationError[],
                                  { customLanguages: __customLang }
                              );
                }

                if (!responseException._error) {
                    _error =
                        typeof responseException._error !== 'string'
                            ? JSON.stringify(responseException._error)
                            : responseException._error;
                }
            }
        }

        const message: string | IMessage = await this.messageService.get(
            messagePath,
            {
                customLanguages: __customLang,
                properties: messageProperties,
            }
        );

        const responseBody = {
            statusCode,
            message,
            errors,
            _error,
            _metadata: metadata,
            data,
        };

        response
            .setHeader('x-custom-lang', __customLang)
            .setHeader('x-timestamp', __timestamp)
            .setHeader('x-timezone', __timezone)
            .setHeader('x-request-id', __requestId)
            .setHeader('x-version', __version)
            .setHeader('x-repo-version', __repoVersion)
            .status(statusHttp)
            .json(responseBody);

        return;
    }

    isErrorException(obj: any): obj is IErrorException {
        return typeof obj === 'object'
            ? 'statusCode' in obj && 'message' in obj
            : false;
    }

    sendToSentry(exception: unknown): void {
        if (
            exception instanceof HttpException &&
            !(exception instanceof InternalServerErrorException)
        ) {
            return;
        }

        try {
            this.sentryService.instance().captureException(exception);
        } catch (err: unknown) {}

        return;
    }
}
