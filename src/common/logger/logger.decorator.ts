import { applyDecorators, UseInterceptors } from '@nestjs/common';
import { ENUM_LOGGER_ACTION } from './constants/logger.constant';
import { LoggerInterceptor } from './interceptors/logger.interceptor';
import { ILoggerOptions } from './logger.interface';

export function Logger(
    action: ENUM_LOGGER_ACTION,
    options?: ILoggerOptions
): any {
    return applyDecorators(UseInterceptors(LoggerInterceptor(action, options)));
}
