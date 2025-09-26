import { Request } from 'express';
import { IAuthJwtAccessTokenPayload } from '@modules/auth/interfaces/auth.interface';
import { IPaginationQuery } from '@common/pagination/interfaces/pagination.interface';
import { ApiKey } from '@prisma/client';
import { RoleAbilityDto } from '@modules/role/dtos/role.ability.dto';
import { IBrowser, ICPU, IDevice, IEngine, IOS } from 'ua-parser-js';
import { IUser } from '@modules/user/interfaces/user.interface';

export interface IRequestApp<T = IAuthJwtAccessTokenPayload> extends Request {
    user?: T;

    __apiKey?: ApiKey;
    __user?: IUser;
    __abilities?: RoleAbilityDto[];

    __pagination?: IPaginationQuery;

    __language: string;
    __version: string;
}

export interface IRequestLog {
    userAgent: IRequestUserAgent;
    ipAddress: string;
}

export interface IRequestUserAgent {
    ua: string;
    browser: Omit<
        IBrowser,
        'is' | 'toString' | 'withClientHints' | 'withFeatureCheck'
    >;
    cpu: Omit<ICPU, 'is' | 'toString' | 'withClientHints' | 'withFeatureCheck'>;
    device: Omit<
        IDevice,
        'is' | 'toString' | 'withClientHints' | 'withFeatureCheck'
    >;
    engine: Omit<
        IEngine,
        'is' | 'toString' | 'withClientHints' | 'withFeatureCheck'
    >;
    os: Omit<IOS, 'is' | 'toString' | 'withClientHints' | 'withFeatureCheck'>;
}
