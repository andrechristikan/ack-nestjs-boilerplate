import { Test, TestingModule } from '@nestjs/testing';
import { HelperFileService } from 'src/common/helper/services/helper.file.service';
import { unlinkSync } from 'fs';

describe('HelperFileService', () => {
    let service: HelperFileService;

    beforeEach(async () => {
        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [HelperFileService],
        }).compile();

        service = moduleRef.get<HelperFileService>(HelperFileService);
    });

    afterEach(async () => {
        try {
            unlinkSync('data/__blabla.json');
        } catch (err: any) {}
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('createExcelWorkbook', () => {
        it('should return a workbook when given rows', () => {
            const rows = [
                { make: 'Ford', model: 'Mustang', year: 2020 },
                { make: 'Tesla', model: 'Model S', year: 2021 },
            ];
            const workbook = service.createExcelWorkbook(rows);
            expect(workbook).toBeDefined();
        });
    });

    describe('writeExcelToBuffer', () => {
        it('should return a buffer when given a workbook', () => {
            const rows = [
                { make: 'Ford', model: 'Mustang', year: 2020 },
                { make: 'Tesla', model: 'Model S', year: 2021 },
            ];
            const workbook = service.createExcelWorkbook(rows);
            const buffer = service.writeExcelToBuffer(workbook);
            expect(buffer).toBeInstanceOf(Buffer);
        });
    });

    describe('readExcelFromBuffer', () => {
        it('should return rows when given a buffer', () => {
            const rows = [
                { make: 'Ford', model: 'Mustang', year: 2020 },
                { make: 'Tesla', model: 'Model S', year: 2021 },
            ];
            const workbook = service.createExcelWorkbook(rows);
            const buffer = service.writeExcelToBuffer(workbook);
            const newRows = service.readExcelFromBuffer(buffer);
            expect(newRows).toEqual([rows]);
        });
    });

    describe('convertToBytes', () => {
        it('should return bytes when given a megabyte string', () => {
            const megabytes = '1MB';
            const bytes = service.convertToBytes(megabytes);
            expect(bytes).toEqual(1048576);
        });
    });

    describe('createJson', () => {
        it('should return true and create json file base on path', () => {
            const result = service.createJson('data/__blabla.json', []);

            expect(result).toEqual(true);
        });
    });

    describe('readJson', () => {
        it('should return object of json', () => {
            service.createJson('data/__blabla.json', []);
            const result = service.readJson('data/__blabla.json');

            expect(result).toBeDefined();
            expect(Array.isArray(result)).toEqual(true);
        });
    });
});
