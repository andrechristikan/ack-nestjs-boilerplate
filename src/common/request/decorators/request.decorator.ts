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
    IRequestGeoLocation,
    IRequestLog,
    IRequestThrottleOptions,
    IRequestUserAgent,
} from '@common/request/interfaces/request.interface';

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
    const requestLog = ClsServiceManager.getClsService().get<
        IRequestLog | undefined
    >(RequestLogStoreKey);
    if (requestLog === undefined || requestLog === null) {
        throw new RequestContextMissingException(RequestLogStoreKey);
    }

    const { ipAddress } = requestLog;
    if (ipAddress === undefined || ipAddress === null) {
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
export const RequestUserAgent = createParamDecorator((): IRequestUserAgent => {
    const requestLog = ClsServiceManager.getClsService().get<
        IRequestLog | undefined
    >(RequestLogStoreKey);
    if (requestLog === undefined || requestLog === null) {
        throw new RequestContextMissingException(RequestLogStoreKey);
    }

    const { userAgent } = requestLog;
    if (userAgent === undefined || userAgent === null) {
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
export const RequestGeoLocation = createParamDecorator(
    (): IRequestGeoLocation => {
        const requestLog = ClsServiceManager.getClsService().get<
            IRequestLog | undefined
        >(RequestLogStoreKey);
        if (requestLog === undefined || requestLog === null) {
            throw new RequestContextMissingException(RequestLogStoreKey);
        }

        const { geoLocation } = requestLog;
        if (geoLocation === undefined || geoLocation === null) {
            throw new RequestContextMissingException(
                `${RequestLogStoreKey}.geoLocation`
            );
        }

        return geoLocation;
    }
);
