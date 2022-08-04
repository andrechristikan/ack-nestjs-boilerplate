import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
} from '@nestjs/common';
import { map, Observable } from 'rxjs';
import { HttpArgumentsHost } from '@nestjs/common/interfaces';
import { Response } from 'express';

// only for response success and error in controller
@Injectable()
export class ResponseCustomHeadersInterceptor
    implements NestInterceptor<Promise<any>>
{
    async intercept(
        context: ExecutionContext,
        next: CallHandler
    ): Promise<Observable<Promise<any> | string>> {
        if (context.getType() === 'http') {
            return next.handle().pipe(
                map(async (response: Promise<Response>) => {
                    const ctx: HttpArgumentsHost = context.switchToHttp();
                    const responseExpress: Response = ctx.getResponse();
                    const { headers }: Request = ctx.getRequest();

                    responseExpress.setHeader(
                        'x-custom-lang',
                        headers['x-custom-lang']
                    );
                    responseExpress.setHeader(
                        'x-timestamp',
                        headers['x-timestamp']
                    );
                    responseExpress.setHeader(
                        'x-timezone',
                        headers['x-timezone']
                    );
                    responseExpress.setHeader(
                        'x-request-id',
                        headers['x-request-id']
                    );

                    return response;
                })
            );
        }

        return next.handle();
    }
}
