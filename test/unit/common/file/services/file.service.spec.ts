import { Test } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { FileService } from '@common/file/services/file.service';
import { EnumFileExtension } from '@common/file/enums/file.enum';

describe('FileService', () => {
    const helperStringService: MockProxy<HelperStringService> =
        mock<HelperStringService>();
    let service: FileService;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module = await Test.createTestingModule({
            providers: [
                FileService,
                { provide: HelperStringService, useValue: helperStringService },
            ],
        }).compile();
        service = module.get(FileService);
    });

    describe('writeCsv', () => {
        it('joins rows with a semicolon delimiter', () => {
            const result = service.writeCsv([
                { name: 'a', age: 1 },
                { name: 'b', age: 2 },
            ]);

            expect(result).toBe('name;age\r\na;1\r\nb;2');
        });
    });

    describe('readCsv', () => {
        it('parses a header row, skips empty lines and turns blank fields into null', () => {
            const result = service.readCsv('name;age\nfoo;\nbar;5\n\n');

            expect(result).toEqual([
                { name: 'foo', age: null },
                { name: 'bar', age: '5' },
            ]);
        });
    });

    describe('createRandomFilename', () => {
        it('joins path, prefix and the random segment with the lowercased extension', () => {
            helperStringService.random.mockReturnValue('abcdef');

            const result = service.createRandomFilename({
                path: 'uploads',
                prefix: 'avatar',
                extension: EnumFileExtension.png,
                randomLength: 6,
            });

            expect(helperStringService.random).toHaveBeenCalledWith(6);
            expect(result).toBe('uploads/avatar-abcdef.png');
        });

        it('defaults the random length to 10 and omits path and prefix when absent', () => {
            helperStringService.random.mockReturnValue('0123456789');

            const result = service.createRandomFilename({
                extension: EnumFileExtension.csv,
            });

            expect(helperStringService.random).toHaveBeenCalledWith(10);
            expect(result).toBe('0123456789.csv');
        });

        it('strips the leading slash produced by a path that starts with one', () => {
            helperStringService.random.mockReturnValue('xyz');

            const result = service.createRandomFilename({
                path: '/uploads',
                extension: EnumFileExtension.pdf,
                randomLength: 3,
            });

            expect(result).toBe('uploads/xyz.pdf');
        });
    });

    describe('extractExtensionFromFilename', () => {
        it('returns the lowercased extension after the last dot', () => {
            expect(service.extractExtensionFromFilename('Archive.TAR.GZ')).toBe(
                'gz'
            );
        });

        it('returns the whole lowercased name when no dot is present', () => {
            expect(service.extractExtensionFromFilename('DOCUMENT')).toBe(
                'document'
            );
        });
    });

    describe('extractMimeFromFilename', () => {
        it('returns the mime type for a known extension', () => {
            expect(service.extractMimeFromFilename('photo.png')).toBe(
                'image/png'
            );
        });

        it('returns null for an unregistered extension', () => {
            expect(service.extractMimeFromFilename('file.unknown')).toBeNull();
        });

        it('returns null when the filename has no dot', () => {
            expect(service.extractMimeFromFilename('document')).toBeNull();
        });
    });

    describe('extractFilenameFromPath', () => {
        it('returns the last segment of a path with several segments', () => {
            expect(service.extractFilenameFromPath('a/b/c.csv')).toBe('c.csv');
        });

        it('returns the whole value when it carries no slash', () => {
            expect(service.extractFilenameFromPath('file.csv')).toBe(
                'file.csv'
            );
        });
    });

    describe('sanitizeFilename', () => {
        it('strips non-printable characters, quotes, backslashes and slashes, then trims', () => {
            const result = service.sanitizeFilename(
                '  My "File"\\Name/\u{1F600}.csv  '
            );

            expect(result).toBe('My FileName.csv');
        });
    });

    describe('sniffExtensionFromBuffer', () => {
        it('returns the sniffed extension for a recognized signature', async () => {
            const pdfBuffer = Buffer.concat([
                Buffer.from('%PDF-1.4'),
                Buffer.alloc(64),
            ]);

            const result = await service.sniffExtensionFromBuffer(pdfBuffer);

            expect(result).toBe('pdf');
        });

        it('returns null when the buffer carries no recognizable signature', async () => {
            const textBuffer = Buffer.from(
                'hello world this is plain text padding padding'
            );

            const result = await service.sniffExtensionFromBuffer(textBuffer);

            expect(result).toBeNull();
        });
    });
});
