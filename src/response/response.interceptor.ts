import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { HttpArgumentsHost } from '@nestjs/common/interfaces';

@Injectable()
export class ResponseInterceptor
    implements NestInterceptor<Promise<any> | string> {
    async intercept(
        context: ExecutionContext,
        next: CallHandler
    ): Promise<Observable<Promise<any> | string>> {
        const ctx: HttpArgumentsHost = context.switchToHttp();
        const response: any = ctx.getResponse();

        return next.handle().pipe(
            map(async (oldData: Promise<Record<string, any> | string>) => {
                const status: number = response.statusCode;
                const data = await oldData;
                return new Promise((resolve) => {
                    resolve(
                        typeof data === 'object'
                            ? {
                                  statusCode: status,
                                  message: data.message,
                                  currentPage: data.currentPage,
                                  perPage: data.perPage,
                                  totalPage: data.totalPage,
                                  totalData: data.totalData,
                                  data: data.data
                              }
                            : data
                    );
                });
            })
        );
    }
}
