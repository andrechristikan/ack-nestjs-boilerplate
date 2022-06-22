import { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
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
        const cls = this.reflector.get<string>(
            ERROR_CLASS_META_KEY,
            context.getHandler()
        );
        const func = this.reflector.get<string>(
            ERROR_FUNCTION_META_KEY,
            context.getHandler()
        );

        return next.handle().pipe(
            catchError((err) => {
                const request: IRequestApp = context
                    .switchToHttp()
                    .getRequest();
                this.debuggerService.error(
                    context.getType() === 'http'
                        ? request.id
                        : ErrorLogInterceptor.name,
                    {
                        description: err.message,
                        class: cls,
                        function: func,
                    },
                    err.message
                );

                return throwError(() => err);
            })
        );
    }
}
