import { Request } from 'express';
import { IAuthJwtAccessTokenPayload } from '@modules/auth/interfaces/auth.interface';
import { EnumRequestThrottleRoute } from '@common/request/enums/request.enum';

export interface IRequestGeoLocation {
    latitude: number;
    longitude: number;
    country: string;
    region: string;
    city: string;
}

export interface IRequestUserAgentBrowser {
    name?: string | null;
    version?: string | null;
    major?: string | null;
    type?: string | null;
}

export interface IRequestUserAgentCpu {
    architecture?: string | null;
}

export interface IRequestUserAgentDevice {
    type?: string | null;
    vendor?: string | null;
    model?: string | null;
}

export interface IRequestUserAgentEngine {
    name?: string | null;
    version?: string | null;
}

export interface IRequestUserAgentOs {
    name?: string | null;
    version?: string | null;
}

export interface IRequestUserAgent {
    ua?: string | null;
    browser?: IRequestUserAgentBrowser | null;
    cpu?: IRequestUserAgentCpu | null;
    device?: IRequestUserAgentDevice | null;
    engine?: IRequestUserAgentEngine | null;
    os?: IRequestUserAgentOs | null;
}

export interface IRequestApp<T = IAuthJwtAccessTokenPayload> extends Omit<
    Request,
    'user'
> {
    correlationId: string;
    user?: T;
}

export interface IRequestLog {
    userAgent: IRequestUserAgent;
    ipAddress?: string | null;
    geoLocation?: IRequestGeoLocation | null;
}

export interface IRequestIsValidUuidPipeOptions {
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
