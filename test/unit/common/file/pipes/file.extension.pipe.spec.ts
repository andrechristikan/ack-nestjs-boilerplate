import type { ArgumentMetadata } from '@nestjs/common';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { FileService } from '@common/file/services/file.service';
import { EnumFileExtension } from '@common/file/enums/file.enum';
import type { IFile, IFileInput } from '@common/file/interfaces/file.interface';
import {
    createFileExtensionPipe,
    expectFileExtensionInvalid,
} from '@test/unit/helpers/test.unit.file.helper';

type IPipeMixin = {
    extractFilesToValidate(value: IFileInput): IFile[];
    isEmptyValue(value: unknown): boolean;
    validate(file: IFile): Promise<void>;
};

describe('FileExtensionPipe', () => {
    const fileService: MockProxy<FileService> = mock<FileService>();
    const metadata = {} as ArgumentMetadata;

    const baseFile = {
        originalname: 'a.pdf',
        buffer: Buffer.from('a'),
    } as IFile;

    describe('transform', () => {
        it('returns the value unchanged when it is falsy', async () => {
            const pipe = await createFileExtensionPipe(
                [EnumFileExtension.pdf],
                fileService
            );

            const result = await pipe.transform(
                undefined as unknown as IFileInput,
                metadata
            );

            expect(result).toBeUndefined();
            expect(
                fileService.extractExtensionFromFilename
            ).not.toHaveBeenCalled();
        });

        it('returns an empty plain object unchanged with no file to validate', async () => {
            const pipe = await createFileExtensionPipe(
                [EnumFileExtension.pdf],
                fileService
            );
            const value = {} as unknown as IFileInput;

            const result = await pipe.transform(value, metadata);

            expect(result).toBe(value);
            expect(
                fileService.extractExtensionFromFilename
            ).not.toHaveBeenCalled();
        });

        it('returns an empty array unchanged with no file to validate', async () => {
            const pipe = await createFileExtensionPipe(
                [EnumFileExtension.pdf],
                fileService
            );

            const result = await pipe.transform([], metadata);

            expect(result).toEqual([]);
            expect(
                fileService.extractExtensionFromFilename
            ).not.toHaveBeenCalled();
        });

        it('throws when the declared extension is not in the allow list', async () => {
            const pipe = await createFileExtensionPipe(
                [EnumFileExtension.pdf],
                fileService
            );
            fileService.extractExtensionFromFilename.mockReturnValue('png');

            const promise = pipe.transform(
                { ...baseFile, originalname: 'a.png' },
                metadata
            );

            await expectFileExtensionInvalid(promise);
            expect(fileService.isContentOfExtension).not.toHaveBeenCalled();
        });

        it('throws when the declared extension is missing', async () => {
            const pipe = await createFileExtensionPipe(
                [EnumFileExtension.pdf],
                fileService
            );

            const promise = pipe.transform(
                { ...baseFile, originalname: '' },
                metadata
            );

            await expectFileExtensionInvalid(promise);
        });

        it('passes when the content check accepts the declared extension', async () => {
            const pipe = await createFileExtensionPipe(
                [EnumFileExtension.csv],
                fileService
            );
            fileService.extractExtensionFromFilename.mockReturnValue('csv');
            fileService.isContentOfExtension.mockResolvedValue(true);

            const value = { ...baseFile, originalname: 'a.csv' };
            const result = await pipe.transform(value, metadata);

            expect(result).toBe(value);
        });

        it('passes when the content check accepts the declared extension', async () => {
            const pipe = await createFileExtensionPipe(
                [EnumFileExtension.pdf],
                fileService
            );
            fileService.extractExtensionFromFilename.mockReturnValue('pdf');
            fileService.isContentOfExtension.mockResolvedValue(true);

            const value = { ...baseFile, originalname: 'a.pdf' };
            const result = await pipe.transform(value, metadata);

            expect(result).toBe(value);
        });

        it('throws when the content check rejects the declared extension', async () => {
            const pipe = await createFileExtensionPipe(
                [EnumFileExtension.pdf],
                fileService
            );
            fileService.extractExtensionFromFilename.mockReturnValue('pdf');
            fileService.isContentOfExtension.mockResolvedValue(false);

            const promise = pipe.transform(
                { ...baseFile, originalname: 'a.pdf' },
                metadata
            );

            await expectFileExtensionInvalid(promise);
        });

        it('validates every element of an array, element by element', async () => {
            const pipe = await createFileExtensionPipe(
                [EnumFileExtension.pdf],
                fileService
            );
            fileService.extractExtensionFromFilename.mockReturnValue('pdf');
            fileService.isContentOfExtension.mockResolvedValue(true);

            const values = [
                { ...baseFile, originalname: 'a.pdf' },
                { ...baseFile, originalname: 'b.pdf' },
            ];
            const result = await pipe.transform(values, metadata);

            expect(result).toBe(values);
            expect(fileService.isContentOfExtension).toHaveBeenCalledTimes(2);
        });

        it('rejects the request when one element of an array fails validation', async () => {
            const pipe = await createFileExtensionPipe(
                [EnumFileExtension.pdf],
                fileService
            );
            fileService.extractExtensionFromFilename
                .mockReturnValueOnce('pdf')
                .mockReturnValueOnce('png');

            const promise = pipe.transform(
                [
                    { ...baseFile, originalname: 'a.pdf' },
                    { ...baseFile, originalname: 'b.png' },
                ],
                metadata
            );

            await expectFileExtensionInvalid(promise);
        });
    });

    describe('extractFilesToValidate', () => {
        it('returns an empty array for a falsy value', async () => {
            const pipe = (await createFileExtensionPipe(
                [EnumFileExtension.pdf],
                fileService
            )) as unknown as IPipeMixin;

            expect(
                pipe['extractFilesToValidate'](
                    undefined as unknown as IFileInput
                )
            ).toEqual([]);
        });

        it('wraps a single file into an array', async () => {
            const pipe = (await createFileExtensionPipe(
                [EnumFileExtension.pdf],
                fileService
            )) as unknown as IPipeMixin;
            const value = { ...baseFile, originalname: 'a.pdf' };

            expect(pipe['extractFilesToValidate'](value)).toEqual([value]);
        });

        it('returns an array value unchanged', async () => {
            const pipe = (await createFileExtensionPipe(
                [EnumFileExtension.pdf],
                fileService
            )) as unknown as IPipeMixin;
            const values = [
                { ...baseFile, originalname: 'a.pdf' },
                { ...baseFile, originalname: 'b.pdf' },
            ];

            expect(pipe['extractFilesToValidate'](values)).toBe(values);
        });
    });

    describe('isEmptyValue', () => {
        it('treats an empty array as empty', async () => {
            const pipe = (await createFileExtensionPipe(
                [EnumFileExtension.pdf],
                fileService
            )) as unknown as IPipeMixin;

            expect(pipe['isEmptyValue']([])).toBe(true);
        });

        it('treats a non-empty file as non-empty', async () => {
            const pipe = (await createFileExtensionPipe(
                [EnumFileExtension.pdf],
                fileService
            )) as unknown as IPipeMixin;

            expect(
                pipe['isEmptyValue']({ ...baseFile, originalname: 'a.pdf' })
            ).toBe(false);
        });
    });

    describe('validate', () => {
        it('throws when the file carries no originalname', async () => {
            const pipe = (await createFileExtensionPipe(
                [EnumFileExtension.pdf],
                fileService
            )) as unknown as IPipeMixin;

            const promise = pipe['validate']({
                originalname: '',
            } as IFile);

            await expectFileExtensionInvalid(promise);
        });

        it('resolves when the content check accepts the declared extension', async () => {
            const pipe = (await createFileExtensionPipe(
                [EnumFileExtension.pdf],
                fileService
            )) as unknown as IPipeMixin;
            fileService.extractExtensionFromFilename.mockReturnValue('pdf');
            fileService.isContentOfExtension.mockResolvedValue(true);

            await expect(
                pipe['validate']({ ...baseFile, originalname: 'a.pdf' })
            ).resolves.toBeUndefined();
        });
    });
});
