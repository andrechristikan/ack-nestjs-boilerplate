import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    RequestTimeoutException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Observable, throwError, TimeoutError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';
import ms from 'ms';
import { ENUM_ERROR_STATUS_CODE_ERROR } from 'src/common/error/constants/error.status-code.constant';
import {
    RESPONSE_CUSTOM_TIMEOUT_META_KEY,
    RESPONSE_CUSTOM_TIMEOUT_META_VALUE_KEY,
} from '../constants/response.constant';

@Injectable()
export class ResponseTimeoutInterceptor
    implements NestInterceptor<Promise<any>>
{
    constructor(
        private readonly configService: ConfigService,
        private readonly reflector: Reflector
    ) {}

    async intercept(
        context: ExecutionContext,
        next: CallHandler
    ): Promise<Observable<Promise<any> | string>> {
        if (context.getType() === 'http') {
            const customTimeout = this.reflector.get<boolean>(
                RESPONSE_CUSTOM_TIMEOUT_META_KEY,
                context.getHandler()
            );

            if (customTimeout) {
                const seconds: string = this.reflector.get<string>(
                    RESPONSE_CUSTOM_TIMEOUT_META_VALUE_KEY,
                    context.getHandler()
                );

                return next.handle().pipe(
                    timeout(ms(seconds)),
                    catchError((err) => {
                        if (err instanceof TimeoutError) {
                            throw new RequestTimeoutException({
                                statusCode:
                                    ENUM_ERROR_STATUS_CODE_ERROR.ERROR_REQUEST_TIMEOUT,
                                message: 'http.clientError.requestTimeOut',
                            });
                        }
                        return throwError(() => err);
                    })
                );
            } else {
                const defaultTimeout: number = this.configService.get<number>(
                    'middleware.timeout.in'
                );
                return next.handle().pipe(
                    timeout(defaultTimeout),
                    catchError((err) => {
                        if (err instanceof TimeoutError) {
                            throw new RequestTimeoutException({
                                statusCode:
                                    ENUM_ERROR_STATUS_CODE_ERROR.ERROR_REQUEST_TIMEOUT,
                                message: 'http.clientError.requestTimeOut',
                            });
                        }
                        return throwError(() => err);
                    })
                );
            }
        }

        return next.handle();
    }
}
