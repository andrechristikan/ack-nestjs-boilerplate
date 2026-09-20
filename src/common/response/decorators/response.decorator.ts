import {
    HttpStatus,
    RequestMethod,
    SetMetadata,
    UseInterceptors,
    applyDecorators,
} from '@nestjs/common';
import { HTTP_CODE_METADATA, METHOD_METADATA } from '@nestjs/common/constants';
import { ApiProduces, ApiResponse } from '@nestjs/swagger';
import { CacheKey, CacheTTL } from '@nestjs/cache-manager';
import { z } from 'zod';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import { DocResponseError } from '@common/doc/decorators/doc.decorator';
import {
    DocFileErrorResponses,
    DocPaginationCursorErrorResponses,
    DocPaginationErrorResponses,
    DocPaginationOffsetErrorResponses,
    DocSerializationErrorResponses,
} from '@common/doc/constants/doc.constant';
import { EnumFileExtensionDocument } from '@common/file/enums/file.enum';
import {
    ResponseMessagePathMetaKey,
    ResponseSchemaMetaKey,
} from '@common/response/constants/response.constant';
import { ResponseCacheInterceptor } from '@common/response/interceptors/response.cache.interceptor';
import { ResponseFileInterceptor } from '@common/response/interceptors/response.file.interceptor';
import { ResponseInterceptor } from '@common/response/interceptors/response.interceptor';
import { ResponsePaginationInterceptor } from '@common/response/interceptors/response.pagination.interceptor';
import { ResponsePaginationSchema } from '@common/response/dtos/response.pagination.dto';
import type { IResponseOptions } from '@common/response/interfaces/response.interface';

/**
 * Standardizes a route's response via `ResponseInterceptor` and documents the JSON success
 * envelope plus serialization errors. Success HTTP status and body `statusCode` both follow
 * `@HttpCode` or Nest method defaults (POST → 201, else 200). Override either at runtime via
 * `metadata` on the handler return. The handler must return `IResponseReturn<T>`.
 * @public
 */
export function Response(
    messagePath: string,
    options?: IResponseOptions
): MethodDecorator {
    return (target, propertyKey, descriptor): void => {
        const handler = descriptor.value as unknown;
        let httpStatus: HttpStatus = HttpStatus.OK;
        if (typeof handler === 'function') {
            const httpCode = Reflect.getMetadata(
                HTTP_CODE_METADATA,
                handler
            ) as number | undefined;
            if (httpCode !== undefined && httpCode !== null) {
                httpStatus = httpCode;
            } else {
                const method = Reflect.getMetadata(METHOD_METADATA, handler) as
                    RequestMethod | undefined;
                if (method === RequestMethod.POST) {
                    httpStatus = HttpStatus.CREATED;
                }
            }
        }

        const decorators: Array<
            ClassDecorator | MethodDecorator | PropertyDecorator
        > = [
            UseInterceptors(ResponseInterceptor),
            SetMetadata(ResponseMessagePathMetaKey, messagePath),
            ApiProduces('application/json'),
            DocResponseError(httpStatus, {
                messagePath,
                statusCode: httpStatus,
                ...(options?.schema
                    ? { schema: options.schema as z.ZodType }
                    : {}),
            }),
            DocSerializationErrorResponses.serialization,
        ];

        if (options?.schema) {
            decorators.push(SetMetadata(ResponseSchemaMetaKey, options.schema));
        }

        if (options?.cache) {
            decorators.push(UseInterceptors(ResponseCacheInterceptor));

            if (typeof options.cache !== 'boolean') {
                if (options.cache.key) {
                    decorators.push(CacheKey(options.cache.key));
                }

                if (options.cache.ttl) {
                    decorators.push(CacheTTL(options.cache.ttl));
                }
            }
        }

        applyDecorators(...decorators)(target, propertyKey, descriptor);
    };
}

/**
 * Standardizes a paginated route via `ResponsePaginationInterceptor` and documents the page
 * envelope plus both offset and cursor pagination error kits. Options carry schema only — no
 * `type`, no ApiQuery. The handler must return `IResponsePaginationReturn<T>`.
 * @public
 */
export function ResponsePagination(
    messagePath: string,
    options: {
        schema: StandardSchemaV1;
        cache?: IResponseOptions['cache'];
    }
): MethodDecorator {
    const decorators: Array<
        ClassDecorator | MethodDecorator | PropertyDecorator
    > = [
        UseInterceptors(ResponsePaginationInterceptor),
        SetMetadata(ResponseMessagePathMetaKey, messagePath),
        SetMetadata(ResponseSchemaMetaKey, options.schema),
        ApiProduces('application/json'),
        DocResponseError(HttpStatus.OK, {
            messagePath,
            statusCode: HttpStatus.OK,
            baseSchema: ResponsePaginationSchema,
            schema: z.array(options.schema as z.ZodType).meta({
                description: 'Page of result items',
                example: [],
            }),
        }),
        DocPaginationErrorResponses.orderByNotAllowed,
        DocPaginationErrorResponses.orderDirectionNotAllowed,
        DocPaginationErrorResponses.filterInvalidValue,
        DocPaginationErrorResponses.invalidPerPage,
        DocPaginationErrorResponses.perPageExceedsMaximum,
        DocPaginationErrorResponses.perPageCannotBeLessThanOne,
        DocPaginationOffsetErrorResponses.invalidOffsetPaginationParams,
        DocPaginationOffsetErrorResponses.invalidPage,
        DocPaginationOffsetErrorResponses.pageExceedsMaximum,
        DocPaginationOffsetErrorResponses.pageCannotBeLessThanOne,
        DocPaginationCursorErrorResponses.invalidCursorPaginationParams,
        DocPaginationCursorErrorResponses.cursorTooLong,
        DocPaginationCursorErrorResponses.invalidCursorFormat,
        DocPaginationCursorErrorResponses.invalidCursorData,
        DocPaginationCursorErrorResponses.failedToEncodeCursor,
        DocPaginationCursorErrorResponses.failedToDecodeCursor,
        DocSerializationErrorResponses.serialization,
        DocSerializationErrorResponses.paginationShapeInvalid,
        DocSerializationErrorResponses.paginationTypeInvalid,
    ];

    if (options.cache) {
        decorators.push(UseInterceptors(ResponseCacheInterceptor));

        if (typeof options.cache !== 'boolean') {
            if (options.cache.key) {
                decorators.push(CacheKey(options.cache.key));
            }

            if (options.cache.ttl) {
                decorators.push(CacheTTL(options.cache.ttl));
            }
        }
    }

    return applyDecorators(...decorators);
}

/**
 * Streams a file download via `ResponseFileInterceptor` and documents the non-JSON produces
 * plus export size/data errors. Success HTTP status follows `@HttpCode` or Nest method defaults.
 * The handler must return `IResponseFileReturn`.
 * @public
 */
export function ResponseFile(options?: {
    extension?: EnumFileExtensionDocument;
}): MethodDecorator {
    return (target, propertyKey, descriptor): void => {
        const handler = descriptor.value as unknown;
        let httpStatus: HttpStatus = HttpStatus.OK;
        if (typeof handler === 'function') {
            const httpCode = Reflect.getMetadata(
                HTTP_CODE_METADATA,
                handler
            ) as number | undefined;
            if (httpCode !== undefined && httpCode !== null) {
                httpStatus = httpCode;
            } else {
                const method = Reflect.getMetadata(METHOD_METADATA, handler) as
                    RequestMethod | undefined;
                if (method === RequestMethod.POST) {
                    httpStatus = HttpStatus.CREATED;
                }
            }
        }

        applyDecorators(
            UseInterceptors(ResponseFileInterceptor),
            ApiProduces(options?.extension ?? EnumFileExtensionDocument.csv),
            ApiResponse({
                description: httpStatus.toString(),
                status: httpStatus,
            }),
            DocFileErrorResponses.exceedMaxDataExport,
            DocFileErrorResponses.exceedMaxSizeExport
        )(target, propertyKey, descriptor);
    };
}
