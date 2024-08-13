import { applyDecorators, SetMetadata } from '@nestjs/common';
import {
    REQUEST_CUSTOM_TIMEOUT_META_KEY,
    REQUEST_CUSTOM_TIMEOUT_VALUE_META_KEY,
} from 'src/common/request/constants/request.constant';

//! custom app timeout
export function RequestTimeout(seconds: string): MethodDecorator {
    return applyDecorators(
        SetMetadata(REQUEST_CUSTOM_TIMEOUT_META_KEY, true),
        SetMetadata(REQUEST_CUSTOM_TIMEOUT_VALUE_META_KEY, seconds)
    );
}
