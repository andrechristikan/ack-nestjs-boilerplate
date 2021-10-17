import { IErrors } from 'src/message/message.interface';

export type IResponse = Record<string, any>;
export interface IResponsePaging {
    totalData: number;
    totalPage: number;
    currentPage: number;
    perPage: number;
    data: Record<string, any>[];
}

export interface IResponseCustomError {
    httpCode: number;
    messagePath: string;
}

export interface IResponseCustomErrorOptions {
    message?: string;
    errors?: IErrors[];
}
