import {
    applyDecorators,
    Inject,
    UseFilters,
    UseInterceptors
} from '@nestjs/common';
import { IApplyDecorator } from 'src/auth/auth.interface';
import { ResponseFilter } from './response.filter';
import { ResponseDefaultInterceptor } from './interceptor/response.default.interceptor';
import { ResponsePagingInterceptor } from './interceptor/response.paging.interceptor';

export function Response(messagePath: string): IApplyDecorator {
    return applyDecorators(
        UseInterceptors(ResponseDefaultInterceptor(messagePath)),
        UseFilters(ResponseFilter)
    );
}

export function ResponsePaging(messagePath: string): IApplyDecorator {
    return applyDecorators(
        UseInterceptors(ResponsePagingInterceptor(messagePath)),
        UseFilters(ResponseFilter)
    );
}
