import { CacheMainProvider } from '@common/cache/constants/cache.constant';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { EnumPolicyAction, EnumPolicySubject } from '@generated/prisma-client';
import { PolicyCache } from '@modules/policy/caches/policy.cache';
import type {
    IPolicyRoleRevision,
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
    const keyPattern = 'Policy:Role:{roleId}:Rev:{policyRevision}';
    const cacheManager: MockProxy<Cache> = mock<Cache>();
    const policyRepository: MockProxy<PolicyRepository> =
        mock<PolicyRepository>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>();
    const helperStringService: MockProxy<HelperStringService> =
        mock<HelperStringService>();
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
    const reference: IPolicyRoleRevision = {
        roleId: 'role-id',
        policyRevision: 3,
    };
    const key = 'Policy:Role:role-id:Rev:3';

    const flush = async (): Promise<void> =>
        new Promise<void>(resolve => {
            setImmediate(resolve);
        });

    let service: PolicyCache;

    beforeEach(async () => {
        vi.resetAllMocks();
        vi.mocked(configService.get).mockImplementation(
            (name: string) =>
                ({
                    'policy.keyPattern': keyPattern,
                    'policy.cacheTtlInMs': 60000,
                })[name]
        );
        helperStringService.fillPattern.mockImplementation((pattern, values) =>
            pattern
                .replace('{roleId}', values.roleId)
                .replace('{policyRevision}', values.policyRevision)
        );
        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                PolicyCache,
                { provide: CacheMainProvider, useValue: cacheManager },
                { provide: PolicyRepository, useValue: policyRepository },
                { provide: ConfigService, useValue: configService },
                { provide: HelperStringService, useValue: helperStringService },
            ],
        }).compile();
        service = moduleRef.get(PolicyCache);
    });

    describe('getByRoleRevisions', () => {
        it('hit on exact revision key returns cached rows without a repository call', async () => {
            cacheManager.mget.mockResolvedValue([[rule]]);

            await expect(
                service.getByRoleRevisions([reference])
            ).resolves.toEqual([rule]);
            expect(cacheManager.mget).toHaveBeenCalledExactlyOnceWith([key]);
            expect(policyRepository.findManyByRoleIds).not.toHaveBeenCalled();
            expect(cacheManager.mset).not.toHaveBeenCalled();
        });

        it('key is Policy:Role:<id>:Rev:<n>, filled from the configured pattern', async () => {
            cacheManager.mget.mockResolvedValue([[rule]]);

            await service.getByRoleRevisions([reference]);

            expect(helperStringService.fillPattern).toHaveBeenCalledWith(
                keyPattern,
                { roleId: 'role-id', policyRevision: '3' }
            );
            expect(cacheManager.mget).toHaveBeenCalledWith([
                'Policy:Role:role-id:Rev:3',
            ]);
        });

        it('revision bump (N+1) misses the N key and loads', async () => {
            cacheManager.mget.mockImplementation(async keys =>
                keys.map(cachedKey =>
                    cachedKey === 'Policy:Role:role-id:Rev:3' ? [rule] : null
                )
            );
            policyRepository.findManyByRoleIds.mockResolvedValue([policy]);

            await expect(
                service.getByRoleRevisions([
                    { roleId: 'role-id', policyRevision: 4 },
                ])
            ).resolves.toEqual([policy]);
            expect(policyRepository.findManyByRoleIds).toHaveBeenCalledWith([
                'role-id',
            ]);
            expect(cacheManager.mset).toHaveBeenCalledWith([
                {
                    key: 'Policy:Role:role-id:Rev:4',
                    value: [policy],
                    ttl: 60000,
                },
            ]);
        });

        it('loads every missed reference in one query and caches them in one write', async () => {
            cacheManager.mget.mockResolvedValue([null, null]);
            policyRepository.findManyByRoleIds.mockResolvedValue([policy]);

            await expect(
                service.getByRoleRevisions([
                    reference,
                    { roleId: 'empty-role', policyRevision: 0 },
                ])
            ).resolves.toEqual([policy]);
            expect(
                policyRepository.findManyByRoleIds
            ).toHaveBeenCalledExactlyOnceWith(['role-id', 'empty-role']);
            expect(cacheManager.mset).toHaveBeenCalledExactlyOnceWith([
                { key, value: [policy], ttl: 60000 },
                {
                    key: 'Policy:Role:empty-role:Rev:0',
                    value: [],
                    ttl: 60000,
                },
            ]);
        });

        it('role with no rows cached as [] and not reloaded on the next call', async () => {
            const empty: IPolicyRoleRevision = {
                roleId: 'empty-role',
                policyRevision: 0,
            };
            const emptyKey = 'Policy:Role:empty-role:Rev:0';
            const store = new Map<string, IPolicyRule[]>();
            cacheManager.mget.mockImplementation(async keys =>
                keys.map(cachedKey => store.get(cachedKey) ?? null)
            );
            cacheManager.mset.mockImplementation(async entries => {
                for (const entry of entries) {
                    store.set(entry.key, entry.value as IPolicyRule[]);
                }
                return entries;
            });
            policyRepository.findManyByRoleIds.mockResolvedValue([]);

            await expect(service.getByRoleRevisions([empty])).resolves.toEqual(
                []
            );
            await expect(service.getByRoleRevisions([empty])).resolves.toEqual(
                []
            );

            expect(store.get(emptyKey)).toEqual([]);
            expect(policyRepository.findManyByRoleIds).toHaveBeenCalledOnce();
        });

        it('queries only the references that missed and keeps request order', async () => {
            const other = { ...rule, subject: EnumPolicySubject.Project };
            cacheManager.mget.mockResolvedValue([null, [other]]);
            policyRepository.findManyByRoleIds.mockResolvedValue([policy]);

            await expect(
                service.getByRoleRevisions([
                    reference,
                    { roleId: 'other-role', policyRevision: 1 },
                ])
            ).resolves.toEqual([policy, other]);
            expect(policyRepository.findManyByRoleIds).toHaveBeenCalledWith([
                'role-id',
            ]);
        });

        it('deduplicates repeated references by key, keeping request order', async () => {
            cacheManager.mget.mockResolvedValue([[rule]]);

            await expect(
                service.getByRoleRevisions([reference, { ...reference }])
            ).resolves.toEqual([rule]);
            expect(cacheManager.mget).toHaveBeenCalledWith([key]);
        });

        it('two concurrent misses on one key make one repository call and both resolve', async () => {
            cacheManager.mget.mockResolvedValue([null]);
            let resolveLoad!: (rows: IPolicyRuleWithRole[]) => void;
            policyRepository.findManyByRoleIds.mockReturnValue(
                new Promise<IPolicyRuleWithRole[]>(resolve => {
                    resolveLoad = resolve;
                })
            );

            const first = service.getByRoleRevisions([reference]);
            const second = service.getByRoleRevisions([reference]);
            await flush();
            resolveLoad([policy]);

            await expect(Promise.all([first, second])).resolves.toEqual([
                [policy],
                [policy],
            ]);
            expect(policyRepository.findManyByRoleIds).toHaveBeenCalledOnce();
        });

        it('an in-flight load for N is not reused for N+1', async () => {
            cacheManager.mget.mockResolvedValue([null]);
            const resolvers: ((rows: IPolicyRuleWithRole[]) => void)[] = [];
            policyRepository.findManyByRoleIds.mockImplementation(
                async () =>
                    new Promise<IPolicyRuleWithRole[]>(resolve => {
                        resolvers.push(resolve);
                    })
            );

            const first = service.getByRoleRevisions([reference]);
            const second = service.getByRoleRevisions([
                { roleId: 'role-id', policyRevision: 4 },
            ]);
            await flush();

            expect(policyRepository.findManyByRoleIds).toHaveBeenCalledTimes(2);
            resolvers[0]([policy]);
            resolvers[1]([]);
            await expect(Promise.all([first, second])).resolves.toEqual([
                [policy],
                [],
            ]);
        });

        it('failing load rejects both waiters, nothing cached, next call retries', async () => {
            const error = new Error('db down');
            cacheManager.mget.mockResolvedValue([null]);
            let rejectLoad!: (reason: Error) => void;
            policyRepository.findManyByRoleIds.mockReturnValueOnce(
                new Promise<IPolicyRuleWithRole[]>((_resolve, reject) => {
                    rejectLoad = reject;
                })
            );

            const first = service.getByRoleRevisions([reference]);
            const second = service.getByRoleRevisions([reference]);
            await flush();
            rejectLoad(error);

            await expect(first).rejects.toBe(error);
            await expect(second).rejects.toBe(error);
            expect(cacheManager.mset).not.toHaveBeenCalled();

            policyRepository.findManyByRoleIds.mockResolvedValue([policy]);
            await expect(
                service.getByRoleRevisions([reference])
            ).resolves.toEqual([policy]);
            expect(policyRepository.findManyByRoleIds).toHaveBeenCalledTimes(2);
        });

        it('mget failure logs and loads', async () => {
            cacheManager.mget.mockRejectedValue(new Error('redis down'));
            policyRepository.findManyByRoleIds.mockResolvedValue([policy]);

            await expect(
                service.getByRoleRevisions([reference])
            ).resolves.toEqual([policy]);
        });

        it('mset failure logs and returns rows', async () => {
            cacheManager.mget.mockResolvedValue([null]);
            cacheManager.mset.mockRejectedValue(new Error('redis down'));
            policyRepository.findManyByRoleIds.mockResolvedValue([policy]);

            await expect(
                service.getByRoleRevisions([reference])
            ).resolves.toEqual([policy]);
        });
    });
    describe('toKey', () => {
        it('fills the configured pattern with the role id and the stringified revision', () => {
            expect(service['toKey'](reference)).toBe(key);
            expect(helperStringService.fillPattern).toHaveBeenCalledWith(
                keyPattern,
                { roleId: 'role-id', policyRevision: '3' }
            );
        });
    });

    describe('getCacheByRoleRevisions', () => {
        it('maps only the references that hit, an empty list counting as a hit', async () => {
            cacheManager.mget.mockResolvedValue([[rule], null, []]);

            await expect(
                service['getCacheByRoleRevisions']([
                    reference,
                    { roleId: 'missed-role', policyRevision: 1 },
                    { roleId: 'empty-role', policyRevision: 0 },
                ])
            ).resolves.toEqual(
                new Map([
                    [key, [rule]],
                    ['Policy:Role:empty-role:Rev:0', []],
                ])
            );
        });

        it('returns an empty map when the read fails', async () => {
            cacheManager.mget.mockRejectedValue(new Error('redis down'));

            await expect(
                service['getCacheByRoleRevisions']([reference])
            ).resolves.toEqual(new Map());
        });
    });

    describe('setCacheByRoleRevisions', () => {
        it('writes every key with the configured ttl', async () => {
            await service['setCacheByRoleRevisions'](new Map([[key, [rule]]]));

            expect(cacheManager.mset).toHaveBeenCalledWith([
                { key, value: [rule], ttl: 60000 },
            ]);
        });

        it('swallows a write failure', async () => {
            cacheManager.mset.mockRejectedValue(new Error('redis down'));

            await expect(
                service['setCacheByRoleRevisions'](new Map([[key, [rule]]]))
            ).resolves.toBeUndefined();
        });
    });

    describe('loadByRoleIds', () => {
        it('groups rows by role, maps a role with no rows to [] and caches the result', async () => {
            policyRepository.findManyByRoleIds.mockResolvedValue([policy]);

            await expect(
                service['loadByRoleIds']([
                    reference,
                    { roleId: 'empty-role', policyRevision: 0 },
                ])
            ).resolves.toEqual(
                new Map([
                    [key, [policy]],
                    ['Policy:Role:empty-role:Rev:0', []],
                ])
            );
            expect(cacheManager.mset).toHaveBeenCalledOnce();
        });

        it('propagates a load failure and caches nothing', async () => {
            const error = new Error('db down');
            policyRepository.findManyByRoleIds.mockRejectedValue(error);

            await expect(service['loadByRoleIds']([reference])).rejects.toBe(
                error
            );
            expect(cacheManager.mset).not.toHaveBeenCalled();
        });
    });

    describe('takeSlice', () => {
        it('returns the key slice of the load and clears the in-flight entry', async () => {
            const loading = Promise.resolve(new Map([[key, [rule]]]));
            service['inFlight'].set(key, Promise.resolve([rule]));

            await expect(service['takeSlice'](key, loading)).resolves.toEqual([
                rule,
            ]);
            expect(service['inFlight'].has(key)).toBe(false);
        });

        it('clears the in-flight entry when the load rejects', async () => {
            const error = new Error('db down');
            service['inFlight'].set(key, Promise.resolve([]));

            await expect(
                service['takeSlice'](key, Promise.reject(error))
            ).rejects.toBe(error);
            expect(service['inFlight'].has(key)).toBe(false);
        });
    });
});
