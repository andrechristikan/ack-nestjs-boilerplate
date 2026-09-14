import { Test, type TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EnumFileExtensionDocument } from '@common/file/enums/file.enum';
import { FileService } from '@common/file/services/file.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';

describe('FileService', () => {
    const helperStringService = {
        random: vi.fn<HelperStringService['random']>(),
    } satisfies Pick<HelperStringService, 'random'>;
    let service: FileService;

    beforeEach(async () => {
        vi.resetAllMocks();
        helperStringService.random.mockReturnValue('random');
        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                FileService,
                { provide: HelperStringService, useValue: helperStringService },
            ],
        }).compile();
        service = moduleRef.get(FileService);
    });

    it('writes and reads semicolon-delimited CSV with empty cells normalized', () => {
        const csv = service.writeCsv([{ id: 1, name: 'Ada' }]);

        expect(csv).toBe('id;name\r\n1;Ada');
        expect(service.readCsv('id;name\n1;Ada\n2;')).toEqual([
            { id: '1', name: 'Ada' },
            { id: '2', name: null },
        ]);
    });

    it('creates a normalized random filename from path and prefix', () => {
        expect(
            service.createRandomFilename({
                path: '/exports',
                prefix: 'users',
                extension: EnumFileExtensionDocument.csv,
                randomLength: 8,
            })
        ).toBe('exports/users-random.csv');
        expect(helperStringService.random).toHaveBeenCalledWith(8);
    });

    it('extracts normalized file metadata', () => {
        expect(service.extractExtensionFromFilename('Report.CSV')).toBe('csv');
        expect(service.extractMimeFromFilename('Report.CSV')).toBe('text/csv');
        expect(
            service.extractMimeFromFilename('file.unknown-extension')
        ).toBeNull();
        expect(service.extractFilenameFromPath('/exports/Report.CSV')).toBe(
            'Report.CSV'
        );
    });
});
