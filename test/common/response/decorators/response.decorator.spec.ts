import { HttpStatus, RequestMethod } from '@nestjs/common';
import {
    HTTP_CODE_METADATA,
    METHOD_METADATA,
    INTERCEPTORS_METADATA,
} from '@nestjs/common/constants';
import { DECORATORS } from '@nestjs/swagger';
import { CACHE_KEY_METADATA, CACHE_TTL_METADATA } from '@nestjs/cache-manager';
import { z } from 'zod';
import { DocResponseEntryMetaKey } from '@common/doc/constants/doc.constant';
import type { IDocResponseEntry } from '@common/doc/interfaces/doc.interface';
import { EnumFileExtensionDocument } from '@common/file/enums/file.enum';
import {
    ResponseMessagePathMetaKey,
    ResponseSchemaMetaKey,
} from '@common/response/constants/response.constant';
import { ResponseCacheInterceptor } from '@common/response/interceptors/response.cache.interceptor';
import { ResponseFileInterceptor } from '@common/response/interceptors/response.file.interceptor';
import { ResponseInterceptor } from '@common/response/interceptors/response.interceptor';
import { ResponsePaginationInterceptor } from '@common/response/interceptors/response.pagination.interceptor';
import {
    Response,
    ResponseFile,
    ResponsePagination,
} from '@common/response/decorators/response.decorator';

function buildDescriptor(value: unknown): {
    target: object;
    propertyKey: string;
    descriptor: PropertyDescriptor;
} {
    return {
        target: {},
        propertyKey: 'handler',
        descriptor: {
            value,
            writable: true,
            enumerable: false,
            configurable: true,
        },
    };
}

function getEntries(subject: object): IDocResponseEntry[] {
    return Reflect.getMetadata(
        DocResponseEntryMetaKey,
        subject
    ) as IDocResponseEntry[];
}

function findEntry(subject: object, messagePath: string): IDocResponseEntry {
    const entry = getEntries(subject).find(
        candidate => candidate.messagePath === messagePath
    );

    if (!entry) {
        throw new Error(`No doc entry found for messagePath "${messagePath}"`);
    }

    return entry;
}

describe('Response', () => {
    it('defaults to HTTP 200 and sets the message path and response interceptor for a non-POST handler', () => {
        function handler(): void {}
        Reflect.defineMetadata(METHOD_METADATA, RequestMethod.GET, handler);
        const { target, propertyKey, descriptor } = buildDescriptor(handler);

        Response('response.default.path')(target, propertyKey, descriptor);

        expect(Reflect.getMetadata(ResponseMessagePathMetaKey, handler)).toBe(
            'response.default.path'
        );
        expect(Reflect.getMetadata(INTERCEPTORS_METADATA, handler)).toEqual([
            ResponseInterceptor,
        ]);
        expect(
            Reflect.getMetadata(ResponseSchemaMetaKey, handler)
        ).toBeUndefined();

        const entry = findEntry(handler, 'response.default.path');
        expect(entry).toMatchObject({
            httpStatus: HttpStatus.OK,
            messagePath: 'response.default.path',
            statusCode: HttpStatus.OK,
        });
        expect(entry.schema).toBeUndefined();
    });

    it('defaults to HTTP 201 for a POST handler carrying no explicit @HttpCode', () => {
        function handler(): void {}
        Reflect.defineMetadata(METHOD_METADATA, RequestMethod.POST, handler);
        const { target, propertyKey, descriptor } = buildDescriptor(handler);

        Response('response.created.path')(target, propertyKey, descriptor);

        const entries = getEntries(handler);
        expect(entries[0].httpStatus).toBe(HttpStatus.CREATED);
    });

    it('honors an explicit @HttpCode over the POST default', () => {
        function handler(): void {}
        Reflect.defineMetadata(METHOD_METADATA, RequestMethod.POST, handler);
        Reflect.defineMetadata(
            HTTP_CODE_METADATA,
            HttpStatus.ACCEPTED,
            handler
        );
        const { target, propertyKey, descriptor } = buildDescriptor(handler);

        Response('response.accepted.path')(target, propertyKey, descriptor);

        const entries = getEntries(handler);
        expect(entries[0].httpStatus).toBe(HttpStatus.ACCEPTED);
    });

    it('keeps the HTTP 200 default when the descriptor value is not a function', () => {
        const handler: object = {};
        const { target, propertyKey, descriptor } = buildDescriptor(handler);

        Response('response.non-function.path')(target, propertyKey, descriptor);

        const entries = getEntries(handler);
        expect(entries[0].httpStatus).toBe(HttpStatus.OK);
    });

    it('documents and sets the schema metadata when a schema is provided', () => {
        function handler(): void {}
        const { target, propertyKey, descriptor } = buildDescriptor(handler);
        const schema = z.object({ id: z.string() });

        Response('response.schema.path', { schema })(
            target,
            propertyKey,
            descriptor
        );

        expect(Reflect.getMetadata(ResponseSchemaMetaKey, handler)).toBe(
            schema
        );
        const entries = getEntries(handler);
        expect(entries[0].schema).toBe(schema);
    });

    it('does not attach the cache interceptor when no cache option is given', () => {
        function handler(): void {}
        const { target, propertyKey, descriptor } = buildDescriptor(handler);

        Response('response.no-cache.path')(target, propertyKey, descriptor);

        expect(Reflect.getMetadata(INTERCEPTORS_METADATA, handler)).toEqual([
            ResponseInterceptor,
        ]);
        expect(
            Reflect.getMetadata(CACHE_KEY_METADATA, handler)
        ).toBeUndefined();
        expect(
            Reflect.getMetadata(CACHE_TTL_METADATA, handler)
        ).toBeUndefined();
    });

    it('attaches the cache interceptor with no key or ttl for a boolean cache flag', () => {
        function handler(): void {}
        const { target, propertyKey, descriptor } = buildDescriptor(handler);

        Response('response.cache-boolean.path', { cache: true })(
            target,
            propertyKey,
            descriptor
        );

        expect(Reflect.getMetadata(INTERCEPTORS_METADATA, handler)).toEqual([
            ResponseInterceptor,
            ResponseCacheInterceptor,
        ]);
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
            function handler(): void {}
            const { target, propertyKey, descriptor } =
                buildDescriptor(handler);

            Response('response.cache-object.path', { cache })(
                target,
                propertyKey,
                descriptor
            );

            expect(Reflect.getMetadata(INTERCEPTORS_METADATA, handler)).toEqual(
                [ResponseInterceptor, ResponseCacheInterceptor]
            );
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
        function handler(): void {}
        const { target, propertyKey, descriptor } = buildDescriptor(handler);

        ResponsePagination('response.pagination.path', { schema })(
            target,
            propertyKey,
            descriptor
        );

        expect(Reflect.getMetadata(ResponseMessagePathMetaKey, handler)).toBe(
            'response.pagination.path'
        );
        expect(Reflect.getMetadata(ResponseSchemaMetaKey, handler)).toBe(
            schema
        );
        expect(Reflect.getMetadata(INTERCEPTORS_METADATA, handler)).toEqual([
            ResponsePaginationInterceptor,
        ]);

        const entry = findEntry(handler, 'response.pagination.path');
        expect(entry).toMatchObject({
            httpStatus: HttpStatus.OK,
            messagePath: 'response.pagination.path',
            statusCode: HttpStatus.OK,
            baseSchema: expect.anything(),
        });
    });

    it('does not attach the cache interceptor when no cache option is given', () => {
        function handler(): void {}
        const { target, propertyKey, descriptor } = buildDescriptor(handler);

        ResponsePagination('response.pagination.no-cache.path', { schema })(
            target,
            propertyKey,
            descriptor
        );

        expect(Reflect.getMetadata(INTERCEPTORS_METADATA, handler)).toEqual([
            ResponsePaginationInterceptor,
        ]);
    });

    it('attaches the cache interceptor with no key or ttl for a boolean cache flag', () => {
        function handler(): void {}
        const { target, propertyKey, descriptor } = buildDescriptor(handler);

        ResponsePagination('response.pagination.cache-boolean.path', {
            schema,
            cache: true,
        })(target, propertyKey, descriptor);

        expect(Reflect.getMetadata(INTERCEPTORS_METADATA, handler)).toEqual([
            ResponsePaginationInterceptor,
            ResponseCacheInterceptor,
        ]);
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
            function handler(): void {}
            const { target, propertyKey, descriptor } =
                buildDescriptor(handler);

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
    it('defaults to HTTP 200, the CSV mime type, and the file interceptor for a non-POST handler', () => {
        function handler(): void {}
        Reflect.defineMetadata(METHOD_METADATA, RequestMethod.GET, handler);
        const { target, propertyKey, descriptor } = buildDescriptor(handler);

        ResponseFile()(target, propertyKey, descriptor);

        expect(Reflect.getMetadata(INTERCEPTORS_METADATA, handler)).toEqual([
            ResponseFileInterceptor,
        ]);
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
        expect(responses[String(HttpStatus.OK)].description).toBe(
            HttpStatus.OK.toString()
        );
        expect(responses[String(HttpStatus.OK)].content).toEqual({
            'text/csv': { schema: { type: 'string', format: 'binary' } },
        });
    });

    it('defaults to HTTP 201 for a POST handler carrying no explicit @HttpCode', () => {
        function handler(): void {}
        Reflect.defineMetadata(METHOD_METADATA, RequestMethod.POST, handler);
        const { target, propertyKey, descriptor } = buildDescriptor(handler);

        ResponseFile()(target, propertyKey, descriptor);

        const responses = Reflect.getMetadata(
            DECORATORS.API_RESPONSE,
            handler
        ) as Record<string, { description: string }>;
        expect(responses[String(HttpStatus.CREATED)].description).toBe(
            HttpStatus.CREATED.toString()
        );
    });

    it('honors an explicit @HttpCode over the POST default', () => {
        function handler(): void {}
        Reflect.defineMetadata(METHOD_METADATA, RequestMethod.POST, handler);
        Reflect.defineMetadata(
            HTTP_CODE_METADATA,
            HttpStatus.ACCEPTED,
            handler
        );
        const { target, propertyKey, descriptor } = buildDescriptor(handler);

        ResponseFile()(target, propertyKey, descriptor);

        const responses = Reflect.getMetadata(
            DECORATORS.API_RESPONSE,
            handler
        ) as Record<string, { description: string }>;
        expect(responses[String(HttpStatus.ACCEPTED)].description).toBe(
            HttpStatus.ACCEPTED.toString()
        );
    });

    it('keeps the HTTP 200 default when the descriptor value is not a function', () => {
        const handler: object = {};
        const { target, propertyKey, descriptor } = buildDescriptor(handler);

        ResponseFile()(target, propertyKey, descriptor);

        const responses = Reflect.getMetadata(
            DECORATORS.API_RESPONSE,
            handler
        ) as Record<string, { description: string }>;
        expect(responses[String(HttpStatus.OK)].description).toBe(
            HttpStatus.OK.toString()
        );
    });

    it('produces the requested extension mime type when one is given', () => {
        function handler(): void {}
        const { target, propertyKey, descriptor } = buildDescriptor(handler);

        ResponseFile({ extension: EnumFileExtensionDocument.pdf })(
            target,
            propertyKey,
            descriptor
        );

        const responses = Reflect.getMetadata(
            DECORATORS.API_RESPONSE,
            handler
        ) as Record<string, { content: Record<string, { schema: unknown }> }>;
        expect(responses[String(HttpStatus.OK)].content).toEqual({
            'application/pdf': { schema: { type: 'string', format: 'binary' } },
        });
    });
});
