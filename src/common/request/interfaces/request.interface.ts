import type { Request } from 'express';
import { EnumRequestThrottleRoute } from '@common/request/enums/request.enum';

export type IRequestGeoLocation = {
    latitude: number;
    longitude: number;
    country: string;
    region: string;
    city: string;
};

export type IRequestUserAgentBrowser = {
    name: string | null;
    version: string | null;
    major: string | null;
    type: string | null;
};

export type IRequestUserAgentCpu = {
    architecture: string | null;
};

export type IRequestUserAgentDevice = {
    type: string | null;
    vendor: string | null;
    model: string | null;
};

export type IRequestUserAgentEngine = {
    name: string | null;
    version: string | null;
};

export type IRequestUserAgentOs = {
    name: string | null;
    version: string | null;
};

export type IRequestUserAgent = {
    ua?: string | null;
    browser?: IRequestUserAgentBrowser | null;
    cpu?: IRequestUserAgentCpu | null;
    device?: IRequestUserAgentDevice | null;
    engine?: IRequestUserAgentEngine | null;
    os?: IRequestUserAgentOs | null;
};

export interface IRequestApp extends Omit<Request, 'user'> {
    id: string;
    correlationId: string;
}

export interface IRequestLog {
    userAgent: IRequestUserAgent;
    ipAddress: string | null;
    geoLocation: IRequestGeoLocation | null;
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
