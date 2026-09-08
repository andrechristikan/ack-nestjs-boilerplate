import { Request } from 'express';
import { IAuthJwtAccessTokenPayload } from '@modules/auth/interfaces/auth.interface';
import { GeoLocation, UserAgent } from '@generated/prisma-client';
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
    ipAddress?: string | null;
    geoLocation?: GeoLocation | null;
}

export interface IRequestIsValidObjectIdPipeOptions {
    optional: boolean;
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
