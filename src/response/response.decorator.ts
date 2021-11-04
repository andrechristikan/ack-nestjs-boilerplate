import { applyDecorators, UseFilters, UseInterceptors } from '@nestjs/common';
import { IAuthApplyDecorator } from 'src/auth/auth.interface';
import { ErrorHttpFilter } from 'src/error/error.http.filter';
import { ResponseDefaultInterceptor } from './interceptor/response.default.interceptor';
import { ResponsePagingInterceptor } from './interceptor/response.paging.interceptor';

export function Response(
    messagePath: string,
    statusCode?: number
): IAuthApplyDecorator {
    return applyDecorators(
        UseInterceptors(ResponseDefaultInterceptor(messagePath, statusCode)),
        UseFilters(ErrorHttpFilter)
    );
}

export function ResponsePaging(
    messagePath: string,
    statusCode?: number
): IAuthApplyDecorator {
    return applyDecorators(
        UseInterceptors(ResponsePagingInterceptor(messagePath, statusCode)),
        UseFilters(ErrorHttpFilter)
    );
}
