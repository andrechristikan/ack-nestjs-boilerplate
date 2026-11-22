import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AnalyticFraudUtil } from '@modules/analytic/utils/analytic.fraud.util';

describe('AnalyticFraudUtil', () => {
    const configGet = vi.fn<(key: string) => number | undefined>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });

    const configValues: Record<string, number> = {
        'analytic.fraud.nearLockoutOffset': 1,
    };

    let util: AnalyticFraudUtil;

    beforeEach(async () => {
        vi.resetAllMocks();

        configGet.mockImplementation((key: string) => configValues[key]);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticFraudUtil,
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();

        util = module.get(AnalyticFraudUtil);
    });

    describe('nearLockoutThreshold', () => {
        it('subtracts the near-lockout offset from the max attempt', () => {
            expect(util.nearLockoutThreshold(5)).toBe(4);
            expect(util.nearLockoutThreshold(10)).toBe(9);
        });

        it('floors the threshold at one attempt', () => {
            expect(util.nearLockoutThreshold(1)).toBe(1);
            expect(util.nearLockoutThreshold(0)).toBe(1);
        });
    });
});
