import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { HelperModule } from 'src/common/helper/helper.module';
import { HelperFileService } from 'src/common/helper/services/helper.file.service';
import configs from 'src/configs';
import { WorkBook } from 'xlsx';

describe('HelperFileService', () => {
    let helperFileService: HelperFileService;
    let workbook: WorkBook;
    let file: Buffer;

    beforeEach(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [
                ConfigModule.forRoot({
                    load: configs,
                    isGlobal: true,
                    cache: true,
                    envFilePath: ['.env'],
                    expandVariables: true,
                }),
                HelperModule,
            ],
        }).compile();

        helperFileService = moduleRef.get<HelperFileService>(HelperFileService);

        workbook = helperFileService.createExcelWorkbook([
            { test: 1 },
            { test: 2 },
        ]);
        file = helperFileService.writeExcelToBuffer(workbook);
    });

    it('should be defined', () => {
        expect(helperFileService).toBeDefined();
    });

    describe('createExcelWorkbook', () => {
        it('should be called', async () => {
            const test = jest.spyOn(helperFileService, 'createExcelWorkbook');

            helperFileService.createExcelWorkbook([{ test: 1 }, { test: 2 }]);
            expect(test).toHaveBeenCalledWith([{ test: 1 }, { test: 2 }]);
        });

        it('should be success', async () => {
            const result = helperFileService.createExcelWorkbook([
                { test: 1 },
                { test: 2 },
            ]);
            jest.spyOn(
                helperFileService,
                'createExcelWorkbook'
            ).mockImplementation(() => result);

            expect(
                helperFileService.createExcelWorkbook([
                    { test: 1 },
                    { test: 2 },
                ])
            ).toBe(result);
        });

        it('should be success if data null', async () => {
            const result = helperFileService.createExcelWorkbook([]);
            jest.spyOn(
                helperFileService,
                'createExcelWorkbook'
            ).mockImplementation(() => result);

            expect(helperFileService.createExcelWorkbook([])).toBe(result);
        });
    });

    describe('writeExcelToBuffer', () => {
        it('should be called', async () => {
            const test = jest.spyOn(helperFileService, 'writeExcelToBuffer');

            helperFileService.writeExcelToBuffer(workbook);
            expect(test).toHaveBeenCalledWith(workbook);
        });

        it('should be success', async () => {
            const result = helperFileService.writeExcelToBuffer(workbook);
            jest.spyOn(
                helperFileService,
                'writeExcelToBuffer'
            ).mockImplementation(() => result);

            expect(helperFileService.writeExcelToBuffer(workbook)).toBe(result);
        });
    });

    describe('readExcelFromBuffer', () => {
        it('should be called', async () => {
            const test = jest.spyOn(helperFileService, 'readExcelFromBuffer');

            helperFileService.readExcelFromBuffer(file);
            expect(test).toHaveBeenCalledWith(file);
        });

        it('should be success', async () => {
            const result = helperFileService.readExcelFromBuffer(file);
            jest.spyOn(
                helperFileService,
                'readExcelFromBuffer'
            ).mockImplementation(() => result);

            expect(helperFileService.readExcelFromBuffer(file)).toBe(result);
        });
    });

    describe('convertToBytes', () => {
        it('should be called', async () => {
            const result = jest.spyOn(helperFileService, 'convertToBytes');

            helperFileService.convertToBytes('1mb');
            expect(result).toHaveBeenCalledWith('1mb');
        });

        it('should be success', async () => {
            const result = helperFileService.convertToBytes('1mb');
            jest.spyOn(helperFileService, 'convertToBytes').mockImplementation(
                () => result
            );

            expect(helperFileService.convertToBytes('1mb')).toBe(result);
        });
    });
});
