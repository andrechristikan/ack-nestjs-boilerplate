import { describe, expect, it } from 'vitest';

import { AnalyticDateDomain } from '@modules/analytic/domains/analytic.date.domain';
import { AnalyticInvalidDateRangeException } from '@modules/analytic/exceptions/analytic.invalid-date-range.exception';

describe('AnalyticDateDomain', () => {
    const domain = new AnalyticDateDomain();
    const startDate = new Date('2026-01-01T00:00:00.000Z');
    const endDate = new Date('2026-01-02T00:00:00.000Z');

    it('returns a complete required range', () => {
        expect(domain.requireRange(startDate, endDate)).toEqual({
            startDate,
            endDate,
        });
    });

    it.each([
        [null, endDate],
        [startDate, null],
        [startDate, startDate],
        [endDate, startDate],
    ])('rejects an invalid required range', (start, end) => {
        expect(() => domain.requireRange(start, end)).toThrow(
            AnalyticInvalidDateRangeException
        );
    });

    it('returns null bounds when both optional dates are absent', () => {
        expect(domain.optionalRange()).toEqual({
            startDate: null,
            endDate: null,
        });
    });

    it('returns a complete optional range', () => {
        expect(domain.optionalRange(startDate, endDate)).toEqual({
            startDate,
            endDate,
        });
    });

    it.each([
        [startDate, null],
        [null, endDate],
    ])('rejects a partial optional range', (start, end) => {
        expect(() => domain.optionalRange(start, end)).toThrow(
            AnalyticInvalidDateRangeException
        );
    });
});
