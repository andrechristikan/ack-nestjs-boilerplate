import {
    applyDecorators,
    Inject,
    UseFilters,
    UseInterceptors
} from '@nestjs/common';
import { IApplyDecorator } from 'src/auth/auth.interface';
import { ResponseFilter } from './response.filter';
import { ResponseInterceptor } from './response.interceptor';
import { ResponseDataTransformerInterceptor } from './response.transformer';

export function Response(): (
    target: Record<string, any>,
    key: string | symbol,
    index?: number
) => void {
    return Inject(`ResponseService`);
}

export function ResponseJson(): IApplyDecorator {
    return applyDecorators(
        UseInterceptors(ResponseInterceptor),
        UseFilters(ResponseFilter)
    );
}

export function ResponseDataTransformer(transformer: any): IApplyDecorator {
    return applyDecorators(
        UseInterceptors(ResponseDataTransformerInterceptor(transformer))
    );
}
