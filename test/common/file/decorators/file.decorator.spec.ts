import { ApiBody, ApiConsumes } from '@nestjs/swagger';
import {
    FileFieldsInterceptor,
    FileInterceptor,
    FilesInterceptor,
} from '@nestjs/platform-express';
import {
    FileMaxMultiple,
    FileSizeInBytes,
} from '@common/file/constants/file.constant';
import type { IFileUploadMultipleField } from '@common/file/interfaces/file.interface';
import {
    FileUploadMultiple,
    FileUploadMultipleFields,
    FileUploadSingle,
} from '@common/file/decorators/file.decorator';

vi.mock('@nestjs/swagger', async importOriginal => {
    const actual = await importOriginal<typeof import('@nestjs/swagger')>();

    return { ...actual, ApiConsumes: vi.fn(), ApiBody: vi.fn() };
});

vi.mock('@nestjs/platform-express', async importOriginal => {
    const actual =
        await importOriginal<typeof import('@nestjs/platform-express')>();

    return {
        ...actual,
        FileInterceptor: vi.fn(),
        FilesInterceptor: vi.fn(),
        FileFieldsInterceptor: vi.fn(),
    };
});

describe('file.decorator', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    describe('FileUploadSingle', () => {
        it('defaults the field and file size when no options are given', () => {
            FileUploadSingle();

            expect(ApiConsumes).toHaveBeenCalledWith('multipart/form-data');
            expect(ApiBody).toHaveBeenCalledWith({
                schema: {
                    type: 'object',
                    properties: {
                        file: { type: 'string', format: 'binary' },
                    },
                },
            });
            expect(FileInterceptor).toHaveBeenCalledWith('file', {
                limits: { fileSize: FileSizeInBytes, files: 1 },
            });
        });

        it('uses the given field and file size', () => {
            FileUploadSingle({ field: 'avatar', fileSize: 123 });

            expect(ApiBody).toHaveBeenCalledWith({
                schema: {
                    type: 'object',
                    properties: {
                        avatar: { type: 'string', format: 'binary' },
                    },
                },
            });
            expect(FileInterceptor).toHaveBeenCalledWith('avatar', {
                limits: { fileSize: 123, files: 1 },
            });
        });
    });

    describe('FileUploadMultiple', () => {
        it('defaults the field, file size and max files when no options are given', () => {
            FileUploadMultiple();

            expect(ApiConsumes).toHaveBeenCalledWith('multipart/form-data');
            expect(ApiBody).toHaveBeenCalledWith({
                schema: {
                    type: 'object',
                    properties: {
                        files: { type: 'string', format: 'binary' },
                    },
                },
            });
            expect(FilesInterceptor).toHaveBeenCalledWith(
                'files',
                FileMaxMultiple,
                { limits: { fileSize: FileSizeInBytes } }
            );
        });

        it('uses the given field, file size and max files', () => {
            FileUploadMultiple({
                field: 'docs',
                fileSize: 456,
                maxFiles: 5,
            });

            expect(ApiBody).toHaveBeenCalledWith({
                schema: {
                    type: 'object',
                    properties: {
                        docs: { type: 'string', format: 'binary' },
                    },
                },
            });
            expect(FilesInterceptor).toHaveBeenCalledWith('docs', 5, {
                limits: { fileSize: 456 },
            });
        });
    });

    describe('FileUploadMultipleFields', () => {
        const fields: IFileUploadMultipleField[] = [
            { field: 'a', maxFiles: 2 },
            { field: 'b', maxFiles: 3 },
        ];

        it('builds one binary property per field and defaults the file size', () => {
            FileUploadMultipleFields(fields);

            expect(ApiConsumes).toHaveBeenCalledWith('multipart/form-data');
            expect(ApiBody).toHaveBeenCalledWith({
                schema: {
                    type: 'object',
                    properties: {
                        a: { type: 'string', format: 'binary' },
                        b: { type: 'string', format: 'binary' },
                    },
                },
            });
            expect(FileFieldsInterceptor).toHaveBeenCalledWith(
                [
                    { name: 'a', maxCount: 2 },
                    { name: 'b', maxCount: 3 },
                ],
                { limits: { fileSize: FileSizeInBytes, files: 5 } }
            );
        });

        it('sums the per-field max files into the global files limit and uses the given file size', () => {
            FileUploadMultipleFields(fields, { fileSize: 789 });

            expect(FileFieldsInterceptor).toHaveBeenCalledWith(
                [
                    { name: 'a', maxCount: 2 },
                    { name: 'b', maxCount: 3 },
                ],
                { limits: { fileSize: 789, files: 5 } }
            );
        });

        it('builds no property and a zero files limit for an empty field list', () => {
            FileUploadMultipleFields([]);

            expect(ApiBody).toHaveBeenCalledWith({
                schema: { type: 'object', properties: {} },
            });
            expect(FileFieldsInterceptor).toHaveBeenCalledWith([], {
                limits: { fileSize: FileSizeInBytes, files: 0 },
            });
        });
    });
});
