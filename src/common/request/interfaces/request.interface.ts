import { Request } from 'express';
import { IAuthJwtAccessTokenPayload } from '@modules/auth/interfaces/auth.interface';
import { GeoLocation, UserAgent } from '@generated/prisma-client';

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
