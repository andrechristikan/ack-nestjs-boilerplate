import { HttpStatus } from '@nestjs/common';
import { IFileRows } from '@common/file/interfaces/file.interface';
import { ENUM_HELPER_FILE_EXCEL_TYPE } from '@common/helper/enums/helper.enum';
import { IDatabasePagination } from '@common/database/interfaces/database.repository.interface';
import { IMessageProperties } from '@common/message/interfaces/message.interface';

// metadata
export interface IResponseMetadata {
    statusCode?: number;
    httpStatus?: HttpStatus;
    messagePath?: string;
    messageProperties?: IMessageProperties;
}

// decorator options
export interface IResponseOptions {
    cached?: IResponseCacheOptions | boolean;
}

export interface IResponseFileExcelOptions {
    type?: ENUM_HELPER_FILE_EXCEL_TYPE;
}

// response
export interface IResponse<T = void> {
    _metadata?: IResponseMetadata;
    data?: T;
}

// response pagination
export interface IResponsePaging<T>
    extends Omit<IDatabasePagination<T>, 'items'> {
    _metadata?: IResponseMetadata;
    data: T[];
}

export interface IResponseFileExcel<T> {
    data: IFileRows<T>[];
}

// cached
export interface IResponseCacheOptions {
    key?: string;
    ttl?: number;
}
