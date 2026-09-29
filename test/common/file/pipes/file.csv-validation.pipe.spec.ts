import type { ArgumentMetadata, PipeTransform, Type } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { z } from 'zod';
import { FileCsvValidationPipe } from '@common/file/pipes/file.csv-validation.pipe';
import { FileRequiredExtractFirstException } from '@common/file/exceptions/file.required-extract-first.exception';
import { FileExceedMaxDataImportException } from '@common/file/exceptions/file.exceed-max-data-import.exception';
import { FileImportException } from '@common/file/exceptions/file.import.exception';
import { EnumFileStatusCodeError } from '@common/file/enums/file.status-code.enum';
import { EnumRequestStatusCodeError } from '@common/request/enums/request.status-code.enum';

const RowSchema = z.strictObject({ name: z.string() });

type IRow = z.infer<typeof RowSchema>;

describe('FileCsvValidationPipe', () => {
    const configGet = vi.fn<(key: string) => number>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as unknown as ConfigService['get'],
    });
    const metadata = {} as ArgumentMetadata;

    beforeEach(() => {
        vi.resetAllMocks();
        configGet.mockReturnValue(5);
    });

    const buildPipe = async (
        maxDataImportConfigKey?: string
    ): Promise<PipeTransform<unknown[], Promise<IRow[] | undefined>>> => {
        const PipeClass: Type<
            PipeTransform<unknown[], Promise<IRow[] | undefined>>
        > = FileCsvValidationPipe(RowSchema, { maxDataImportConfigKey });

        const module = await Test.createTestingModule({
            providers: [
                PipeClass,
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();

        return module.get(PipeClass);
    };

    describe('constructor', () => {
        it('reads the row cap from the default config key with no options', async () => {
            const PipeClass: Type<PipeTransform> =
                FileCsvValidationPipe(RowSchema);
            const module = await Test.createTestingModule({
                providers: [
                    PipeClass,
                    { provide: ConfigService, useValue: configService },
                ],
            }).compile();
            module.get(PipeClass);

            expect(configGet).toHaveBeenCalledWith('file.maxDataImport');
        });

        it('reads the row cap from the given config key', async () => {
            await buildPipe('user.maxDataImport');

            expect(configGet).toHaveBeenCalledWith('user.maxDataImport');
        });
    });

    describe('transform', () => {
        it('returns undefined when the value is falsy', async () => {
            const pipe = await buildPipe();

            const result = await pipe.transform(
                undefined as unknown as unknown[],
                metadata
            );

            expect(result).toBeUndefined();
        });

        it('throws FileRequiredExtractFirstException for an empty array', async () => {
            const pipe = await buildPipe();

            const promise = pipe.transform([], metadata);

            await expect(promise).rejects.toThrow(
                FileRequiredExtractFirstException
            );
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
            const pipe = await buildPipe();

            const promise = pipe.transform(
                [{ name: 'a' }, { name: 'b' }],
                metadata
            );

            await expect(promise).rejects.toThrow(
                FileExceedMaxDataImportException
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
            const pipe = await buildPipe();

            const result = await pipe.transform(
                [{ name: 'a' }, { name: 'b' }],
                metadata
            );

            expect(result).toEqual([{ name: 'a' }, { name: 'b' }]);
        });

        it('collects every row failure into one FileImportException, never failing fast', async () => {
            const pipe = await buildPipe();
            let caught: FileImportException | undefined;

            try {
                await pipe.transform(
                    [{ name: 'a' }, { name: 42 }, { name: 99 }],
                    metadata
                );
            } catch (error) {
                caught = error as FileImportException;
            }

            expect(caught).toBeInstanceOf(FileImportException);
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
            expect(caught?.errors[0].row).toBe(1);
            expect(caught?.errors[1].row).toBe(2);
        });
    });

    describe('parse', () => {
        it('throws FileRequiredExtractFirstException when called directly with a nullish value', async () => {
            const pipe = (await buildPipe()) as unknown as {
                parse(value: unknown[]): Promise<unknown>;
            };

            const promise = pipe['parse'](null as unknown as unknown[]);

            await expect(promise).rejects.toThrow(
                FileRequiredExtractFirstException
            );
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
            const pipe = (await buildPipe()) as unknown as {
                validateRows(data: unknown[]): Promise<IRow[]>;
            };

            const result = await pipe['validateRows']([
                { name: 'a' },
                { name: 'b' },
            ]);

            expect(result).toEqual([{ name: 'a' }, { name: 'b' }]);
        });

        it('collects every row failure into one FileImportException, never failing fast', async () => {
            const pipe = (await buildPipe()) as unknown as {
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

            expect(caught).toBeInstanceOf(FileImportException);
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
    });
});
