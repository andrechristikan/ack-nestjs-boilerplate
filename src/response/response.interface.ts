import { IErrors } from 'src/message/message.interface';

export interface IResponse {
    readonly message: string;
    readonly totalData?: number;
    readonly totalPage?:number;
    readonly currentPage?:number;
    readonly perPage?:number;
    readonly errors?: IErrors[];
    readonly data?: Record<string, any> | Record<string, any>[];
}
