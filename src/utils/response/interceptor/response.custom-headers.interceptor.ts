import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
} from '@nestjs/common';
import { map, Observable } from 'rxjs';
import { HttpArgumentsHost } from '@nestjs/common/interfaces';
import { Response } from 'express';
import { CacheService } from 'src/cache/service/cache.service';

@Injectable()
export class ResponseCustomHeadersInterceptor
    implements NestInterceptor<Promise<any>>
{
    constructor(private readonly cacheService: CacheService) {}

    async intercept(
        context: ExecutionContext,
        next: CallHandler
    ): Promise<Observable<Promise<any> | string>> {
        if (context.getType() === 'http') {
            return next.handle().pipe(
                map(async (response: Promise<Response>) => {
                    const ctx: HttpArgumentsHost = context.switchToHttp();
                    const responseExpress: Response = ctx.getResponse();

                    const timezone: string =
                        await this.cacheService.getTimezone();
                    const timestamp: string =
                        await this.cacheService.getTimestamp();
                    const customLang: string =
                        await this.cacheService.getCustomLang();
                    const requestId: string =
                        await this.cacheService.getRequestId();

                    responseExpress.setHeader('x-custom-lang', customLang);
                    responseExpress.setHeader('x-timestamp', timestamp);
                    responseExpress.setHeader('x-timezone', timezone);
                    responseExpress.setHeader('x-request-id', requestId);

                    return response;
                })
            );
        }

        return next.handle();
    }
}
