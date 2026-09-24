import { FileUploadSingleRequestSchema } from '@common/file/dtos/request/file.upload-single.request.dto';

describe('FileUploadSingleRequestSchema', () => {
    it('accepts one uploaded file value', () =>
        expect(
            FileUploadSingleRequestSchema.parse({
                file: { originalname: 'a.txt' },
            })
        ).toEqual({ file: { originalname: 'a.txt' } }));
    it.each([{}, { file: {}, unknown: true }])(
        'rejects missing or unknown input',
        input =>
            expect(FileUploadSingleRequestSchema.safeParse(input).success).toBe(
                false
            )
    );
});
