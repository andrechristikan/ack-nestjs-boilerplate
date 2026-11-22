import { Test } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { FileService } from '@common/file/services/file.service';
import { FileCsvParsePipe } from '@common/file/pipes/file.csv-parse.pipe';
import { EnumFileStatusCodeError } from '@common/file/enums/file.status-code.enum';
import type { IFile } from '@common/file/interfaces/file.interface';

interface IRow {
    name: string;
}

describe('FileCsvParsePipe', () => {
    const fileService: MockProxy<FileService> = mock<FileService>();
    let pipe: FileCsvParsePipe<IRow>;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module = await Test.createTestingModule({
            providers: [
                FileCsvParsePipe,
                { provide: FileService, useValue: fileService },
            ],
        }).compile();
        pipe = module.get(FileCsvParsePipe);
    });

    describe('validate', () => {
        it('throws FileRequiredException when the buffer is missing', async () => {
            const value = {
                originalname: 'a.csv',
                buffer: undefined,
            } as unknown as IFile;

            const promise = pipe.validate(value);

            await expect(promise).rejects.toMatchObject({
                module: 'file',
                statusCode: EnumFileStatusCodeError.required,
                statusCodeKey:
                    EnumFileStatusCodeError[EnumFileStatusCodeError.required],
                messagePath: 'file.error.required',
            });
        });

        it('throws FileRequiredException when the buffer is empty', async () => {
            const value = {
                originalname: 'a.csv',
                buffer: Buffer.alloc(0),
            } as IFile;

            const promise = pipe.validate(value);

            await expect(promise).rejects.toMatchObject({
                module: 'file',
                statusCode: EnumFileStatusCodeError.required,
                statusCodeKey:
                    EnumFileStatusCodeError[EnumFileStatusCodeError.required],
                messagePath: 'file.error.required',
            });
        });

        it('throws FileExtensionInvalidException when originalname is missing', async () => {
            const value = {
                originalname: '',
                buffer: Buffer.from('a'),
            } as IFile;

            const promise = pipe.validate(value);

            await expect(promise).rejects.toMatchObject({
                module: 'file',
                statusCode: EnumFileStatusCodeError.extensionInvalid,
                statusCodeKey:
                    EnumFileStatusCodeError[
                        EnumFileStatusCodeError.extensionInvalid
                    ],
                messagePath: 'file.error.extensionInvalid',
            });
        });

        it('throws FileExtensionInvalidException when the extension is not csv', async () => {
            const value = {
                originalname: 'a.pdf',
                buffer: Buffer.from('a'),
            } as IFile;
            fileService.extractExtensionFromFilename.mockReturnValue('pdf');

            const promise = pipe.validate(value);

            await expect(promise).rejects.toMatchObject({
                module: 'file',
                statusCode: EnumFileStatusCodeError.extensionInvalid,
                statusCodeKey:
                    EnumFileStatusCodeError[
                        EnumFileStatusCodeError.extensionInvalid
                    ],
                messagePath: 'file.error.extensionInvalid',
            });
        });

        it('resolves when the buffer is non-empty and the extension is csv', async () => {
            const value = {
                originalname: 'a.csv',
                buffer: Buffer.from('a'),
            } as IFile;
            fileService.extractExtensionFromFilename.mockReturnValue('csv');

            await expect(pipe.validate(value)).resolves.toBeUndefined();
        });
    });

    describe('transform', () => {
        it('returns null when the value is falsy', async () => {
            const result = await pipe.transform(undefined as unknown as IFile);

            expect(result).toBeNull();
        });

        it('validates then parses the buffer through FileService.readCsv', async () => {
            const value = {
                originalname: 'a.csv',
                buffer: Buffer.from('name\nfoo', 'utf-8'),
            } as IFile;
            fileService.extractExtensionFromFilename.mockReturnValue('csv');
            const rows: IRow[] = [{ name: 'foo' }];
            fileService.readCsv.mockReturnValue(rows);

            const result = await pipe.transform(value);

            expect(fileService.readCsv).toHaveBeenCalledWith(
                value.buffer.toString('utf-8')
            );
            expect(result).toBe(rows);
        });

        it('rejects with the validation failure before parsing', async () => {
            const value = {
                originalname: 'a.csv',
                buffer: Buffer.alloc(0),
            } as IFile;

            const promise = pipe.transform(value);

            await expect(promise).rejects.toMatchObject({
                module: 'file',
                statusCode: EnumFileStatusCodeError.required,
                statusCodeKey:
                    EnumFileStatusCodeError[EnumFileStatusCodeError.required],
                messagePath: 'file.error.required',
            });
            expect(fileService.readCsv).not.toHaveBeenCalled();
        });
    });
});
