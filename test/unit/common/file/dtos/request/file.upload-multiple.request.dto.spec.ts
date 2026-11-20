import { FileUploadMultipleRequestSchema } from '@common/file/dtos/request/file.upload-multiple.request.dto';
import type { IFile } from '@common/file/interfaces/file.interface';

describe('FileUploadMultipleRequestSchema', () => {
    describe('parse', () => {
        it('accepts a payload carrying only the declared files field', () => {
            const files = [
                { originalname: 'a.csv' },
                { originalname: 'b.csv' },
            ] as IFile[];

            const result = FileUploadMultipleRequestSchema.parse({ files });

            expect(result).toEqual({ files });
        });

        it('accepts an empty files array', () => {
            const result = FileUploadMultipleRequestSchema.parse({
                files: [],
            });

            expect(result).toEqual({ files: [] });
        });

        it('rejects an undeclared key', () => {
            const result = FileUploadMultipleRequestSchema.safeParse({
                files: [],
                extra: 'unexpected',
            });

            expect(result.error?.issues).toEqual([
                expect.objectContaining({
                    path: [],
                    code: 'unrecognized_keys',
                }),
            ]);
        });

        it('rejects a payload missing the files field', () => {
            const result = FileUploadMultipleRequestSchema.safeParse({});

            expect(result.error?.issues).toEqual([
                expect.objectContaining({
                    path: ['files'],
                    code: 'invalid_type',
                }),
            ]);
        });
    });
});
