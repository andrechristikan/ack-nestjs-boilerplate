import { HttpStatus } from '@nestjs/common';
import { ApiParamOptions, ApiQueryOptions } from '@nestjs/swagger';
import { z } from 'zod';
import { EnumDocRequestBodyType } from '@common/doc/enums/doc.enum';
import { EnumFileExtensionDocument } from '@common/file/enums/file.enum';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';

export interface IDocOptions {
    summary?: string;
    operation?: string;
    deprecated?: boolean;
    description?: string;
}

export interface IDocOfOptions<T = unknown> {
    statusCode: number;
    messagePath: string;
    schema?: z.ZodType<T>;
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

export interface IDocRequestOptions {
    params?: ApiParamOptions[];
    queries?: ApiQueryOptions[];
    bodyType?: EnumDocRequestBodyType;
}

export interface IDocRequestFileOptions<T = unknown> extends Omit<
    IDocRequestOptions,
    'bodyType'
> {
    schema?: z.ZodType<T>;
}

export interface IDocGuardOptions {
    policy?: boolean;
    role?: boolean;
    termPolicy?: boolean;
}

export interface IDocResponseOptions<T = unknown> {
    statusCode?: number;
    httpStatus?: HttpStatus;
    schema?: z.ZodType<T>;
}

export interface IDocResponsePagingOptions<
    T = unknown,
> extends IDocResponseOptions<T> {
    schema: z.ZodType<T>;
    availableSearch?: string[];
    availableOrderBy?: string[];
    type: EnumPaginationType;
}

export interface IDocResponseFileOptions extends Omit<
    IDocResponseOptions,
    'schema' | 'statusCode'
> {
    extension?: EnumFileExtensionDocument;
}
