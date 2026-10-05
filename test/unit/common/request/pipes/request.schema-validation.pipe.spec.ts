import type { ArgumentMetadata } from '@nestjs/common';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import { z } from 'zod';
import { RequestValidationException } from '@common/request/exceptions/request.validation.exception';
import { EnumRequestStatusCodeError } from '@common/request/enums/request.status-code.enum';
import { buildRequestSchemaValidationPipe } from '@test/unit/helpers/test.unit.request.helper';

describe('RequestSchemaValidationPipe', () => {
    describe('transform', () => {
        it('throws RequestSchemaMissingException for a body with no schema attached', async () => {
            const pipe = buildRequestSchemaValidationPipe(true);
            const metadata: ArgumentMetadata = { type: 'body' };

            const promise = pipe.transform('value', metadata);

            await expect(promise).rejects.toMatchObject({
                module: 'request',
                statusCode: EnumRequestStatusCodeError.schemaMissing,
                statusCodeKey:
                    EnumRequestStatusCodeError[
                        EnumRequestStatusCodeError.schemaMissing
                    ],
                messagePath: 'request.error.schemaMissing',
            });
        });

        it('throws RequestSchemaMissingException for a param with no schema attached', async () => {
            const pipe = buildRequestSchemaValidationPipe(true);
            const metadata: ArgumentMetadata = {
                type: 'param',
                data: 'userId',
            };

            const promise = pipe.transform('value', metadata);

            await expect(promise).rejects.toMatchObject({
                module: 'request',
                statusCode: EnumRequestStatusCodeError.schemaMissing,
                statusCodeKey:
                    EnumRequestStatusCodeError[
                        EnumRequestStatusCodeError.schemaMissing
                    ],
                messagePath: 'request.error.schemaMissing',
            });
        });

        it('returns a query value unchanged when it carries no schema', async () => {
            const pipe = buildRequestSchemaValidationPipe(true);
            const metadata: ArgumentMetadata = { type: 'query' };

            await expect(pipe.transform('value', metadata)).resolves.toBe(
                'value'
            );
        });

        it('returns a value unchanged when the metadata is not validated (custom, no validateCustomDecorators)', async () => {
            const pipe = buildRequestSchemaValidationPipe(true);
            const metadata: ArgumentMetadata = {
                type: 'custom',
                metatype: z.string(),
                schema: z.string(),
            } as unknown as ArgumentMetadata;

            await expect(pipe.transform('value', metadata)).resolves.toBe(
                'value'
            );
        });

        it('throws the configured exceptionFactory result when validation fails', async () => {
            const pipe = buildRequestSchemaValidationPipe(true);
            const metadata: ArgumentMetadata = {
                type: 'query',
                schema: z.string(),
            } as unknown as ArgumentMetadata;

            const promise = pipe.transform(5, metadata);

            await expect(promise).rejects.toMatchObject({
                module: 'request',
                statusCode: EnumRequestStatusCodeError.validation,
                statusCodeKey:
                    EnumRequestStatusCodeError[
                        EnumRequestStatusCodeError.validation
                    ],
                messagePath: 'request.error.validation',
            });
        });

        it('stamps an empty issue path with the bound argument name', async () => {
            const pipe = buildRequestSchemaValidationPipe(true);
            const metadata: ArgumentMetadata = {
                type: 'query',
                data: 'age',
                schema: z.string(),
            } as unknown as ArgumentMetadata;

            let thrown: RequestValidationException | undefined;
            try {
                await pipe.transform(5, metadata);
            } catch (error) {
                thrown = error as RequestValidationException;
            }

            expect(thrown?.issues).toEqual([
                expect.objectContaining({ path: ['age'] }),
            ]);
        });

        it('leaves an issue with an existing path untouched even with a bound argument name', async () => {
            const pipe = buildRequestSchemaValidationPipe(true);
            const metadata: ArgumentMetadata = {
                type: 'query',
                data: 'body',
                schema: z.object({ a: z.string() }),
            } as unknown as ArgumentMetadata;

            let thrown: RequestValidationException | undefined;
            try {
                await pipe.transform({}, metadata);
            } catch (error) {
                thrown = error as RequestValidationException;
            }

            expect(thrown?.issues).toEqual([
                expect.objectContaining({ path: ['a'] }),
            ]);
        });

        it('returns the coerced value when transform is enabled', async () => {
            const pipe = buildRequestSchemaValidationPipe(true);
            const metadata: ArgumentMetadata = {
                type: 'query',
                schema: z.coerce.number(),
            } as unknown as ArgumentMetadata;

            await expect(pipe.transform('5', metadata)).resolves.toBe(5);
        });

        it('returns the original value when transform is disabled', async () => {
            const pipe = buildRequestSchemaValidationPipe(false);
            const metadata: ArgumentMetadata = {
                type: 'query',
                schema: z.coerce.number(),
            } as unknown as ArgumentMetadata;

            await expect(pipe.transform('5', metadata)).resolves.toBe('5');
        });
    });

    describe('stampEmptyIssuePaths', () => {
        it('returns the issues unchanged when no argument name is bound', () => {
            const pipe = buildRequestSchemaValidationPipe(true);
            const issues: readonly StandardSchemaV1.Issue[] = [
                { message: 'Required', path: [] },
            ];

            const result = pipe['stampEmptyIssuePaths'](issues, undefined);

            expect(result).toBe(issues);
        });
    });
});
