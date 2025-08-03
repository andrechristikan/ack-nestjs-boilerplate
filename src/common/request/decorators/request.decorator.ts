import { SetMetadata, applyDecorators } from '@nestjs/common';
import {
    REQUEST_CUSTOM_TIMEOUT_META_KEY,
    REQUEST_CUSTOM_TIMEOUT_VALUE_META_KEY,
} from '@common/request/constants/request.constant';
import ms from 'ms';

export function RequestTimeout(seconds: ms.StringValue): MethodDecorator {
    return applyDecorators(
        SetMetadata(REQUEST_CUSTOM_TIMEOUT_META_KEY, true),
        SetMetadata(REQUEST_CUSTOM_TIMEOUT_VALUE_META_KEY, seconds)
    );
}
