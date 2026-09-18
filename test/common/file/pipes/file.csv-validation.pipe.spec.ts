import type { ArgumentMetadata } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { FileExceedMaxDataImportException } from '@common/file/exceptions/file.exceed-max-data-import.exception';
import { FileImportException } from '@common/file/exceptions/file.import.exception';
import { FileRequiredExtractFirstException } from '@common/file/exceptions/file.required-extract-first.exception';
import { FileCsvValidationPipe } from '@common/file/pipes/file.csv-validation.pipe';

describe('FileCsvValidationPipe', () => {
    const schema = z.strictObject({
        id: z.coerce.number().int(),
        email: z.email(),
    });
    const configService: Pick<ConfigService, 'get'> = { get: vi.fn() };
    const configGet = vi.mocked(configService.get);
    const metadata: ArgumentMetadata = { type: 'body' };

    beforeEach(() => {
        vi.resetAllMocks();
        configGet.mockReturnValue(2);
    });

    async function createPipe() {
        const Pipe = FileCsvValidationPipe(schema, {
            maxDataImportConfigKey: 'feature.importLimit',
        });
        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                Pipe,
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();
        return moduleRef.get(Pipe);
    }

    it('validates and transforms every imported row', async () => {
        const pipe = await createPipe();

        await expect(
            pipe.transform(
                [
                    { id: '1', email: 'ada@example.com' },
                    { id: '2', email: 'grace@example.com' },
                ],
                metadata
            )
        ).resolves.toEqual([
            { id: 1, email: 'ada@example.com' },
            { id: 2, email: 'grace@example.com' },
        ]);
        expect(configGet).toHaveBeenCalledWith('feature.importLimit');
    });

    it('collects every row validation failure before rejecting', async () => {
        const pipe = await createPipe();
        let thrown: unknown;

        try {
            await pipe.transform(
                [
                    { id: 'invalid', email: 'bad' },
                    { id: '2', email: 'also-bad' },
                ],
                metadata
            );
        } catch (error) {
            thrown = error;
        }

        expect(thrown).toBeInstanceOf(FileImportException);
        expect(thrown).toMatchObject({
            errors: [
                expect.objectContaining({ row: 0 }),
                expect.objectContaining({ row: 1 }),
            ],
        });
    });

    it.each([
        [[], FileRequiredExtractFirstException],
        [
            [
                { id: '1', email: 'one@example.com' },
                { id: '2', email: 'two@example.com' },
                { id: '3', email: 'three@example.com' },
            ],
            FileExceedMaxDataImportException,
        ],
    ])('rejects import boundary %o', async (rows, exceptionType) => {
        const pipe = await createPipe();

        await expect(pipe.transform(rows, metadata)).rejects.toBeInstanceOf(
            exceptionType
        );
    });
});
