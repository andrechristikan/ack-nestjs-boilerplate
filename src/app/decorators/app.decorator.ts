import { SetMetadata, UseGuards, applyDecorators } from '@nestjs/common';
import { APP_ENV_META_KEY } from '@app/constants/app.constant';
import { ENUM_APP_ENVIRONMENT } from '@app/enums/app.enum';
import { AppEnvGuard } from '@app/guards/app.env.guard';

/**
 * Environment protection decorator for route handlers.
 *
 * Restricts access to endpoints based on the current application environment.
 * This decorator is useful for protecting debug endpoints, admin tools, or
 * development-only features from being accessed in production.
 *
 * @param envs - List of application environments where the decorated route should be accessible
 * @returns Method decorator that applies environment-based access control
 *
 * @see {@link AppEnvGuard} Guard implementation that enforces the restriction
 * @see {@link ENUM_APP_ENVIRONMENT} Available environment types
 */
export function AppEnvProtected(
    ...envs: ENUM_APP_ENVIRONMENT[]
): MethodDecorator {
    return applyDecorators(
        UseGuards(AppEnvGuard),
        SetMetadata(APP_ENV_META_KEY, envs)
    );
}
