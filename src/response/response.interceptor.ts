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
        const response: any = ctx.getResponse();

        return next.handle().pipe(
            map(async (oldData) => {
                console.log(typeof oldData);
                console.log(typeof oldData);
                const status: number = response.statusCode;
                const { statusCode, ...data } = (await oldData) as Record<
                    string,
                    any
                >;

                return new Promise((resolve) => {
                    resolve({
                        statusCode: statusCode || status,
                        ...data
                    });
                });
            })
        );
    }
}
