import { Test } from '@nestjs/testing';
import { readFileSync } from 'fs';
import { CommonModule } from 'src/common/common.module';
import { HelperFileService } from 'src/common/helper/services/helper.file.service';

describe('HelperFileService', () => {
    let helperFileService: HelperFileService;
    const file = readFileSync('./test/unit/helper/data/test.xlsx');

    beforeEach(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [CommonModule],
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
});
