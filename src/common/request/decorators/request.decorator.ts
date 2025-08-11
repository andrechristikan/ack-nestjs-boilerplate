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
 *
 * Sets a custom timeout value for specific endpoints that may require longer processing time
 * than the default application timeout. This decorator applies metadata that can be used by
 * timeout interceptors or middleware to override the default request timeout configuration.
 * The timeout value is stored using ms library format which supports various time units.
 *
 * @param seconds - Timeout duration in ms.StringValue format (e.g., '30s', '2m', '5000')
 * @returns A method decorator that applies custom timeout metadata to the route handler
 *
 * @see {@link REQUEST_CUSTOM_TIMEOUT_META_KEY} - Metadata key used to mark custom timeout
 * @see {@link REQUEST_CUSTOM_TIMEOUT_VALUE_META_KEY} - Metadata key used to store timeout value
 */
export function RequestTimeout(seconds: ms.StringValue): MethodDecorator {
    return applyDecorators(
        SetMetadata(REQUEST_CUSTOM_TIMEOUT_META_KEY, true),
        SetMetadata(REQUEST_CUSTOM_TIMEOUT_VALUE_META_KEY, seconds)
    );
}

/**
 * Environment protection decorator for route handlers.
 *
 * Restricts access to endpoints based on the current application environment.
 * This decorator is useful for protecting debug endpoints, admin tools, or
 * development-only features from being accessed in production environments.
 * The decorator applies the RequestEnvGuard which validates the current environment
 * against the specified allowed environments.
 *
 * @param envs - Array of application environments where the decorated route should be accessible.
 *               If the current environment is not in this list, access will be denied.
 * @returns A method decorator that applies environment-based access control to the route handler
 *
 * @see {@link RequestEnvGuard} - Guard implementation that enforces the environment restriction
 * @see {@link ENUM_APP_ENVIRONMENT} - Available environment types that can be specified
 * @see {@link REQUEST_ENV_META_KEY} - Metadata key used to store environment configuration
 */
export function RequestEnvProtected(
    ...envs: ENUM_APP_ENVIRONMENT[]
): MethodDecorator {
    return applyDecorators(
        UseGuards(RequestEnvGuard),
        SetMetadata(REQUEST_ENV_META_KEY, envs)
    );
}
