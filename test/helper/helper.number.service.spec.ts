import { Test } from '@nestjs/testing';
import { HelperNumberService } from 'src/common/helper/services/helper.number.service';

describe('HelperNumberService', () => {
    let service: HelperNumberService;
    const mockNumber = '1234';

    beforeEach(async () => {
        const app = await Test.createTestingModule({
            providers: [HelperNumberService],
        }).compile();

        service = app.get<HelperNumberService>(HelperNumberService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('check', () => {
        it('should return true when given a valid number', () => {
            expect(service.check(mockNumber)).toBe(true);
        });

        it('should return false when given an invalid number', () => {
            expect(service.check('not a number')).toBe(false);
        });
    });

    describe('create', () => {
        it('should return a number when given a string number', () => {
            expect(service.create(mockNumber)).toBe(1234);
        });
    });

    describe('random', () => {
        it('should return a random number of the given length', () => {
            expect(service.random(4)).toBeGreaterThanOrEqual(1000);
            expect(service.random(4)).toBeLessThanOrEqual(9999);
        });
    });

    describe('randomInRange', () => {
        it('should return a random number within the given range', () => {
            expect(service.randomInRange(1, 10)).toBeGreaterThanOrEqual(1);
            expect(service.randomInRange(1, 10)).toBeLessThanOrEqual(10);
        });
    });

    describe('percent', () => {
        it('should return the correct percentage', () => {
            expect(service.percent(25, 100)).toBe(25);
            expect(service.percent(50, 200)).toBe(25);
        });

        it('should return 0 when given invalid values', () => {
            expect(service.percent(25, 0)).toBe(0);
            expect(service.percent(NaN, 100)).toBe(0);
        });
    });
});
