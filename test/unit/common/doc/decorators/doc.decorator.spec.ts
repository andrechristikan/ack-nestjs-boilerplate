import { HttpStatus } from '@nestjs/common';
import { z } from 'zod';
import {
    Doc,
    DocErrors,
    DocResponseError,
} from '@common/doc/decorators/doc.decorator';
import type { IDocResponseEntry } from '@common/doc/interfaces/doc.interface';
import { DocResponseEntryMetaKey } from '@common/doc/constants/doc.constant';
import {
    RequestCorrelationIdHeaderName,
    RequestCustomLangHeaderName,
} from '@common/request/constants/request.constant';
import { getHeaderParameterNames } from '@test/unit/helpers/test.unit.decorator.helper';

const ApiResponseMetaKey = 'swagger/apiResponse';
const ApiOperationMetaKey = 'swagger/apiOperation';
const ApiParametersMetaKey = 'swagger/apiParameters';

interface IApiResponseEntry {
    description: string;
    schema?: {
        properties?: Record<string, { example?: unknown; type?: string }>;
    };
    examples?: Record<string, { summary: string; value: unknown }>;
}

interface IMethodDescriptor {
    value: () => void;
}

describe('doc.decorator', () => {
    describe('DocResponseError', () => {
        it('records no metadata and applies no response decorator', () => {
            const descriptor: IMethodDescriptor = { value: vi.fn() };

            DocResponseError(HttpStatus.BAD_REQUEST)(
                {},
                'exampleMethod',
                descriptor
            );

            expect(
                Reflect.getMetadata(DocResponseEntryMetaKey, descriptor.value)
            ).toBeUndefined();
            expect(
                Reflect.getMetadata(ApiResponseMetaKey, descriptor.value)
            ).toBeUndefined();
        });

        it('records the entry and documents a plain schema with a first-time description', () => {
            const descriptor: IMethodDescriptor = { value: vi.fn() };

            DocResponseError(HttpStatus.NOT_FOUND, {
                statusCode: 50401,
                messagePath: 'user.error.notFound',
            })({}, 'exampleMethod', descriptor);

            const stored = Reflect.getMetadata(
                DocResponseEntryMetaKey,
                descriptor.value
            ) as IDocResponseEntry[];
            expect(stored).toEqual([
                {
                    statusCode: 50401,
                    messagePath: 'user.error.notFound',
                    httpStatus: HttpStatus.NOT_FOUND,
                },
            ]);

            const responses = Reflect.getMetadata(
                ApiResponseMetaKey,
                descriptor.value
            ) as Record<number, IApiResponseEntry>;
            const entry = responses[HttpStatus.NOT_FOUND]!;
            expect(entry.description).toBe(HttpStatus.NOT_FOUND.toString());
            expect(entry.examples).toBeUndefined();
            expect(entry.schema?.properties?.metadata?.example).toBeDefined();
            expect(entry.schema?.properties?.data).toBeUndefined();
        });

        it('extends the base schema with a data schema when entry.schema is given', () => {
            const descriptor: IMethodDescriptor = { value: vi.fn() };

            DocResponseError(HttpStatus.OK, {
                statusCode: 1,
                messagePath: 'user.success.found',
                schema: z.object({ count: z.number() }),
            })({}, 'exampleMethod', descriptor);

            const responses = Reflect.getMetadata(
                ApiResponseMetaKey,
                descriptor.value
            ) as Record<number, IApiResponseEntry>;
            expect(
                responses[HttpStatus.OK]!.schema?.properties?.data
            ).toBeDefined();
        });

        it('documents a custom baseSchema with no metadata field as having no metadata example', () => {
            const descriptor: IMethodDescriptor = { value: vi.fn() };
            const baseSchema = z.object({
                statusCode: z.number(),
                message: z.string(),
            });

            DocResponseError(HttpStatus.BAD_REQUEST, {
                statusCode: 2,
                messagePath: 'user.error.custom',
                baseSchema,
            })({}, 'exampleMethod', descriptor);

            const responses = Reflect.getMetadata(
                ApiResponseMetaKey,
                descriptor.value
            ) as Record<number, IApiResponseEntry>;
            expect(
                responses[HttpStatus.BAD_REQUEST]!.schema?.properties?.metadata
            ).toBeUndefined();
        });

        it('does not duplicate an entry already stored at the same httpStatus:statusCode:messagePath key', () => {
            const descriptor: IMethodDescriptor = { value: vi.fn() };
            Reflect.defineMetadata(
                DocResponseEntryMetaKey,
                [
                    {
                        httpStatus: HttpStatus.BAD_REQUEST,
                        statusCode: 3,
                        messagePath: 'user.error.duplicate',
                    },
                ],
                descriptor.value
            );

            DocResponseError(HttpStatus.BAD_REQUEST, {
                statusCode: 3,
                messagePath: 'user.error.duplicate',
            })({}, 'exampleMethod', descriptor);

            const stored = Reflect.getMetadata(
                DocResponseEntryMetaKey,
                descriptor.value
            ) as IDocResponseEntry[];
            expect(stored).toHaveLength(1);
        });

        it('emits an empty description, keeping both entries in the metadata list', () => {
            const descriptor: IMethodDescriptor = { value: vi.fn() };
            Reflect.defineMetadata(
                DocResponseEntryMetaKey,
                [
                    {
                        httpStatus: HttpStatus.BAD_REQUEST,
                        statusCode: 4,
                        messagePath: 'user.error.first',
                    },
                ],
                descriptor.value
            );

            DocResponseError(HttpStatus.BAD_REQUEST, {
                statusCode: 5,
                messagePath: 'user.error.second',
            })({}, 'exampleMethod', descriptor);

            const stored = Reflect.getMetadata(
                DocResponseEntryMetaKey,
                descriptor.value
            ) as IDocResponseEntry[];
            expect(stored).toHaveLength(2);

            const responses = Reflect.getMetadata(
                ApiResponseMetaKey,
                descriptor.value
            ) as Record<number, IApiResponseEntry>;
            expect(responses[HttpStatus.BAD_REQUEST]!.description).toBe('');
        });

        it('documents a shared envelope schema with one named example per messagePath', () => {
            const descriptor: IMethodDescriptor = { value: vi.fn() };

            DocResponseError(
                HttpStatus.UNPROCESSABLE_ENTITY,
                { statusCode: 6, messagePath: 'user.error.a' },
                { statusCode: 7, messagePath: 'user.error.b' }
            )({}, 'exampleMethod', descriptor);

            const responses = Reflect.getMetadata(
                ApiResponseMetaKey,
                descriptor.value
            ) as Record<number, IApiResponseEntry>;
            const entry = responses[HttpStatus.UNPROCESSABLE_ENTITY]!;
            expect(entry.examples).toBeDefined();
            expect(Object.keys(entry.examples ?? {})).toEqual([
                'user.error.a',
                'user.error.b',
            ]);
            expect(entry.examples?.['user.error.a']).toMatchObject({
                summary: `6 — user.error.a`,
                value: {
                    statusCode: 6,
                    message: 'user.error.a',
                },
            });
        });
    });

    describe('DocErrors', () => {
        it('documents an entry the same way DocResponseError does', () => {
            const descriptor: IMethodDescriptor = { value: vi.fn() };

            DocErrors(HttpStatus.CONFLICT, {
                statusCode: 8,
                messagePath: 'user.error.conflict',
            })({}, 'exampleMethod', descriptor);

            const stored = Reflect.getMetadata(
                DocResponseEntryMetaKey,
                descriptor.value
            ) as IDocResponseEntry[];
            expect(stored).toEqual([
                {
                    statusCode: 8,
                    messagePath: 'user.error.conflict',
                    httpStatus: HttpStatus.CONFLICT,
                },
            ]);
        });
    });

    describe('Doc', () => {
        it('composes the operation, header and global-error decorators on the method', () => {
            const descriptor: IMethodDescriptor = { value: vi.fn() };

            Doc({
                summary: 'Test operation',
                operation: 'testOperation',
                description: 'A test operation',
                deprecated: true,
            })({}, 'exampleMethod', descriptor);

            const operation = Reflect.getMetadata(
                ApiOperationMetaKey,
                descriptor.value
            ) as Record<string, unknown>;
            expect(operation).toMatchObject({
                summary: 'Test operation',
                operationId: 'testOperation',
                description: 'A test operation',
                deprecated: true,
            });

            const headers = Reflect.getMetadata(
                ApiParametersMetaKey,
                descriptor.value
            ) as { name: string; in: string }[];
            expect(getHeaderParameterNames(headers)).toEqual([
                RequestCustomLangHeaderName,
                RequestCorrelationIdHeaderName,
            ]);

            const stored = Reflect.getMetadata(
                DocResponseEntryMetaKey,
                descriptor.value
            ) as IDocResponseEntry[];
            expect(stored.length).toBeGreaterThan(1);
        });

        it('applies with no options given', () => {
            const descriptor: IMethodDescriptor = { value: vi.fn() };

            expect(() => Doc()({}, 'exampleMethod', descriptor)).not.toThrow();
        });
    });
});
