import { HttpStatus } from '@nestjs/common';
import { ClassConstructor } from 'class-transformer';
import { ENUM_HELPER_FILE_EXCEL_TYPE } from 'src/common/helper/constants/helper.enum.constant';
import { IHelperFileRows } from 'src/common/helper/interfaces/helper.interface';
import { IMessageOptionsProperties } from 'src/common/message/interfaces/message.interface';

export interface IResponseCustomPropertyMetadata {
    statusCode?: number;
    message?: string;
    httpStatus?: HttpStatus;
    messageProperties?: IMessageOptionsProperties;
}

// metadata
export interface IResponseMetadata {
    customProperty?: IResponseCustomPropertyMetadata;
    [key: string]: any;
}

// decorator options

export interface IResponseOptions<T> {
    serialization?: ClassConstructor<T>;
    messageProperties?: IMessageOptionsProperties;
}

export interface IResponsePagingOptions<T>
    extends Omit<IResponseOptions<T>, 'serialization'> {
    serialization: ClassConstructor<T>;
}

export interface IResponseFileExcelOptions<T>
    extends Pick<IResponseOptions<T>, 'messageProperties'> {
    serialization?: ClassConstructor<T>[];
    type?: ENUM_HELPER_FILE_EXCEL_TYPE;
    password?: string;
}

// response
export interface IResponse {
    _metadata?: IResponseMetadata;
    data?: Record<string, any>;
}

// response pagination
export interface IResponsePagingPagination {
    totalPage: number;
    total: number;
}

export interface IResponsePaging {
    _metadata?: IResponseMetadata;
    _pagination: IResponsePagingPagination;
    data: Record<string, any>[];
}

export interface IResponseFileExcel {
    data: IHelperFileRows[];
}
