import {
    applyDecorators,
    Inject,
    UseFilters,
    UseInterceptors
} from '@nestjs/common';
import { IApplyDecorator } from 'src/auth/auth.interface';
import { ResponseFilter } from './response.filter';
import { ResponseInterceptor } from './interceptor/response.interceptor';
import { ResponseTransformerInterceptor } from './interceptor/response-transformer.interceptor';
import { ResponsePagingInterceptor } from './interceptor/response-paging.interceptor';

export function Response(messagePath: string): IApplyDecorator {
    return applyDecorators(
        UseInterceptors(ResponseInterceptor(messagePath)),
        UseFilters(ResponseFilter)
    );
}

export function ResponsePaging(messagePath: string): IApplyDecorator {
    return applyDecorators(
        UseInterceptors(ResponsePagingInterceptor(messagePath)),
        UseFilters(ResponseFilter)
    );
}

export function ResponseTransformer(transformer: any): IApplyDecorator {
    return applyDecorators(
        UseInterceptors(ResponseTransformerInterceptor(transformer))
    );
}
