import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import type { MockProxy } from 'vitest-mock-extended';
import { AnalyticDateService } from '@modules/analytic/services/analytic.date.service';
import { EnumAnalyticStatusCodeError } from '@modules/analytic/enums/analytic.status-code.enum';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';

describe('AnalyticDateService', () => {
    const startDate: Date = new Date('2026-01-01T00:00:00.000Z');
    const endDate: Date = new Date('2026-02-01T00:00:00.000Z');
    const maxWindowInMs = 2678400000;
    const tooLong: Date = new Date('2026-02-01T00:00:00.001Z');

    let configService: MockProxy<ConfigService>;
    let service: AnalyticDateService;

    beforeEach(async () => {
        vi.resetAllMocks();

        configService = buildConfigService({
            'analytic.maxWindowInMs': maxWindowInMs,
        });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticDateService,
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();

        service = module.get(AnalyticDateService);
    });

    describe('requireRange', () => {
        it('returns the range when start is before end', () => {
            expect(service.requireRange(startDate, endDate)).toEqual({
                startDate,
                endDate,
            });
        });

        it('throws AnalyticInvalidDateRangeException when start equals end', () => {
            try {
                service.requireRange(startDate, startDate);
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
                service.requireRange(endDate, startDate);
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
            expect(service.requireRange(startDate, endDate)).toEqual({
                startDate,
                endDate,
            });
        });

        it('throws AnalyticInvalidDateRangeException when the range is longer than the maximum window', () => {
            try {
                service.requireRange(startDate, tooLong);
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
            expect(service.resolveWindow(null, defaultInMs)).toBe(defaultInMs);
        });

        it('returns the requested window when it is within the maximum', () => {
            expect(service.resolveWindow(maxWindowInMs, defaultInMs)).toBe(
                maxWindowInMs
            );
        });

        it('throws AnalyticInvalidDateRangeException when the requested window exceeds the maximum', () => {
            try {
                service.resolveWindow(maxWindowInMs + 1, defaultInMs);
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
            expect(service.optionalRange()).toEqual({
                startDate: null,
                endDate: null,
            });
        });

        it('returns null dates when neither date is present', () => {
            expect(service.optionalRange(null, null)).toEqual({
                startDate: null,
                endDate: null,
            });
        });

        it('returns the validated range when both dates are present', () => {
            expect(service.optionalRange(startDate, endDate)).toEqual({
                startDate,
                endDate,
            });
        });

        it('throws AnalyticInvalidDateRangeException when only startDate is present', () => {
            try {
                service.optionalRange(startDate, null);
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
                service.optionalRange(null, endDate);
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
