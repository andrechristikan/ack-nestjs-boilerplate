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
import { IResponseOptions } from '../response.interface';
import { Response } from 'express';
import { IRequestApp } from 'src/utils/request/request.interface';

export function ResponseDefaultInterceptor(
    messagePath: string,
    options?: IResponseOptions
): Type<NestInterceptor> {
    @Injectable()
    class MixinResponseDefaultInterceptor
        implements NestInterceptor<Promise<any>>
    {
        constructor(private readonly messageService: MessageService) {}

        async intercept(
            context: ExecutionContext,
            next: CallHandler
        ): Promise<Observable<Promise<any> | string>> {
            if (context.getType() === 'http') {
                const statusCode: number =
                    options && options.statusCode
                        ? options.statusCode
                        : undefined;

                return next.handle().pipe(
                    map(async (response: Promise<Record<string, any>>) => {
                        const ctx: HttpArgumentsHost = context.switchToHttp();
                        const responseExpress: Response = ctx.getResponse();
                        const { customLang } = ctx.getRequest<IRequestApp>();
                        const customLanguages = customLang.split(',');

                        const newStatusCode = statusCode
                            ? statusCode
                            : responseExpress.statusCode;
                        const data: Record<string, any> = await response;
                        const message: string | IMessage =
                            await this.messageService.get(messagePath, {
                                customLanguages,
                            });

                        return {
                            statusCode: newStatusCode,
                            message,
                            data,
                        };
                    })
                );
            }

            return next.handle();
        }
    }

    return mixin(MixinResponseDefaultInterceptor);
}
