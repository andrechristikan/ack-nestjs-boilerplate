import { CacheMainProvider } from '@common/cache/constants/cache.constant';
import { EnumPolicyAction, EnumPolicySubject } from '@generated/prisma-client';
import { PolicyCache } from '@modules/policy/caches/policy.cache';
import type {
    IPolicyRule,
    IPolicyRuleWithRole,
} from '@modules/policy/interfaces/policy.interface';
import { PolicyRepository } from '@modules/policy/repositories/policy.repository';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import type { Cache } from 'cache-manager';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';

describe('PolicyCache', () => {
    const cacheManager: MockProxy<Cache> = mock<Cache>();
    const policyRepository: MockProxy<PolicyRepository> =
        mock<PolicyRepository>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>();
    const policy = {
        roleId: 'role-id',
        subject: EnumPolicySubject.User,
        action: [EnumPolicyAction.read],
        conditions: { userId: '${userId}' },
        inverted: false,
        reason: null,
    } satisfies IPolicyRuleWithRole;
    const rule: IPolicyRule = {
        subject: policy.subject,
        action: policy.action,
        conditions: policy.conditions,
        inverted: policy.inverted,
        reason: policy.reason,
    };

    let service: PolicyCache;

    beforeEach(async () => {
        vi.resetAllMocks();
        vi.mocked(configService.get).mockImplementation(
            (key: string) =>
                ({
                    'policy.keyPattern': 'Policy:Role:{roleId}',
                    'policy.cacheTtlInMs': 60000,
                })[key]
        );
        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                PolicyCache,
                { provide: CacheMainProvider, useValue: cacheManager },
                { provide: PolicyRepository, useValue: policyRepository },
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();
        service = moduleRef.get(PolicyCache);
    });

    it('returns cached rules without loading the repository', async () => {
        cacheManager.mget.mockResolvedValue([[rule]]);

        await expect(
            service.getByRoleIdsAndCache(['role-id'])
        ).resolves.toEqual([rule]);
        expect(cacheManager.mget).toHaveBeenCalledWith(['Policy:Role:role-id']);
        expect(policyRepository.findManyByRoleIds).not.toHaveBeenCalled();
    });

    it('loads every missed role in one query, caches them', async () => {
        cacheManager.mget.mockResolvedValue([undefined, undefined]);
        policyRepository.findManyByRoleIds.mockResolvedValue([policy]);

        await expect(
            service.getByRoleIdsAndCache(['role-id', 'empty-role'])
        ).resolves.toEqual([policy]);
        expect(
            policyRepository.findManyByRoleIds
        ).toHaveBeenCalledExactlyOnceWith(['role-id', 'empty-role']);
        expect(cacheManager.mset).toHaveBeenCalledWith([
            { key: 'Policy:Role:role-id', value: [policy], ttl: 60000 },
            { key: 'Policy:Role:empty-role', value: [], ttl: 60000 },
        ]);
    });

    it('queries only the roles that missed and keeps role order', async () => {
        const other = { ...rule, subject: EnumPolicySubject.Project };
        cacheManager.mget.mockResolvedValue([undefined, [other]]);
        policyRepository.findManyByRoleIds.mockResolvedValue([policy]);

        await expect(
            service.getByRoleIdsAndCache(['role-id', 'other-role'])
        ).resolves.toEqual([policy, other]);
        expect(policyRepository.findManyByRoleIds).toHaveBeenCalledWith([
            'role-id',
        ]);
    });

    it('deduplicates repeated role ids', async () => {
        cacheManager.mget.mockResolvedValue([[rule]]);

        await expect(
            service.getByRoleIdsAndCache(['role-id', 'role-id'])
        ).resolves.toEqual([rule]);
        expect(cacheManager.mget).toHaveBeenCalledWith(['Policy:Role:role-id']);
    });

    it('falls through to the repository when the cache read fails', async () => {
        cacheManager.mget.mockRejectedValue(new Error('redis down'));
        policyRepository.findManyByRoleIds.mockResolvedValue([policy]);

        await expect(
            service.getByRoleIdsAndCache(['role-id'])
        ).resolves.toEqual([policy]);
    });

    it('still returns the rules when the cache write fails', async () => {
        cacheManager.mget.mockResolvedValue([undefined]);
        cacheManager.mset.mockRejectedValue(new Error('redis down'));
        policyRepository.findManyByRoleIds.mockResolvedValue([policy]);

        await expect(
            service.getByRoleIdsAndCache(['role-id'])
        ).resolves.toEqual([policy]);
    });

    it('getCacheByRoleIds maps only the roles that hit', async () => {
        cacheManager.mget.mockResolvedValue([[rule], undefined]);

        await expect(
            service.getCacheByRoleIds(['role-id', 'other-role'])
        ).resolves.toEqual(new Map([['role-id', [rule]]]));
        expect(cacheManager.mget).toHaveBeenCalledWith([
            'Policy:Role:role-id',
            'Policy:Role:other-role',
        ]);
    });

    it('getCacheByRoleIds returns an empty map when the read fails', async () => {
        cacheManager.mget.mockRejectedValue(new Error('redis down'));

        await expect(service.getCacheByRoleIds(['role-id'])).resolves.toEqual(
            new Map()
        );
    });

    it('setCacheByRoleIds writes every role with the configured ttl', async () => {
        await service.setCacheByRoleIds(new Map([['role-id', [rule]]]));

        expect(cacheManager.mset).toHaveBeenCalledWith([
            { key: 'Policy:Role:role-id', value: [rule], ttl: 60000 },
        ]);
    });

    it('setCacheByRoleIds swallows a write failure', async () => {
        cacheManager.mset.mockRejectedValue(new Error('redis down'));

        await expect(
            service.setCacheByRoleIds(new Map([['role-id', [rule]]]))
        ).resolves.toBeUndefined();
    });

    it('deletes the role key', async () => {
        await service.deleteCacheByRoleId('role-id');

        expect(cacheManager.del).toHaveBeenCalledWith('Policy:Role:role-id');
    });

    it('rejects when the cache delete fails so a stale grant is never silent', async () => {
        const error = new Error('redis down');
        cacheManager.del.mockRejectedValue(error);

        await expect(service.deleteCacheByRoleId('role-id')).rejects.toBe(
            error
        );
    });
});
