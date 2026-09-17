import {
    SetMetadata,
    UseGuards,
    applyDecorators,
    createParamDecorator,
} from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { ClsServiceManager } from 'nestjs-cls';
import {
    RequestCustomTimeoutMetaKey,
    RequestCustomTimeoutValueMetaKey,
    RequestEnvMetaKey,
    RequestLogStoreKey,
} from '@common/request/constants/request.constant';
import ms from 'ms';
import { RequestEnvGuard } from '@common/request/guards/request.env.guard';
import { EnumAppEnvironment } from '@app/enums/app.enum';
import type { IRequestLog } from '@common/request/interfaces/request.interface';
import type { GeoLocation, UserAgent } from '@generated/prisma-client/client';

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
 * Reads the client IP resolved once per request into the request-log store.
 * @public
 */
export const RequestIPAddress = createParamDecorator(
    (_: unknown, _ctx: ExecutionContext): string | null =>
        ClsServiceManager.getClsService().get<IRequestLog>(RequestLogStoreKey)
            ?.ipAddress ?? null
);

/**
 * Reads the parsed user agent resolved once per request into the request-log store.
 * @public
 */
export const RequestUserAgent = createParamDecorator(
    (_: unknown, _ctx: ExecutionContext): UserAgent | null =>
        ClsServiceManager.getClsService().get<IRequestLog>(RequestLogStoreKey)
            ?.userAgent ?? null
);

/**
 * Reads the IP-derived geolocation resolved once per request into the request-log store.
 * @public
 */
export const RequestGeoLocation = createParamDecorator(
    (_: unknown, _ctx: ExecutionContext): GeoLocation | null =>
        ClsServiceManager.getClsService().get<IRequestLog>(RequestLogStoreKey)
            ?.geoLocation ?? null
);
