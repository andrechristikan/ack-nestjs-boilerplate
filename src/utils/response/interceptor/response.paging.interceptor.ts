import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    mixin,
    Type,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { HttpArgumentsHost } from '@nestjs/common/interfaces';
import { IMessage } from 'src/message/message.interface';
import { MessageService } from 'src/message/service/message.service';
import {
    ENUM_PAGINATION_TYPE,
    PAGINATION_DEFAULT_MAX_PAGE,
} from 'src/pagination/pagination.constant';
import { IResponsePaging, IResponsePagingOptions } from '../response.interface';
import { Response } from 'express';
import { IRequestApp } from 'src/utils/request/request.interface';

// This interceptor for restructure response success
export function ResponsePagingInterceptor(
    messagePath: string,
    options?: IResponsePagingOptions
): Type<NestInterceptor> {
    @Injectable()
    class MixinResponseInterceptor implements NestInterceptor<Promise<any>> {
        constructor(private readonly messageService: MessageService) {}

        async intercept(
            context: ExecutionContext,
            next: CallHandler
        ): Promise<Observable<Promise<any> | string>> {
            if (context.getType() === 'http') {
                return next.handle().pipe(
                    map(async (responseData: Promise<Record<string, any>>) => {
                        const ctx: HttpArgumentsHost = context.switchToHttp();
                        const response: Response = ctx.getResponse();
                        const { customLang } = ctx.getRequest<IRequestApp>();
                        const customLanguages = customLang
                            ? customLang.split(',')
                            : [];

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
                            const resTotalPage =
                                totalPage > PAGINATION_DEFAULT_MAX_PAGE
                                    ? PAGINATION_DEFAULT_MAX_PAGE
                                    : totalPage;
                            if (metadata) {
                                const {
                                    statusCode,
                                    message,
                                    ...metadataOthers
                                } = metadata;
                                resStatusCode = statusCode || resStatusCode;
                                resMessage = message
                                    ? await this.messageService.get(message, {
                                          customLanguages,
                                      })
                                    : resMessage;
                                resMetadata = metadataOthers;
                            }

                            if (
                                options &&
                                options.type === ENUM_PAGINATION_TYPE.SIMPLE
                            ) {
                                return {
                                    statusCode: resStatusCode,
                                    message: resMessage,
                                    totalData,
                                    totalPage: resTotalPage,
                                    currentPage,
                                    perPage,
                                    metadata:
                                        Object.keys(resMetadata).length > 0
                                            ? resMetadata
                                            : undefined,
                                    data,
                                };
                            } else if (
                                options &&
                                options.type === ENUM_PAGINATION_TYPE.MINI
                            ) {
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
                                totalPage: resTotalPage,
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

    return mixin(MixinResponseInterceptor);
}
