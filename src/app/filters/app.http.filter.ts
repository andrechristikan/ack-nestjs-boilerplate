import {
    ArgumentsHost,
    Catch,
    ExceptionFilter,
    HttpException,
    HttpStatus,
} from '@nestjs/common';
import { HttpArgumentsHost } from '@nestjs/common/interfaces';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { IAppException } from '@app/interfaces/app.interface';
import { HelperService } from '@common/helper/services/helper.service';
import { MessageService } from '@common/message/services/message.service';
import { IRequestApp } from '@common/request/interfaces/request.interface';
import { ResponseMetadataDto } from '@common/response/dtos/response.dto';
import { ResponseErrorDto } from '@common/response/dtos/response.error.dto';
import { ENUM_APP_LANGUAGE } from '@app/enums/app.enum';
import { IMessageProperties } from '@common/message/interfaces/message.interface';

/**
 * AppHttpFilter is an exception filter that handles HTTP exceptions
 * and formats the response according to the application's standards.
 * It sets the appropriate headers and response body based on the exception details.
 */
@Catch(HttpException)
export class AppHttpFilter implements ExceptionFilter {
    private readonly globalPrefix: string;
    private readonly docPrefix: string;

    constructor(
        private readonly messageService: MessageService,
        private readonly configService: ConfigService,
        private readonly helperService: HelperService
    ) {
        this.globalPrefix = this.configService.get<string>('app.globalPrefix');
        this.docPrefix = this.configService.get<string>('doc.prefix');
    }

    async catch(exception: HttpException, host: ArgumentsHost): Promise<void> {
        const ctx: HttpArgumentsHost = host.switchToHttp();
        const response: Response = ctx.getResponse<Response>();
        const request: IRequestApp = ctx.getRequest<IRequestApp>();

        if (
            !request.path.startsWith(this.globalPrefix) &&
            !request.path.startsWith(this.docPrefix)
        ) {
            response.redirect(
                HttpStatus.PERMANENT_REDIRECT,
                `${this.globalPrefix}/public/hello`
            );

            return;
        }

        // set default
        let statusHttp: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
        let messagePath = `http.${statusHttp}`;
        let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
        let messageProperties: IMessageProperties;
        let data: unknown;

        // metadata
        const today = this.helperService.dateCreate();
        const xLanguage: string =
            request.__language ??
            this.configService.get<ENUM_APP_LANGUAGE>('message.language');
        const xTimestamp = this.helperService.dateGetTimestamp(today);
        const xTimezone = this.helperService.dateGetZone(today);
        const xVersion =
            request.__version ??
            this.configService.get<string>('app.urlVersion.version');
        const xRepoVersion = this.configService.get<string>('app.version');
        let metadata: ResponseMetadataDto = {
            language: xLanguage,
            timestamp: xTimestamp,
            timezone: xTimezone,
            path: request.path,
            version: xVersion,
            repoVersion: xRepoVersion,
        };

        // Restructure
        const responseException = exception.getResponse();
        statusHttp = exception.getStatus();
        statusCode = exception.getStatus();
        messagePath = `http.${statusHttp}`;

        if (this.isErrorException(responseException)) {
            statusCode = responseException.statusCode;
            messagePath = responseException.message;
            messageProperties = responseException.messageProperties;
            data = responseException.data;

            metadata = {
                ...responseException.metadata,
                ...metadata,
            };
        }

        const message: string = this.messageService.setMessage(messagePath, {
            customLanguage: xLanguage,
            properties: messageProperties,
        });

        const responseBody: ResponseErrorDto = {
            statusCode,
            message,
            metadata,
            data,
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

    isErrorException(obj: unknown): obj is IAppException<unknown> {
        return typeof obj === 'object'
            ? 'statusCode' in obj && 'message' in obj
            : false;
    }
}
