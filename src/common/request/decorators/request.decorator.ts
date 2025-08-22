import { SetMetadata, UseGuards, applyDecorators } from '@nestjs/common';
import {
    REQUEST_CUSTOM_TIMEOUT_META_KEY,
    REQUEST_CUSTOM_TIMEOUT_VALUE_META_KEY,
    REQUEST_ENV_META_KEY,
} from '@common/request/constants/request.constant';
import ms from 'ms';
import { RequestEnvGuard } from '@common/request/guards/request.env.guard';
import { ENUM_APP_ENVIRONMENT } from '@app/enums/app.enum';

/**
 * Request timeout decorator for route handlers.
 * Sets a custom timeout value for specific endpoints.
 *
 * @param seconds - Timeout duration in ms.StringValue format
 * @returns A method decorator that applies custom timeout metadata
 */
export function RequestTimeout(seconds: ms.StringValue): MethodDecorator {
    return applyDecorators(
        SetMetadata(REQUEST_CUSTOM_TIMEOUT_META_KEY, true),
        SetMetadata(REQUEST_CUSTOM_TIMEOUT_VALUE_META_KEY, seconds)
    );
}

/**
 * Environment protection decorator for route handlers.
 * Restricts access to endpoints based on the current application environment.
 *
 * @param envs - Array of application environments where the route should be accessible
 * @returns A method decorator that applies environment-based access control
 */
export function RequestEnvProtected(
    ...envs: ENUM_APP_ENVIRONMENT[]
): MethodDecorator {
    return applyDecorators(
        UseGuards(RequestEnvGuard),
        SetMetadata(REQUEST_ENV_META_KEY, envs)
    );
}
