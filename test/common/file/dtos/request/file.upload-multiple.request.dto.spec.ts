import { FileUploadMultipleRequestSchema } from '@common/file/dtos/request/file.upload-multiple.request.dto';

describe('FileUploadMultipleRequestSchema', () => {
    it('accepts an empty or populated file array', () => {
        expect(FileUploadMultipleRequestSchema.parse({ files: [] })).toEqual({
            files: [],
        });
        expect(
            FileUploadMultipleRequestSchema.safeParse({ files: [{}] }).success
        ).toBe(true);
    });
    it.each([{}, { files: [], unknown: true }])(
        'rejects missing or unknown input',
        input =>
            expect(
                FileUploadMultipleRequestSchema.safeParse(input).success
            ).toBe(false)
    );
});
