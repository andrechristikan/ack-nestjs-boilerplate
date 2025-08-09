import { Request } from 'express';
import { IAuthJwtAccessTokenPayload } from '@modules/auth/interfaces/auth.interface';
import { IPaginationQuery } from '@common/pagination/interfaces/pagination.interface';
import { ApiKeyEntity } from '@modules/api-key/repository/entities/api-key.entity';
import { IPolicyAbilityRule } from '@modules/policy/interfaces/policy.interface';

export interface IRequestApp<T = IAuthJwtAccessTokenPayload> extends Request {
    user?: T;

    __apiKey?: ApiKeyEntity;
    __user?: any; // TODO: CHANGE WITH USER DOC INTERFACE
    __language: string;
    __version: string;
    __ability: IPolicyAbilityRule;

    __pagination?: IPaginationQuery;
}
