import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import type { MockProxy } from 'vitest-mock-extended';
import { AnalyticDateDomain } from '@modules/analytic/domains/analytic.date.domain';
import { EnumAnalyticStatusCodeError } from '@modules/analytic/enums/analytic.status-code.enum';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';

describe('AnalyticDateDomain', () => {
    const startDate: Date = new Date('2026-01-01T00:00:00.000Z');
    const endDate: Date = new Date('2026-02-01T00:00:00.000Z');
    const maxWindowInMs = 2678400000;
    const tooLong: Date = new Date('2026-02-01T00:00:00.001Z');

    let configService: MockProxy<ConfigService>;
    let domain: AnalyticDateDomain;

    beforeEach(async () => {
        vi.resetAllMocks();

        configService = buildConfigService({
            'analytic.maxWindowInMs': maxWindowInMs,
        });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticDateDomain,
                { provide: ConfigService, useValue: configService },
            ],
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

        it('throws AnalyticInvalidDateRangeException when start equals end', () => {
            try {
                domain.requireRange(startDate, startDate);
                throw new Error('expected throw');
            } catch (error) {
                expect(error).toMatchObject({
                    module: 'analytic',
                    statusCode: EnumAnalyticStatusCodeError.invalidDateRange,
                    statusCodeKey:
                        EnumAnalyticStatusCodeError[
                            EnumAnalyticStatusCodeError.invalidDateRange
                        ],
                    messagePath: 'analytic.error.invalidDateRange',
                });
            }
        });

        it('throws AnalyticInvalidDateRangeException when start is after end', () => {
            try {
                domain.requireRange(endDate, startDate);
                throw new Error('expected throw');
            } catch (error) {
                expect(error).toMatchObject({
                    module: 'analytic',
                    statusCode: EnumAnalyticStatusCodeError.invalidDateRange,
                    statusCodeKey:
                        EnumAnalyticStatusCodeError[
                            EnumAnalyticStatusCodeError.invalidDateRange
                        ],
                    messagePath: 'analytic.error.invalidDateRange',
                });
            }
        });
    });

    describe('requireRange window bound', () => {
        it('returns a range exactly as long as the maximum window', () => {
            expect(domain.requireRange(startDate, endDate)).toEqual({
                startDate,
                endDate,
            });
        });

        it('throws AnalyticInvalidDateRangeException when the range is longer than the maximum window', () => {
            try {
                domain.requireRange(startDate, tooLong);
                throw new Error('expected throw');
            } catch (error) {
                expect(error).toMatchObject({
                    module: 'analytic',
                    statusCode: EnumAnalyticStatusCodeError.invalidDateRange,
                    messagePath: 'analytic.error.invalidDateRange',
                });
            }
        });
    });

    describe('resolveWindow', () => {
        const defaultInMs = 600000;

        it('returns the default when no window is requested', () => {
            expect(domain.resolveWindow(null, defaultInMs)).toBe(defaultInMs);
        });

        it('returns the requested window when it is within the maximum', () => {
            expect(domain.resolveWindow(maxWindowInMs, defaultInMs)).toBe(
                maxWindowInMs
            );
        });

        it('throws AnalyticInvalidDateRangeException when the requested window exceeds the maximum', () => {
            try {
                domain.resolveWindow(maxWindowInMs + 1, defaultInMs);
                throw new Error('expected throw');
            } catch (error) {
                expect(error).toMatchObject({
                    module: 'analytic',
                    statusCode: EnumAnalyticStatusCodeError.invalidDateRange,
                    messagePath: 'analytic.error.invalidDateRange',
                });
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
                expect(error).toMatchObject({
                    module: 'analytic',
                    statusCode: EnumAnalyticStatusCodeError.invalidDateRange,
                    statusCodeKey:
                        EnumAnalyticStatusCodeError[
                            EnumAnalyticStatusCodeError.invalidDateRange
                        ],
                    messagePath: 'analytic.error.invalidDateRange',
                });
            }
        });

        it('throws AnalyticInvalidDateRangeException when only endDate is present', () => {
            try {
                domain.optionalRange(null, endDate);
                throw new Error('expected throw');
            } catch (error) {
                expect(error).toMatchObject({
                    module: 'analytic',
                    statusCode: EnumAnalyticStatusCodeError.invalidDateRange,
                    statusCodeKey:
                        EnumAnalyticStatusCodeError[
                            EnumAnalyticStatusCodeError.invalidDateRange
                        ],
                    messagePath: 'analytic.error.invalidDateRange',
                });
            }
        });
    });
});
