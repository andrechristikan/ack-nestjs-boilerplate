import { Test } from '@nestjs/testing';
import { CoreModule } from 'src/core/core.module';
import { HelperFileService } from 'src/utils/helper/service/helper.file.service';

describe('HelperFileService', () => {
    let helperFileService: HelperFileService;

    beforeEach(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [CoreModule],
        }).compile();

        helperFileService = moduleRef.get<HelperFileService>(HelperFileService);
    });

    it('should be defined', () => {
        expect(helperFileService).toBeDefined();
    });

    describe('writeExcel', () => {
        it('should be called', async () => {
            const test = jest.spyOn(helperFileService, 'writeExcel');

            helperFileService.writeExcel([], []);
            expect(test).toHaveBeenCalledWith([], []);
        });

        it('should be success', async () => {
            const result = helperFileService.writeExcel([], []);
            jest.spyOn(helperFileService, 'writeExcel').mockImplementation(
                () => result
            );

            expect(helperFileService.writeExcel([], [])).toBe(result);
        });
    });
});
