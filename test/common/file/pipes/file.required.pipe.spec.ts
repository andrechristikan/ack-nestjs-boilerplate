import { UnprocessableEntityException } from '@nestjs/common';
import { ENUM_FILE_STATUS_CODE_ERROR } from 'src/common/file/enums/file.status-code.enum';
import { FileRequiredPipe } from 'src/common/file/pipes/file.required.pipe';

describe('FileRequiredPipe', () => {
    let pipe: FileRequiredPipe;

    beforeEach(() => {
        pipe = new FileRequiredPipe();
    });

    it('should be defined', () => {
        expect(pipe).toBeDefined();
    });

    it('should pass through valid file', async () => {
        const file = { originalname: 'test.jpg', buffer: Buffer.from('') };
        const result = await pipe.transform(file as any);
        expect(result).toBe(file);
    });

    it('should throw UnprocessableEntityException for null value', async () => {
        await expect(pipe.transform(undefined)).rejects.toThrow(
            new UnprocessableEntityException({
                statusCode: ENUM_FILE_STATUS_CODE_ERROR.REQUIRED,
                message: 'file.error.required',
            })
        );
    });

    it('should throw UnprocessableEntityException for empty object', async () => {
        await expect(pipe.transform({} as any)).rejects.toThrow(
            new UnprocessableEntityException({
                statusCode: ENUM_FILE_STATUS_CODE_ERROR.REQUIRED,
                message: 'file.error.required',
            })
        );
    });

    it('should throw UnprocessableEntityException for empty array', async () => {
        await expect(pipe.transform([] as any)).rejects.toThrow(
            new UnprocessableEntityException({
                statusCode: ENUM_FILE_STATUS_CODE_ERROR.REQUIRED,
                message: 'file.error.required',
            })
        );
    });

    it('should handle field property', async () => {
        pipe = new FileRequiredPipe('file');
        const value = {
            file: { originalname: 'test.jpg', buffer: Buffer.from('') },
        };
        const result = await pipe.transform(value as any);
        expect(result).toBe(value);
    });

    it('should throw UnprocessableEntityException for invalid field property', async () => {
        pipe = new FileRequiredPipe('file');
        const value = { file: null };

        await expect(pipe.transform(value as any)).rejects.toThrow(
            new UnprocessableEntityException({
                statusCode: ENUM_FILE_STATUS_CODE_ERROR.REQUIRED,
                message: 'file.error.required',
            })
        );
    });
});
