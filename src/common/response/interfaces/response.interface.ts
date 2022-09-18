import { HttpStatus } from '@nestjs/common';
import { ApiParamOptions, ApiQueryOptions } from '@nestjs/swagger';
import { ClassConstructor } from 'class-transformer';
import { IHelperFileExcelRows } from 'src/common/helper/interfaces/helper.interface';
import { IMessageOptionsProperties } from 'src/common/message/interfaces/message.interface';

// Doc
export interface IResponseDoc {
    httpStatus: HttpStatus;
    messagePath: string;
    statusCode: number;
    serialization?: ClassConstructor<any>;
}

export interface IResponseDocs {
    messagePath: string;
    statusCode: number;
    serialization?: ClassConstructor<any>;
}

export interface IResponseDocOptions {
    httpStatus?: HttpStatus;
    statusCode?: number;
    params?: ApiParamOptions[];
    queries?: ApiQueryOptions[];
    responses?: IResponseDoc[];
}

export interface IResponseDocPagingOptions
    extends Omit<IResponseDocOptions, 'httpStatus'> {
    availableSearch?: string[];
    availableSort?: string[];
}

export interface IResponseMetadata {
    statusCode?: number;
    message?: string;
    messageProperties?: IMessageOptionsProperties;
    [key: string]: any;
}

export interface IResponseOptions<T> {
    classSerialization?: ClassConstructor<T>;
    messageProperties?: IMessageOptionsProperties;
    doc?: IResponseDocOptions;
    excludeRequestBodyJson?: boolean;
}

export interface IResponsePagingOptions<T>
    extends Omit<IResponseOptions<T>, 'excludeRequestBodyJson' | 'doc'> {
    doc?: IResponseDocPagingOptions;
}

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
