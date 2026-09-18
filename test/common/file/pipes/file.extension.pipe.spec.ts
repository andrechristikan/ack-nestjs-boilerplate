import { createMock } from '@golevelup/ts-vitest';
import type { ArgumentMetadata } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { Readable } from 'stream';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EnumFileExtensionImage } from '@common/file/enums/file.enum';
import { FileExtensionInvalidException } from '@common/file/exceptions/file.extension-invalid.exception';
import type { IFile } from '@common/file/interfaces/file.interface';
import { FileExtensionPipe } from '@common/file/pipes/file.extension.pipe';
import { FileService } from '@common/file/services/file.service';

describe('FileExtensionPipe', () => {
    const fileService =
        createMock<
            Pick<
                FileService,
                'extractExtensionFromFilename' | 'sniffExtensionFromBuffer'
            >
        >();
    const metadata: ArgumentMetadata = { type: 'body' };

    beforeEach(() => vi.resetAllMocks());

    async function createPipe() {
        const Pipe = FileExtensionPipe([EnumFileExtensionImage.png]);
        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [Pipe, { provide: FileService, useValue: fileService }],
        }).compile();
        return moduleRef.get(Pipe);
    }

    it('returns an allowed single file unchanged', async () => {
        const pipe = await createPipe();
        const file = createFile('avatar.png');
        fileService.extractExtensionFromFilename.mockReturnValue('png');
        fileService.sniffExtensionFromBuffer.mockResolvedValue('png');

        await expect(pipe.transform(file, metadata)).resolves.toBe(file);
    });

    it.each([{}, []])('allows the empty upload shape %o', async value => {
        const pipe = await createPipe();

        await expect(pipe.transform(value, metadata)).resolves.toBe(value);
        expect(fileService.extractExtensionFromFilename).not.toHaveBeenCalled();
    });

    it('rejects a file outside the extension allow-list', async () => {
        const pipe = await createPipe();
        fileService.extractExtensionFromFilename.mockReturnValue('jpg');

        await expect(
            pipe.transform(createFile('avatar.jpg'), metadata)
        ).rejects.toBeInstanceOf(FileExtensionInvalidException);
    });

    function createFile(originalname: string): IFile {
        return {
            fieldname: 'file',
            originalname,
            encoding: '7bit',
            mimetype: 'image/png',
            size: 1,
            destination: '',
            filename: originalname,
            path: '',
            buffer: Buffer.from('file'),
            stream: Readable.from('file'),
        };
    }
});
