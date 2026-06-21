import { HttpStatus } from '@nestjs/common';
import { IMessageProperties } from '@common/message/interfaces/message.interface';
import {
    IPaginationCursorReturn,
    IPaginationOffsetReturn,
} from '@common/pagination/interfaces/pagination.interface';
import { EnumFileExtensionDocument } from '@common/file/enums/file.enum';

export interface IResponseMetadata {
    statusCode?: number;
    httpStatus?: HttpStatus;
    messagePath?: string;
    messageProperties?: IMessageProperties;
}

export interface IResponseCacheOptions {
    key?: string;
    ttl?: number;
}

export interface IResponseOptions {
    cache?: IResponseCacheOptions | boolean;
}

export interface IResponseReturn<T = unknown> {
    metadata?: IResponseMetadata;
    data?: T;
}

export type IResponsePagingReturn<T> = (
    | IPaginationOffsetReturn<T>
    | IPaginationCursorReturn<T>
) & {
    metadata?: IResponseMetadata;
};

export interface IResponseCsvReturn {
    data: string;
    extension: EnumFileExtensionDocument.csv;
    filename?: string;
}

export interface IResponsePdfReturn {
    data: Buffer;
    extension: EnumFileExtensionDocument.pdf;
    filename?: string;
}

export type IResponseFileReturn = IResponseCsvReturn | IResponsePdfReturn;
