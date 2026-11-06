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
import { DocErrors } from '@common/doc/decorators/doc.decorator';
import { EnumFileExtensionDocument } from '@common/file/enums/file.enum';
import {
    ResponseDocErrors,
    ResponseFileDocErrors,
    ResponseFileMediaTypes,
    ResponseMessagePathMetaKey,
    ResponsePaginationDocErrors,
    ResponseSchemaMetaKey,
} from '@common/response/constants/response.constant';
import { ResponseCacheInterceptor } from '@common/response/interceptors/response.cache.interceptor';
import { ResponseFileInterceptor } from '@common/response/interceptors/response.file.interceptor';
import { ResponseInterceptor } from '@common/response/interceptors/response.interceptor';
import { ResponsePaginationInterceptor } from '@common/response/interceptors/response.pagination.interceptor';
import { ResponsePaginationSchema } from '@common/response/dtos/response.pagination.dto';
import type {
    IResponseFileInterceptorOptions,
    IResponseOptions,
} from '@common/response/interfaces/response.interface';

/** @public */
export function Response(
    messagePath: string,
    options?: IResponseOptions
): MethodDecorator {
    return (target, propertyKey, descriptor): void => {
        const handler = descriptor.value as unknown;
        let httpStatus: HttpStatus = HttpStatus.OK;
        if (typeof handler === 'function') {
            const httpCode =
                (Reflect.getMetadata(HTTP_CODE_METADATA, handler) as
                    number | undefined) ?? null;
            if (httpCode !== null) {
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
            DocErrors(
                {
                    httpStatus,
                    messagePath,
                    statusCode: httpStatus,
                    ...(options?.schema
                        ? { schema: options.schema as z.ZodType }
                        : {}),
                },
                ...ResponseDocErrors
            ),
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

/** @public */
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
        DocErrors(
            {
                httpStatus: HttpStatus.OK,
                messagePath,
                statusCode: HttpStatus.OK,
                baseSchema: ResponsePaginationSchema,
                schema: z.array(options.schema as z.ZodType).meta({
                    description: 'Page of result items',
                    example: [],
                }),
            },
            ...ResponsePaginationDocErrors
        ),
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

/** @public */
export function ResponseFile(
    options?: IResponseFileInterceptorOptions & {
        extension?: EnumFileExtensionDocument;
    }
): MethodDecorator {
    return (target, propertyKey, descriptor): void => {
        const handler = descriptor.value as unknown;
        let httpStatus: HttpStatus = HttpStatus.OK;
        if (typeof handler === 'function') {
            const httpCode =
                (Reflect.getMetadata(HTTP_CODE_METADATA, handler) as
                    number | undefined) ?? null;
            if (httpCode !== null) {
                httpStatus = httpCode;
            } else {
                const method = Reflect.getMetadata(METHOD_METADATA, handler) as
                    RequestMethod | undefined;
                if (method === RequestMethod.POST) {
                    httpStatus = HttpStatus.CREATED;
                }
            }
        }

        const extension = options?.extension ?? EnumFileExtensionDocument.csv;
        const maxDataExportConfigKey = options?.maxDataExportConfigKey ?? null;
        const mediaType = ResponseFileMediaTypes[extension];

        applyDecorators(
            UseInterceptors(
                ResponseFileInterceptor({
                    ...(maxDataExportConfigKey !== null && {
                        maxDataExportConfigKey,
                    }),
                })
            ),
            ApiResponse({
                description: httpStatus.toString(),
                status: httpStatus,
                content: {
                    [mediaType]: {
                        schema: { type: 'string', format: 'binary' },
                    },
                },
            }),
            DocErrors(...ResponseFileDocErrors)
        )(target, propertyKey, descriptor);
    };
}
