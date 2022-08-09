import { applyDecorators, SetMetadata, UseInterceptors } from '@nestjs/common';
import {
    LOGGER_ACTION_META_KEY,
    LOGGER_OPTIONS_META_KEY,
} from '../constants/logger.constant';
import { ENUM_LOGGER_ACTION } from '../constants/logger.enum.constant';
import { LoggerInterceptor } from '../interceptors/logger.interceptor';
import { ILoggerOptions } from '../logger.interface';

export function Logger(
    action: ENUM_LOGGER_ACTION,
    options?: ILoggerOptions
): any {
    return applyDecorators(
        UseInterceptors(LoggerInterceptor),
        SetMetadata(LOGGER_ACTION_META_KEY, action),
        SetMetadata(LOGGER_OPTIONS_META_KEY, options ? options : {})
    );
}
