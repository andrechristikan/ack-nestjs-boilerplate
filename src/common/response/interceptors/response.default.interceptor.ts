import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
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
                map(async (responseData: Promise<Record<string, any>>) => {
                    const ctx: HttpArgumentsHost = context.switchToHttp();
                    const responseExpress: Response = ctx.getResponse();
                    const requestExpress: IRequestApp =
                        ctx.getRequest<IRequestApp>();

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

                    // get metadata
                    const __customLang = requestExpress.__customLang;
                    const __path = requestExpress.path;
                    const __requestId = requestExpress.__id;
                    const __timestamp =
                        requestExpress.__xTimestamp ??
                        requestExpress.__timestamp;
                    const __timezone = requestExpress.__timezone;
                    const __version = requestExpress.__version;
                    const __repoVersion = requestExpress.__repoVersion;

                    // set default response
                    let statusCode: number = responseExpress.statusCode;
                    let message: string | IMessage =
                        await this.messageService.get(messagePath, {
                            customLanguages: __customLang,
                            properties: messageProperties,
                        });
                    let metadata: ResponseMetadataSerialization = {
                        languages: __customLang,
                        timestamp: __timestamp,
                        timezone: __timezone,
                        requestId: __requestId,
                        path: __path,
                        version: __version,
                        repoVersion: __repoVersion,
                    };
                    let serialization = undefined;

                    // response
                    const response = (await responseData) as IResponse;

                    if (response) {
                        const { data, _metadata } = response;
                        serialization = data;

                        if (classSerialization) {
                            serialization = plainToInstance(
                                classSerialization,
                                data,
                                classSerializationOptions
                            );
                        }
                        if (_metadata) {
                            statusCode =
                                _metadata.customProperty?.statusCode ??
                                statusCode;
                            messagePath =
                                _metadata.customProperty?.message ??
                                messagePath;
                            messageProperties =
                                _metadata.customProperty?.messageProperties ??
                                messageProperties;
                        }

                        delete _metadata?.customProperty;

                        message = await this.messageService.get(messagePath, {
                            customLanguages: __customLang,
                            properties: messageProperties,
                        });
                        metadata = {
                            ...metadata,
                            ..._metadata,
                        };
                    }

                    return {
                        statusCode,
                        message,
                        _metadata: metadata,
                        data: serialization,
                    };
                })
            );
        }

        return next.handle();
    }
}
