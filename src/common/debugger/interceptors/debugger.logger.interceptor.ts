import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ConfigService } from '@nestjs/config';
import { DebuggerService } from 'src/common/debugger/services/debugger.service';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';
import { Response } from 'express';

@Injectable()
export class DebuggerInterceptor implements NestInterceptor<Promise<any>> {
    private readonly writeIntoFile: boolean;

    constructor(
        private readonly configService: ConfigService,
        private readonly debuggerService: DebuggerService
    ) {
        this.writeIntoFile = this.configService.get<boolean>(
            'debugger.writeIntoFile'
        );
    }

    async intercept(
        context: ExecutionContext,
        next: CallHandler
    ): Promise<Observable<Promise<any> | string>> {
        if (context.getType() === 'http') {
            const request: IRequestApp = context
                .switchToHttp()
                .getRequest<IRequestApp>();

            console.log('aaa');

            if (this.writeIntoFile) {
                console.log('bbb');
                this.debuggerService.info({
                    type: 'request',
                    method: request.method,
                    path: request.path,
                    originalUrl: request.originalUrl,
                    params: request.params,
                    body: request.body,
                    baseUrl: request.baseUrl,
                    query: request.query,
                    ip: request.ip,
                    hostname: request.hostname,
                    protocol: request.protocol,
                });
            }

            return next.handle().pipe(
                tap(() => {
                    console.log('ccc');
                    const response: Response = context
                        .switchToHttp()
                        .getResponse<Response>();

                    if (this.writeIntoFile) {
                        console.log('ddd');
                        this.debuggerService.info({
                            type: 'response',
                            statusCode: response.statusCode,
                            message: response.statusMessage,
                        });
                    }
                })
            );
        }

        return next.handle();
    }
}
