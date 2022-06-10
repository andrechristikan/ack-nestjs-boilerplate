import { applyDecorators, UseInterceptors } from '@nestjs/common';
import { ResponseDefaultInterceptor } from './interceptor/response.default.interceptor';
import { ResponsePagingInterceptor } from './interceptor/response.paging.interceptor';
import { IResponseOptions, IResponsePagingOptions } from './response.interface';

export function Response(messagePath: string, options?: IResponseOptions): any {
    return applyDecorators(
        UseInterceptors(ResponseDefaultInterceptor(messagePath, options))
    );
}

export function ResponsePaging(
    messagePath: string,
    options?: IResponsePagingOptions
): any {
    return applyDecorators(
        UseInterceptors(ResponsePagingInterceptor(messagePath, options))
    );
}
