import {
    applyDecorators,
    createParamDecorator,
    ExecutionContext,
    SetMetadata,
} from '@nestjs/common';
import {
    REQUEST_CUSTOM_TIMEOUT_META_KEY,
    REQUEST_CUSTOM_TIMEOUT_VALUE_META_KEY,
} from '@common/request/constants/request.constant';
import { IRequestApp } from '@common/request/interfaces/request.interface';

export const RequestLanguage: () => ParameterDecorator = createParamDecorator(
    (_: unknown, ctx: ExecutionContext): string => {
        const { __language } = ctx.switchToHttp().getRequest<IRequestApp>();
        return __language;
    },
);

export function RequestTimeout(seconds: string): MethodDecorator {
    return applyDecorators(
        SetMetadata(REQUEST_CUSTOM_TIMEOUT_META_KEY, true),
        SetMetadata(REQUEST_CUSTOM_TIMEOUT_VALUE_META_KEY, seconds)
    );
}
