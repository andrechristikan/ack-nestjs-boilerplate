import { FileUploadSingleRequestSchema } from '@common/file/dtos/request/file.upload-single.request.dto';
import type { IFile } from '@common/file/interfaces/file.interface';

describe('FileUploadSingleRequestSchema', () => {
    describe('parse', () => {
        it('accepts a payload carrying only the declared file field', () => {
            const file = { originalname: 'a.csv' } as IFile;

            const result = FileUploadSingleRequestSchema.parse({ file });

            expect(result).toEqual({ file });
        });

        it('rejects an undeclared key', () => {
            const file = { originalname: 'a.csv' } as IFile;

            expect(() =>
                FileUploadSingleRequestSchema.parse({
                    file,
                    extra: 'unexpected',
                })
            ).toThrow();
        });

        it('rejects a payload missing the file field', () => {
            expect(() => FileUploadSingleRequestSchema.parse({})).toThrow();
        });
    });
});
