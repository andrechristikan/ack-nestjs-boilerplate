import { HttpStatus } from '@nestjs/common';
import { IMessageProperties } from '@common/message/interfaces/message.interface';
import { IFileSheet } from '@common/file/interfaces/file.interface';
import {
    IPaginationCursorReturn,
    IPaginationOffsetReturn,
} from '@common/pagination/interfaces/pagination.interface';
import { ENUM_FILE_EXTENSION_EXCEL } from '@common/file/enums/file.enum';

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
    cached?: IResponseCacheOptions | boolean;
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

export interface IResponseFileReturn<T> {
    extension: ENUM_FILE_EXTENSION_EXCEL;
    data: IFileSheet<T>[];
}
