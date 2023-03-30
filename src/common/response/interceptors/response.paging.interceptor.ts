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
import qs from 'qs';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';
import {
    IMessage,
    IMessageOptionsProperties,
} from 'src/common/message/interfaces/message.interface';
import {
    ResponsePagingCursorMetadataSerialization,
    ResponsePagingMetadataSerialization,
    ResponsePagingSerialization,
} from 'src/common/response/serializations/response.paging.serialization';
import {
    RESPONSE_MESSAGE_PATH_META_KEY,
    RESPONSE_MESSAGE_PROPERTIES_META_KEY,
    RESPONSE_SERIALIZATION_META_KEY,
    RESPONSE_SERIALIZATION_OPTIONS_META_KEY,
} from 'src/common/response/constants/response.constant';
import { IResponsePaging } from 'src/common/response/interfaces/response.interface';

@Injectable()
export class ResponsePagingInterceptor<T>
    implements NestInterceptor<Promise<T>>
{
    constructor(
        private readonly reflector: Reflector,
        private readonly messageService: MessageService
    ) {}

    async intercept(
        context: ExecutionContext,
        next: CallHandler
    ): Promise<Observable<Promise<ResponsePagingSerialization>>> {
        if (context.getType() === 'http') {
            return next.handle().pipe(
                map(async (responseData: Promise<IResponsePaging>) => {
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

                    // response
                    const response = (await responseData) as IResponsePaging;
                    if (!response) {
                        throw new Error('Paging must have response');
                    }

                    const { data, _metadata, _pagination } = response;

                    let messageProperties: IMessageOptionsProperties =
                        this.reflector.get<IMessageOptionsProperties>(
                            RESPONSE_MESSAGE_PROPERTIES_META_KEY,
                            context.getHandler()
                        );
                    let statusCode: number = responseExpress.statusCode;
                    let serialization = data;

                    if (classSerialization) {
                        serialization = plainToInstance(
                            classSerialization,
                            data,
                            classSerializationOptions
                        );
                    }

                    // _metadata
                    const __customLang = requestExpress.__customLang;
                    const __path = requestExpress.path;
                    const __requestId = requestExpress.__id;
                    const __timestamp =
                        requestExpress.__xTimestamp ??
                        requestExpress.__timestamp;
                    const __timezone = requestExpress.__timezone;
                    const __version = requestExpress.__version;
                    const __repoVersion = requestExpress.__repoVersion;
                    const __pagination = requestExpress.__pagination;

                    if (_metadata) {
                        statusCode =
                            _metadata.customProperty?.statusCode ?? statusCode;
                        messagePath =
                            _metadata.customProperty?.message ?? messagePath;
                        messageProperties =
                            _metadata.customProperty?.messageProperties ??
                            messageProperties;
                    }

                    delete _metadata?.customProperty;

                    // add metadata pagination
                    const { query } = requestExpress;
                    delete query.perPage;
                    delete query.page;

                    const total: number = _pagination.total;
                    const totalPage: number = _pagination.totalPage;
                    const perPage: number = __pagination.perPage;
                    const page: number = __pagination.page;
                    const queryString = qs.stringify(query, {
                        encode: false,
                    });

                    const cursorPaginationMetadata: ResponsePagingCursorMetadataSerialization =
                        {
                            nextPage:
                                page < totalPage
                                    ? `${__path}?perPage=${perPage}&page=${
                                          page + 1
                                      }&${queryString}`
                                    : undefined,
                            previousPage:
                                page > 1
                                    ? `${__path}?perPage=${perPage}&page=${
                                          page - 1
                                      }&${queryString}`
                                    : undefined,
                            firstPage:
                                totalPage > 1
                                    ? `${__path}?perPage=${perPage}&page=${1}&${queryString}`
                                    : undefined,
                            lastPage:
                                totalPage > 1
                                    ? `${__path}?perPage=${perPage}&page=${totalPage}&${queryString}`
                                    : undefined,
                        };

                    // message
                    const finalMetadata: ResponsePagingMetadataSerialization = {
                        languages: __customLang,
                        timestamp: __timestamp,
                        timezone: __timezone,
                        requestId: __requestId,
                        path: __path,
                        version: __version,
                        repoVersion: __repoVersion,
                        pagination: {
                            ...__pagination,
                            ..._pagination,
                            total,
                            totalPage,
                        },
                        cursor: cursorPaginationMetadata,
                        ..._metadata,
                    };

                    const message: string | IMessage =
                        await this.messageService.get(messagePath, {
                            customLanguages: __customLang,
                            properties: messageProperties,
                        });

                    const responseHttp: ResponsePagingSerialization = {
                        statusCode,
                        message,
                        _metadata: finalMetadata,
                        data: serialization,
                    };

                    return responseHttp;
                })
            );
        }

        return next.handle();
    }
}
