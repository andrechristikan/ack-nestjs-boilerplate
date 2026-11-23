import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { PolicyCache } from '@modules/policy/caches/policy.cache';

describe('PolicyCache', () => {
    const configGet = vi.fn<(key: string) => string | number | undefined>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });

    const helperStringService: MockProxy<HelperStringService> =
        mock<HelperStringService>();

    let cache: PolicyCache;

    beforeEach(async () => {
        vi.resetAllMocks();
        configGet.mockImplementation((key: string) => {
            const values: Record<string, string | number> = {
                'policy.keyPattern':
                    'Policy:Role:{roleId}:Rev:{policyRevision}',
                'policy.cacheTtlInMs': 900000,
            };
            return values[key];
        });

        helperStringService.fillPattern.mockReturnValue(
            'Policy:Role:role-1:Rev:3'
        );

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PolicyCache,
                { provide: ConfigService, useValue: configService },
                { provide: HelperStringService, useValue: helperStringService },
            ],
        }).compile();

        cache = module.get(PolicyCache);
    });

    describe('cacheTtlInMs', () => {
        it('reads the TTL from policy.cacheTtlInMs', () => {
            expect(cache.cacheTtlInMs).toBe(900000);
            expect(configGet).toHaveBeenCalledWith('policy.cacheTtlInMs');
        });
    });

    describe('buildPolicyRulesKey', () => {
        it('fills the key pattern with the role id and the revision as a string', () => {
            const key = cache.buildPolicyRulesKey('role-1', 3);

            expect(helperStringService.fillPattern).toHaveBeenCalledWith(
                'Policy:Role:{roleId}:Rev:{policyRevision}',
                { roleId: 'role-1', policyRevision: '3' }
            );
            expect(key).toBe('Policy:Role:role-1:Rev:3');
        });
    });
});
