import { describe, expect, it } from 'vitest';

import { AnalyticInvalidDateRangeException } from '@modules/analytic/exceptions/analytic.invalid-date-range.exception';
import { AnalyticDateUtil } from '@modules/analytic/utils/analytic.date.util';

describe('AnalyticDateUtil', () => {
    const util = new AnalyticDateUtil();
    const startDate = new Date('2026-01-01T00:00:00.000Z');
    const endDate = new Date('2026-01-02T00:00:00.000Z');

    it('returns a complete required range', () => {
        expect(util.requireRange(startDate, endDate)).toEqual({
            startDate,
            endDate,
        });
    });

    it.each([
        [undefined, endDate],
        [startDate, undefined],
        [startDate, startDate],
        [endDate, startDate],
    ])('rejects an invalid required range', (start, end) => {
        expect(() => util.requireRange(start, end)).toThrow(
            AnalyticInvalidDateRangeException
        );
    });

    it('returns an empty optional range when both dates are absent', () => {
        expect(util.optionalRange()).toEqual({});
    });

    it('returns a complete optional range', () => {
        expect(util.optionalRange(startDate, endDate)).toEqual({
            startDate,
            endDate,
        });
    });

    it.each([
        [startDate, undefined],
        [undefined, endDate],
    ])('rejects a partial optional range', (start, end) => {
        expect(() => util.optionalRange(start, end)).toThrow(
            AnalyticInvalidDateRangeException
        );
    });

    it('builds stable cache tokens', () => {
        expect(util.cacheToken(startDate)).toBe('2026-01-01T00:00:00.000Z');
        expect(util.cacheToken()).toBe('_');
    });
});
