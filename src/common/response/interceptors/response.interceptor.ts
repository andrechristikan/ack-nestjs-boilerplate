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
import { ResponseMessagePathMetaKey } from '@common/response/constants/response.constant';
import {
    ResponseDto,
    ResponseMetadataDto,
} from '@common/response/dtos/response.dto';
import { ConfigService } from '@nestjs/config';
import { HelperService } from '@common/helper/services/helper.service';
import { IMessageProperties } from '@common/message/interfaces/message.interface';
import { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';

/**
 * Wraps handler results into the standard `{ statusCode, message, metadata, data }` envelope,
 * localizing the message and setting custom headers.
 */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor {
    constructor(
        private readonly reflector: Reflector,
        private readonly messageService: MessageService,
        private readonly configService: ConfigService,
        private readonly helperService: HelperService
    ) {}

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
                        ResponseMessagePathMetaKey,
                        context.getHandler()
                    );
                    let messageProperties: IMessageProperties | undefined;

                    let httpStatus: HttpStatus = response.statusCode;
                    let statusCode: number = response.statusCode;
                    let data: T | undefined = undefined;

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

    private createResponseMetadata(request: IRequestApp): ResponseMetadataDto {
        const today = this.helperService.dateCreate();
        const xLanguage: EnumMessageLanguage =
            (request.language as EnumMessageLanguage) ??
            this.configService.get<EnumMessageLanguage>('message.language')!;
        const xVersion =
            request.version ??
            this.configService.get<string>('app.urlVersion.version')!;

        return {
            language: xLanguage,
            timestamp: this.helperService.dateGetTimestamp(today),
            timezone: this.helperService.dateGetZone(today),
            path: request.path,
            version: xVersion,
            repoVersion: this.configService.get<string>('app.version')!,
            requestId: String(request.id),
            correlationId: String(request.correlationId),
        };
    }

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
        response.setHeader('x-correlation-id', String(metadata.correlationId));
    }
}
