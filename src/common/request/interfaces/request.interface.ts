import type { Request } from 'express';
import type { GeoLocation, UserAgent } from '@generated/prisma-client/client';
import { EnumRequestThrottleRoute } from '@common/request/enums/request.enum';

export interface IRequestApp extends Omit<Request, 'user'> {
    id: string;
    correlationId: string;
}

export interface IRequestLog {
    userAgent: UserAgent;
    ipAddress: string | null;
    geoLocation: GeoLocation | null;
}

export interface IRequestContext {
    requestLog: IRequestLog;
    language: string;
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

export type IRequestThrottleRoutePolicies = Record<
    EnumRequestThrottleRoute,
    IRequestThrottlePolicy
>;

export type IRequestStorePatch<T extends object> = Partial<T>;
