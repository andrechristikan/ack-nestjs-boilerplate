import { applyDecorators, UseFilters, UseInterceptors } from '@nestjs/common';
import { IAuthApplyDecorator } from 'src/auth/auth.interface';
import { ErrorHttpFilter } from 'src/error/filter/error.http.filter';
import { ResponseDefaultInterceptor } from './interceptor/response.default.interceptor';
import { ResponsePagingInterceptor } from './interceptor/response.paging.interceptor';

export function Response(messagePath: string): IAuthApplyDecorator {
    return applyDecorators(
        UseInterceptors(ResponseDefaultInterceptor(messagePath)),
        UseFilters(ErrorHttpFilter)
    );
}

export function ResponsePaging(messagePath: string): IAuthApplyDecorator {
    return applyDecorators(
        UseInterceptors(ResponsePagingInterceptor(messagePath)),
        UseFilters(ErrorHttpFilter)
    );
}
