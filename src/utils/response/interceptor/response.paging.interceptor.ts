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

// This interceptor for restructure response success
export function ResponsePagingInterceptor(
    messagePath: string,
    customStatusCode: number
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
                        customStatusCode || responseExpress.statusCode;
                    const responseData: Record<string, any> = await response;
                    const {
                        totalData,
                        totalPage,
                        currentPage,
                        perPage,
                        data,
                        availableSort,
                        sort,
                    } = responseData;

                    const message: string | IMessage =
                        (await this.messageService.get(messagePath, {
                            appLanguages,
                        })) ||
                        (await this.messageService.get('response.default'));

                    return {
                        statusCode,
                        message,
                        totalData,
                        totalPage,
                        currentPage,
                        perPage,
                        availableSort,
                        sort: {
                            field: sort.field,
                            type: sort.type,
                        },
                        data,
                    };
                })
            );
        }
    }

    return mixin(MixinResponseInterceptor);
}
