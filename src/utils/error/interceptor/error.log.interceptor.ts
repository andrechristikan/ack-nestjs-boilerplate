import {
    CallHandler,
    ExecutionContext,
    HttpException,
    NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { catchError, Observable, throwError } from 'rxjs';
import { DebuggerService } from 'src/debugger/service/debugger.service';
import { IRequestApp } from 'src/utils/request/request.interface';
import {
    ERROR_CLASS_META_KEY,
    ERROR_FUNCTION_META_KEY,
} from '../error.constant';

export class ErrorLogInterceptor implements NestInterceptor<Promise<any>> {
    constructor(
        private readonly reflector: Reflector,
        private readonly debuggerService: DebuggerService
    ) {}

    async intercept(
        context: ExecutionContext,
        next: CallHandler
    ): Promise<Observable<Promise<any> | string>> {
        const request: IRequestApp = context.switchToHttp().getRequest();
        const cls = this.reflector.get<string>(
            ERROR_CLASS_META_KEY,
            context.getHandler()
        );
        const func = this.reflector.get<string>(
            ERROR_FUNCTION_META_KEY,
            context.getHandler()
        );

        if (context.getType() === 'http') {
            return next.handle().pipe(
                catchError((err) => {
                    if (err instanceof HttpException) {
                        this.debuggerService.error(
                            request.id,
                            {
                                description: err.message,
                                class: cls,
                                function: func,
                            },
                            err.getResponse()
                        );
                    }

                    return throwError(() => err);
                })
            );
        }

        return next.handle();
    }
}
