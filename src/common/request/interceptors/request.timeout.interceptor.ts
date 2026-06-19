import {
    CallHandler,
    ExecutionContext,
    Injectable,
    NestInterceptor,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Observable, TimeoutError, throwError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';
import ms from 'ms';
import {
    RequestCustomTimeoutMetaKey,
    RequestCustomTimeoutValueMetaKey,
} from '@common/request/constants/request.constant';
import { RequestTimeoutException } from '@common/request/exceptions/request.timeout.exception';

/**
 * Applies the global request timeout, or a per-route override from `@RequestTimeout`.
 */
@Injectable()
export class RequestTimeoutInterceptor implements NestInterceptor {
    private readonly maxTimeoutInMs: number;

    constructor(
        private readonly configService: ConfigService,
        private readonly reflector: Reflector
    ) {
        this.maxTimeoutInMs = this.configService.get<number>(
            'request.timeoutInMs'
        )!;
    }

    intercept(
        context: ExecutionContext,
        next: CallHandler
    ): Observable<unknown> {
        if (context.getType() === 'http') {
            const customTimeout = this.reflector.get<boolean>(
                RequestCustomTimeoutMetaKey,
                context.getHandler()
            );

            if (customTimeout === true) {
                const timeoutValue: ms.StringValue =
                    this.reflector.get<ms.StringValue>(
                        RequestCustomTimeoutValueMetaKey,
                        context.getHandler()
                    );

                return this.handleTimeoutRequest(
                    next,
                    ms(timeoutValue as ms.StringValue)
                );
            } else {
                return this.handleTimeoutRequest(next, this.maxTimeoutInMs);
            }
        }

        return next.handle();
    }

    private handleTimeoutRequest(
        next: CallHandler,
        timeoutMs: number
    ): Observable<unknown> {
        return next.handle().pipe(
            timeout(timeoutMs),
            catchError(err => {
                if (err instanceof TimeoutError) {
                    throw new RequestTimeoutException();
                }
                return throwError(() => err);
            })
        );
    }
}
