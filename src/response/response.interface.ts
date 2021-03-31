import { IErrors } from 'src/message/message.interface';

export interface IResponse {
    readonly message: string;
    readonly errors?: IErrors[];
    readonly data?: Record<string, any> | Record<string, any>[];
}

export interface IResponsePaging extends Omit<IResponse, 'errors' | 'data'> {
    readonly totalData: number;
    readonly totalPage: number;
    readonly currentPage: number;
    readonly perPage: number;
    readonly data: Record<string, any> | Record<string, any>[];
}
