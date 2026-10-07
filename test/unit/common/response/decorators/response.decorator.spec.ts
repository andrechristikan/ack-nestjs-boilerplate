import { HttpStatus, RequestMethod } from '@nestjs/common';
import type { NestInterceptor, Type } from '@nestjs/common';
import {
    HTTP_CODE_METADATA,
    METHOD_METADATA,
    INTERCEPTORS_METADATA,
} from '@nestjs/common/constants';
import { DECORATORS } from '@nestjs/swagger';
import { CACHE_KEY_METADATA, CACHE_TTL_METADATA } from '@nestjs/cache-manager';
import { z } from 'zod';
import { EnumFileExtensionDocument } from '@common/file/enums/file.enum';
import {
    ResponseMessagePathMetaKey,
    ResponseSchemaMetaKey,
} from '@common/response/constants/response.constant';
import { ResponseCacheInterceptor } from '@common/response/interceptors/response.cache.interceptor';
import { ResponseInterceptor } from '@common/response/interceptors/response.interceptor';
import { ResponsePaginationInterceptor } from '@common/response/interceptors/response.pagination.interceptor';
import {
    Response,
    ResponseFile,
    ResponsePagination,
} from '@common/response/decorators/response.decorator';
import { createResponseFileInterceptorFromClass } from '@test/unit/helpers/test.unit.response.helper';
import { buildResponseFileInterceptorDoubles } from '@test/unit/helpers/test.unit.response.helper';
import {
    buildDecoratorTarget,
    findDocResponseEntry,
    getDocResponseEntries,
} from '@test/unit/helpers/test.unit.decorator.helper';

describe('response.decorator', () => {
    describe('Response', () => {
        it('defaults to HTTP 200 and sets the message path and response interceptor for a non-POST handler', () => {
            const handler = vi.fn();
            Reflect.defineMetadata(METHOD_METADATA, RequestMethod.GET, handler);
            const { target, propertyKey, descriptor } =
                buildDecoratorTarget(handler);

            Response('response.default.path')(target, propertyKey, descriptor);

            expect(
                Reflect.getMetadata(ResponseMessagePathMetaKey, handler)
            ).toBe('response.default.path');
            expect(Reflect.getMetadata(INTERCEPTORS_METADATA, handler)).toEqual(
                [ResponseInterceptor]
            );
            expect(
                Reflect.getMetadata(ResponseSchemaMetaKey, handler)
            ).toBeUndefined();

            const entry = findDocResponseEntry(
                handler,
                'response.default.path'
            );
            expect(entry).toMatchObject({
                httpStatus: HttpStatus.OK,
                messagePath: 'response.default.path',
                statusCode: HttpStatus.OK,
            });
            expect(entry.schema).toBeUndefined();
        });

        it('defaults to HTTP 201 for a POST handler carrying no explicit @HttpCode', () => {
            const handler = vi.fn();
            Reflect.defineMetadata(
                METHOD_METADATA,
                RequestMethod.POST,
                handler
            );
            const { target, propertyKey, descriptor } =
                buildDecoratorTarget(handler);

            Response('response.created.path')(target, propertyKey, descriptor);

            const entries = getDocResponseEntries(handler);
            expect(entries[0]!.httpStatus).toBe(HttpStatus.CREATED);
        });

        it('honors an explicit @HttpCode over the POST default', () => {
            const handler = vi.fn();
            Reflect.defineMetadata(
                METHOD_METADATA,
                RequestMethod.POST,
                handler
            );
            Reflect.defineMetadata(
                HTTP_CODE_METADATA,
                HttpStatus.ACCEPTED,
                handler
            );
            const { target, propertyKey, descriptor } =
                buildDecoratorTarget(handler);

            Response('response.accepted.path')(target, propertyKey, descriptor);

            const entries = getDocResponseEntries(handler);
            expect(entries[0]!.httpStatus).toBe(HttpStatus.ACCEPTED);
        });

        it('keeps the HTTP 200 default when the descriptor value is not a function', () => {
            const handler: object = {};
            const { target, propertyKey, descriptor } =
                buildDecoratorTarget(handler);

            Response('response.non-function.path')(
                target,
                propertyKey,
                descriptor
            );

            const entries = getDocResponseEntries(handler);
            expect(entries[0]!.httpStatus).toBe(HttpStatus.OK);
        });

        it('documents and sets the schema metadata when a schema is provided', () => {
            const handler = vi.fn();
            const { target, propertyKey, descriptor } =
                buildDecoratorTarget(handler);
            const schema = z.object({ id: z.string() });

            Response('response.schema.path', { schema })(
                target,
                propertyKey,
                descriptor
            );

            expect(Reflect.getMetadata(ResponseSchemaMetaKey, handler)).toBe(
                schema
            );
            const entries = getDocResponseEntries(handler);
            expect(entries[0]!.schema).toBe(schema);
        });

        it('does not attach the cache interceptor when no cache option is given', () => {
            const handler = vi.fn();
            const { target, propertyKey, descriptor } =
                buildDecoratorTarget(handler);

            Response('response.no-cache.path')(target, propertyKey, descriptor);

            expect(Reflect.getMetadata(INTERCEPTORS_METADATA, handler)).toEqual(
                [ResponseInterceptor]
            );
            expect(
                Reflect.getMetadata(CACHE_KEY_METADATA, handler)
            ).toBeUndefined();
            expect(
                Reflect.getMetadata(CACHE_TTL_METADATA, handler)
            ).toBeUndefined();
        });

        it('attaches the cache interceptor with no key or ttl for a boolean cache flag', () => {
            const handler = vi.fn();
            const { target, propertyKey, descriptor } =
                buildDecoratorTarget(handler);

            Response('response.cache-boolean.path', { cache: true })(
                target,
                propertyKey,
                descriptor
            );

            expect(Reflect.getMetadata(INTERCEPTORS_METADATA, handler)).toEqual(
                [ResponseInterceptor, ResponseCacheInterceptor]
            );
            expect(
                Reflect.getMetadata(CACHE_KEY_METADATA, handler)
            ).toBeUndefined();
            expect(
                Reflect.getMetadata(CACHE_TTL_METADATA, handler)
            ).toBeUndefined();
        });

        it.each([
            [{ key: 'user-list' }, 'user-list', undefined],
            [{ ttl: 60 }, undefined, 60],
            [{ key: 'user-list', ttl: 60 }, 'user-list', 60],
            [{}, undefined, undefined],
        ])(
            'applies cache option %j onto CacheKey/CacheTTL metadata',
            (cache, expectedKey, expectedTtl) => {
                const handler = vi.fn();
                const { target, propertyKey, descriptor } =
                    buildDecoratorTarget(handler);

                Response('response.cache-object.path', { cache })(
                    target,
                    propertyKey,
                    descriptor
                );

                expect(
                    Reflect.getMetadata(INTERCEPTORS_METADATA, handler)
                ).toEqual([ResponseInterceptor, ResponseCacheInterceptor]);
                expect(Reflect.getMetadata(CACHE_KEY_METADATA, handler)).toBe(
                    expectedKey
                );
                expect(Reflect.getMetadata(CACHE_TTL_METADATA, handler)).toBe(
                    expectedTtl
                );
            }
        );
    });

    describe('ResponsePagination', () => {
        const schema = z.object({ id: z.string() });

        it('sets the message path, schema, and pagination interceptor metadata', () => {
            const handler = vi.fn();
            const { target, propertyKey, descriptor } =
                buildDecoratorTarget(handler);

            ResponsePagination('response.pagination.path', { schema })(
                target,
                propertyKey,
                descriptor
            );

            expect(
                Reflect.getMetadata(ResponseMessagePathMetaKey, handler)
            ).toBe('response.pagination.path');
            expect(Reflect.getMetadata(ResponseSchemaMetaKey, handler)).toBe(
                schema
            );
            expect(Reflect.getMetadata(INTERCEPTORS_METADATA, handler)).toEqual(
                [ResponsePaginationInterceptor]
            );

            const entry = findDocResponseEntry(
                handler,
                'response.pagination.path'
            );
            expect(entry).toMatchObject({
                httpStatus: HttpStatus.OK,
                messagePath: 'response.pagination.path',
                statusCode: HttpStatus.OK,
                baseSchema: expect.anything(),
            });
        });

        it('does not attach the cache interceptor when no cache option is given', () => {
            const handler = vi.fn();
            const { target, propertyKey, descriptor } =
                buildDecoratorTarget(handler);

            ResponsePagination('response.pagination.no-cache.path', { schema })(
                target,
                propertyKey,
                descriptor
            );

            expect(Reflect.getMetadata(INTERCEPTORS_METADATA, handler)).toEqual(
                [ResponsePaginationInterceptor]
            );
        });

        it('attaches the cache interceptor with no key or ttl for a boolean cache flag', () => {
            const handler = vi.fn();
            const { target, propertyKey, descriptor } =
                buildDecoratorTarget(handler);

            ResponsePagination('response.pagination.cache-boolean.path', {
                schema,
                cache: true,
            })(target, propertyKey, descriptor);

            expect(Reflect.getMetadata(INTERCEPTORS_METADATA, handler)).toEqual(
                [ResponsePaginationInterceptor, ResponseCacheInterceptor]
            );
            expect(
                Reflect.getMetadata(CACHE_KEY_METADATA, handler)
            ).toBeUndefined();
            expect(
                Reflect.getMetadata(CACHE_TTL_METADATA, handler)
            ).toBeUndefined();
        });

        it.each([
            [{ key: 'user-list' }, 'user-list', undefined],
            [{ ttl: 60 }, undefined, 60],
            [{ key: 'user-list', ttl: 60 }, 'user-list', 60],
            [{}, undefined, undefined],
        ])(
            'applies cache option %j onto CacheKey/CacheTTL metadata',
            (cache, expectedKey, expectedTtl) => {
                const handler = vi.fn();
                const { target, propertyKey, descriptor } =
                    buildDecoratorTarget(handler);

                ResponsePagination('response.pagination.cache-object.path', {
                    schema,
                    cache,
                })(target, propertyKey, descriptor);

                expect(Reflect.getMetadata(CACHE_KEY_METADATA, handler)).toBe(
                    expectedKey
                );
                expect(Reflect.getMetadata(CACHE_TTL_METADATA, handler)).toBe(
                    expectedTtl
                );
            }
        );
    });

    describe('ResponseFile', () => {
        it('defaults to HTTP 200, the CSV mime type, and the file interceptor on the default row cap key for a non-POST handler', async () => {
            const handler = vi.fn();
            Reflect.defineMetadata(METHOD_METADATA, RequestMethod.GET, handler);
            const { target, propertyKey, descriptor } =
                buildDecoratorTarget(handler);

            ResponseFile()(target, propertyKey, descriptor);

            const interceptors = Reflect.getMetadata(
                INTERCEPTORS_METADATA,
                handler
            ) as Type<NestInterceptor>[];
            expect(interceptors).toHaveLength(1);
            const doubles = buildResponseFileInterceptorDoubles();
            await createResponseFileInterceptorFromClass(
                interceptors[0]!,
                doubles
            );
            expect(doubles.configService.get).toHaveBeenCalledWith(
                'file.maxDataExport'
            );
            const responses = Reflect.getMetadata(
                DECORATORS.API_RESPONSE,
                handler
            ) as Record<
                string,
                {
                    description: string;
                    content: Record<string, { schema: unknown }>;
                }
            >;
            expect(responses[String(HttpStatus.OK)]!.description).toBe(
                HttpStatus.OK.toString()
            );
            expect(responses[String(HttpStatus.OK)]!.content).toEqual({
                'text/csv': { schema: { type: 'string', format: 'binary' } },
            });
        });

        it('binds the file interceptor to the given row cap config key', async () => {
            const handler = vi.fn();
            const { target, propertyKey, descriptor } =
                buildDecoratorTarget(handler);

            ResponseFile({ maxDataExportConfigKey: 'user.maxDataExport' })(
                target,
                propertyKey,
                descriptor
            );

            const interceptors = Reflect.getMetadata(
                INTERCEPTORS_METADATA,
                handler
            ) as Type<NestInterceptor>[];
            const doubles = buildResponseFileInterceptorDoubles();
            await createResponseFileInterceptorFromClass(
                interceptors[0]!,
                doubles
            );
            expect(doubles.configService.get).toHaveBeenCalledWith(
                'user.maxDataExport'
            );
        });

        it('defaults to HTTP 201 for a POST handler carrying no explicit @HttpCode', () => {
            const handler = vi.fn();
            Reflect.defineMetadata(
                METHOD_METADATA,
                RequestMethod.POST,
                handler
            );
            const { target, propertyKey, descriptor } =
                buildDecoratorTarget(handler);

            ResponseFile()(target, propertyKey, descriptor);

            const responses = Reflect.getMetadata(
                DECORATORS.API_RESPONSE,
                handler
            ) as Record<string, { description: string }>;
            expect(responses[String(HttpStatus.CREATED)]!.description).toBe(
                HttpStatus.CREATED.toString()
            );
        });

        it('honors an explicit @HttpCode over the POST default', () => {
            const handler = vi.fn();
            Reflect.defineMetadata(
                METHOD_METADATA,
                RequestMethod.POST,
                handler
            );
            Reflect.defineMetadata(
                HTTP_CODE_METADATA,
                HttpStatus.ACCEPTED,
                handler
            );
            const { target, propertyKey, descriptor } =
                buildDecoratorTarget(handler);

            ResponseFile()(target, propertyKey, descriptor);

            const responses = Reflect.getMetadata(
                DECORATORS.API_RESPONSE,
                handler
            ) as Record<string, { description: string }>;
            expect(responses[String(HttpStatus.ACCEPTED)]!.description).toBe(
                HttpStatus.ACCEPTED.toString()
            );
        });

        it('keeps the HTTP 200 default when the descriptor value is not a function', () => {
            const handler: object = {};
            const { target, propertyKey, descriptor } =
                buildDecoratorTarget(handler);

            ResponseFile()(target, propertyKey, descriptor);

            const responses = Reflect.getMetadata(
                DECORATORS.API_RESPONSE,
                handler
            ) as Record<string, { description: string }>;
            expect(responses[String(HttpStatus.OK)]!.description).toBe(
                HttpStatus.OK.toString()
            );
        });

        it('produces the requested extension mime type when one is given', () => {
            const handler = vi.fn();
            const { target, propertyKey, descriptor } =
                buildDecoratorTarget(handler);

            ResponseFile({ extension: EnumFileExtensionDocument.pdf })(
                target,
                propertyKey,
                descriptor
            );

            const responses = Reflect.getMetadata(
                DECORATORS.API_RESPONSE,
                handler
            ) as Record<
                string,
                { content: Record<string, { schema: unknown }> }
            >;
            expect(responses[String(HttpStatus.OK)]!.content).toEqual({
                'application/pdf': {
                    schema: { type: 'string', format: 'binary' },
                },
            });
        });
    });
});
