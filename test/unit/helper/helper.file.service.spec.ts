import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { HelperModule } from 'src/common/helper/helper.module';
import { IHelperFileRows } from 'src/common/helper/interfaces/helper.interface';
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

    afterEach(async () => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(helperFileService).toBeDefined();
    });

    describe('createExcelWorkbook', () => {
        it('should be convert array of object to excel workbook', async () => {
            const result: WorkBook = helperFileService.createExcelWorkbook([
                { test: 1 },
                { test: 2 },
            ]);

            jest.spyOn(
                helperFileService,
                'createExcelWorkbook'
            ).mockReturnValueOnce(result);

            expect(result).toBeTruthy();
        });

        it('should be convert empty array to excel workbook', async () => {
            const result: WorkBook = helperFileService.createExcelWorkbook([]);

            jest.spyOn(
                helperFileService,
                'createExcelWorkbook'
            ).mockReturnValueOnce(result);

            expect(result).toBeTruthy();
        });
    });

    describe('writeExcelToBuffer', () => {
        it('write workbook to buffer', async () => {
            const result: Buffer =
                helperFileService.writeExcelToBuffer(workbook);

            jest.spyOn(
                helperFileService,
                'writeExcelToBuffer'
            ).mockReturnValueOnce(result);

            expect(result).toBeTruthy();
        });
    });

    describe('readExcelFromBuffer', () => {
        it('should be success', async () => {
            const result: IHelperFileRows[] =
                helperFileService.readExcelFromBuffer(file);

            jest.spyOn(
                helperFileService,
                'readExcelFromBuffer'
            ).mockReturnValueOnce(result);

            expect(result).toBeTruthy();
        });
    });

    describe('convertToBytes', () => {
        it('should be success', async () => {
            const result: number = helperFileService.convertToBytes('1mb');

            jest.spyOn(helperFileService, 'convertToBytes').mockReturnValueOnce(
                result
            );

            expect(result).toBeTruthy();
            expect(result).toBe(1048576);
        });
    });
});
