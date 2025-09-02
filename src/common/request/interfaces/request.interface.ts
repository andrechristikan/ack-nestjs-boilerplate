import { Request } from 'express';
import { IAuthJwtAccessTokenPayload } from '@modules/auth/interfaces/auth.interface';
import { IPaginationQuery } from '@common/pagination/interfaces/pagination.interface';
import { IPolicyAbilityRule } from '@modules/policy/interfaces/policy.interface';
import { ApiKey } from '@prisma/client';

export interface IRequestApp<T = IAuthJwtAccessTokenPayload> extends Request {
    user?: T;

    __apiKey?: ApiKey;
    __user?: any; // TODO: NEXT CHANGE WITH USER DOC INTERFACE
    __language: string;
    __version: string;
    __ability: IPolicyAbilityRule;

    __pagination?: IPaginationQuery;
}
