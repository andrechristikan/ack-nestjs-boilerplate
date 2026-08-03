import { ConfigService } from '@nestjs/config';
import { IsString } from 'class-validator';
import { FileCsvValidationPipe } from '@common/file/pipes/file.csv-validation.pipe';
import { FileExceedMaxDataImportException } from '@common/file/exceptions/file.exceed-max-data-import.exception';
import { FileRequiredExtractFirstException } from '@common/file/exceptions/file.required-extract-first.exception';
import { FileImportException } from '@common/file/exceptions/file.import.exception';

class TestImportRequestDto {
    @IsString()
    name!: string;
}

interface ITestCsvValidationPipe {
    transform(value: unknown[]): Promise<TestImportRequestDto[] | undefined>;
}

describe('FileCsvValidationPipe', () => {
    const maxDataImport = 1000;
    let configService: ConfigService;

    function createPipe(): ITestCsvValidationPipe {
        const PipeClass = FileCsvValidationPipe(TestImportRequestDto);
        return new PipeClass(configService) as unknown as ITestCsvValidationPipe;
    }

    beforeEach(() => {
        configService = {
            get: jest.fn().mockReturnValue(maxDataImport),
        } as unknown as ConfigService;
    });

    it('reads the row cap from file.maxDataImport on construction', () => {
        createPipe();

        expect(configService.get).toHaveBeenCalledWith('file.maxDataImport');
    });

    it('returns undefined when value is falsy', async () => {
        const pipe = createPipe();

        const result = await pipe.transform(
            undefined as unknown as unknown[]
        );

        expect(result).toBeUndefined();
    });

    it('throws FileRequiredExtractFirstException when value is an empty array', async () => {
        const pipe = createPipe();

        await expect(pipe.transform([])).rejects.toBeInstanceOf(
            FileRequiredExtractFirstException
        );
    });

    it('throws FileExceedMaxDataImportException when rows exceed the configured maxDataImport', async () => {
        const pipe = createPipe();
        const rows = new Array(maxDataImport + 1).fill({ name: 'valid' });

        await expect(pipe.transform(rows)).rejects.toBeInstanceOf(
            FileExceedMaxDataImportException
        );
    });

    it('returns validated dto instances when rows are within maxDataImport', async () => {
        const pipe = createPipe();
        const rows = new Array(maxDataImport).fill({ name: 'valid' });

        const result = await pipe.transform(rows);

        expect(result).toHaveLength(maxDataImport);
        expect(result?.[0]).toBeInstanceOf(TestImportRequestDto);
    });

    it('throws FileImportException carrying row-scoped errors when a row fails validation', async () => {
        const pipe = createPipe();
        const rows = [{ name: 'valid' }, { name: 123 }];

        const error = await pipe.transform(rows).catch((err: unknown) => err);

        expect(error).toBeInstanceOf(FileImportException);
        expect((error as FileImportException).errors).toEqual([
            expect.objectContaining({ row: 1 }),
        ]);
    });
});
