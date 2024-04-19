import { HttpStatus } from '@nestjs/common';
import { ApiParamOptions, ApiQueryOptions } from '@nestjs/swagger';
import { ClassConstructor } from 'class-transformer';
import { ENUM_DOC_REQUEST_BODY_TYPE } from 'src/common/doc/constants/doc.enum.constant';
import { ENUM_FILE_MIME } from 'src/common/file/constants/file.enum.constant';

export interface IDocOptions {
    summary?: string;
    operation?: string;
    deprecated?: boolean;
    description?: string;
}

export interface IDocOfOptions<T = any> {
    statusCode: number;
    messagePath: string;
    dto?: ClassConstructor<T>;
}

export interface IDocDefaultOptions<T = any> extends IDocOfOptions<T> {
    httpStatus: HttpStatus;
}

export interface IDocAuthOptions {
    jwtAccessToken?: boolean;
    jwtRefreshToken?: boolean;
    apiKey?: boolean;
    google?: boolean;
    apple?: boolean;
}

export interface IDocRequestOptions<T = any> {
    params?: ApiParamOptions[];
    queries?: ApiQueryOptions[];
    bodyType?: ENUM_DOC_REQUEST_BODY_TYPE;
    dto?: ClassConstructor<T>;
}

export interface IDocRequestFileOptions
    extends Omit<IDocRequestOptions, 'bodyType'> {}

export interface IDocGuardOptions {
    policy?: boolean;
    role?: boolean;
}

export interface IDocResponseOptions<T = any> {
    statusCode?: number;
    httpStatus?: HttpStatus;
    dto?: ClassConstructor<T>;
}

export interface IDocResponsePagingOptions<T = any>
    extends Omit<IDocResponseOptions<T>, 'dto'> {
    dto: ClassConstructor<T>;
}

export interface IDocResponseFileOptions
    extends Omit<IDocResponseOptions, 'dto' | 'statusCode'> {
    fileType?: ENUM_FILE_MIME;
}

export interface IDocErrorOptions<T> extends IDocResponseOptions<T> {
    messagePath: string;
}
