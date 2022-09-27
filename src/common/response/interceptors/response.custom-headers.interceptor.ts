import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { HttpArgumentsHost } from '@nestjs/common/interfaces';
import { Response } from 'express';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';
import { HelperDateService } from 'src/common/helper/services/helper.date.service';

// only for response success and error in controller
@Injectable()
export class ResponseCustomHeadersInterceptor
    implements NestInterceptor<Promise<any>>
{
    constructor(private readonly helperDateService: HelperDateService) {}

    async intercept(
        context: ExecutionContext,
        next: CallHandler
    ): Promise<Observable<Promise<any> | string>> {
        if (context.getType() === 'http') {
            const ctx: HttpArgumentsHost = context.switchToHttp();
            const responseExpress: Response = ctx.getResponse();
            const request: IRequestApp = ctx.getRequest();

            responseExpress.setHeader('x-custom-lang', request.customLang);
            responseExpress.setHeader(
                'x-timestamp',
                request.timestamp || this.helperDateService.timestamp()
            );
            responseExpress.setHeader(
                'x-timezone',
                Intl.DateTimeFormat().resolvedOptions().timeZone
            );
            responseExpress.setHeader('x-request-id', request.id);
            responseExpress.setHeader('x-version', request.version);
            responseExpress.setHeader('x-repo-version', request.repoVersion);

            return next.handle();
        }

        return next.handle();
    }
}
