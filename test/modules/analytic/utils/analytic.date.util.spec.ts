import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { AnalyticInvalidDateRangeException } from '@modules/analytic/exceptions/analytic.invalid-date-range.exception';
import { EnumAnalyticStatusCodeError } from '@modules/analytic/enums/analytic.status-code.enum';
import { AnalyticDateUtil } from '@modules/analytic/utils/analytic.date.util';
import { HttpStatus } from '@nestjs/common';

describe('AnalyticDateUtil', () => {
    const configGet = vi.fn<(key: string) => string | undefined>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });
    const helperStringService: MockProxy<HelperStringService> =
        mock<HelperStringService>();

    const startDate: Date = new Date('2026-01-01T00:00:00.000Z');
    const endDate: Date = new Date('2026-02-01T00:00:00.000Z');

    let util: AnalyticDateUtil;

    beforeEach(async () => {
        vi.resetAllMocks();

        configGet.mockImplementation((key: string) => {
            if (key === 'analytic.cache.windowTokenPattern') {
                return 'Window:{start}:{end}';
            }
            if (key === 'analytic.cache.workspaceWindowTokenPattern') {
                return 'Workspace:{workspaceId}:{start}:{end}';
            }
            return undefined;
        });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticDateUtil,
                { provide: ConfigService, useValue: configService },
                { provide: HelperStringService, useValue: helperStringService },
            ],
        }).compile();

        util = module.get(AnalyticDateUtil);
    });

    describe('requireRange', () => {
        it('returns the range when start is before end', () => {
            expect(util.requireRange(startDate, endDate)).toEqual({
                startDate,
                endDate,
            });
        });

        it('throws AnalyticInvalidDateRangeException when startDate is missing', () => {
            try {
                util.requireRange(undefined, endDate);
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
                util.requireRange(startDate, undefined);
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
                util.requireRange(startDate, startDate);
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
                util.requireRange(endDate, startDate);
                throw new Error('expected throw');
            } catch (error) {
                expect(error).toBeInstanceOf(AnalyticInvalidDateRangeException);
            }
        });
    });

    describe('optionalRange', () => {
        it('returns an empty object when both dates are omitted', () => {
            expect(util.optionalRange()).toEqual({});
        });

        it('returns the validated range when both dates are present', () => {
            expect(util.optionalRange(startDate, endDate)).toEqual({
                startDate,
                endDate,
            });
        });

        it('throws AnalyticInvalidDateRangeException when only startDate is present', () => {
            try {
                util.optionalRange(startDate, undefined);
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
                util.optionalRange(undefined, endDate);
                throw new Error('expected throw');
            } catch (error) {
                expect(error).toBeInstanceOf(AnalyticInvalidDateRangeException);
            }
        });
    });

    describe('cacheToken', () => {
        it('returns the ISO string when a date is present', () => {
            expect(util.cacheToken(startDate)).toBe(startDate.toISOString());
        });

        it('returns an underscore when the date is omitted', () => {
            expect(util.cacheToken()).toBe('_');
        });
    });

    describe('windowToken', () => {
        it('fills the window pattern with start and end cache tokens', () => {
            helperStringService.fillPattern.mockReturnValue('filled-window');

            const result = util.windowToken(startDate, endDate);

            expect(result).toBe('filled-window');
            expect(helperStringService.fillPattern).toHaveBeenCalledWith(
                'Window:{start}:{end}',
                {
                    start: startDate.toISOString(),
                    end: endDate.toISOString(),
                }
            );
        });

        it('fills the window pattern with underscores when dates are omitted', () => {
            helperStringService.fillPattern.mockReturnValue('open-window');

            const result = util.windowToken();

            expect(result).toBe('open-window');
            expect(helperStringService.fillPattern).toHaveBeenCalledWith(
                'Window:{start}:{end}',
                { start: '_', end: '_' }
            );
        });
    });

    describe('workspaceWindowToken', () => {
        it('fills the workspace window pattern with workspace id and cache tokens', () => {
            helperStringService.fillPattern.mockReturnValue(
                'filled-workspace-window'
            );

            const result = util.workspaceWindowToken(
                'workspace-1',
                startDate,
                endDate
            );

            expect(result).toBe('filled-workspace-window');
            expect(helperStringService.fillPattern).toHaveBeenCalledWith(
                'Workspace:{workspaceId}:{start}:{end}',
                {
                    workspaceId: 'workspace-1',
                    start: startDate.toISOString(),
                    end: endDate.toISOString(),
                }
            );
        });
    });
});
