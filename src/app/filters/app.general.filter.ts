import {
    ArgumentsHost,
    Catch,
    ExceptionFilter,
    HttpException,
    HttpStatus,
    InternalServerErrorException,
    Logger,
} from '@nestjs/common';
import { HttpArgumentsHost } from '@nestjs/common/interfaces';
import { ConfigService } from '@nestjs/config';
import { HttpAdapterHost } from '@nestjs/core';
import { Response } from 'express';
import { FileImportException } from '@common/file/exceptions/file.import.exception';
import { HelperService } from '@common/helper/services/helper.service';
import { MessageService } from '@common/message/services/message.service';
import { RequestValidationException } from '@common/request/exceptions/request.validation.exception';
import { IRequestApp } from '@common/request/interfaces/request.interface';
import { ResponseMetadataDto } from '@common/response/dtos/response.dto';
import * as Sentry from '@sentry/nestjs';
import { ResponseErrorDto } from '@common/response/dtos/response.error.dto';
import { ENUM_MESSAGE_LANGUAGE } from '@common/message/enums/message.enum';

/**
 * Global exception filter for handling errors in the application.
 * It catches exceptions thrown during request processing and formats the response.
 * If the exception is an instance of HttpException, it will pass the response to the HTTP filter.
 * It also sets appropriate HTTP status codes and response headers.
 * The response includes metadata such as language, timestamp, timezone, path, version, and repository version.
 *
 * The filter sends error details to Sentry for tracking if the exception is internal server error or a validation error or unhandled error.
 */
@Catch()
export class AppGeneralFilter implements ExceptionFilter {
    private readonly logger = new Logger(AppGeneralFilter.name);

    constructor(
        private readonly httpAdapterHost: HttpAdapterHost,
        private readonly messageService: MessageService,
        private readonly configService: ConfigService,
        private readonly helperService: HelperService
    ) {}

    async catch(exception: unknown, host: ArgumentsHost): Promise<void> {
        const { httpAdapter } = this.httpAdapterHost;

        const ctx: HttpArgumentsHost = host.switchToHttp();
        const response: Response = ctx.getResponse<Response>();
        const request: IRequestApp = ctx.getRequest<IRequestApp>();

        this.logger.error(exception);

        // sentry
        this.sendToSentry(exception);

        if (exception instanceof HttpException) {
            const response = exception.getResponse();
            const statusHttp = exception.getStatus();

            httpAdapter.reply(ctx.getResponse(), response, statusHttp);
            return;
        }

        // set default
        const statusHttp: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
        const messagePath = `http.${statusHttp}`;
        const statusCode = HttpStatus.INTERNAL_SERVER_ERROR;

        // metadata
        const today = this.helperService.dateCreate();
        const xLanguage: string =
            request.__language ??
            this.configService.get<ENUM_MESSAGE_LANGUAGE>('message.language');
        const xTimestamp = this.helperService.dateGetTimestamp(today);
        const xTimezone = this.helperService.dateGetZone(today);
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

        const message: string = this.messageService.setMessage(messagePath, {
            customLanguage: xLanguage,
        });

        const responseBody: ResponseErrorDto = {
            statusCode,
            message,
            metadata,
        };

        response
            .setHeader('x-custom-lang', xLanguage)
            .setHeader('x-timestamp', xTimestamp)
            .setHeader('x-timezone', xTimezone)
            .setHeader('x-version', xVersion)
            .setHeader('x-repo-version', xRepoVersion)
            .status(statusHttp)
            .json(responseBody);

        return;
    }

    sendToSentry(exception: unknown): void {
        if (
            (exception instanceof HttpException &&
                !(exception instanceof InternalServerErrorException)) ||
            exception instanceof RequestValidationException ||
            exception instanceof FileImportException
        ) {
            return;
        }

        try {
            Sentry.captureException(exception);
        } catch (_) {}

        return;
    }
}
