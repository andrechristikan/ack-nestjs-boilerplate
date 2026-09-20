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
        it('returns an integer within the half-open range', () => {
            for (let i = 0; i < 50; i++) {
                const value = service.randomInRange(5, 10);
                expect(Number.isInteger(value)).toBe(true);
                expect(value).toBeGreaterThanOrEqual(5);
                expect(value).toBeLessThan(10);
            }
        });

        it('stays below max when random approaches 1', () => {
            for (let i = 0; i < 50; i++) {
                expect(service.randomInRange(5, 10)).toBeLessThan(10);
            }
        });

        it('rounds fractional bounds inward', () => {
            for (let i = 0; i < 50; i++) {
                const value = service.randomInRange(1.2, 9.9);
                expect(value).toBeGreaterThanOrEqual(2);
                expect(value).toBeLessThan(9);
            }
        });
    });

    describe('randomDigits', () => {
        it('returns a string with the requested digit count', () => {
            for (let i = 0; i < 50; i++) {
                expect(service.randomDigits(6)).toMatch(/^[1-9]\d{5}$/);
            }
        });

        it('builds a four-digit value', () => {
            expect(service.randomDigits(4)).toMatch(/^[1-9]\d{3}$/);
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
