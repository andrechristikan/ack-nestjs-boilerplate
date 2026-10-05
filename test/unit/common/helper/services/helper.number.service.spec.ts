import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { HelperNumberService } from '@common/helper/services/helper.number.service';

describe('HelperNumberService', () => {
    let service: HelperNumberService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [HelperNumberService],
        }).compile();

        service = module.get(HelperNumberService);
    });

    describe('checkString', () => {
        it('returns true for an integer string', () => {
            expect(service.checkString('123')).toBe(true);
        });

        it('returns true for a negative integer string', () => {
            expect(service.checkString('-123')).toBe(true);
        });

        it('returns false for a non-numeric string', () => {
            expect(service.checkString('12a')).toBe(false);
        });
    });

    describe('randomDigits', () => {
        it('generates a string of the requested length with a non-zero first digit', () => {
            const result = service.randomDigits(4);

            expect(result).toHaveLength(4);
            expect(result[0]).not.toBe('0');
            expect(/^\d+$/.test(result)).toBe(true);
        });
    });

    describe('randomInRange', () => {
        it('returns an integer within the given range', () => {
            const result = service.randomInRange(1, 10);

            expect(result).toBeGreaterThanOrEqual(1);
            expect(result).toBeLessThan(10);
            expect(Number.isInteger(result)).toBe(true);
        });
    });

    describe('calculatePercent', () => {
        it('computes a percentage rounded to two decimals', () => {
            const result = service.calculatePercent(1, 3);

            expect(result).toBe(33.33);
        });

        it('returns zero when the total is zero', () => {
            const result = service.calculatePercent(1, 0);

            expect(result).toBe(0);
        });

        it('returns zero when the division is not finite', () => {
            const result = service.calculatePercent(
                Number.POSITIVE_INFINITY,
                Number.POSITIVE_INFINITY
            );

            expect(result).toBe(0);
        });
    });
});
