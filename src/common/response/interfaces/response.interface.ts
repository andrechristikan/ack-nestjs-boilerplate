import { HttpStatus } from '@nestjs/common';
import { IMessageProperties } from '@common/message/interfaces/message.interface';
import { IFileSheet } from '@common/file/interfaces/file.interface';
import {
    IPaginationCursorReturn,
    IPaginationOffsetReturn,
} from '@common/pagination/interfaces/pagination.interface';
import { ENUM_FILE_EXTENSION_EXCEL } from '@common/file/enums/file.enum';
import { IActivityLogMetadata } from '@modules/activity-log/interfaces/activity-log.interface';

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

export interface IResponseActivityLogReturn {
    metadataActivityLog?: IActivityLogMetadata;
}

export interface IResponseOptions {
    cache?: IResponseCacheOptions | boolean;
}

export interface IResponseReturn<T = unknown>
    extends IResponseActivityLogReturn {
    metadata?: IResponseMetadata;
    data?: T;
}

export type IResponsePagingReturn<T> = (
    | IPaginationOffsetReturn<T>
    | IPaginationCursorReturn<T>
) & {
    metadata?: IResponseMetadata;
} & IResponseActivityLogReturn;

export interface IResponseFileReturn<T> extends IResponseActivityLogReturn {
    extension: ENUM_FILE_EXTENSION_EXCEL;
    data: IFileSheet<T>[];
}
