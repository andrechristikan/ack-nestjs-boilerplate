import { applyDecorators, SetMetadata, UseInterceptors } from '@nestjs/common';
import {
    LOGGER_ACTION_META_KEY,
    LOGGER_OPTIONS_META_KEY,
} from 'src/common/logger/constants/logger.constant';
import { ENUM_LOGGER_ACTION } from 'src/common/logger/constants/logger.enum.constant';
import { LoggerInterceptor } from 'src/common/logger/interceptors/logger.interceptor';
import { ILoggerOptions } from 'src/common/logger/interfaces/logger.interface';

export function Logger(
    action: ENUM_LOGGER_ACTION,
    options?: ILoggerOptions
): MethodDecorator {
    return applyDecorators(
        UseInterceptors(LoggerInterceptor),
        SetMetadata(LOGGER_ACTION_META_KEY, action),
        SetMetadata(LOGGER_OPTIONS_META_KEY, options ?? {})
    );
}
