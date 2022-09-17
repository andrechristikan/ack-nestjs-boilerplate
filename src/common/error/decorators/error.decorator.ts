import { applyDecorators, SetMetadata } from '@nestjs/common';
import {
    ERROR_CLASS_META_KEY,
    ERROR_FUNCTION_META_KEY,
} from 'src/common/error/constants/error.constant';

export function ErrorMeta(cls: string, func: string): any {
    return applyDecorators(
        SetMetadata(ERROR_CLASS_META_KEY, cls),
        SetMetadata(ERROR_FUNCTION_META_KEY, func)
    );
}
