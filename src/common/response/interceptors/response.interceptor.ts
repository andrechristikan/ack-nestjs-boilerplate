import {
    CallHandler,
    ExecutionContext,
    HttpStatus,
    Injectable,
    NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { HttpArgumentsHost } from '@nestjs/common/interfaces';
import { Response } from 'express';
import { MessageService } from '@common/message/services/message.service';
import { Reflector } from '@nestjs/core';
import { IRequestApp } from '@common/request/interfaces/request.interface';
import { RESPONSE_MESSAGE_PATH_META_KEY } from '@common/response/constants/response.constant';
import {
    ResponseDto,
    ResponseMetadataDto,
} from '@common/response/dtos/response.dto';
import { ConfigService } from '@nestjs/config';
import { HelperService } from '@common/helper/services/helper.service';
import { IMessageProperties } from '@common/message/interfaces/message.interface';
import { IResponseReturn } from '@common/response/interfaces/response.interface';
import { ENUM_MESSAGE_LANGUAGE } from '@common/message/enums/message.enum';

/**
 * Global response interceptor that standardizes HTTP response format
 * across the entire application.
 *
 * This interceptor transforms all HTTP responses into a consistent format
 * with metadata, status codes, messages, and standardized headers.
 * It handles response data transformation, message localization,
 * and adds custom headers for client-side processing.
 *
 * @template T - The type of the response data
 */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor {
    constructor(
        private readonly reflector: Reflector,
        private readonly messageService: MessageService,
        private readonly configService: ConfigService,
        private readonly helperService: HelperService
    ) {}

    /**
     * Intercepts HTTP requests and transforms responses into standardized format.
     *
     * This method only processes HTTP contexts, ignoring other types like WebSocket
     * or RPC contexts. It extracts response metadata, applies localization,
     * sets custom headers, and returns a consistent response structure.
     *
     * @param context - The execution context containing request/response information
     * @param next - The next handler in the chain
     * @returns Observable of the transformed response promise
     */
    intercept(
        context: ExecutionContext,
        next: CallHandler
    ): Observable<Promise<ResponseDto<T>>> {
        if (context.getType() === 'http') {
            return next.handle().pipe(
                map(async (res: Promise<Response>) => {
                    const ctx: HttpArgumentsHost = context.switchToHttp();
                    const response: Response = ctx.getResponse();
                    const request: IRequestApp = ctx.getRequest<IRequestApp>();

                    let messagePath: string = this.reflector.get<string>(
                        RESPONSE_MESSAGE_PATH_META_KEY,
                        context.getHandler()
                    );
                    let messageProperties: IMessageProperties;

                    let httpStatus: HttpStatus = response.statusCode;
                    let statusCode: number = response.statusCode;
                    let data: T = undefined;

                    const metadata: ResponseMetadataDto =
                        this.createResponseMetadata(request);

                    const responseData = (await res) as IResponseReturn<T>;
                    if (responseData) {
                        const { metadata: responseMetadata } = responseData;

                        data = responseData.data ?? undefined;
                        httpStatus = responseMetadata?.httpStatus ?? httpStatus;
                        statusCode = responseMetadata?.statusCode ?? statusCode;
                        messagePath =
                            responseMetadata?.messagePath ?? messagePath;
                        messageProperties = responseMetadata?.messageProperties;
                    }

                    const message: string = this.messageService.setMessage(
                        messagePath,
                        {
                            customLanguage: metadata.language,
                            properties: messageProperties,
                        }
                    );

                    this.setResponseHeaders(response, metadata);
                    response.status(httpStatus);

                    return {
                        statusCode,
                        message,
                        metadata,
                        data,
                    };
                })
            );
        }

        return next.handle();
    }

    /**
     * Creates standardized response metadata from request information.
     *
     * @param request - The incoming HTTP request
     * @returns ResponseMetadataDto containing metadata for the response
     */
    private createResponseMetadata(request: IRequestApp): ResponseMetadataDto {
        const today = this.helperService.dateCreate();
        const xLanguage: ENUM_MESSAGE_LANGUAGE =
            (request.__language as ENUM_MESSAGE_LANGUAGE) ??
            this.configService.get<ENUM_MESSAGE_LANGUAGE>('message.language');
        const xVersion =
            request.__version ??
            this.configService.get<string>('app.urlVersion.version');

        return {
            language: xLanguage,
            timestamp: this.helperService.dateGetTimestamp(today),
            timezone: this.helperService.dateGetZone(today),
            path: request.path,
            version: xVersion,
            repoVersion: this.configService.get<string>('app.version'),
            requestId: String(request.id),
        };
    }

    /**
     * Sets custom headers on the HTTP response.
     *
     * Adds standardized headers including language, timestamp, timezone,
     * version information, and request ID for client-side processing
     * and request correlation.
     *
     * @param response - The HTTP response object
     * @param metadata - Response metadata containing header values
     */
    private setResponseHeaders(
        response: Response,
        metadata: ResponseMetadataDto
    ): void {
        response.setHeader('x-custom-lang', metadata.language);
        response.setHeader('x-timestamp', metadata.timestamp);
        response.setHeader('x-timezone', metadata.timezone);
        response.setHeader('x-version', metadata.version);
        response.setHeader('x-repo-version', metadata.repoVersion);
        response.setHeader('x-request-id', String(metadata.requestId));
    }
}
