import { applyDecorators, UseInterceptors } from '@nestjs/common';
import { LoggerInterceptor } from './interceptor/logger.interceptor';
import { ENUM_LOGGER_ACTION } from './logger.constant';
import { ILoggerOptions } from './logger.interface';

export function Logger(
    action: ENUM_LOGGER_ACTION,
    options?: ILoggerOptions
): any {
    return applyDecorators(UseInterceptors(LoggerInterceptor(action, options)));
}
