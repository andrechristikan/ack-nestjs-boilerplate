import { ClassConstructor } from 'class-transformer';
import { IHelperFileExcelRows } from 'src/common/helper/interfaces/helper.interface';
import { IMessageOptionsProperties } from 'src/common/message/interfaces/message.interface';

export interface IResponseMetadata {
    statusCode?: number;
    message?: string;
    messageProperties?: IMessageOptionsProperties;
    [key: string]: any;
}

export interface IResponseOptions<T> {
    classSerialization?: ClassConstructor<T>;
    messageProperties?: IMessageOptionsProperties;
}

export type IResponsePagingOptions<T> = IResponseOptions<T>;

export type IResponseExcelOptions<T> = IResponseOptions<T>;

export type IResponseExcel = IHelperFileExcelRows[];

export interface IResponse {
    metadata?: IResponseMetadata;
    [key: string]: any;
}

export interface IResponsePaging<T = Record<string, any>> {
    totalData: number;
    totalPage?: number;
    currentPage?: number;
    perPage?: number;
    availableSearch?: string[];
    availableSort?: string[];
    metadata?: IResponseMetadata;
    data: T[];
}
