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
import {
    ClassConstructor,
    ClassTransformOptions,
    plainToInstance,
} from 'class-transformer';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';
import {
    IMessage,
    IMessageOptionsProperties,
} from 'src/common/message/interfaces/message.interface';
import {
    ResponseDefaultSerialization,
    ResponseMetadataSerialization,
} from 'src/common/response/serializations/response.default.serialization';
import {
    RESPONSE_MESSAGE_PATH_META_KEY,
    RESPONSE_MESSAGE_PROPERTIES_META_KEY,
    RESPONSE_SERIALIZATION_META_KEY,
    RESPONSE_SERIALIZATION_OPTIONS_META_KEY,
} from 'src/common/response/constants/response.constant';
import { IResponse } from 'src/common/response/interfaces/response.interface';

@Injectable()
export class ResponseDefaultInterceptor<T>
    implements NestInterceptor<Promise<T>>
{
    constructor(
        private readonly reflector: Reflector,
        private readonly messageService: MessageService
    ) {}

    async intercept(
        context: ExecutionContext,
        next: CallHandler
    ): Promise<Observable<Promise<ResponseDefaultSerialization>>> {
        if (context.getType() === 'http') {
            return next.handle().pipe(
                map(async (res: Promise<Record<string, any>>) => {
                    const ctx: HttpArgumentsHost = context.switchToHttp();
                    const response: Response = ctx.getResponse();
                    const request: IRequestApp = ctx.getRequest<IRequestApp>();

                    let messagePath: string = this.reflector.get<string>(
                        RESPONSE_MESSAGE_PATH_META_KEY,
                        context.getHandler()
                    );
                    const classSerialization: ClassConstructor<any> =
                        this.reflector.get<ClassConstructor<any>>(
                            RESPONSE_SERIALIZATION_META_KEY,
                            context.getHandler()
                        );
                    const classSerializationOptions: ClassTransformOptions =
                        this.reflector.get<ClassTransformOptions>(
                            RESPONSE_SERIALIZATION_OPTIONS_META_KEY,
                            context.getHandler()
                        );
                    let messageProperties: IMessageOptionsProperties =
                        this.reflector.get<IMessageOptionsProperties>(
                            RESPONSE_MESSAGE_PROPERTIES_META_KEY,
                            context.getHandler()
                        );

                    // metadata
                    const __customLang = request.__customLang;
                    const __requestId = request.__id;
                    const __path = request.path;
                    const __timestamp =
                        request.__xTimestamp ?? request.__timestamp;
                    const __timezone = request.__timezone;
                    const __version = request.__version;
                    const __repoVersion = request.__repoVersion;

                    // set default response
                    let httpStatus: HttpStatus = response.statusCode;
                    let statusCode: number = response.statusCode;
                    let data: Record<string, any> = undefined;
                    let metadata: ResponseMetadataSerialization = {
                        languages: __customLang,
                        timestamp: __timestamp,
                        timezone: __timezone,
                        requestId: __requestId,
                        path: __path,
                        version: __version,
                        repoVersion: __repoVersion,
                    };

                    // response
                    const responseData = (await res) as IResponse;

                    if (responseData) {
                        const { _metadata } = responseData;
                        data = responseData.data;

                        if (data && classSerialization) {
                            data = plainToInstance(
                                classSerialization,
                                data,
                                classSerializationOptions
                            );
                        }

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

                    const message: string | IMessage =
                        await this.messageService.get(messagePath, {
                            customLanguages: __customLang,
                            properties: messageProperties,
                        });

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
