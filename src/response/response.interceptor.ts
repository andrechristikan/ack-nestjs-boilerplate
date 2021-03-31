import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { HttpArgumentsHost } from '@nestjs/common/interfaces';

@Injectable()
export class ResponseInterceptor
    implements NestInterceptor<Promise<any> | string> {
    async intercept(
        context: ExecutionContext,
        next: CallHandler
    ): Promise<Observable<Promise<any> | string>> {
        const ctx: HttpArgumentsHost = context.switchToHttp();
        const responseExpress: any = ctx.getResponse();

        return next.handle().pipe(
            map(async (response: Promise<Record<string, any> | string>) => {
                const status: number = responseExpress.statusCode;
                const data: Record<string, any> | string = await response;
                console.log('response inter', data);
                if (typeof data === 'object') {
                    const { statusCode, ...others } = data;
                    return {
                        statusCode: statusCode || status,
                        ...others
                    };
                }

                return data;
            })
        );
    }
}
