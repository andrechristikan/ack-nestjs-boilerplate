import {
    CallHandler,
    ExecutionContext,
    Injectable,
    NestInterceptor,
    Optional,
} from '@nestjs/common';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import { Observable } from 'rxjs';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';

@Injectable()
export class RequestLogInterceptor implements NestInterceptor<Promise<any>> {
    constructor(
        @Optional()
        @InjectSentry()
        private readonly sentryService: SentryService
    ) {}

    async intercept(
        context: ExecutionContext,
        next: CallHandler
    ): Promise<Observable<Promise<any> | string>> {
        if (context.getType() === 'http') {
            const request: IRequestApp = context
                .switchToHttp()
                .getRequest<IRequestApp>();

            try {
                this.sentryService.instance().captureEvent({
                    user: request.user,
                    event_id: request.__id,
                    tags: {
                        class: request.__class,
                        func: request.__function,
                        timezone: request.__timezone,
                    },
                    timestamp: request.__timestamp,
                    release: request.__repoVersion,
                    request: {
                        url: request.path,
                        method: request.method,
                        data: request.body,
                        query_string: request.query as Record<string, any>,
                        headers: request.headers as Record<string, any>,
                    },
                });
            } catch (err: unknown) {}
        }

        return next.handle();
    }
}
