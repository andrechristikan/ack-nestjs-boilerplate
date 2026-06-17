import {
    ExecutionContext,
    SetMetadata,
    UseGuards,
    applyDecorators,
    createParamDecorator,
} from '@nestjs/common';
import {
    RequestCustomTimeoutMetaKey,
    RequestCustomTimeoutValueMetaKey,
    RequestEnvMetaKey,
} from '@common/request/constants/request.constant';
import ms from 'ms';
import { RequestEnvGuard } from '@common/request/guards/request.env.guard';
import { EnumAppEnvironment } from '@app/enums/app.enum';
import { RealIp } from 'nestjs-real-ip';
import { IRequestApp } from '@common/request/interfaces/request.interface';
import { UAParser } from 'ua-parser-js';
import { getClientIp } from '@supercharge/request-ip';
import geoIp from 'geoip-lite';
import { GeoLocation } from '@generated/prisma-client';

/**
 * Overrides the global request timeout for a route.
 */
export function RequestTimeout(seconds: ms.StringValue): MethodDecorator {
    return applyDecorators(
        SetMetadata(RequestCustomTimeoutMetaKey, true),
        SetMetadata(RequestCustomTimeoutValueMetaKey, seconds)
    );
}

/**
 * Restricts a route to the given application environments.
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
 * Param decorator resolving the client's real IP address.
 */
export const RequestIPAddress = RealIp;

/**
 * Param decorator resolving geolocation from the client IP, or null when unavailable.
 */
export const RequestGeoLocation = createParamDecorator(
    (_: unknown, ctx: ExecutionContext): GeoLocation | null => {
        const request = ctx.switchToHttp().getRequest<IRequestApp>();
        const ip = getClientIp(request);

        if (!ip) {
            return null;
        }

        const geo = geoIp.lookup(ip);
        if (!geo) {
            return null;
        }

        return {
            latitude: geo.ll[0],
            longitude: geo.ll[1],
            country: geo.country,
            region: geo.region,
            city: geo.city,
        };
    }
);

/**
 * Param decorator parsing the `user-agent` header into a structured object.
 */
export const RequestUserAgent = createParamDecorator(
    (_: unknown, ctx: ExecutionContext): UAParser.IResult => {
        const { headers } = ctx.switchToHttp().getRequest<IRequestApp>();
        const userAgent = headers['user-agent'];
        return UAParser(userAgent);
    }
);
