import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
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
        const ctx: HttpArgumentsHost = context.switchToHttp();
        const responseExpress: Response = ctx.getResponse();

        const timezone: string = await this.cacheService.get('x-timezone');
        const timestamp: string = await this.cacheService.get('x-timestamp');
        const customLang: string = await this.cacheService.get('x-custom-lang');
        const requestId: string = await this.cacheService.get('x-request-id');

        responseExpress.setHeader('x-custom-lang', customLang);
        responseExpress.setHeader('x-timestamp', timestamp);
        responseExpress.setHeader('x-timezone', timezone);
        responseExpress.setHeader('x-request-id', requestId);

        return next.handle();
    }
}
