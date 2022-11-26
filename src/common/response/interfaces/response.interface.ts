import { ClassConstructor } from 'class-transformer';
import { ENUM_HELPER_FILE_TYPE } from 'src/common/helper/constants/helper.enum.constant';
import { IHelperFileRows } from 'src/common/helper/interfaces/helper.interface';
import { IMessageOptionsProperties } from 'src/common/message/interfaces/message.interface';
import { Response } from 'express';

export interface IResponseMetadata {
    statusCode?: number;
    message?: string;
    messageProperties?: IMessageOptionsProperties;
    [key: string]: any;
}

export interface IResponseOptions<T> {
    serialization?: ClassConstructor<T>;
    messageProperties?: IMessageOptionsProperties;
}

export type IResponsePagingOptions<T> = IResponseOptions<T>;

export interface IResponseExcelOptions<T> extends IResponseOptions<T> {
    type?: ENUM_HELPER_FILE_TYPE;
}

export type IResponseExcel = IHelperFileRows[];

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

export interface IResponseCustom extends Response {
    body: string;
}
