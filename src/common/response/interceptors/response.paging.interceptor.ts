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
import { ENUM_PAGINATION_TYPE } from 'src/common/pagination/constants/pagination.enum.constant';
import qs from 'qs';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';
import {
    IMessage,
    IMessageOptionsProperties,
} from 'src/common/message/interfaces/message.interface';
import { IErrorHttpFilterMetadata } from 'src/common/error/interfaces/error.interface';
import {
    ResponsePagingSerialization,
    ResponsePagingMetadataSerialization,
} from 'src/common/response/serializations/response.paging.serialization';
import {
    RESPONSE_MESSAGE_PATH_META_KEY,
    RESPONSE_MESSAGE_PROPERTIES_META_KEY,
    RESPONSE_PAGING_TYPE_META_KEY,
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
                map(
                    async (
                        responseData: Promise<ResponsePagingSerialization>
                    ) => {
                        const ctx: HttpArgumentsHost = context.switchToHttp();
                        const responseExpress: Response = ctx.getResponse();
                        const requestExpress: IRequestApp =
                            ctx.getRequest<IRequestApp>();

                        let messagePath: string = this.reflector.get<string>(
                            RESPONSE_MESSAGE_PATH_META_KEY,
                            context.getHandler()
                        );
                        const type: ENUM_PAGINATION_TYPE =
                            this.reflector.get<ENUM_PAGINATION_TYPE>(
                                RESPONSE_PAGING_TYPE_META_KEY,
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

                        // response
                        const response =
                            (await responseData) as IResponsePaging;
                        const {
                            metadata,
                            totalData,
                            currentPage,
                            perPage,
                            data,
                            availableSort,
                            availableSearch,
                            totalPage,
                        } = response;
                        let statusCode: number = responseExpress.statusCode;
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

                        // get metadata
                        const __path = requestExpress.path;
                        const __requestId = requestExpress.id;
                        const __timestamp = requestExpress.timestamp;
                        const __timezone =
                            Intl.DateTimeFormat().resolvedOptions().timeZone;
                        const __version = requestExpress.version;
                        const __repoVersion = requestExpress.repoVersion;

                        if (metadata) {
                            statusCode = metadata.statusCode || statusCode;
                            messagePath = metadata.message || messagePath;
                            properties = metadata.properties || properties;

                            delete metadata.statusCode;
                            delete metadata.message;
                            delete metadata.properties;
                        }

                        const path = requestExpress.path;
                        const { query } = requestExpress;
                        delete query.perPage;
                        delete query.page;
                        const queryString = qs.stringify(query, {
                            encode: false,
                        });

                        const addMetadata: ResponsePagingMetadataSerialization =
                            {
                                nextPage:
                                    currentPage < totalPage
                                        ? `${path}?perPage=${perPage}&page=${
                                              currentPage + 1
                                          }&${queryString}`
                                        : undefined,
                                previousPage:
                                    currentPage > 1
                                        ? `${path}?perPage=${perPage}&page=${
                                              currentPage - 1
                                          }&${queryString}`
                                        : undefined,
                                firstPage:
                                    totalPage > 1
                                        ? `${path}?perPage=${perPage}&page=${1}&${queryString}`
                                        : undefined,
                                lastPage:
                                    totalPage > 1
                                        ? `${path}?perPage=${perPage}&page=${totalPage}&${queryString}`
                                        : undefined,
                            };

                        const resMetadata: IErrorHttpFilterMetadata = {
                            languages: customLang,
                            timestamp: __timestamp,
                            timezone: __timezone,
                            requestId: __requestId,
                            path: __path,
                            version: __version,
                            repoVersion: __repoVersion,
                        };

                        // message
                        const message: string | IMessage =
                            await this.messageService.get(messagePath, {
                                customLanguages: customLang,
                                properties,
                            });

                        const responseHttp: ResponsePagingSerialization = {
                            statusCode,
                            message,
                            totalData,
                            totalPage,
                            currentPage,
                            perPage,
                            availableSort,
                            availableSearch,
                            metadata: {
                                ...addMetadata,
                                ...resMetadata,
                                ...metadata,
                            },
                            data: serialization,
                        };

                        if (
                            type === ENUM_PAGINATION_TYPE.SIMPLE ||
                            type === ENUM_PAGINATION_TYPE.MINI
                        ) {
                            delete responseHttp.totalPage;
                            delete responseHttp.currentPage;
                            delete responseHttp.perPage;
                        }

                        if (type === ENUM_PAGINATION_TYPE.MINI) {
                            delete responseHttp.availableSort;
                            delete responseHttp.availableSearch;
                        }

                        return responseHttp;
                    }
                )
            );
        }

        return next.handle();
    }
}
