import { UnsupportedMediaTypeException } from '@nestjs/common';
import { ENUM_FILE_MIME } from 'src/common/file/enums/file.enum';
import { ENUM_FILE_STATUS_CODE_ERROR } from 'src/common/file/enums/file.status-code.enum';
import { FileTypePipe } from 'src/common/file/pipes/file.type.pipe';

describe('FileTypePipe', () => {
    let pipe: FileTypePipe;

    beforeEach(() => {
        pipe = new FileTypePipe([ENUM_FILE_MIME.JPG, ENUM_FILE_MIME.PNG]);
    });

    it('should be defined', () => {
        expect(pipe).toBeDefined();
    });

    it('should pass through valid MIME type', async () => {
        const file = { mimetype: ENUM_FILE_MIME.JPG };
        const result = await pipe.transform(file);
        expect(result).toBe(file);
    });

    it('should throw UnsupportedMediaTypeException for invalid MIME type', async () => {
        const file = { mimetype: 'application/pdf' };

        await expect(pipe.transform(file)).rejects.toThrow(
            new UnsupportedMediaTypeException({
                statusCode: ENUM_FILE_STATUS_CODE_ERROR.MIME_INVALID,
                message: 'file.error.mimeInvalid',
            })
        );
    });

    it('should handle array of files', async () => {
        const files = [
            { mimetype: ENUM_FILE_MIME.JPG },
            { mimetype: ENUM_FILE_MIME.PNG },
        ];
        const result = await pipe.transform(files);
        expect(result).toBe(files);
    });

    it('should handle empty value', async () => {
        const result = await pipe.transform(null);
        expect(result).toBeNull();
    });

    it('should handle empty field in object', async () => {
        const result = await pipe.transform({});
        expect(result).toEqual({});
    });

    it('should handle empty array', async () => {
        const result = await pipe.transform([]);
        expect(result).toEqual([]);
    });

    it('should handle field property', async () => {
        pipe = new FileTypePipe([ENUM_FILE_MIME.JPG], 'file');
        const value = { file: { mimetype: ENUM_FILE_MIME.JPG } };
        const result = await pipe.transform(value);
        expect(result).toBe(value);
    });

    it('should handle invalid MIME type in field property', async () => {
        pipe = new FileTypePipe([ENUM_FILE_MIME.JPG], 'file');
        const value = { file: { mimetype: 'application/pdf' } };

        await expect(pipe.transform(value)).rejects.toThrow(
            new UnsupportedMediaTypeException({
                statusCode: ENUM_FILE_STATUS_CODE_ERROR.MIME_INVALID,
                message: 'file.error.mimeInvalid',
            })
        );
    });
});
