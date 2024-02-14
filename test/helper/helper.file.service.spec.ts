import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { HelperFileService } from 'src/common/helper/services/helper.file.service';

describe('HelperFileService', () => {
    let service: HelperFileService;

    beforeEach(async () => {
        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [ConfigService, HelperFileService],
        }).compile();

        service = moduleRef.get<HelperFileService>(HelperFileService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('writeCsv', () => {
        it('should return a buffer of csv', () => {
            const rows = [
                { make: 'Ford', model: 'Mustang', year: 2020 },
                { make: 'Tesla', model: 'Model S', year: 2021 },
            ];
            const buffer = service.writeCsv({ data: rows });
            expect(buffer).toBeDefined();
            expect(buffer).toBeInstanceOf(Buffer);
        });
    });

    describe('writeExcel', () => {
        it('should return a buffer of excel', () => {
            const rows = [
                { make: 'Ford', model: 'Mustang', year: 2020 },
                { make: 'Tesla', model: 'Model S', year: 2021 },
            ];
            const buffer = service.writeExcel([{ data: rows }]);
            expect(buffer).toBeDefined();
            expect(buffer).toBeInstanceOf(Buffer);
        });
    });

    describe('readCsv', () => {
        it('should return rows when given a buffer csv', () => {
            const rows = [
                { make: 'Ford', model: 'Mustang', year: 2020 },
                { make: 'Tesla', model: 'Model S', year: 2021 },
            ];
            const buffer = service.writeCsv({ data: rows, sheetName: 'test' });
            const newRows = service.readCsv(buffer);
            expect(newRows).toBeDefined();
            expect(newRows.sheetName).toBe('Sheet1');
            expect(newRows.data.length).toBe(2);
            expect(newRows.data[0].make).toBe('Ford');
        });
    });

    describe('readExcel', () => {
        it('should return rows when given a buffer excel', () => {
            const rows = [
                { make: 'Ford', model: 'Mustang', year: 2020 },
                { make: 'Tesla', model: 'Model S', year: 2021 },
            ];
            const buffer = service.writeExcel([
                { data: rows, sheetName: 'test' },
            ]);
            const newRows = service.readExcel(buffer);

            expect(newRows).toBeDefined();
            expect(newRows.length).toBe(1);
            expect(newRows[0].sheetName).toBe('test');
            expect(newRows[0].data.length).toBe(2);
            expect(newRows[0].data[0].make).toBe('Ford');
        });
    });
});
