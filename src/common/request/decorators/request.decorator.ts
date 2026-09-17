import {
    SetMetadata,
    UseGuards,
    applyDecorators,
    createParamDecorator,
} from '@nestjs/common';
import {
    RequestCustomTimeoutMetaKey,
    RequestCustomTimeoutValueMetaKey,
    RequestEnvMetaKey,
    RequestLogStoreKey,
} from '@common/request/constants/request.constant';
import ms from 'ms';
import { RequestEnvGuard } from '@common/request/guards/request.env.guard';
import { EnumAppEnvironment } from '@app/enums/app.enum';
import { RequestStorePipe } from '@common/request/pipes/request.store.pipe';
import type {
    IRequestLog,
    IRequestStoreParam,
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

const RequestStoreParam = createParamDecorator<
    IRequestStoreParam,
    IRequestStoreParam
>((param: IRequestStoreParam): IRequestStoreParam => param);

/**
 * Reads a request-store value, or one of its fields, and fails fast when the store holds nothing.
 * @public
 */
export function RequestStore(
    storeKey: string,
    field?: string
): ParameterDecorator {
    return RequestStoreParam(
        { storeKey, field: field ?? null, nullable: false },
        RequestStorePipe
    );
}

/**
 * Reads a request-store value, or one of its fields, and yields null when the store holds nothing.
 * @public
 */
export function RequestStoreNullable(
    storeKey: string,
    field?: string
): ParameterDecorator {
    return RequestStoreParam(
        { storeKey, field: field ?? null, nullable: true },
        RequestStorePipe
    );
}

/**
 * Reads the client IP, or null, from the request-log store.
 * @public
 */
export function RequestIPAddress(): ParameterDecorator {
    return RequestStore(
        RequestLogStoreKey,
        'ipAddress' satisfies Extract<keyof IRequestLog, string>
    );
}

/**
 * Reads the parsed user agent from the request-log store.
 * @public
 */
export function RequestUserAgent(): ParameterDecorator {
    return RequestStore(
        RequestLogStoreKey,
        'userAgent' satisfies Extract<keyof IRequestLog, string>
    );
}

/**
 * Reads the IP-derived geolocation, or null, from the request-log store.
 * @public
 */
export function RequestGeoLocation(): ParameterDecorator {
    return RequestStore(
        RequestLogStoreKey,
        'geoLocation' satisfies Extract<keyof IRequestLog, string>
    );
}
