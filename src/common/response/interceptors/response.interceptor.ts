import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    HttpStatus,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { HttpArgumentsHost } from '@nestjs/common/interfaces';
import { Response } from 'express';
import { MessageService } from 'src/common/message/services/message.service';
import { Reflector } from '@nestjs/core';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';
import { IMessageOptionsProperties } from 'src/common/message/interfaces/message.interface';
import {
    RESPONSE_MESSAGE_PATH_META_KEY,
    RESPONSE_MESSAGE_PROPERTIES_META_KEY,
} from 'src/common/response/constants/response.constant';
import { IResponse } from 'src/common/response/interfaces/response.interface';
import {
    ResponseDto,
    ResponseMetadataDto,
} from 'src/common/response/dtos/response.dto';

@Injectable()
export class ResponseInterceptor
    implements NestInterceptor<Promise<ResponseDto>>
{
    constructor(
        private readonly reflector: Reflector,
        private readonly messageService: MessageService
    ) {}

    async intercept(
        context: ExecutionContext,
        next: CallHandler
    ): Promise<Observable<Promise<ResponseDto>>> {
        if (context.getType() === 'http') {
            return next.handle().pipe(
                map(async (res: Promise<any>) => {
                    const ctx: HttpArgumentsHost = context.switchToHttp();
                    const response: Response = ctx.getResponse();
                    const request: IRequestApp = ctx.getRequest<IRequestApp>();

                    let messagePath: string = this.reflector.get<string>(
                        RESPONSE_MESSAGE_PATH_META_KEY,
                        context.getHandler()
                    );
                    let messageProperties: IMessageOptionsProperties =
                        this.reflector.get<IMessageOptionsProperties>(
                            RESPONSE_MESSAGE_PROPERTIES_META_KEY,
                            context.getHandler()
                        );

                    // metadata
                    const __language = request.__language;
                    const __requestId = request.__id;
                    const __path = request.path;
                    const __timestamp = request.__timestamp;
                    const __timezone = request.__timezone;
                    const __version = request.__version;
                    const __repoVersion = request.__repoVersion;

                    // set default response
                    let httpStatus: HttpStatus = response.statusCode;
                    let statusCode: number = response.statusCode;
                    let data: Record<string, any> = undefined;
                    let metadata: ResponseMetadataDto = {
                        language: __language,
                        timestamp: __timestamp,
                        timezone: __timezone,
                        requestId: __requestId,
                        path: __path,
                        version: __version,
                        repoVersion: __repoVersion,
                    };

                    // response
                    const responseData = (await res) as IResponse<any>;

                    if (responseData) {
                        const { _metadata } = responseData;

                        data = responseData.data;
                        httpStatus =
                            _metadata?.customProperty?.httpStatus ?? httpStatus;
                        statusCode =
                            _metadata?.customProperty?.statusCode ?? statusCode;
                        messagePath =
                            _metadata?.customProperty?.message ?? messagePath;
                        messageProperties =
                            _metadata?.customProperty?.messageProperties ??
                            messageProperties;

                        delete _metadata?.customProperty;

                        metadata = {
                            ...metadata,
                            ..._metadata,
                        };
                    }

                    const message: string = this.messageService.setMessage(
                        messagePath,
                        {
                            customLanguage: __language,
                            properties: messageProperties,
                        }
                    );

                    response.status(httpStatus);

                    return {
                        statusCode,
                        message,
                        _metadata: metadata,
                        data,
                    };
                })
            );
        }

        return next.handle();
    }
}
