import { buildPolicyRule } from '@test/unit/helpers/test.unit.policy.helper';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { CacheService } from '@common/cache/services/cache.service';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import {
    EnumPolicyAction,
    EnumPolicySubject,
    EnumRoleScope,
} from '@generated/prisma-client/client';
import type { Policy } from '@generated/prisma-client/client';
import { PolicyCache } from '@modules/policy/caches/policy.cache';
import { PolicyRulesCacheSchema } from '@modules/policy/constants/policy.constant';
import { PolicyImmutableException } from '@modules/policy/exceptions/policy.immutable.exception';
import { PolicyNotFoundException } from '@modules/policy/exceptions/policy.not-found.exception';
import type {
    IPolicyCreate,
    IPolicyUpdate,
} from '@modules/policy/interfaces/policy.interface';
import { PolicyRepository } from '@modules/policy/repositories/policy.repository';
import { PolicyService } from '@modules/policy/services/policy.service';
import { EnumRolePlatformKey } from '@modules/role/enums/role.enum';
import type { IRoleRef } from '@modules/role/interfaces/role.interface';

describe('PolicyService', () => {
    const policyRepository: MockProxy<PolicyRepository> =
        mock<PolicyRepository>();
    const cacheService: MockProxy<CacheService> = mock<CacheService>();
    const policyCache: MockProxy<PolicyCache> = mock<PolicyCache>();
    const tx: MockProxy<IDatabaseTransactionClient> =
        mock<IDatabaseTransactionClient>();

    let service: PolicyService;

    const policy: Policy = {
        id: 'policy-1',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
        roleId: 'role-1',
        subject: EnumPolicySubject.User,
        action: [EnumPolicyAction.manage],
        conditions: null,
        inverted: false,
        reason: null,
    };

    beforeEach(async () => {
        vi.resetAllMocks();
        Object.defineProperty(policyCache, 'cacheTtlInMs', { value: 900000 });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PolicyService,
                { provide: PolicyRepository, useValue: policyRepository },
                { provide: CacheService, useValue: cacheService },
                { provide: PolicyCache, useValue: policyCache },
            ],
        }).compile();

        service = module.get(PolicyService);
    });

    describe('getRulesByRoleRevisions', () => {
        it('reads each role revision through the cache and concatenates the rules in reference order', async () => {
            const platformRules = [buildPolicyRule({})];
            const workspaceRules = [
                buildPolicyRule({ subject: EnumPolicySubject.Project }),
            ];
            policyCache.buildPolicyRulesKey.mockImplementation(
                (roleId, revision) => `key:${roleId}:${revision}`
            );
            cacheService.readThrough.mockImplementation(
                key =>
                    Promise.resolve(
                        key === 'key:role-1:2' ? platformRules : workspaceRules
                    ) as never
            );

            const rules = await service.getRulesByRoleRevisions([
                { roleId: 'role-1', policyRevision: 2 },
                { roleId: 'role-2', policyRevision: 0 },
            ]);

            expect(rules).toEqual([...platformRules, ...workspaceRules]);
            expect(cacheService.readThrough).toHaveBeenCalledWith(
                'key:role-1:2',
                PolicyRulesCacheSchema,
                900000,
                expect.any(Function)
            );
        });

        it('loads a missing entry from the repository by role id', async () => {
            const loaded = [buildPolicyRule({})];
            policyCache.buildPolicyRulesKey.mockReturnValue('key');
            policyRepository.findManyRulesByRoleId.mockResolvedValue(loaded);
            cacheService.readThrough.mockImplementation(
                (_key, _schema, _ttl, loader) => loader() as never
            );

            const rules = await service.getRulesByRoleRevisions([
                { roleId: 'role-1', policyRevision: 1 },
            ]);

            expect(rules).toEqual(loaded);
            expect(policyRepository.findManyRulesByRoleId).toHaveBeenCalledWith(
                'role-1'
            );
        });

        it('returns no rules and reads nothing for no role', async () => {
            const rules = await service.getRulesByRoleRevisions([]);

            expect(rules).toEqual([]);
            expect(cacheService.readThrough).not.toHaveBeenCalled();
        });
    });

    describe('assertRoleWritable', () => {
        const baseRef: IRoleRef = {
            id: 'role-1',
            scope: EnumRoleScope.platform,
            key: EnumRolePlatformKey.admin,
            name: 'Role',
            policyRevision: 0,
        };

        it('throws immutable for the super administrator platform role', () => {
            expect(() =>
                service.assertRoleWritable({
                    ...baseRef,
                    key: EnumRolePlatformKey.superAdmin,
                })
            ).toThrow(PolicyImmutableException);
        });

        it.each([
            [EnumRoleScope.platform, EnumRolePlatformKey.admin],
            [EnumRoleScope.workspace, EnumRolePlatformKey.superAdmin],
        ])('allows a %s role keyed %s', (scope, key) => {
            expect(() =>
                service.assertRoleWritable({ ...baseRef, scope, key })
            ).not.toThrow();
        });
    });

    describe('validateRule', () => {
        it('accepts a subject the role scope may be granted', () => {
            expect(() =>
                service.validateRule(
                    EnumRoleScope.workspace,
                    buildPolicyRule({
                        subject: EnumPolicySubject.WorkspaceMember,
                    })
                )
            ).not.toThrow();
        });

        it('rejects a subject outside the role scope with roleScopeInvalid', () => {
            expect(() =>
                service.validateRule(
                    EnumRoleScope.workspace,
                    buildPolicyRule({ subject: EnumPolicySubject.ApiKey })
                )
            ).toThrow(
                expect.objectContaining({
                    messagePath: 'policy.error.invalidRule.roleScopeInvalid',
                })
            );
        });

        it('rejects an empty action list with actionEmpty', () => {
            expect(() =>
                service.validateRule(
                    EnumRoleScope.platform,
                    buildPolicyRule({ action: [] })
                )
            ).toThrow(
                expect.objectContaining({
                    messagePath: 'policy.error.invalidRule.actionEmpty',
                })
            );
        });

        it('rejects a repeated action with actionDuplicate', () => {
            expect(() =>
                service.validateRule(
                    EnumRoleScope.platform,
                    buildPolicyRule({
                        action: [EnumPolicyAction.read, EnumPolicyAction.read],
                    })
                )
            ).toThrow(
                expect.objectContaining({
                    messagePath: 'policy.error.invalidRule.actionDuplicate',
                })
            );
        });

        it('rejects an action no policy action names with actionInvalid', () => {
            expect(() =>
                service.validateRule(
                    EnumRoleScope.platform,
                    buildPolicyRule({ action: ['fly' as EnumPolicyAction] })
                )
            ).toThrow(
                expect.objectContaining({
                    messagePath: 'policy.error.invalidRule.actionInvalid',
                })
            );
        });

        it.each([EnumPolicySubject.all, EnumPolicySubject.Analytic])(
            'rejects conditions on the non-model subject %s with conditionsNotAllowed',
            subject => {
                expect(() =>
                    service.validateRule(
                        EnumRoleScope.platform,
                        buildPolicyRule({ subject, conditions: { id: 'x' } })
                    )
                ).toThrow(
                    expect.objectContaining({
                        messagePath:
                            'policy.error.invalidRule.conditionsNotAllowed',
                    })
                );
            }
        );

        it('accepts conditions on a model subject', () => {
            expect(() =>
                service.validateRule(
                    EnumRoleScope.platform,
                    buildPolicyRule({ conditions: { status: 'active' } })
                )
            ).not.toThrow();
        });
    });

    describe('getManyByRole', () => {
        it('returns the policies of the role', async () => {
            policyRepository.findManyByRoleId.mockResolvedValue([policy]);

            const result = await service.getManyByRole('role-1');

            expect(result).toEqual([policy]);
            expect(policyRepository.findManyByRoleId).toHaveBeenCalledWith(
                'role-1'
            );
        });
    });

    describe('getOneByRoleIdAndId', () => {
        it('returns the policy of the role', async () => {
            policyRepository.findOneByRoleIdAndId.mockResolvedValue(policy);

            const result = await service.getOneByRoleIdAndId(
                'role-1',
                'policy-1'
            );

            expect(result).toBe(policy);
            expect(policyRepository.findOneByRoleIdAndId).toHaveBeenCalledWith(
                'role-1',
                'policy-1'
            );
        });

        it('throws not found when the role holds no such policy', async () => {
            policyRepository.findOneByRoleIdAndId.mockResolvedValue(null);

            await expect(
                service.getOneByRoleIdAndId('role-1', 'policy-1')
            ).rejects.toThrow(PolicyNotFoundException);
        });
    });

    describe('createByAdminInTx', () => {
        it('creates the policy on the given transaction', async () => {
            const data: IPolicyCreate = {
                subject: EnumPolicySubject.User,
                action: [EnumPolicyAction.read],
                conditions: null,
                inverted: false,
                reason: null,
            };
            policyRepository.createInTx.mockResolvedValue(policy);

            const result = await service.createByAdminInTx(tx, 'role-1', data);

            expect(result).toBe(policy);
            expect(policyRepository.createInTx).toHaveBeenCalledWith(
                tx,
                'role-1',
                data
            );
        });
    });

    describe('updateByAdminInTx', () => {
        const data: IPolicyUpdate = {
            action: [EnumPolicyAction.read],
            conditions: { status: 'active' },
            inverted: false,
            reason: null,
        };

        it('returns the updated policy', async () => {
            policyRepository.updateInTx.mockResolvedValue(policy);

            const result = await service.updateByAdminInTx(
                tx,
                'role-1',
                'policy-1',
                data
            );

            expect(result).toBe(policy);
            expect(policyRepository.updateInTx).toHaveBeenCalledWith(
                tx,
                'role-1',
                'policy-1',
                data
            );
        });

        it('throws not found when no row matches', async () => {
            policyRepository.updateInTx.mockResolvedValue(null);

            await expect(
                service.updateByAdminInTx(tx, 'role-1', 'policy-1', data)
            ).rejects.toThrow(PolicyNotFoundException);
        });
    });

    describe('deleteByAdminInTx', () => {
        it('returns the policy it deleted', async () => {
            policyRepository.findOneByRoleIdAndIdInTx.mockResolvedValue(policy);
            policyRepository.deleteInTx.mockResolvedValue(true);

            const result = await service.deleteByAdminInTx(
                tx,
                'role-1',
                'policy-1'
            );

            expect(result).toBe(policy);
        });

        it('throws not found when the policy does not exist', async () => {
            policyRepository.findOneByRoleIdAndIdInTx.mockResolvedValue(null);

            await expect(
                service.deleteByAdminInTx(tx, 'role-1', 'policy-1')
            ).rejects.toThrow(PolicyNotFoundException);
            expect(policyRepository.deleteInTx).not.toHaveBeenCalled();
        });

        it('throws not found when the delete matches no row', async () => {
            policyRepository.findOneByRoleIdAndIdInTx.mockResolvedValue(policy);
            policyRepository.deleteInTx.mockResolvedValue(false);

            await expect(
                service.deleteByAdminInTx(tx, 'role-1', 'policy-1')
            ).rejects.toThrow(PolicyNotFoundException);
        });
    });
});
