import { applyDecorators, SetMetadata, UseInterceptors } from '@nestjs/common';
import { RESPONSE_CUSTOM_TIMEOUT_META_KEY } from './constants/response.constant';
import { ResponseDefaultInterceptor } from './interceptors/response.default.interceptor';
import { ResponsePagingInterceptor } from './interceptors/response.paging.interceptor';
import { ResponseTimeoutInterceptor } from './interceptors/response.timeout.interceptor';
import { IResponsePagingOptions } from './response.interface';

export function Response(messagePath: string): any {
    return applyDecorators(
        UseInterceptors(ResponseDefaultInterceptor(messagePath))
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
