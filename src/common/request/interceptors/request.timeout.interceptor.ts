import {
    CallHandler,
    ExecutionContext,
    Injectable,
    NestInterceptor,
    RequestTimeoutException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Observable, TimeoutError, throwError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';
import ms from 'ms';
import {
    REQUEST_CUSTOM_TIMEOUT_META_KEY,
    REQUEST_CUSTOM_TIMEOUT_VALUE_META_KEY,
} from '@common/request/constants/request.constant';
import { ENUM_REQUEST_STATUS_CODE_ERROR } from '@common/request/enums/request.status-code.enum';

/**
 * Interceptor that handles request timeouts for HTTP requests.
 * Applies either a global timeout from configuration or a custom timeout
 * specified via decorators on individual route handlers.
 */
@Injectable()
export class RequestTimeoutInterceptor implements NestInterceptor {
    private readonly maxTimeoutInMs: number;

    constructor(
        private readonly configService: ConfigService,
        private readonly reflector: Reflector
    ) {
        this.maxTimeoutInMs =
            this.configService.get<number>('middleware.timeout');
    }

    intercept(
        context: ExecutionContext,
        next: CallHandler
    ): Observable<unknown> {
        if (context.getType() === 'http') {
            const customTimeout = this.reflector.get<boolean>(
                REQUEST_CUSTOM_TIMEOUT_META_KEY,
                context.getHandler()
            );

            if (customTimeout === true) {
                const timeoutValue: ms.StringValue =
                    this.reflector.get<ms.StringValue>(
                        REQUEST_CUSTOM_TIMEOUT_VALUE_META_KEY,
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
                    throw new RequestTimeoutException({
                        statusCode: ENUM_REQUEST_STATUS_CODE_ERROR.TIMEOUT,
                        message: 'http.clientError.requestTimeOut',
                    });
                }
                return throwError(() => err);
            })
        );
    }
}
