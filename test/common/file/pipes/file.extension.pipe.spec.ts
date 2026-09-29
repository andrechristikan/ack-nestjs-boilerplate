import type { ArgumentMetadata, PipeTransform, Type } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { FileService } from '@common/file/services/file.service';
import { FileExtensionPipe } from '@common/file/pipes/file.extension.pipe';
import { FileExtensionInvalidException } from '@common/file/exceptions/file.extension-invalid.exception';
import { EnumFileStatusCodeError } from '@common/file/enums/file.status-code.enum';
import {
    EnumFileExtension,
    EnumFileExtensionTemplate,
} from '@common/file/enums/file.enum';
import type { IFile, IFileInput } from '@common/file/interfaces/file.interface';

type IPipeMixin = {
    extractFilesToValidate(value: IFileInput): IFile[];
    isEmptyValue(value: unknown): boolean;
    signaturesOf(extension: EnumFileExtension): readonly string[] | undefined;
    validate(file: IFile): Promise<void>;
};

describe('FileExtensionPipe', () => {
    const fileService: MockProxy<FileService> = mock<FileService>();
    const metadata = {} as ArgumentMetadata;

    const buildPipe = async (
        allowedExtensions: EnumFileExtension[]
    ): Promise<PipeTransform<IFileInput, Promise<IFileInput>>> => {
        const PipeClass: Type<PipeTransform<IFileInput, Promise<IFileInput>>> =
            FileExtensionPipe(allowedExtensions);
        const module = await Test.createTestingModule({
            providers: [
                PipeClass,
                { provide: FileService, useValue: fileService },
            ],
        }).compile();

        return module.get(PipeClass);
    };

    const file = (originalname: string): IFile =>
        ({ originalname, buffer: Buffer.from('a') }) as IFile;

    beforeEach(() => {
        vi.resetAllMocks();
    });

    const expectExtensionInvalid = async (promise: Promise<unknown>) => {
        await expect(promise).rejects.toThrow(FileExtensionInvalidException);
        await expect(promise).rejects.toMatchObject({
            module: 'file',
            statusCode: EnumFileStatusCodeError.extensionInvalid,
            statusCodeKey:
                EnumFileStatusCodeError[
                    EnumFileStatusCodeError.extensionInvalid
                ],
            messagePath: 'file.error.extensionInvalid',
        });
    };

    describe('transform', () => {
        it('returns the value unchanged when it is falsy', async () => {
            const pipe = await buildPipe([EnumFileExtension.pdf]);

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
            const pipe = await buildPipe([EnumFileExtension.pdf]);
            const value = {} as unknown as IFileInput;

            const result = await pipe.transform(value, metadata);

            expect(result).toBe(value);
            expect(
                fileService.extractExtensionFromFilename
            ).not.toHaveBeenCalled();
        });

        it('returns an empty array unchanged with no file to validate', async () => {
            const pipe = await buildPipe([EnumFileExtension.pdf]);

            const result = await pipe.transform([], metadata);

            expect(result).toEqual([]);
            expect(
                fileService.extractExtensionFromFilename
            ).not.toHaveBeenCalled();
        });

        it('throws when the declared extension is not in the allow list', async () => {
            const pipe = await buildPipe([EnumFileExtension.pdf]);
            fileService.extractExtensionFromFilename.mockReturnValue('png');

            const promise = pipe.transform(file('a.png'), metadata);

            await expectExtensionInvalid(promise);
            expect(fileService.sniffExtensionFromBuffer).not.toHaveBeenCalled();
        });

        it('throws when the declared extension is missing', async () => {
            const pipe = await buildPipe([EnumFileExtension.pdf]);

            const promise = pipe.transform(file(''), metadata);

            await expectExtensionInvalid(promise);
        });

        it('passes a signatureless extension whose sniff comes back null', async () => {
            const pipe = await buildPipe([EnumFileExtension.csv]);
            fileService.extractExtensionFromFilename.mockReturnValue('csv');
            fileService.sniffExtensionFromBuffer.mockResolvedValue(null);

            const value = file('a.csv');
            const result = await pipe.transform(value, metadata);

            expect(result).toBe(value);
        });

        it('throws for a null sniff when the declared extension carries no signatureless entry', async () => {
            const pipe = await buildPipe([EnumFileExtensionTemplate.hbs]);
            fileService.extractExtensionFromFilename.mockReturnValue('hbs');
            fileService.sniffExtensionFromBuffer.mockResolvedValue(null);

            const promise = pipe.transform(file('a.hbs'), metadata);

            await expectExtensionInvalid(promise);
        });

        it('passes when the sniffed type matches the declared extension signature', async () => {
            const pipe = await buildPipe([EnumFileExtension.pdf]);
            fileService.extractExtensionFromFilename.mockReturnValue('pdf');
            fileService.sniffExtensionFromBuffer.mockResolvedValue('pdf');

            const value = file('a.pdf');
            const result = await pipe.transform(value, metadata);

            expect(result).toBe(value);
        });

        it('throws when the sniffed type does not match the declared extension signature', async () => {
            const pipe = await buildPipe([EnumFileExtension.pdf]);
            fileService.extractExtensionFromFilename.mockReturnValue('pdf');
            fileService.sniffExtensionFromBuffer.mockResolvedValue('png');

            const promise = pipe.transform(file('a.pdf'), metadata);

            await expectExtensionInvalid(promise);
        });

        it('validates every element of an array, element by element', async () => {
            const pipe = await buildPipe([EnumFileExtension.pdf]);
            fileService.extractExtensionFromFilename.mockReturnValue('pdf');
            fileService.sniffExtensionFromBuffer.mockResolvedValue('pdf');

            const values = [file('a.pdf'), file('b.pdf')];
            const result = await pipe.transform(values, metadata);

            expect(result).toBe(values);
            expect(fileService.sniffExtensionFromBuffer).toHaveBeenCalledTimes(
                2
            );
        });

        it('rejects the request when one element of an array fails validation', async () => {
            const pipe = await buildPipe([EnumFileExtension.pdf]);
            fileService.extractExtensionFromFilename
                .mockReturnValueOnce('pdf')
                .mockReturnValueOnce('png');

            const promise = pipe.transform(
                [file('a.pdf'), file('b.png')],
                metadata
            );

            await expectExtensionInvalid(promise);
        });
    });

    describe('extractFilesToValidate', () => {
        it('returns an empty array for a falsy value', async () => {
            const pipe = (await buildPipe([
                EnumFileExtension.pdf,
            ])) as unknown as IPipeMixin;

            expect(
                pipe['extractFilesToValidate'](
                    undefined as unknown as IFileInput
                )
            ).toEqual([]);
        });

        it('wraps a single file into an array', async () => {
            const pipe = (await buildPipe([
                EnumFileExtension.pdf,
            ])) as unknown as IPipeMixin;
            const value = file('a.pdf');

            expect(pipe['extractFilesToValidate'](value)).toEqual([value]);
        });

        it('returns an array value unchanged', async () => {
            const pipe = (await buildPipe([
                EnumFileExtension.pdf,
            ])) as unknown as IPipeMixin;
            const values = [file('a.pdf'), file('b.pdf')];

            expect(pipe['extractFilesToValidate'](values)).toBe(values);
        });
    });

    describe('isEmptyValue', () => {
        it('treats an empty array as empty', async () => {
            const pipe = (await buildPipe([
                EnumFileExtension.pdf,
            ])) as unknown as IPipeMixin;

            expect(pipe['isEmptyValue']([])).toBe(true);
        });

        it('treats a non-empty file as non-empty', async () => {
            const pipe = (await buildPipe([
                EnumFileExtension.pdf,
            ])) as unknown as IPipeMixin;

            expect(pipe['isEmptyValue'](file('a.pdf'))).toBe(false);
        });
    });

    describe('signaturesOf', () => {
        it('returns the contract signatures for a mapped extension', async () => {
            const pipe = (await buildPipe([
                EnumFileExtension.pdf,
            ])) as unknown as IPipeMixin;

            expect(pipe['signaturesOf'](EnumFileExtension.pdf)).toEqual([
                'pdf',
            ]);
        });

        it('returns undefined for an extension the contract does not map', async () => {
            const pipe = (await buildPipe([
                EnumFileExtensionTemplate.hbs,
            ])) as unknown as IPipeMixin;

            expect(
                pipe['signaturesOf'](EnumFileExtensionTemplate.hbs)
            ).toBeUndefined();
        });
    });

    describe('validate', () => {
        it('throws when the file carries no originalname', async () => {
            const pipe = (await buildPipe([
                EnumFileExtension.pdf,
            ])) as unknown as IPipeMixin;

            const promise = pipe['validate']({
                originalname: '',
            } as IFile);

            await expectExtensionInvalid(promise);
        });

        it('resolves when the sniffed type matches the declared extension', async () => {
            const pipe = (await buildPipe([
                EnumFileExtension.pdf,
            ])) as unknown as IPipeMixin;
            fileService.extractExtensionFromFilename.mockReturnValue('pdf');
            fileService.sniffExtensionFromBuffer.mockResolvedValue('pdf');

            await expect(
                pipe['validate'](file('a.pdf'))
            ).resolves.toBeUndefined();
        });
    });
});
