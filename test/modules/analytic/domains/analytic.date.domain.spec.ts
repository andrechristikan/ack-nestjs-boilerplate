import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { AnalyticDateDomain } from '@modules/analytic/domains/analytic.date.domain';
import { AnalyticInvalidDateRangeException } from '@modules/analytic/exceptions/analytic.invalid-date-range.exception';
import { EnumAnalyticStatusCodeError } from '@modules/analytic/enums/analytic.status-code.enum';
import { HttpStatus } from '@nestjs/common';

describe('AnalyticDateDomain', () => {
    const startDate: Date = new Date('2026-01-01T00:00:00.000Z');
    const endDate: Date = new Date('2026-02-01T00:00:00.000Z');

    let domain: AnalyticDateDomain;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [AnalyticDateDomain],
        }).compile();

        domain = module.get(AnalyticDateDomain);
    });

    describe('requireRange', () => {
        it('returns the range when start is before end', () => {
            expect(domain.requireRange(startDate, endDate)).toEqual({
                startDate,
                endDate,
            });
        });

        it('throws AnalyticInvalidDateRangeException when startDate is missing', () => {
            try {
                domain.requireRange(null, endDate);
                throw new Error('expected throw');
            } catch (error) {
                expect(error).toBeInstanceOf(AnalyticInvalidDateRangeException);
                expect(error).toMatchObject({
                    module: 'analytic',
                    statusCode: EnumAnalyticStatusCodeError.invalidDateRange,
                    statusCodeKey:
                        EnumAnalyticStatusCodeError[
                            EnumAnalyticStatusCodeError.invalidDateRange
                        ],
                    httpStatus: HttpStatus.BAD_REQUEST,
                    messagePath: 'analytic.error.invalidDateRange',
                });
            }
        });

        it('throws AnalyticInvalidDateRangeException when endDate is missing', () => {
            try {
                domain.requireRange(startDate, null);
                throw new Error('expected throw');
            } catch (error) {
                expect(error).toBeInstanceOf(AnalyticInvalidDateRangeException);
                expect(error).toMatchObject({
                    statusCode: EnumAnalyticStatusCodeError.invalidDateRange,
                    messagePath: 'analytic.error.invalidDateRange',
                });
            }
        });

        it('throws AnalyticInvalidDateRangeException when start equals end', () => {
            try {
                domain.requireRange(startDate, startDate);
                throw new Error('expected throw');
            } catch (error) {
                expect(error).toBeInstanceOf(AnalyticInvalidDateRangeException);
                expect(error).toMatchObject({
                    statusCode: EnumAnalyticStatusCodeError.invalidDateRange,
                });
            }
        });

        it('throws AnalyticInvalidDateRangeException when start is after end', () => {
            try {
                domain.requireRange(endDate, startDate);
                throw new Error('expected throw');
            } catch (error) {
                expect(error).toBeInstanceOf(AnalyticInvalidDateRangeException);
            }
        });
    });

    describe('optionalRange', () => {
        it('returns null dates when both dates are omitted', () => {
            expect(domain.optionalRange()).toEqual({
                startDate: null,
                endDate: null,
            });
        });

        it('returns null dates when neither date is present', () => {
            expect(domain.optionalRange(null, null)).toEqual({
                startDate: null,
                endDate: null,
            });
        });

        it('returns the validated range when both dates are present', () => {
            expect(domain.optionalRange(startDate, endDate)).toEqual({
                startDate,
                endDate,
            });
        });

        it('throws AnalyticInvalidDateRangeException when only startDate is present', () => {
            try {
                domain.optionalRange(startDate, null);
                throw new Error('expected throw');
            } catch (error) {
                expect(error).toBeInstanceOf(AnalyticInvalidDateRangeException);
                expect(error).toMatchObject({
                    statusCode: EnumAnalyticStatusCodeError.invalidDateRange,
                    messagePath: 'analytic.error.invalidDateRange',
                });
            }
        });

        it('throws AnalyticInvalidDateRangeException when only endDate is present', () => {
            try {
                domain.optionalRange(null, endDate);
                throw new Error('expected throw');
            } catch (error) {
                expect(error).toBeInstanceOf(AnalyticInvalidDateRangeException);
            }
        });
    });
});
