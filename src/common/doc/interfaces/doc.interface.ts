import { HttpStatus } from '@nestjs/common';
import { ApiParamOptions, ApiQueryOptions } from '@nestjs/swagger';
import { ClassConstructor } from 'class-transformer';
import {
    ENUM_DOC_REQUEST_BODY_TYPE,
    ENUM_DOC_RESPONSE_BODY_TYPE,
} from 'src/common/doc/constants/doc.enum.constant';

export interface IDocOfOptions {
    messagePath: string;
    statusCode: number;
    serialization?: ClassConstructor<any>;
}

export interface IDocDefaultOptions {
    httpStatus: HttpStatus;
    messagePath: string;
    statusCode: number;
    serialization?: ClassConstructor<any>;
}

export interface IDocOptions<T> {
    auth?: IDocAuthOptions;
    requestHeader?: IDocRequestHeaderOptions;
    response?: IDocResponseOptions<T>;
    request?: IDocRequestOptions;
}

export interface IDocPagingOptions<T>
    extends Omit<IDocOptions<T>, 'response' | 'request'> {
    response: IDocPagingResponseOptions<T>;
    request?: Omit<IDocRequestOptions, 'bodyType' | 'file'>;
}

export interface IDocResponseOptions<T> {
    statusCode?: number;
    httpStatus?: HttpStatus;
    bodyType?: ENUM_DOC_RESPONSE_BODY_TYPE;
    serialization?: ClassConstructor<T>;
}

export interface IDocPagingResponseOptions<T>
    extends Pick<IDocResponseOptions<T>, 'statusCode'> {
    serialization: ClassConstructor<T>;
    availableSearch: string[];
    availableSort: string[];
}

export interface IDocAuthOptions {
    jwtAccessToken?: boolean;
    jwtRefreshToken?: boolean;
    apiKey?: boolean;
    permissionToken?: boolean;
}

export interface IDocRequestHeaderOptions {
    userAgent?: boolean;
    timestamp?: boolean;
}

export interface IDocRequestOptions {
    params?: ApiParamOptions[];
    queries?: ApiQueryOptions[];
    bodyType?: ENUM_DOC_REQUEST_BODY_TYPE;
    file?: {
        multiple: boolean;
    };
}
