import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { HttpArgumentsHost } from '@nestjs/common/interfaces';
import { FILE_CUSTOM_MAX_SIZE_META_KEY } from 'src/common/file/constants/file.constant';
import { Reflector } from '@nestjs/core';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';

@Injectable()
export class FileCustomMaxSizeInterceptor implements NestInterceptor<any> {
    constructor(private readonly reflector: Reflector) {}

    async intercept(
        context: ExecutionContext,
        next: CallHandler
    ): Promise<Observable<void>> {
        if (context.getType() === 'http') {
            const ctx: HttpArgumentsHost = context.switchToHttp();
            const request = ctx.getRequest<
                IRequestApp & { __customMaxFileSize: string }
            >();

            const customSize: string = this.reflector.get<string>(
                FILE_CUSTOM_MAX_SIZE_META_KEY,
                context.getHandler()
            );
            request.__customMaxFileSize = customSize;

            return next.handle();
        }

        return next.handle();
    }
}
