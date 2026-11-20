import type { ArgumentMetadata, PipeTransform, Type } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import type { MockProxy } from 'vitest-mock-extended';
import { z } from 'zod';
import { HelperArrayService } from '@common/helper/services/helper.array.service';
import { FileCsvValidationPipe } from '@common/file/pipes/file.csv-validation.pipe';
import { EnumFileStatusCodeError } from '@common/file/enums/file.status-code.enum';
import { createFileCsvValidationPipe } from '@test/unit/helpers/test.unit.file.helper';
import {
    buildConfigService,
    stubConfigValues,
} from '@test/unit/helpers/test.unit.config.helper';

const RowSchema = z.strictObject({ name: z.string() });

type IRow = z.infer<typeof RowSchema>;

describe('FileCsvValidationPipe', () => {
    let configService: MockProxy<ConfigService>;
    const metadata = {} as ArgumentMetadata;

    beforeEach(() => {
        configService = buildConfigService({
            'file.maxDataImport': 5,
            'user.maxDataImport': 5,
            'file.importValidationConcurrency': 5,
        });
    });

    describe('constructor', () => {
        it('reads the row cap from the default config key with no options', async () => {
            const PipeClass: Type<PipeTransform> =
                FileCsvValidationPipe(RowSchema);
            const module = await Test.createTestingModule({
                providers: [
                    PipeClass,
                    { provide: ConfigService, useValue: configService },
                    HelperArrayService,
                ],
            }).compile();
            module.get(PipeClass);

            expect(configService.get).toHaveBeenCalledWith(
                'file.maxDataImport'
            );
        });

        it('reads the row cap from the given config key', async () => {
            await createFileCsvValidationPipe(
                RowSchema,
                { maxDataImportConfigKey: 'user.maxDataImport' },
                configService
            );

            expect(configService.get).toHaveBeenCalledWith(
                'user.maxDataImport'
            );
        });
    });

    describe('transform', () => {
        it('returns null when the value is falsy', async () => {
            const pipe = await createFileCsvValidationPipe(
                RowSchema,
                {},
                configService
            );

            const result = await pipe.transform(
                undefined as unknown as unknown[],
                metadata
            );

            expect(result).toBeNull();
        });

        it('throws FileRequiredExtractFirstException for an empty array', async () => {
            const pipe = await createFileCsvValidationPipe(
                RowSchema,
                {},
                configService
            );

            const promise = pipe.transform([], metadata);

            await expect(promise).rejects.toMatchObject({
                module: 'file',
                statusCode: EnumFileStatusCodeError.requiredExtractFirst,
            });
        });

        it('throws FileExceedMaxDataImportException past the configured row cap', async () => {
            stubConfigValues(configService, {
                'file.maxDataImport': 1,
                'user.maxDataImport': 1,
                'file.importValidationConcurrency': 1,
            });
            const pipe = await createFileCsvValidationPipe(
                RowSchema,
                {},
                configService
            );

            const promise = pipe.transform(
                [{ name: 'a' }, { name: 'b' }],
                metadata
            );

            await expect(promise).rejects.toMatchObject({
                module: 'file',
                statusCode: EnumFileStatusCodeError.exceedMaxDataImport,
            });
        });

        it('returns every row parsed when all rows pass validation', async () => {
            const pipe = await createFileCsvValidationPipe(
                RowSchema,
                {},
                configService
            );

            const result = await pipe.transform(
                [{ name: 'a' }, { name: 'b' }],
                metadata
            );

            expect(result).toEqual([{ name: 'a' }, { name: 'b' }]);
        });

        it('collects every row failure into one FileImportException, never failing fast', async () => {
            const pipe = await createFileCsvValidationPipe(
                RowSchema,
                {},
                configService
            );

            await expect(
                pipe.transform(
                    [{ name: 'a' }, { name: 42 }, { name: 99 }],
                    metadata
                )
            ).rejects.toMatchObject({
                module: 'file',
                statusCode: EnumFileStatusCodeError.importInvalid,
                errors: [
                    expect.objectContaining({ row: 1 }),
                    expect.objectContaining({ row: 2 }),
                ],
            });
        });
    });

    describe('parse', () => {
        it('throws FileRequiredExtractFirstException when called directly with a nullish value', async () => {
            const pipe = (await createFileCsvValidationPipe(
                RowSchema,
                {},
                configService
            )) as unknown as {
                parse(value: unknown[]): Promise<unknown>;
            };

            const promise = pipe['parse'](null as unknown as unknown[]);

            await expect(promise).rejects.toMatchObject({
                module: 'file',
                statusCode: EnumFileStatusCodeError.requiredExtractFirst,
            });
        });
    });

    describe('validateRows', () => {
        it('returns every row parsed when all rows pass validation', async () => {
            const pipe = (await createFileCsvValidationPipe(
                RowSchema,
                {},
                configService
            )) as unknown as {
                validateRows(data: unknown[]): Promise<IRow[]>;
            };

            const result = await pipe['validateRows']([
                { name: 'a' },
                { name: 'b' },
            ]);

            expect(result).toEqual([{ name: 'a' }, { name: 'b' }]);
        });

        it('collects every row failure into one FileImportException, never failing fast', async () => {
            const pipe = (await createFileCsvValidationPipe(
                RowSchema,
                {},
                configService
            )) as unknown as {
                validateRows(data: unknown[]): Promise<IRow[]>;
            };

            await expect(
                pipe['validateRows']([
                    { name: 'a' },
                    { name: 42 },
                    { name: 99 },
                ])
            ).rejects.toMatchObject({
                module: 'file',
                statusCode: EnumFileStatusCodeError.importInvalid,
                errors: [expect.anything(), expect.anything()],
            });
        });

        it('keeps absolute row indexes and input order for errors across chunks', async () => {
            stubConfigValues(configService, {
                'file.maxDataImport': 2,
                'user.maxDataImport': 2,
                'file.importValidationConcurrency': 2,
            });
            const pipe = (await createFileCsvValidationPipe(
                RowSchema,
                {},
                configService
            )) as unknown as {
                validateRows(data: unknown[]): Promise<IRow[]>;
            };

            await expect(
                pipe['validateRows']([
                    { name: 'a' },
                    { name: 1 },
                    { name: 'c' },
                    { name: 2 },
                    { name: 3 },
                ])
            ).rejects.toMatchObject({
                errors: [
                    expect.objectContaining({ row: 1 }),
                    expect.objectContaining({ row: 3 }),
                    expect.objectContaining({ row: 4 }),
                ],
            });
        });
    });
});
