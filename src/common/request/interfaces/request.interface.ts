import type { Request } from 'express';
import type { IAuthJwtAccessTokenPayload } from '@modules/auth/interfaces/auth.interface';
import type { GeoLocation, UserAgent } from '@generated/prisma-client/client';
import { EnumRequestThrottleRoute } from '@common/request/enums/request.enum';

export interface IRequestApp<T = IAuthJwtAccessTokenPayload> extends Omit<
    Request,
    'user'
> {
    correlationId: string;
    user?: T;
}

export interface IRequestLog {
    userAgent: UserAgent;
    ipAddress: string | null;
    geoLocation: GeoLocation | null;
}

export interface IRequestThrottlePolicy {
    ttlInMs: number;
    limit: number;
    blockDurationInMs: number;
}

export interface IRequestThrottleOptions {
    user?: boolean;
    route?: EnumRequestThrottleRoute;
}
