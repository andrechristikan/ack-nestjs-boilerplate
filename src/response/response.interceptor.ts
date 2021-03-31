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
            map(async (rawData: any) => {
                const status: number = response.statusCode;
                const oldData: Record<string, any> | string = await rawData;

                return new Promise((resolve) => {
                    if (typeof oldData === 'object') {
                        const data = oldData as Record<
                            string,
                            any
                        >;
                        resolve({
                            statusCode: status,
                            ...data
                        });
                    } else {
                        resolve(rawData);
                    }
                });
            })
        );
    }
}
