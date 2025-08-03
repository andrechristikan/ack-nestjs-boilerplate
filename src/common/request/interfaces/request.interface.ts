import { Request } from 'express';
import { IPagination } from '@common/pagination/interfaces/pagination.interface';
import { IAuthJwtAccessTokenPayload } from '@modules/auth/interfaces/auth.interface';

export interface IRequestApp<T = IAuthJwtAccessTokenPayload> extends Request {
    user?: T;

    __apiKey?: ApiKeyEntity;
    // TODO: CHECK
    __user?: any;
    __language: string;
    __version: string;

    __pagination?: IPagination;
}
