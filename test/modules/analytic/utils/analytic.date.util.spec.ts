import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { AnalyticDateUtil } from '@modules/analytic/utils/analytic.date.util';

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
