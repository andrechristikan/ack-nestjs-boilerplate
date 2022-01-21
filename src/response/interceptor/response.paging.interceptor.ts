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
import { Message } from 'src/message/message.decorator';
import { MessageService } from 'src/message/message.service';
import { IMessage } from 'src/message/message.interface';

// This interceptor for restructure response success
export function ResponsePagingInterceptor(
    messagePath: string,
    customStatusCode: number
): Type<NestInterceptor> {
    @Injectable()
    class MixinResponseInterceptor implements NestInterceptor<Promise<any>> {
        constructor(
            @Message() private readonly messageService: MessageService
        ) {}

        async intercept(
            context: ExecutionContext,
            next: CallHandler
        ): Promise<Observable<Promise<any> | string>> {
            const ctx: HttpArgumentsHost = context.switchToHttp();
            const responseExpress: any = ctx.getResponse();

            const request: Request = ctx.getRequest<Request>();
            const { headers } = request;
            const appLanguages: string[] = headers['Accept-Languages']
                ? (headers['Accept-Languages'] as string).split(',')
                : undefined;

            return next.handle().pipe(
                map(async (response: Promise<Record<string, any>>) => {
                    const statusCode: number =
                        customStatusCode || responseExpress.statusCode;
                    const responseData: Record<string, any> = await response;
                    const { totalData, totalPage, currentPage, perPage, data } =
                        responseData;

                    const message: string | IMessage[] =
                        this.messageService.get(messagePath, {
                            appLanguages,
                        }) || this.messageService.get('response.default');

                    return {
                        statusCode,
                        message,
                        totalData,
                        totalPage,
                        currentPage,
                        perPage,
                        data,
                    };
                })
            );
        }
    }

    return mixin(MixinResponseInterceptor);
}
