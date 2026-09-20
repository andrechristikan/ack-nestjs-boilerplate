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
 * One documented response variant for `DocResponseError`: status code, message path and optional schema.
 * @public
 */
export interface IDocResponseErrorOptions<T = unknown> {
    statusCode: number;
    messagePath: string;
    schema?: z.ZodType<T>;
}

/**
 * One accumulated response entry on the decorated method: a documented response variant, its HTTP
 * status, and the envelope its schema extends. `envelope` defaults to `ResponseSchema`; a paginated
 * entry passes `ResponsePagingSchema`.
 * @public
 */
export interface IDocResponseEntry<
    T = unknown,
> extends IDocResponseErrorOptions<T> {
    httpStatus: HttpStatus;
    envelope?: z.ZodObject;
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
 * Options of `DocGuard`: which user, policy, role, term-policy, workspace, workspace-role,
 * feature-flag, project, project-member and project-role guards the endpoint documents.
 * @public
 */
export interface IDocGuardOptions {
    user?: boolean;
    policy?: boolean;
    role?: boolean;
    termPolicy?: boolean;
    workspace?: boolean;
    workspaceRole?: boolean;
    featureFlag?: boolean;
    project?: boolean;
    projectMember?: boolean;
    projectRole?: boolean;
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
 * Options of `DocResponsePagination`: item schema, pagination type, and the search and sort allow-lists.
 * @public
 */
export interface IDocResponsePaginationOptions<
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
