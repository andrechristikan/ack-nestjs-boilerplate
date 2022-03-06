import { applyDecorators, UseFilters, UseInterceptors } from '@nestjs/common';
import { ErrorHttpFilter } from 'src/error/error.filter';
import { ResponseDefaultInterceptor } from './interceptor/response.default.interceptor';
import { ResponsePagingInterceptor } from './interceptor/response.paging.interceptor';

export function Response(messagePath: string, statusCode?: number): any {
    return applyDecorators(
        UseInterceptors(ResponseDefaultInterceptor(messagePath, statusCode)),
        UseFilters(ErrorHttpFilter)
    );
}

export function ResponsePaging(messagePath: string, statusCode?: number): any {
    return applyDecorators(
        UseInterceptors(ResponsePagingInterceptor(messagePath, statusCode)),
        UseFilters(ErrorHttpFilter)
    );
}
