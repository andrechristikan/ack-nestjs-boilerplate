import { IErrors } from 'src/message/message.interface';

export type IResponse = Record<string, any>;

export interface IResponseError {
    httpCode: number;
    messagePath: string;
}

export interface IResponseException {
    message?: string;
    errors?: IErrors[];
}
export interface IResponsePaging {
    totalData: number;
    totalPage: number;
    currentPage: number;
    perPage: number;
    data: Record<string, any>[];
}
