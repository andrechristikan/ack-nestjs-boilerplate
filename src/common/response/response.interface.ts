import { ENUM_PAGINATION_TYPE } from '../pagination/constants/pagination.constant';

export interface IResponseMetadata {
    statusCode?: number;
    message?: string;
    [key: string]: any;
}
export interface IResponse {
    metadata?: IResponseMetadata;
    [key: string]: any;
}

export interface IResponsePaging {
    totalData: number;
    totalPage?: number;
    currentPage?: number;
    perPage?: number;
    availableSearch?: string[];
    availableSort?: string[];
    metadata?: IResponseMetadata;
    data: Record<string, any>[];
}

export interface IResponsePagingOptions {
    type?: ENUM_PAGINATION_TYPE;
}
