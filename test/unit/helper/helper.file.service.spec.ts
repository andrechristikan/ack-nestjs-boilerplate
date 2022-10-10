import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { readFileSync } from 'fs';
import { HelperModule } from 'src/common/helper/helper.module';
import { HelperFileService } from 'src/common/helper/services/helper.file.service';
import configs from 'src/configs';

describe('HelperFileService', () => {
    let helperFileService: HelperFileService;
    const file = readFileSync('./test/unit/helper/data/test.xlsx');

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
    });

    it('should be defined', () => {
        expect(helperFileService).toBeDefined();
    });

    describe('writeExcel', () => {
        it('should be called', async () => {
            const test = jest.spyOn(helperFileService, 'writeExcel');

            helperFileService.writeExcel([{ test: 1 }, { test: 2 }]);
            expect(test).toHaveBeenCalledWith([{ test: 1 }, { test: 2 }]);
        });

        it('should be success', async () => {
            const result = helperFileService.writeExcel([
                { test: 1 },
                { test: 2 },
            ]);
            jest.spyOn(helperFileService, 'writeExcel').mockImplementation(
                () => result
            );

            expect(
                helperFileService.writeExcel([{ test: 1 }, { test: 2 }])
            ).toBe(result);
        });
    });

    describe('readExcel', () => {
        it('should be called', async () => {
            const test = jest.spyOn(helperFileService, 'readExcel');

            helperFileService.readExcel(file);
            expect(test).toHaveBeenCalledWith(file);
        });

        it('should be success', async () => {
            const result = helperFileService.readExcel(file);
            jest.spyOn(helperFileService, 'readExcel').mockImplementation(
                () => result
            );

            expect(helperFileService.readExcel(file)).toBe(result);
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
