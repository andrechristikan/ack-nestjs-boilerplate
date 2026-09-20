import { afterEach, describe, expect, it, vi } from 'vitest';

import { HelperNumberService } from '@common/helper/services/helper.number.service';

describe('HelperNumberService', () => {
    const service = new HelperNumberService();

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('checkString', () => {
        it.each([
            ['123', true],
            ['-5', true],
            ['0', true],
            ['1.5', false],
            ['12a', false],
            ['', false],
            ['+1', false],
        ])('checkString(%j) is %s', (value, expected) => {
            expect(service.checkString(value)).toBe(expected);
        });
    });

    describe('randomInRange', () => {
        it('returns min when random is 0', () => {
            vi.spyOn(Math, 'random').mockReturnValue(0);

            expect(service.randomInRange(5, 10)).toBe(5);
        });

        it('stays below max when random approaches 1', () => {
            vi.spyOn(Math, 'random').mockReturnValue(0.999999);

            expect(service.randomInRange(5, 10)).toBe(9);
        });

        it('rounds fractional bounds inward', () => {
            vi.spyOn(Math, 'random').mockReturnValue(0);

            expect(service.randomInRange(1.2, 9.9)).toBe(2);
        });
    });

    describe('randomDigits', () => {
        it('returns a string with the requested digit count', () => {
            for (let i = 0; i < 50; i++) {
                expect(service.randomDigits(6)).toMatch(/^[1-9]\d{5}$/);
            }
        });

        it('builds the range from 10^(n-1) to 10^n - 1', () => {
            vi.spyOn(Math, 'random').mockReturnValue(0);

            expect(service.randomDigits(4)).toBe('1000');
        });
    });

    describe('calculatePercent', () => {
        it.each([
            [1, 3, 33.33],
            [50, 200, 25],
            [5, 0, 0],
            [0, 0, 0],
            [Number.NaN, 4, 0],
        ])('calculatePercent(%s, %s) is %s', (value, total, expected) => {
            expect(service.calculatePercent(value, total)).toBe(expected);
        });
    });
});
