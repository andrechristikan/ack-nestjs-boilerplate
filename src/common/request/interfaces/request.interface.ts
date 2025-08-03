import { Request } from 'express';
import { IAuthJwtAccessTokenPayload } from '@modules/auth/interfaces/auth.interface';
import { IPaginationQuery } from '@common/pagination/interfaces/pagination.interface';

export interface IRequestApp<T = IAuthJwtAccessTokenPayload> extends Request {
    user?: T;

    __apiKey?: any;
    // TODO: CHECK
    __user?: any;
    __language: string;
    __version: string;

    __pagination?: IPaginationQuery;
}
