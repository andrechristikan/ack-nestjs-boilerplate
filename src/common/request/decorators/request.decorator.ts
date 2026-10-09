import {
    SetMetadata,
    UseGuards,
    UseInterceptors,
    applyDecorators,
    createParamDecorator,
} from '@nestjs/common';
import { ClsServiceManager } from 'nestjs-cls';
import {
    RequestCustomTimeoutMetaKey,
    RequestCustomTimeoutValueMetaKey,
    RequestEnvMetaKey,
    RequestLogStoreKey,
    RequestThrottleOptionsMetaKey,
} from '@common/request/constants/request.constant';
import ms from 'ms';
import { RequestEnvGuard } from '@common/request/guards/request.env.guard';
import { RequestThrottleUserInterceptor } from '@common/request/interceptors/request.throttle-user.interceptor';
import { EnumAppEnvironment } from '@app/enums/app.enum';
import { RequestContextMissingException } from '@common/request/exceptions/request.context-missing.exception';
import type {
    IRequestLog,
    IRequestThrottleOptions,
} from '@common/request/interfaces/request.interface';
import type { GeoLocation, UserAgent } from '@generated/prisma-client/client';
import { RequestEnvProtectedEmptyException } from '@common/request/exceptions/request.env-protected-empty.exception';

/**
 * Overrides the global request timeout for a route.
 * @public
 */
export function RequestTimeout(seconds: ms.StringValue): MethodDecorator {
    return applyDecorators(
        SetMetadata(RequestCustomTimeoutMetaKey, true),
        SetMetadata(RequestCustomTimeoutValueMetaKey, seconds)
    );
}

/**
 * Restricts a route to the given application environments.
 * @public
 */
export function RequestEnvProtected(
    ...envs: EnumAppEnvironment[]
): MethodDecorator {
    if (envs.length === 0) {
        throw new RequestEnvProtectedEmptyException();
    }

    return applyDecorators(
        UseGuards(RequestEnvGuard),
        SetMetadata(RequestEnvMetaKey, envs)
    );
}

/**
 * Switches on the `route` and `user` throttle limiters for one endpoint.
 * @public
 */
export function RequestThrottle(
    options: IRequestThrottleOptions
): MethodDecorator {
    return applyDecorators(
        SetMetadata(RequestThrottleOptionsMetaKey, options),
        UseInterceptors(RequestThrottleUserInterceptor)
    );
}

/**
 * Reads the client IP resolved once per request into the request-log store; throws when it is unresolved.
 * @public
 */
export const RequestIPAddress = createParamDecorator((): string => {
    const requestLog =
        ClsServiceManager.getClsService().get<IRequestLog | null>(
            RequestLogStoreKey
        ) ?? null;
    if (requestLog === null) {
        throw new RequestContextMissingException(RequestLogStoreKey);
    }

    const ipAddress = requestLog.ipAddress ?? null;
    if (ipAddress === null) {
        throw new RequestContextMissingException(
            `${RequestLogStoreKey}.ipAddress`
        );
    }

    return ipAddress;
});

/**
 * Reads the user agent parsed once per request into the request-log store; throws when it is absent.
 * @public
 */
export const RequestUserAgent = createParamDecorator((): UserAgent => {
    const requestLog =
        ClsServiceManager.getClsService().get<IRequestLog | null>(
            RequestLogStoreKey
        ) ?? null;
    if (requestLog === null) {
        throw new RequestContextMissingException(RequestLogStoreKey);
    }

    const userAgent = requestLog.userAgent ?? null;
    if (userAgent === null) {
        throw new RequestContextMissingException(
            `${RequestLogStoreKey}.userAgent`
        );
    }

    return userAgent;
});

/**
 * Reads the IP-derived geolocation resolved once per request into the request-log store; throws when it is unresolved.
 * @public
 */
export const RequestGeoLocation = createParamDecorator((): GeoLocation => {
    const requestLog =
        ClsServiceManager.getClsService().get<IRequestLog | null>(
            RequestLogStoreKey
        ) ?? null;
    if (requestLog === null) {
        throw new RequestContextMissingException(RequestLogStoreKey);
    }

    const geoLocation = requestLog.geoLocation ?? null;
    if (geoLocation === null) {
        throw new RequestContextMissingException(
            `${RequestLogStoreKey}.geoLocation`
        );
    }

    return geoLocation;
});
