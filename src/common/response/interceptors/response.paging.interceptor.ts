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
import { HelperArrayService } from 'src/common/helper/services/helper.array.service';

@Injectable()
export class ResponsePagingInterceptor<T>
    implements NestInterceptor<Promise<T>>
{
    constructor(
        private readonly reflector: Reflector,
        private readonly messageService: MessageService,
        private readonly helperArrayService: HelperArrayService
    ) {}

    async intercept(
        context: ExecutionContext,
        next: CallHandler
    ): Promise<Observable<Promise<ResponsePagingSerialization>>> {
        if (context.getType() === 'http') {
            return next.handle().pipe(
                map(async (res: Promise<IResponsePaging>) => {
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
                    const __path = request.path;
                    const __requestId = request.__id;
                    const __timestamp =
                        request.__xTimestamp ?? request.__timestamp;
                    const __timezone = request.__timezone;
                    const __version = request.__version;
                    const __repoVersion = request.__repoVersion;
                    const __pagination = request.__pagination;

                    let statusCode: number = response.statusCode;
                    let data: Record<string, any>[] = [];
                    let metadata: ResponsePagingMetadataSerialization = {
                        languages: __customLang,
                        timestamp: __timestamp,
                        timezone: __timezone,
                        requestId: __requestId,
                        path: __path,
                        version: __version,
                        repoVersion: __repoVersion,
                    };

                    // response
                    const responseData = (await res) as IResponsePaging;
                    if (!responseData) {
                        throw new Error('Paging must have response');
                    }

                    const { _metadata } = responseData;
                    data = responseData.data;

                    if (classSerialization) {
                        data = plainToInstance(
                            classSerialization,
                            data,
                            classSerializationOptions
                        );
                    }

                    statusCode =
                        _metadata?.customProperty?.statusCode ?? statusCode;
                    messagePath =
                        _metadata?.customProperty?.message ?? messagePath;
                    messageProperties =
                        _metadata?.customProperty?.messageProperties ??
                        messageProperties;

                    delete _metadata?.customProperty;

                    // metadata pagination

                    const { query } = request;

                    delete query.perPage;

                    delete query.page;

                    const total: number = responseData._pagination.total;

                    const totalPage: number =
                        responseData._pagination.totalPage;

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

                    metadata = {
                        ...metadata,
                        ..._metadata,
                        pagination: {
                            ...__pagination,
                            ...metadata._pagination,
                            total,
                            totalPage,
                        },
                    };

                    if (
                        !this.helperArrayService.includes(
                            Object.values(cursorPaginationMetadata),
                            undefined
                        )
                    ) {
                        metadata.cursor = cursorPaginationMetadata;
                    }

                    const message: string | IMessage =
                        await this.messageService.get(messagePath, {
                            customLanguages: __customLang,
                            properties: messageProperties,
                        });

                    const responseHttp: ResponsePagingSerialization = {
                        statusCode,
                        message,
                        _metadata: metadata,
                        data,
                    };

                    return responseHttp;
                })
            );
        }

        return next.handle();
    }
}
