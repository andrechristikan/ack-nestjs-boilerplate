import { Test, TestingModule } from '@nestjs/testing';
import { HelperFileService } from 'src/common/helper/services/helper.file.service';

describe('HelperFileService', () => {
    let service: HelperFileService;

    beforeEach(async () => {
        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [HelperFileService],
        }).compile();

        service = moduleRef.get<HelperFileService>(HelperFileService);
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
            expect(newRows).toEqual(rows);
        });
    });

    describe('convertToBytes', () => {
        it('should return bytes when given a megabyte string', () => {
            const megabytes = '1MB';
            const bytes = service.convertToBytes(megabytes);
            expect(bytes).toEqual(1048576);
        });
    });
});
