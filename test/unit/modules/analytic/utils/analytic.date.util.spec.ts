import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { EnumAnalyticDashboardMetric } from '@modules/analytic/enums/analytic.enum';
import { Duration } from 'luxon';
import { AnalyticDateUtil } from '@modules/analytic/utils/analytic.date.util';

describe('AnalyticDateUtil', () => {
    const configGet = vi.fn<(key: string) => string | undefined>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });
    const helperStringService: MockProxy<HelperStringService> =
        mock<HelperStringService>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();

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
                { provide: HelperDateService, useValue: helperDateService },
            ],
        }).compile();

        util = module.get(AnalyticDateUtil);
    });

    describe('cacheToken', () => {
        it('returns the ISO string when a date is present', () => {
            expect(util.cacheToken(startDate)).toBe(startDate.toISOString());
        });

        it('returns an underscore when the date is omitted', () => {
            expect(util.cacheToken(null)).toBe('_');
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

            const result = util.windowToken(null, null);

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

    describe('windowRange', () => {
        it('returns the window ending now and starting windowMs earlier', () => {
            const now = new Date('2026-03-01T00:00:00.000Z');
            const earlier = new Date('2026-02-28T23:59:00.000Z');
            helperDateService.create.mockReturnValue(now);
            helperDateService.backward.mockReturnValue(earlier);

            const result = util.windowRange(60000);

            expect(result).toEqual({ startDate: earlier, endDate: now });
            expect(helperDateService.backward).toHaveBeenCalledWith(
                now,
                Duration.fromMillis(60000)
            );
        });
    });

    describe('pagedMetricToken', () => {
        it('fills the paged metric pattern with the one-based page and the page size', () => {
            helperStringService.fillPattern.mockReturnValue('paged-token');

            const result = util.pagedMetricToken(
                EnumAnalyticDashboardMetric.workspacesMembership,
                20,
                10
            );

            expect(result).toBe('paged-token');
            expect(helperStringService.fillPattern).toHaveBeenCalledWith(
                '{metric}:page={page}:perPage={perPage}',
                {
                    metric: EnumAnalyticDashboardMetric.workspacesMembership,
                    page: '3',
                    perPage: '10',
                }
            );
        });
    });
});
