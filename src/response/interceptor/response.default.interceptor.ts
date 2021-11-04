import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    mixin,
    Type
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { HttpArgumentsHost } from '@nestjs/common/interfaces';
import { Message } from 'src/message/message.decorator';
import { MessageService } from 'src/message/message.service';

export function ResponseDefaultInterceptor(
    messagePath: string,
    customStatusCode?: number
): Type<NestInterceptor> {
    @Injectable()
    class MixinResponseDefaultInterceptor
        implements NestInterceptor<Promise<any>> {
        constructor(
            @Message() private readonly messageService: MessageService
        ) {}

        async intercept(
            context: ExecutionContext,
            next: CallHandler
        ): Promise<Observable<Promise<any> | string>> {
            const ctx: HttpArgumentsHost = context.switchToHttp();
            const responseExpress: any = ctx.getResponse();

            return next.handle().pipe(
                map(async (response: Promise<Record<string, any>>) => {
                    const statusCode: number =
                        customStatusCode || responseExpress.statusCode;
                    const data: Record<string, any> = await response;
                    const message: string =
                        this.messageService.get(messagePath) ||
                        this.messageService.get('response.default');

                    return {
                        statusCode,
                        message,
                        data
                    };
                })
            );
        }
    }

    return mixin(MixinResponseDefaultInterceptor);
}
