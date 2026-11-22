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
export interface IDocResponseEntry<T = unknown> {
    httpStatus: HttpStatus;
    statusCode: number;
    messagePath: string;
    schema?: z.ZodType<T>;
    baseSchema?: z.ZodObject;
}
