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
} from 'src/utils/pagination/pagination.constant';
import { IResponsePagingOptions } from '../response.interface';

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
            const ctx: HttpArgumentsHost = context.switchToHttp();
            const responseExpress: any = ctx.getResponse();

            const request: Request = ctx.getRequest<Request>();
            const { headers } = request;
            const appLanguages: string[] = headers['x-custom-lang']
                ? ctx.getRequest().i18nLang.split(',')
                : undefined;

            return next.handle().pipe(
                map(async (response: Promise<Record<string, any>>) => {
                    const statusCode: number =
                        options && options.statusCode
                            ? options.statusCode
                            : responseExpress.statusCode;
                    const responseData: Record<string, any> = await response;
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
                            appLanguages,
                        })) ||
                        (await this.messageService.get('response.default'));

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
    }

    return mixin(MixinResponseInterceptor);
}
