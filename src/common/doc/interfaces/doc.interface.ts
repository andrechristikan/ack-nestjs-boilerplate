import { HttpStatus } from '@nestjs/common';
import { ApiParamOptions, ApiQueryOptions } from '@nestjs/swagger';
import { ClassConstructor } from 'class-transformer';
import { ENUM_DOC_REQUEST_BODY_TYPE } from '@common/doc/enums/doc.enum';
import { ENUM_FILE_EXTENSION } from '@common/file/enums/file.enum';

export interface IDocOptions {
    summary?: string;
    operation?: string;
    deprecated?: boolean;
    description?: string;
}

export interface IDocOfOptions<T = unknown> {
    statusCode: number;
    messagePath: string;
    dto?: ClassConstructor<T>;
}

export interface IDocDefaultOptions<T = unknown> extends IDocOfOptions<T> {
    httpStatus: HttpStatus;
}

export interface IDocAuthOptions {
    jwtAccessToken?: boolean;
    jwtRefreshToken?: boolean;
    xApiKey?: boolean;
    google?: boolean;
    apple?: boolean;
}

export interface IDocRequestOptions<T = unknown> {
    params?: ApiParamOptions[];
    queries?: ApiQueryOptions[];
    bodyType?: ENUM_DOC_REQUEST_BODY_TYPE;
    dto?: ClassConstructor<T>;
}

export type IDocRequestFileOptions<T = unknown> = Omit<
    IDocRequestOptions<T>,
    'bodyType'
>;

export interface IDocGuardOptions {
    policy?: boolean;
    role?: boolean;
}

export interface IDocResponseOptions<T = unknown> {
    statusCode?: number;
    httpStatus?: HttpStatus;
    dto?: ClassConstructor<T>;
}

export interface IDocResponsePagingOptions<T = unknown>
    extends IDocResponseOptions<T> {
    availableSearch?: string[];
    availableOrder?: string[];
}

export interface IDocResponseFileOptions
    extends Omit<IDocResponseOptions, 'dto' | 'statusCode'> {
    extension?: ENUM_FILE_EXTENSION;
}
