import type { ArgumentMetadata, PipeTransform, Type } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { z } from 'zod';
import { chunk } from 'lodash-es';
import { HelperArrayService } from '@common/helper/services/helper.array.service';
import { FileCsvValidationPipe } from '@common/file/pipes/file.csv-validation.pipe';
import { FileImportException } from '@common/file/exceptions/file.import.exception';
import { EnumFileStatusCodeError } from '@common/file/enums/file.status-code.enum';
import { EnumRequestStatusCodeError } from '@common/request/enums/request.status-code.enum';
import { createFileCsvValidationPipe } from '@test/unit/helpers/test.unit.file.helper';

const RowSchema = z.strictObject({ name: z.string() });

type IRow = z.infer<typeof RowSchema>;

describe('FileCsvValidationPipe', () => {
    const configGet = vi.fn<(key: string) => number>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as unknown as ConfigService['get'],
    });
    const helperArrayService: MockProxy<HelperArrayService> =
        mock<HelperArrayService>();
    const metadata = {} as ArgumentMetadata;

    beforeEach(() => {
        vi.resetAllMocks();
        configGet.mockReturnValue(5);
        helperArrayService.chunk.mockImplementation((rows, size) =>
            chunk(rows, size)
        );
    });

    describe('constructor', () => {
        it('reads the row cap from the default config key with no options', async () => {
            const PipeClass: Type<PipeTransform> =
                FileCsvValidationPipe(RowSchema);
            const module = await Test.createTestingModule({
                providers: [
                    PipeClass,
                    { provide: ConfigService, useValue: configService },
                    {
                        provide: HelperArrayService,
                        useValue: helperArrayService,
                    },
                ],
            }).compile();
            module.get(PipeClass);

            expect(configGet).toHaveBeenCalledWith('file.maxDataImport');
        });

        it('reads the row cap from the given config key', async () => {
            await createFileCsvValidationPipe(
                RowSchema,
                { maxDataImportConfigKey: 'user.maxDataImport' },
                configService,
                helperArrayService
            );

            expect(configGet).toHaveBeenCalledWith('user.maxDataImport');
        });
    });

    describe('transform', () => {
        it('returns null when the value is falsy', async () => {
            const pipe = await createFileCsvValidationPipe(
                RowSchema,
                {},
                configService,
                helperArrayService
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
                configService,
                helperArrayService
            );

            const promise = pipe.transform([], metadata);

            await expect(promise).rejects.toMatchObject({
                module: 'file',
                statusCode: EnumFileStatusCodeError.requiredExtractFirst,
                statusCodeKey:
                    EnumFileStatusCodeError[
                        EnumFileStatusCodeError.requiredExtractFirst
                    ],
                messagePath: 'file.error.requiredExtractFirst',
            });
        });

        it('throws FileExceedMaxDataImportException past the configured row cap', async () => {
            configGet.mockReturnValue(1);
            const pipe = await createFileCsvValidationPipe(
                RowSchema,
                {},
                configService,
                helperArrayService
            );

            const promise = pipe.transform(
                [{ name: 'a' }, { name: 'b' }],
                metadata
            );

            await expect(promise).rejects.toMatchObject({
                module: 'file',
                statusCode: EnumFileStatusCodeError.exceedMaxDataImport,
                statusCodeKey:
                    EnumFileStatusCodeError[
                        EnumFileStatusCodeError.exceedMaxDataImport
                    ],
                messagePath: 'file.error.exceedMaxDataImport',
            });
        });

        it('returns every row parsed when all rows pass validation', async () => {
            const pipe = await createFileCsvValidationPipe(
                RowSchema,
                {},
                configService,
                helperArrayService
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
                configService,
                helperArrayService
            );
            let caught: FileImportException | undefined;

            try {
                await pipe.transform(
                    [{ name: 'a' }, { name: 42 }, { name: 99 }],
                    metadata
                );
            } catch (error) {
                caught = error as FileImportException;
            }

            expect(caught).toMatchObject({
                module: 'file',
                statusCode: EnumRequestStatusCodeError.validation,
                statusCodeKey:
                    EnumRequestStatusCodeError[
                        EnumRequestStatusCodeError.validation
                    ],
                messagePath: 'file.error.validationDto',
            });
            expect(caught?.errors).toHaveLength(2);
            expect(caught?.errors[0]!.row).toBe(1);
            expect(caught?.errors[1]!.row).toBe(2);
        });
    });

    describe('parse', () => {
        it('throws FileRequiredExtractFirstException when called directly with a nullish value', async () => {
            const pipe = (await createFileCsvValidationPipe(
                RowSchema,
                {},
                configService,
                helperArrayService
            )) as unknown as {
                parse(value: unknown[]): Promise<unknown>;
            };

            const promise = pipe['parse'](null as unknown as unknown[]);

            await expect(promise).rejects.toMatchObject({
                module: 'file',
                statusCode: EnumFileStatusCodeError.requiredExtractFirst,
                statusCodeKey:
                    EnumFileStatusCodeError[
                        EnumFileStatusCodeError.requiredExtractFirst
                    ],
                messagePath: 'file.error.requiredExtractFirst',
            });
        });
    });

    describe('validateRows', () => {
        it('returns every row parsed when all rows pass validation', async () => {
            const pipe = (await createFileCsvValidationPipe(
                RowSchema,
                {},
                configService,
                helperArrayService
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
                configService,
                helperArrayService
            )) as unknown as {
                validateRows(data: unknown[]): Promise<IRow[]>;
            };
            let caught: FileImportException | undefined;

            try {
                await pipe['validateRows']([
                    { name: 'a' },
                    { name: 42 },
                    { name: 99 },
                ]);
            } catch (error) {
                caught = error as FileImportException;
            }

            expect(caught).toMatchObject({
                module: 'file',
                statusCode: EnumRequestStatusCodeError.validation,
                statusCodeKey:
                    EnumRequestStatusCodeError[
                        EnumRequestStatusCodeError.validation
                    ],
                messagePath: 'file.error.validationDto',
            });
            expect(caught?.errors).toHaveLength(2);
        });

        it('keeps absolute row indexes and input order for errors across chunks', async () => {
            configGet.mockReturnValue(2);
            const pipe = (await createFileCsvValidationPipe(
                RowSchema,
                {},
                configService,
                helperArrayService
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
            expect(helperArrayService.chunk).toHaveBeenCalledWith(
                expect.any(Array),
                2
            );
        });
    });
});
