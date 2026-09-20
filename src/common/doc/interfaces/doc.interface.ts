import { HttpStatus } from '@nestjs/common';
import { z } from 'zod';

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
 * One documented response variant for `DocResponseError` / `DocErrors`: status code, message
 * path, optional `data` schema, and optional base schema (defaults to `ResponseSchema`;
 * paginated success passes `ResponsePaginationSchema`).
 * @public
 */
export interface IDocResponseErrorOptions<T = unknown> {
    statusCode: number;
    messagePath: string;
    schema?: z.ZodType<T>;
    baseSchema?: z.ZodObject;
}

/**
 * A documented response entry stored on the decorated method: the error options plus the HTTP
 * status they belong to.
 * @public
 */
export interface IDocResponseEntry<
    T = unknown,
> extends IDocResponseErrorOptions<T> {
    httpStatus: HttpStatus;
}
