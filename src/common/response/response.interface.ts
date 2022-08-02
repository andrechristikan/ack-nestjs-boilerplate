import { IMessage } from '../message/message.interface';

export interface IResponseMetadata {
    statusCode?: number;
    message?: string;
    [key: string]: any;
}

// response from controller
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

// response for client
export interface IResponseMetadataHttp {
    [key: string]: any;
}

export interface IResponsePagingMetadataHttp extends IResponseMetadataHttp {
    nextPage?: string;
    previousPage?: string;
    firstPage: string;
    lastPage: string;
}

export interface IResponseHttp {
    statusCode: number;
    message: string | IMessage;
    metadata: IResponseMetadataHttp;
    data?: Record<string, any>;
}

export interface IResponsePagingHttp extends Omit<IResponsePaging, 'metadata'> {
    statusCode: number;
    message: string | IMessage;
    metadata: IResponsePagingMetadataHttp;
}
