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

            const result = FileUploadSingleRequestSchema.safeParse({
                file,
                extra: 'unexpected',
            });

            expect(result.error?.issues).toEqual([
                expect.objectContaining({
                    path: [],
                    code: 'unrecognized_keys',
                }),
            ]);
        });

        it('rejects a payload missing the file field', () => {
            const result = FileUploadSingleRequestSchema.safeParse({});

            expect(result.error?.issues).toEqual([
                expect.objectContaining({
                    path: ['file'],
                    code: 'invalid_type',
                }),
            ]);
        });
    });
});
