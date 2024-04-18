import {
    applyDecorators,
    createParamDecorator,
    ExecutionContext,
    SetMetadata,
    UseGuards,
} from '@nestjs/common';
import {
    REQUEST_CUSTOM_TIMEOUT_META_KEY,
    REQUEST_CUSTOM_TIMEOUT_VALUE_META_KEY,
    REQUEST_PARAM_REQUIRED_META_KEY,
} from 'src/common/request/constants/request.constant';
import { RequestParamRequiredGuard } from 'src/common/request/guards/request.param-required.guard';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';

//! Get request id
export const RequestId: () => ParameterDecorator = createParamDecorator(
    (_: unknown, ctx: ExecutionContext): string => {
        const { __id } = ctx.switchToHttp().getRequest<IRequestApp>();
        return __id;
    }
);

//! Get request language
export const RequestLanguage: () => ParameterDecorator = createParamDecorator(
    (_: unknown, ctx: ExecutionContext): string => {
        const { __language } = ctx.switchToHttp().getRequest<IRequestApp>();
        return __language;
    }
);

//! Set request param validation
export function RequestParamRequired(...fields: string[]): MethodDecorator {
    return applyDecorators(
        UseGuards(RequestParamRequiredGuard),
        SetMetadata(REQUEST_PARAM_REQUIRED_META_KEY, fields)
    );
}

//! custom request timeout
export function RequestTimeout(seconds: string): MethodDecorator {
    return applyDecorators(
        SetMetadata(REQUEST_CUSTOM_TIMEOUT_META_KEY, true),
        SetMetadata(REQUEST_CUSTOM_TIMEOUT_VALUE_META_KEY, seconds)
    );
}
