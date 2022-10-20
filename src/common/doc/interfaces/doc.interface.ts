import { HttpStatus } from '@nestjs/common';
import { ApiParamOptions, ApiQueryOptions } from '@nestjs/swagger';
import { ClassConstructor } from 'class-transformer';

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
    responseVoid?: boolean;
    request?: IDocRequestOptions;
}

export interface IDocResponseOptions<T> {
    statusCode?: number;
    httpStatus?: HttpStatus;
    classSerialization?: ClassConstructor<T>;
}

export interface IDocAuthOptions {
    jwtAccessToken?: boolean;
    jwtRefreshToken?: boolean;
    apiKey?: boolean;
}

export interface IDocRequestHeaderOptions {
    userAgent?: boolean;
    timestamp?: boolean;
}

export interface IDocRequestOptions {
    params?: ApiParamOptions[];
    queries?: ApiQueryOptions[];
}
