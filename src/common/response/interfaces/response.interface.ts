import { HttpStatus } from '@nestjs/common';
import { IMessageProperties } from '@common/message/interfaces/message.interface';
import { IFileSheet } from '@common/file/interfaces/file.interface';

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

export interface IResponsePagingReturn<T> {
    count: number;
    page: number;
    totalPage: number;
    metadata?: IResponseMetadata;
    data: T[];
}

export interface IResponseFileReturn<T> {
    data: IFileSheet<T>[];
}
