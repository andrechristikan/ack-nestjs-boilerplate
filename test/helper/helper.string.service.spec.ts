import { Test } from '@nestjs/testing';
import { BaseModule } from 'src/core/core.module';
import { HelperStringService } from 'src/utils/helper/service/helper.string.service';

describe('HelperStringService', () => {
    let helperStringService: HelperStringService;

    beforeEach(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [BaseModule],
        }).compile();

        helperStringService =
            moduleRef.get<HelperStringService>(HelperStringService);
    });

    it('should be defined', () => {
        expect(helperStringService).toBeDefined();
    });

    describe('checkEmail', () => {
        it('should be called', async () => {
            const test = jest.spyOn(helperStringService, 'checkEmail');

            helperStringService.checkEmail('111');
            expect(test).toHaveBeenCalledWith('111');
        });

        it('should be success', async () => {
            const result = helperStringService.checkEmail('111');
            jest.spyOn(helperStringService, 'checkEmail').mockImplementation(
                () => result
            );

            expect(helperStringService.checkEmail('111')).toBe(result);
        });
    });

    describe('randomReference', () => {
        it('should be called', async () => {
            const test = jest.spyOn(helperStringService, 'randomReference');

            helperStringService.randomReference(10);
            expect(test).toHaveBeenCalledWith(10);
        });

        it('should be success', async () => {
            const result = helperStringService.randomReference(10);
            jest.spyOn(
                helperStringService,
                'randomReference'
            ).mockImplementation(() => result);

            expect(helperStringService.randomReference(10)).toBe(result);
        });
    });

    describe('random', () => {
        it('should be called', async () => {
            const test = jest.spyOn(helperStringService, 'random');

            helperStringService.random(5);
            expect(test).toHaveBeenCalledWith(5);
        });

        it('should be success', async () => {
            const result = helperStringService.random(5);
            jest.spyOn(helperStringService, 'random').mockImplementation(
                () => result
            );

            expect(helperStringService.random(5)).toBe(result);
        });
    });

    describe('censor', () => {
        it('should be called', async () => {
            const test = jest.spyOn(helperStringService, 'censor');

            helperStringService.censor('12312312');
            expect(test).toHaveBeenCalledWith('12312312');
        });

        it('should be success', async () => {
            const result = helperStringService.censor('12312312');
            jest.spyOn(helperStringService, 'censor').mockImplementation(
                () => result
            );

            expect(helperStringService.censor('12312312')).toBe(result);
        });
    });
});
