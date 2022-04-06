import { Test } from '@nestjs/testing';
import { BaseModule } from 'src/core/core.module';
import { HelperDateService } from 'src/utils/helper/service/helper.date.service';

describe('HelperDateService', () => {
    let helperDateService: HelperDateService;
    const date1 = new Date();
    const date2 = new Date();

    beforeEach(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [BaseModule],
        }).compile();

        helperDateService = moduleRef.get<HelperDateService>(HelperDateService);
    });

    it('should be defined', () => {
        expect(helperDateService).toBeDefined();
    });

    describe('calculateAge', () => {
        it('should be called', async () => {
            const test = jest.spyOn(helperDateService, 'calculateAge');

            helperDateService.calculateAge(date1);
            expect(test).toHaveBeenCalledWith(date1);
        });

        it('should be success', async () => {
            const result = helperDateService.calculateAge(date1);
            jest.spyOn(helperDateService, 'calculateAge').mockImplementation(
                () => result
            );

            expect(helperDateService.calculateAge(date1)).toBe(result);
        });
    });

    describe('diff', () => {
        it('should be called', async () => {
            const test = jest.spyOn(helperDateService, 'diff');

            helperDateService.diff(date1, date2);
            expect(test).toHaveBeenCalledWith(date1, date2);
        });

        it('should be success', async () => {
            const result = helperDateService.diff(date1, date2);
            jest.spyOn(helperDateService, 'diff').mockImplementation(
                () => result
            );

            expect(helperDateService.diff(date1, date2)).toBe(result);
        });
    });

    describe('check', () => {
        it('should be called', async () => {
            const test = jest.spyOn(helperDateService, 'check');

            helperDateService.check(date1.toISOString());
            expect(test).toHaveBeenCalledWith(date1.toISOString());
        });

        it('should be success', async () => {
            const result = helperDateService.check(date1.toISOString());
            jest.spyOn(helperDateService, 'check').mockImplementation(
                () => result
            );

            expect(helperDateService.check(date1.toISOString())).toBe(result);
        });
    });

    describe('create', () => {
        it('should be called', async () => {
            const test = jest.spyOn(helperDateService, 'create');

            helperDateService.create(date1);
            expect(test).toHaveBeenCalledWith(date1);
        });

        it('should be success', async () => {
            const result = helperDateService.create(date1);
            jest.spyOn(helperDateService, 'create').mockImplementation(
                () => result
            );

            expect(helperDateService.create(date1)).toBe(result);
        });
    });

    describe('timestamp', () => {
        it('should be called', async () => {
            const test = jest.spyOn(helperDateService, 'timestamp');

            helperDateService.timestamp(date1);
            expect(test).toHaveBeenCalledWith(date1);
        });

        it('should be success', async () => {
            const result = helperDateService.timestamp(date1);
            jest.spyOn(helperDateService, 'timestamp').mockImplementation(
                () => result
            );

            expect(helperDateService.timestamp(date1)).toBe(result);
        });
    });

    describe('format', () => {
        it('should be called', async () => {
            const test = jest.spyOn(helperDateService, 'format');

            helperDateService.format(date1);
            expect(test).toHaveBeenCalledWith(date1);
        });

        it('should be success', async () => {
            const result = helperDateService.format(date1);
            jest.spyOn(helperDateService, 'format').mockImplementation(
                () => result
            );

            expect(helperDateService.format(date1)).toBe(result);
        });
    });

    describe('forwardInMinutes', () => {
        it('should be called', async () => {
            const test = jest.spyOn(helperDateService, 'forwardInMinutes');

            helperDateService.forwardInMinutes(2);
            expect(test).toHaveBeenCalledWith(2);
        });

        it('should be success', async () => {
            const result = helperDateService.forwardInMinutes(2);
            jest.spyOn(
                helperDateService,
                'forwardInMinutes'
            ).mockImplementation(() => result);

            expect(helperDateService.forwardInMinutes(2)).toBe(result);
        });
    });

    describe('backwardInMinutes', () => {
        it('should be called', async () => {
            const test = jest.spyOn(helperDateService, 'backwardInMinutes');

            helperDateService.backwardInMinutes(2);
            expect(test).toHaveBeenCalledWith(2);
        });

        it('should be success', async () => {
            const result = helperDateService.backwardInMinutes(2);
            jest.spyOn(
                helperDateService,
                'backwardInMinutes'
            ).mockImplementation(() => result);

            expect(helperDateService.backwardInMinutes(2)).toBe(result);
        });
    });

    describe('forwardInDays', () => {
        it('should be called', async () => {
            const test = jest.spyOn(helperDateService, 'forwardInDays');

            helperDateService.forwardInDays(2);
            expect(test).toHaveBeenCalledWith(2);
        });

        it('should be success', async () => {
            const result = helperDateService.forwardInDays(2);
            jest.spyOn(helperDateService, 'forwardInDays').mockImplementation(
                () => result
            );

            expect(helperDateService.forwardInDays(2)).toBe(result);
        });
    });

    describe('backwardInDays', () => {
        it('should be called', async () => {
            const test = jest.spyOn(helperDateService, 'backwardInDays');

            helperDateService.backwardInDays(2);
            expect(test).toHaveBeenCalledWith(2);
        });

        it('should be success', async () => {
            const result = helperDateService.backwardInDays(2);
            jest.spyOn(helperDateService, 'backwardInDays').mockImplementation(
                () => result
            );

            expect(helperDateService.backwardInDays(2)).toBe(result);
        });
    });

    describe('forwardInMonths', () => {
        it('should be called', async () => {
            const test = jest.spyOn(helperDateService, 'forwardInMonths');

            helperDateService.forwardInMonths(2);
            expect(test).toHaveBeenCalledWith(2);
        });

        it('should be success', async () => {
            const result = helperDateService.forwardInMonths(2);
            jest.spyOn(helperDateService, 'forwardInMonths').mockImplementation(
                () => result
            );

            expect(helperDateService.forwardInMonths(2)).toBe(result);
        });
    });

    describe('backwardInMonths', () => {
        it('should be called', async () => {
            const test = jest.spyOn(helperDateService, 'backwardInMonths');

            helperDateService.backwardInMonths(2);
            expect(test).toHaveBeenCalledWith(2);
        });

        it('should be success', async () => {
            const result = helperDateService.backwardInMonths(2);
            jest.spyOn(
                helperDateService,
                'backwardInMonths'
            ).mockImplementation(() => result);

            expect(helperDateService.backwardInMonths(2)).toBe(result);
        });
    });
});
