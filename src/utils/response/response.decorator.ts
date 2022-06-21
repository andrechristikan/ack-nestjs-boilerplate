import { applyDecorators, SetMetadata, UseInterceptors } from '@nestjs/common';
import { ResponseDefaultInterceptor } from './interceptor/response.default.interceptor';
import { ResponsePagingInterceptor } from './interceptor/response.paging.interceptor';
import { ResponseTimeoutInterceptor } from './interceptor/response.timeout.interceptor';
import { RESPONSE_CUSTOM_TIMEOUT_META_KEY } from './response.constant';
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

export function ResponseTimeout(seconds: string): any {
    return applyDecorators(
        SetMetadata(RESPONSE_CUSTOM_TIMEOUT_META_KEY, true),
        UseInterceptors(ResponseTimeoutInterceptor(seconds))
    );
}
