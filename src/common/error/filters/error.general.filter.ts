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
import { HttpAdapterHost } from '@nestjs/core';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import { Response } from 'express';
import { IErrorException } from 'src/common/error/interfaces/error.interface';
import { HelperDateService } from 'src/common/helper/services/helper.date.service';
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
        private readonly messageService: MessageService,
        private readonly configService: ConfigService,
        private readonly helperDateService: HelperDateService
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

        // set default
        const statusHttp: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
        const messagePath = `http.${statusHttp}`;
        const statusCode = HttpStatus.INTERNAL_SERVER_ERROR;

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

        const message: string = this.messageService.setMessage(messagePath, {
            customLanguage: xLanguage,
        });

        const responseBody: IErrorException = {
            statusCode,
            message,
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
