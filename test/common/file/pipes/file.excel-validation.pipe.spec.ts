import { UnprocessableEntityException } from '@nestjs/common';
import { IsString, ValidationError } from 'class-validator';
import { ENUM_FILE_STATUS_CODE_ERROR } from 'src/common/file/enums/file.status-code.enum';
import { FileImportException } from 'src/common/file/exceptions/file.import.exception';
import { FileExcelValidationPipe } from 'src/common/file/pipes/file.excel-validation.pipe';

class MockDto {
    @IsString()
    field: string;
}

describe('FileExcelValidationPipe', () => {
    let pipe: FileExcelValidationPipe<MockDto>;

    beforeEach(async () => {
        pipe = new FileExcelValidationPipe(MockDto);
    });

    it('should be defined', () => {
        expect(pipe).toBeDefined();
    });

    it('should pass through valid file rows', async () => {
        const fileRows = [
            { sheetName: 'Sheet1', data: { field: 'value' } as any },
        ];
        const result = await pipe.transform(fileRows as any);
        expect(result).toEqual(fileRows);
    });

    it('should throw UnprocessableEntityException for null value', async () => {
        await expect(pipe.transform(null));
    });

    it('should throw UnprocessableEntityException for empty array', async () => {
        await expect(pipe.transform([])).rejects.toThrow(
            new UnprocessableEntityException({
                statusCode: ENUM_FILE_STATUS_CODE_ERROR.REQUIRED_EXTRACT_FIRST,
                message: 'file.error.requiredParseFirst',
            })
        );
    });

    it('should throw FileImportException for invalid data', async () => {
        const fileRows = [{ sheetName: 'Sheet1', data: { field: null } }];

        await expect(pipe.transform(fileRows as any)).rejects.toThrow(
            new FileImportException([
                {
                    row: 0,
                    sheetName: 'Sheet1',
                    errors: [new ValidationError()],
                },
            ])
        );
    });
});
