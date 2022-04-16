import { Request } from 'express';
import { IResult } from 'ua-parser-js';
import { ENUM_PAGINATION_AVAILABLE_SORT_TYPE } from '../pagination/pagination.constant';

export interface IRequestSort {
    field: string;
    type: string;
    sort: Record<string, ENUM_PAGINATION_AVAILABLE_SORT_TYPE>;
}

export interface IRequestApp extends Request {
    userAgent: IResult;
}
