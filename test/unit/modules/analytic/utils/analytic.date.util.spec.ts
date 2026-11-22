import type { MockProxy } from 'vitest-mock-extended';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { AnalyticDateUtil } from '@modules/analytic/utils/analytic.date.util';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import { TestUnitKitConfigValues } from '@test/unit/helpers/test.unit.kit.helper';

describe('AnalyticDateUtil', () => {
    let configService: MockProxy<ConfigService>;

    let util: AnalyticDateUtil;

    beforeAll(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-03-01T00:00:00.000Z'));
    });

    afterAll(() => {
        vi.useRealTimers();
    });

    beforeEach(async () => {
        configService = buildConfigService(TestUnitKitConfigValues);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticDateUtil,
                HelperDateService,
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();

        util = module.get(AnalyticDateUtil);
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
