import { Request } from 'express';
import { IAuthJwtAccessTokenPayload } from '@modules/auth/interfaces/auth.interface';
import { IPaginationQuery } from '@common/pagination/interfaces/pagination.interface';

export interface IRequestApp<T = IAuthJwtAccessTokenPayload> extends Request {
    user?: T;

    __apiKey?: any; // TODO: CHANGE WITH API KEY DOC INTERFACE
    __user?: any; // TODO: CHANGE WITH USER DOC INTERFACE
    __language: string;
    __version: string;

    __pagination?: IPaginationQuery;
}
