import { Request } from 'express';
import { IAuthJwtAccessTokenPayload } from '@modules/auth/interfaces/auth.interface';
import { IPaginationQuery } from '@common/pagination/interfaces/pagination.interface';
import { ApiKey, GeoLocation, UserAgent } from '@prisma/client';
import { IUser } from '@modules/user/interfaces/user.interface';
import { PolicyAbility } from '@modules/policy/interfaces/policy.interface';

export interface IRequestApp<T = IAuthJwtAccessTokenPayload> extends Request {
    correlationId: string;
    user?: T;

    __apiKey?: ApiKey;
    __user?: IUser;
    __abilities?: PolicyAbility;

    __pagination?: IPaginationQuery;

    __language: string;
    __version: string;
}

export interface IRequestLog {
    userAgent: UserAgent;
    ipAddress: string;
    geoLocation?: GeoLocation;
}
