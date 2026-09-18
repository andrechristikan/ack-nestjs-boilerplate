import { Test, type TestingModule } from '@nestjs/testing';
import { Readable } from 'stream';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FileExtensionInvalidException } from '@common/file/exceptions/file.extension-invalid.exception';
import { FileRequiredException } from '@common/file/exceptions/file.required.exception';
import type { IFile } from '@common/file/interfaces/file.interface';
import { FileCsvParsePipe } from '@common/file/pipes/file.csv-parse.pipe';
import { FileService } from '@common/file/services/file.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';

describe('FileCsvParsePipe', () => {
    let pipe: FileCsvParsePipe<{ id: string }>;

    beforeEach(async () => {
        vi.resetAllMocks();
        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                FileCsvParsePipe,
                FileService,
                {
                    provide: HelperStringService,
                    useValue: { random: vi.fn() },
                },
            ],
        }).compile();
        pipe = moduleRef.get(FileCsvParsePipe);
    });

    it('validates and parses a UTF-8 CSV upload', async () => {
        const file = createFile('users.csv', Buffer.from('id\n1'));

        await expect(pipe.transform(file)).resolves.toEqual([{ id: '1' }]);
    });

    it.each([
        [createFile('users.csv', Buffer.alloc(0)), FileRequiredException],
        [createFile('', Buffer.from('id')), FileExtensionInvalidException],
        [
            createFile('users.txt', Buffer.from('id')),
            FileExtensionInvalidException,
        ],
    ])('rejects invalid upload %o', async (file, exceptionType) => {
        await expect(pipe.transform(file)).rejects.toBeInstanceOf(
            exceptionType
        );
    });

    function createFile(originalname: string, buffer: Buffer): IFile {
        return {
            fieldname: 'file',
            originalname,
            encoding: '7bit',
            mimetype: 'text/csv',
            size: buffer.length,
            destination: '',
            filename: originalname,
            path: '',
            buffer,
            stream: Readable.from(buffer),
        };
    }
});
