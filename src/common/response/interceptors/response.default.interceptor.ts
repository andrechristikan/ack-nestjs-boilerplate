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
import { IMessageOptionsProperties } from 'src/common/message/interfaces/message.interface';
import { IErrorHttpFilterMetadata } from 'src/common/error/interfaces/error.interface';
import { ResponseDefaultSerialization } from 'src/common/response/serializations/response.default.serialization';
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
                    const messageProperties: IMessageOptionsProperties =
                        this.reflector.get<IMessageOptionsProperties>(
                            RESPONSE_MESSAGE_PROPERTIES_META_KEY,
                            context.getHandler()
                        );

                    // message base on language
                    const { customLang } = ctx.getRequest<IRequestApp>();

                    // default response
                    let statusCode: number = responseExpress.statusCode;
                    let message = await this.messageService.get(messagePath, {
                        customLanguages: customLang,
                    });

                    // get metadata
                    const __path = requestExpress.path;
                    const __requestId = requestExpress.id;
                    const __timestamp = requestExpress.timestamp;
                    const __timezone =
                        Intl.DateTimeFormat().resolvedOptions().timeZone;
                    const __version = requestExpress.version;
                    const __repoVersion = requestExpress.repoVersion;

                    const resMetadata: IErrorHttpFilterMetadata = {
                        languages: customLang,
                        timestamp: __timestamp,
                        timezone: __timezone,
                        requestId: __requestId,
                        path: __path,
                        version: __version,
                        repoVersion: __repoVersion,
                    };

                    // response
                    const response = (await responseData) as IResponse;
                    if (response) {
                        const { metadata, ...data } = response;
                        let properties: IMessageOptionsProperties =
                            messageProperties;
                        let serialization = data;

                        if (classSerialization) {
                            serialization = plainToInstance(
                                classSerialization,
                                data,
                                classSerializationOptions
                            );
                        }

                        if (metadata) {
                            statusCode = metadata.statusCode || statusCode;
                            messagePath = metadata.message || messagePath;
                            properties = metadata.properties || properties;

                            delete metadata.statusCode;
                            delete metadata.message;
                            delete metadata.properties;
                        }

                        // message
                        message = await this.messageService.get(messagePath, {
                            customLanguages: customLang,
                            properties,
                        });

                        serialization =
                            serialization &&
                            Object.keys(serialization).length > 0
                                ? serialization
                                : undefined;

                        return {
                            statusCode,
                            message,
                            metadata: { ...resMetadata, ...metadata },
                            data: serialization,
                        };
                    }

                    return {
                        statusCode,
                        message,
                        metadata: resMetadata,
                    };
                })
            );
        }

        return next.handle();
    }
}
