import { HttpStatus } from '@nestjs/common';
import { z } from 'zod';

/** @public */
export interface IDocOptions {
    summary?: string;
    operation?: string;
    deprecated?: boolean;
    description?: string;
    errors?: IDocResponseEntry[];
}

/** @public */
export interface IDocResponseErrorOptions<T = unknown> {
    statusCode: number;
    messagePath: string;
    schema?: z.ZodType<T>;
    baseSchema?: z.ZodObject;
}

/** @public */
export interface IDocResponseEntry<
    T = unknown,
> extends IDocResponseErrorOptions<T> {
    httpStatus: HttpStatus;
}
