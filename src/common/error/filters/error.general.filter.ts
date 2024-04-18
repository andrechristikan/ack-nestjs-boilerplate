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
import { HttpAdapterHost } from '@nestjs/core';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import { Response } from 'express';
import { IErrorException } from 'src/common/error/interfaces/error.interface';
import { MessageService } from 'src/common/message/services/message.service';
import { RequestValidationException } from 'src/common/request/exceptions/request.validation.exception';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';
import { ResponseMetadataDto } from 'src/common/response/dtos/response.dto';

@Catch()
export class ErrorGeneralFilter implements ExceptionFilter {
    constructor(
        @Optional()
        @InjectSentry()
        private readonly sentryService: SentryService,
        private readonly httpAdapterHost: HttpAdapterHost,
        private readonly messageService: MessageService
    ) {}

    async catch(exception: unknown, host: ArgumentsHost): Promise<void> {
        const { httpAdapter } = this.httpAdapterHost;

        const ctx: HttpArgumentsHost = host.switchToHttp();
        const response: Response = ctx.getResponse<Response>();
        const request: IRequestApp = ctx.getRequest<IRequestApp>();

        // sentry
        this.sendToSentry(exception);

        if (exception instanceof HttpException) {
            const response = exception.getResponse();
            const statusHttp = exception.getStatus();

            httpAdapter.reply(ctx.getResponse(), response, statusHttp);
            return;
        }

        // get request headers
        const __language: string =
            request.__language ?? this.messageService.getLanguage();

        // set default
        const statusHttp: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
        const messagePath = `http.${statusHttp}`;
        const statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
        const metadata: ResponseMetadataDto = {
            language: __language,
            timestamp: request.__timestamp,
            timezone: request.__timezone,
            requestId: request.__id,
            path: request.path,
            version: request.__version,
            repoVersion: request.__repoVersion,
        };

        const message: string = this.messageService.setMessage(messagePath, {
            customLanguage: __language,
        });

        const responseBody: IErrorException = {
            statusCode,
            message,
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

    sendToSentry(exception: unknown): void {
        if (
            (exception instanceof HttpException &&
                !(exception instanceof InternalServerErrorException)) ||
            exception instanceof RequestValidationException
        ) {
            return;
        }

        try {
            this.sentryService.instance().captureException(exception);
        } catch (err: unknown) {}

        return;
    }
}
