import type { MockProxy } from 'vitest-mock-extended';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { AnalyticDateUtil } from '@modules/analytic/utils/analytic.date.util';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import { TestUnitKitConfigValues } from '@test/unit/helpers/test.unit.kit.helper';

describe('AnalyticDateUtil', () => {
    let configService: MockProxy<ConfigService>;

    const startDate: Date = new Date('2026-01-01T00:00:00.000Z');
    const endDate: Date = new Date('2026-02-01T00:00:00.000Z');

    let util: AnalyticDateUtil;

    beforeAll(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-03-01T00:00:00.000Z'));
    });

    afterAll(() => {
        vi.useRealTimers();
    });

    beforeEach(async () => {
        configService = buildConfigService({
            ...TestUnitKitConfigValues,
            'analytic.cache.windowTokenPattern': 'Window:{start}:{end}',
        });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticDateUtil,
                HelperStringService,
                HelperDateService,
                { provide: ConfigService, useValue: configService },
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
            expect(util.windowToken(startDate, endDate)).toBe(
                'Window:2026-01-01T00:00:00.000Z:2026-02-01T00:00:00.000Z'
            );
        });

        it('fills the window pattern with underscores when dates are omitted', () => {
            expect(util.windowToken(null, null)).toBe('Window:_:_');
        });
    });

    describe('windowRange', () => {
        it('returns the window ending now and starting windowMs earlier', () => {
            expect(util.windowRange(60000)).toEqual({
                startDate: new Date('2026-02-28T23:59:00.000Z'),
                endDate: new Date('2026-03-01T00:00:00.000Z'),
            });
        });
    });
});
