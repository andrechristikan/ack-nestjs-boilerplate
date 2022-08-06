import { Test } from '@nestjs/testing';
import { CommonModule } from 'src/common/common.module';
import { HelperService } from 'src/common/helper/services/helper.service';

describe('HelperService', () => {
    let helperService: HelperService;

    beforeEach(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [CommonModule],
        }).compile();

        helperService = moduleRef.get<HelperService>(HelperService);
    });

    it('should be defined', () => {
        expect(helperService).toBeDefined();
    });

    describe('check', () => {
        it('should be called', async () => {
            const test = jest.spyOn(helperService, 'delay');

            await helperService.delay(100);
            expect(test).toHaveBeenCalledWith(100);
        });

        it('should be success', async () => {
            const result = await helperService.delay(100);
            jest.spyOn(helperService, 'delay').mockImplementation(
                async () => result
            );

            expect(await helperService.delay(100)).toBe(result);
        });
    });
});
