import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { HttpArgumentsHost } from '@nestjs/common/interfaces';
import { IResponsePaging } from '../response.interface';
import { Response } from 'express';
import { IRequestApp } from 'src/common/request/request.interface';
import {
    IMessage,
    IMessageOptionsProperties,
} from 'src/common/message/message.interface';
import { MessageService } from 'src/common/message/services/message.service';
import {
    RESPONSE_MESSAGE_PATH_META_KEY,
    RESPONSE_PAGING_TYPE_META_KEY,
    RESPONSE_SERIALIZATION_META_KEY,
    RESPONSE_SERIALIZATION_OPTIONS_META_KEY,
    RESPONSE_MESSAGE_PROPERTIES_META_KEY,
} from '../constants/response.constant';
import { Reflector } from '@nestjs/core';
import {
    ClassConstructor,
    ClassTransformOptions,
    plainToInstance,
} from 'class-transformer';
import {
    ResponsePagingDto,
    ResponsePagingMetadataDto,
} from '../dtos/response.paging.dto';
import { ENUM_PAGINATION_TYPE } from 'src/common/pagination/constants/pagination.enum.constant';
import { IErrorHttpFilterMetadata } from 'src/common/error/error.interface';

@Injectable()
export class ResponsePagingInterceptor
    implements NestInterceptor<Promise<any>>
{
    constructor(
        private readonly reflector: Reflector,
        private readonly messageService: MessageService
    ) {}

    async intercept(
        context: ExecutionContext,
        next: CallHandler
    ): Promise<Observable<Promise<ResponsePagingDto>>> {
        if (context.getType() === 'http') {
            return next.handle().pipe(
                map(async (responseData: Promise<ResponsePagingDto>) => {
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
                    const response = (await responseData) as IResponsePaging;
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
                    const __timezone = requestExpress.timezone;
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
                    const addMetadata: ResponsePagingMetadataDto = {
                        nextPage:
                            currentPage < totalPage
                                ? `${path}?perPage=${perPage}&page=${
                                      currentPage + 1
                                  }`
                                : undefined,
                        previousPage:
                            currentPage > 1
                                ? `${path}?perPage=${perPage}&page=${
                                      currentPage - 1
                                  }`
                                : undefined,
                        firstPage:
                            totalPage > 1
                                ? `${path}?perPage=${perPage}&page=${1}`
                                : undefined,
                        lastPage:
                            totalPage > 1
                                ? `${path}?perPage=${perPage}&page=${totalPage}`
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

                    const responseHttp: ResponsePagingDto = {
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
                })
            );
        }

        return next.handle();
    }
}
