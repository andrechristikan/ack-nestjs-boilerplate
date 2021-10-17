import {
    applyDecorators,
    Inject,
    UseFilters,
    UseInterceptors
} from '@nestjs/common';
import { IAuthApplyDecorator } from 'src/auth/auth.interface';
import { HttpResponseFilter } from './http-response.filter';
import { HttpResponseDefaultInterceptor } from './interceptor/http-response.default.interceptor';
import { HttpResponsePagingInterceptor } from './interceptor/http-response.paging.interceptor';

export function HttpResponse(messagePath: string): IAuthApplyDecorator {
    return applyDecorators(
        UseInterceptors(HttpResponseDefaultInterceptor(messagePath)),
        UseFilters(HttpResponseFilter)
    );
}

export function HttpResponsePaging(messagePath: string): IAuthApplyDecorator {
    return applyDecorators(
        UseInterceptors(HttpResponsePagingInterceptor(messagePath)),
        UseFilters(HttpResponseFilter)
    );
}
