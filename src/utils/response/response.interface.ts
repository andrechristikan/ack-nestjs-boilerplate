import { IncomingMessage } from 'http';
import { ENUM_PAGINATION_TYPE } from '../pagination/pagination.constant';

export type IResponse = Record<string, any>;
export type IResponseKafka = IncomingMessage;

export interface IResponsePaging {
    totalData: number;
    totalPage?: number;
    currentPage?: number;
    perPage?: number;
    availableSearch?: string[];
    availableSort?: string[];
    metadata?: Record<string, any>;
    data: Record<string, any>[];
}

export interface IResponseOptions {
    statusCode?: number;
}

export interface IResponsePagingOptions {
    statusCode?: number;
    type?: ENUM_PAGINATION_TYPE;
}
