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
import { IResponsePagingOptions } from '../response.interface';
import { Response } from 'express';

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
                    map(async (response: Promise<Record<string, any>>) => {
                        const ctx: HttpArgumentsHost = context.switchToHttp();
                        const responseExpress: Response = ctx.getResponse();
                        const { headers } = ctx.getRequest();
                        const customLanguages = headers['x-custom-lang'];

                        const statusCode: number =
                            options && options.statusCode
                                ? options.statusCode
                                : responseExpress.statusCode;
                        const responseData: Record<string, any> =
                            await response;
                        const {
                            totalData,
                            currentPage,
                            perPage,
                            data,
                            metadata,
                            availableSort,
                            availableSearch,
                        } = responseData;

                        let { totalPage } = responseData;
                        totalPage =
                            totalPage > PAGINATION_DEFAULT_MAX_PAGE
                                ? PAGINATION_DEFAULT_MAX_PAGE
                                : totalPage;

                        const message: string | IMessage =
                            (await this.messageService.get(messagePath, {
                                customLanguages,
                            })) ||
                            (await this.messageService.get('response.default', {
                                customLanguages,
                            }));

                        if (
                            options &&
                            options.type === ENUM_PAGINATION_TYPE.SIMPLE
                        ) {
                            return {
                                statusCode,
                                message,
                                totalData,
                                totalPage,
                                currentPage,
                                perPage,
                                metadata,
                                data,
                            };
                        } else if (
                            options &&
                            options.type === ENUM_PAGINATION_TYPE.MINI
                        ) {
                            return {
                                statusCode,
                                message,
                                totalData,
                                metadata,
                                data,
                            };
                        }

                        return {
                            statusCode,
                            message,
                            totalData,
                            totalPage,
                            currentPage,
                            perPage,
                            availableSort,
                            availableSearch,
                            metadata,
                            data,
                        };
                    })
                );
            }

            return next.handle();
        }
    }

    return mixin(MixinResponseInterceptor);
}
