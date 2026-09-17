import { HttpStatus } from '@nestjs/common';
import type { ApiParamOptions, ApiQueryOptions } from '@nestjs/swagger';
import { z } from 'zod';
import { EnumDocRequestBodyType } from '@common/doc/enums/doc.enum';
import { EnumFileExtensionDocument } from '@common/file/enums/file.enum';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';

/**
 * Options of `Doc`: the operation summary, id, description and deprecation flag.
 * @public
 */
export interface IDocOptions {
    summary?: string;
    operation?: string;
    deprecated?: boolean;
    description?: string;
}

/**
 * One documented response variant for `DocOneOf`, `DocAnyOf` and `DocAllOf`: status code, message path and optional schema.
 * @public
 */
export interface IDocOfOptions<T = unknown> {
    statusCode: number;
    messagePath: string;
    schema?: z.ZodType<T>;
}

/**
 * Options of `DocDefault`: a documented response variant plus its HTTP status.
 * @public
 */
export interface IDocDefaultOptions<T = unknown> extends IDocOfOptions<T> {
    httpStatus: HttpStatus;
}

/**
 * Options of `DocAuth`: which credentials the endpoint accepts.
 * @public
 */
export interface IDocAuthOptions {
    jwtAccessToken?: boolean;
    jwtRefreshToken?: boolean;
    xApiKey?: boolean;
    google?: boolean;
    apple?: boolean;
}

/**
 * Options of `DocRequest`: path parameters, query parameters and body type.
 * @public
 */
export interface IDocRequestOptions {
    params?: ApiParamOptions[];
    queries?: ApiQueryOptions[];
    bodyType?: EnumDocRequestBodyType;
}

/**
 * Options of `DocRequestFile`: path and query parameters plus the multipart body schema.
 * @public
 */
export interface IDocRequestFileOptions<T = unknown> extends Omit<
    IDocRequestOptions,
    'bodyType'
> {
    schema?: z.ZodType<T>;
}

/**
 * Options of `DocGuard`: which policy, role and term-policy guards the endpoint documents.
 * @public
 */
export interface IDocGuardOptions {
    policy?: boolean;
    role?: boolean;
    termPolicy?: boolean;
}

/**
 * Options of `DocResponse`: status code, HTTP status and payload schema.
 * @public
 */
export interface IDocResponseOptions<T = unknown> {
    statusCode?: number;
    httpStatus?: HttpStatus;
    schema?: z.ZodType<T>;
}

/**
 * Options of `DocResponsePaging`: item schema, pagination type, and the search and sort allow-lists.
 * @public
 */
export interface IDocResponsePagingOptions<
    T = unknown,
> extends IDocResponseOptions<T> {
    schema: z.ZodType<T>;
    availableSearch?: string[];
    availableOrderBy?: string[];
    type: EnumPaginationType;
}

/**
 * Options of `DocResponseFile`: HTTP status and the exported file extension.
 * @public
 */
export interface IDocResponseFileOptions extends Omit<
    IDocResponseOptions,
    'schema' | 'statusCode'
> {
    extension?: EnumFileExtensionDocument;
}
