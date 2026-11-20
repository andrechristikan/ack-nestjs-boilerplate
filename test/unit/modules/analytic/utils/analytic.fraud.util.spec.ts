import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import type { MockProxy } from 'vitest-mock-extended';
import { AnalyticFraudUtil } from '@modules/analytic/utils/analytic.fraud.util';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';

describe('AnalyticFraudUtil', () => {
    let configService: MockProxy<ConfigService>;

    const configValues: Record<string, number> = {
        'analytic.fraud.nearLockoutOffset': 1,
    };

    let util: AnalyticFraudUtil;

    beforeEach(async () => {
        configService = buildConfigService(configValues);

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
