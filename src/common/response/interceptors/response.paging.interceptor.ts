import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { HttpArgumentsHost } from '@nestjs/common/interfaces';
import { IResponsePaging, IResponsePagingOptions } from '../response.interface';
import { Response } from 'express';
import { IRequestApp } from 'src/common/request/request.interface';
import { IMessage } from 'src/common/message/message.interface';
import { MessageService } from 'src/common/message/services/message.service';
import { ENUM_PAGINATION_TYPE } from 'src/common/pagination/constants/pagination.constant';
import {
    RESPONSE_MESSAGE_PATH_META_KEY,
    RESPONSE_PAGING_OPTIONS_META_KEY,
} from '../constants/response.constant';
import { Reflector } from '@nestjs/core';

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
    ): Promise<Observable<Promise<any> | string>> {
        if (context.getType() === 'http') {
            return next.handle().pipe(
                map(async (responseData: Promise<Record<string, any>>) => {
                    const ctx: HttpArgumentsHost = context.switchToHttp();
                    const response: Response = ctx.getResponse();

                    const messagePath: string = this.reflector.get<string>(
                        RESPONSE_MESSAGE_PATH_META_KEY,
                        context.getHandler()
                    );
                    const options: IResponsePagingOptions =
                        this.reflector.get<IResponsePagingOptions>(
                            RESPONSE_PAGING_OPTIONS_META_KEY,
                            context.getHandler()
                        );

                    // message base on language
                    const { customLang } = ctx.getRequest<IRequestApp>();
                    const customLanguages = customLang
                        ? customLang.split(',')
                        : [];

                    // response
                    let resStatusCode = response.statusCode;
                    let resMessage: string | IMessage =
                        await this.messageService.get(messagePath, {
                            customLanguages,
                        });
                    const resData = (await responseData) as IResponsePaging;

                    if (resData) {
                        const {
                            totalData,
                            currentPage,
                            perPage,
                            data,
                            metadata,
                            availableSort,
                            availableSearch,
                            totalPage,
                        } = resData;

                        // metadata
                        let resMetadata = {};
                        if (metadata) {
                            const { statusCode, message, ...metadataOthers } =
                                metadata;
                            resStatusCode = statusCode || resStatusCode;
                            resMessage = message
                                ? await this.messageService.get(message, {
                                      customLanguages,
                                  })
                                : resMessage;
                            resMetadata = metadataOthers;
                        }

                        if (options.type === ENUM_PAGINATION_TYPE.SIMPLE) {
                            return {
                                statusCode: resStatusCode,
                                message: resMessage,
                                totalData,
                                totalPage,
                                currentPage,
                                perPage,
                                metadata:
                                    Object.keys(resMetadata).length > 0
                                        ? resMetadata
                                        : undefined,
                                data,
                            };
                        } else if (options.type === ENUM_PAGINATION_TYPE.MINI) {
                            return {
                                statusCode: resStatusCode,
                                message: resMessage,
                                totalData,
                                metadata:
                                    Object.keys(resMetadata).length > 0
                                        ? resMetadata
                                        : undefined,
                                data,
                            };
                        }

                        return {
                            statusCode: resStatusCode,
                            message: resMessage,
                            totalData,
                            totalPage,
                            currentPage,
                            perPage,
                            availableSort,
                            availableSearch,
                            metadata:
                                Object.keys(resMetadata).length > 0
                                    ? resMetadata
                                    : undefined,
                            data,
                        };
                    }

                    return {
                        statusCode: resStatusCode,
                        message: resMessage,
                    };
                })
            );
        }

        return next.handle();
    }
}
