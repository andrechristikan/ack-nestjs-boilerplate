import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumPolicyAction,
    EnumPolicySubject,
    EnumRoleScope,
    EnumActivityLogAction,
    type Policy,
    type Prisma,
} from '@generated/prisma-client';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { EnumRolePlatformKey } from '@modules/role/enums/role.platform-key.enum';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import { PolicyImmutableException } from '@modules/policy/exceptions/policy.immutable.exception';
import { PolicyNotFoundException } from '@modules/policy/exceptions/policy.not-found.exception';
import { PolicyInvalidRuleException } from '@modules/policy/exceptions/policy.invalid-rule.exception';
import { EnumPolicyInvalidRuleReason } from '@modules/policy/enums/policy.invalid-rule-reason.enum';
import type { PolicyCreateRequestDto } from '@modules/policy/dtos/request/policy.create.request.dto';
import type { PolicyUpdateRequestDto } from '@modules/policy/dtos/request/policy.update.request.dto';
import { PolicyCache } from '@modules/policy/caches/policy.cache';
import { PolicyRepository } from '@modules/policy/repositories/policy.repository';
import { PolicyDomain } from '@modules/policy/domains/policy.domain';
import { RoleDomain } from '@modules/role/domains/role.domain';
import type { IRole } from '@modules/role/interfaces/role.interface';

describe('PolicyDomain', () => {
    const now = new Date('2026-01-01T00:00:00.000Z');
    const policy = {
        id: 'policy-id',
        roleId: 'role-id',
        subject: EnumPolicySubject.User,
        action: [EnumPolicyAction.read, EnumPolicyAction.update],
        conditions: null,
        inverted: false,
        reason: null,
        createdAt: now,
        createdBy: null,
        updatedAt: now,
        updatedBy: null,
    } satisfies Policy;
    const role = {
        id: 'role-id',
        scope: EnumRoleScope.platform,
        key: EnumRolePlatformKey.admin,
        name: 'Admin',
    } satisfies IRole;
    const superAdminRole = {
        ...role,
        id: 'super-admin-role-id',
        key: EnumRolePlatformKey.superAdmin,
        name: 'Super Admin',
    } satisfies IRole;
    const ruleRequest: PolicyCreateRequestDto = {
        subject: EnumPolicySubject.User,
        action: [EnumPolicyAction.read],
    };
    const ruleUpdate: PolicyUpdateRequestDto = {
        action: [EnumPolicyAction.read],
        inverted: true,
        reason: 'why',
    };
    const policyRepository: MockProxy<PolicyRepository> =
        mock<PolicyRepository>();
    const policyCache: MockProxy<PolicyCache> = mock<PolicyCache>();
    const roleDomain: MockProxy<RoleDomain> = mock<RoleDomain>();
    const activityLogDomain: MockProxy<ActivityLogDomain> =
        mock<ActivityLogDomain>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const tx: MockProxy<IDatabaseTransactionClient> =
        mock<IDatabaseTransactionClient>();

    let service: PolicyDomain;

    beforeEach(async () => {
        vi.resetAllMocks();
        databaseService.withTransaction.mockImplementation(async callback =>
            callback(tx)
        );
        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                PolicyDomain,
                { provide: PolicyRepository, useValue: policyRepository },
                { provide: PolicyCache, useValue: policyCache },
                { provide: RoleDomain, useValue: roleDomain },
                { provide: ActivityLogDomain, useValue: activityLogDomain },
                { provide: DatabaseService, useValue: databaseService },
            ],
        }).compile();

        service = moduleRef.get(PolicyDomain);
    });

    describe('findManyByRole', () => {
        it('forwards additionalWhere to findManyByRoleId', async () => {
            const additionalWhere = {
                role: { scope: EnumRoleScope.platform },
            } satisfies Prisma.PolicyWhereInput;
            policyRepository.findManyByRoleId.mockResolvedValue([policy]);

            await expect(
                service.findManyByRole('role-id', additionalWhere)
            ).resolves.toEqual([policy]);
            expect(policyRepository.findManyByRoleId).toHaveBeenCalledWith(
                'role-id',
                additionalWhere
            );
        });

        it('calls findManyByRoleId with an empty where and returns the same result', async () => {
            policyRepository.findManyByRoleId.mockResolvedValue([]);

            await expect(
                service.findManyByRole('missing', {})
            ).resolves.toEqual([]);
            expect(policyRepository.findManyByRoleId).toHaveBeenCalledWith(
                'missing',
                {}
            );
        });
    });

    describe('findManyByRoleRevisions', () => {
        it('delegates to policyCache.getByRoleRevisions', async () => {
            const roleRevisions = [
                { roleId: 'a', policyRevision: 1 },
                { roleId: 'b', policyRevision: 2 },
            ];
            policyCache.getByRoleRevisions.mockResolvedValue([policy]);

            await expect(
                service.findManyByRoleRevisions(roleRevisions)
            ).resolves.toEqual([policy]);
            expect(policyCache.getByRoleRevisions).toHaveBeenCalledWith(
                roleRevisions
            );
            expect(policyRepository.findManyByRoleIds).not.toHaveBeenCalled();
        });
    });

    describe('validateRule', () => {
        const rejectedWith = (
            run: () => void,
            reason: EnumPolicyInvalidRuleReason
        ): void => {
            let thrown: unknown;
            try {
                run();
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toBeInstanceOf(PolicyInvalidRuleException);
            expect((thrown as PolicyInvalidRuleException).messagePath).toBe(
                `policy.error.invalidRule.${reason}`
            );
        };

        it('rejects an empty action list with actionEmpty', () => {
            rejectedWith(
                () =>
                    service.validateRule(EnumRoleScope.platform, {
                        subject: EnumPolicySubject.User,
                        action: [],
                        conditions: null,
                    }),
                EnumPolicyInvalidRuleReason.actionEmpty
            );
        });

        it('rejects an action that is not an EnumPolicyAction member with actionInvalid', () => {
            rejectedWith(
                () =>
                    service.validateRule(EnumRoleScope.platform, {
                        subject: EnumPolicySubject.User,
                        action: ['bogus' as EnumPolicyAction],
                        conditions: null,
                    }),
                EnumPolicyInvalidRuleReason.actionInvalid
            );
        });

        it('rejects a duplicated action with actionDuplicate', () => {
            rejectedWith(
                () =>
                    service.validateRule(EnumRoleScope.platform, {
                        subject: EnumPolicySubject.User,
                        action: [EnumPolicyAction.read, EnumPolicyAction.read],
                        conditions: null,
                    }),
                EnumPolicyInvalidRuleReason.actionDuplicate
            );
        });

        it('rejects a subject the role scope may not grant with roleScopeInvalid', () => {
            rejectedWith(
                () =>
                    service.validateRule(EnumRoleScope.project, {
                        subject: EnumPolicySubject.User,
                        action: [EnumPolicyAction.read],
                        conditions: null,
                    }),
                EnumPolicyInvalidRuleReason.roleScopeInvalid
            );
        });

        it.each([
            [EnumRoleScope.platform, EnumPolicySubject.all],
            [EnumRoleScope.platform, EnumPolicySubject.Analytic],
        ])(
            'rejects conditions on the %s non-model subject %s with conditionsNotAllowed',
            (scope, subject) => {
                rejectedWith(
                    () =>
                        service.validateRule(scope, {
                            subject,
                            action: [EnumPolicyAction.read],
                            conditions: { workspaceId: '${workspaceId}' },
                        }),
                    EnumPolicyInvalidRuleReason.conditionsNotAllowed
                );
            }
        );

        it('reports actionEmpty before roleScopeInvalid', () => {
            rejectedWith(
                () =>
                    service.validateRule(EnumRoleScope.project, {
                        subject: EnumPolicySubject.User,
                        action: [],
                        conditions: null,
                    }),
                EnumPolicyInvalidRuleReason.actionEmpty
            );
        });

        it('reports roleScopeInvalid before conditionsNotAllowed', () => {
            rejectedWith(
                () =>
                    service.validateRule(EnumRoleScope.workspace, {
                        subject: EnumPolicySubject.Analytic,
                        action: [EnumPolicyAction.read],
                        conditions: { a: 1 },
                    }),
                EnumPolicyInvalidRuleReason.roleScopeInvalid
            );
        });

        it('accepts a workspaceId condition on WorkspaceAnalytic', () => {
            expect(() =>
                service.validateRule(EnumRoleScope.workspace, {
                    subject: EnumPolicySubject.WorkspaceAnalytic,
                    action: [EnumPolicyAction.read],
                    conditions: { workspaceId: '${workspaceId}' },
                })
            ).not.toThrow();
        });

        it('workspace scope accepts ProjectMember', () => {
            expect(() =>
                service.validateRule(EnumRoleScope.workspace, {
                    subject: EnumPolicySubject.ProjectMember,
                    action: [EnumPolicyAction.update],
                    conditions: { projectId: '${projectId}' },
                })
            ).not.toThrow();
        });

        it('accepts a model subject with conditions and a non-model subject without', () => {
            expect(() =>
                service.validateRule(EnumRoleScope.platform, {
                    subject: EnumPolicySubject.Analytic,
                    action: [EnumPolicyAction.read],
                    conditions: null,
                })
            ).not.toThrow();
            expect(() =>
                service.validateRule(EnumRoleScope.platform, {
                    subject: EnumPolicySubject.User,
                    action: [EnumPolicyAction.read],
                    conditions: { id: 'x' },
                })
            ).not.toThrow();
        });
    });

    describe('rule validation on admin writes', () => {
        it('create throws before any repository write when the subject is not grantable to the role scope', async () => {
            await expect(
                service.createByAdmin(
                    { ...role, scope: EnumRoleScope.project },
                    ruleRequest
                )
            ).rejects.toBeInstanceOf(PolicyInvalidRuleException);
            expect(policyRepository.createInTx).not.toHaveBeenCalled();
            expect(activityLogDomain.prepare).not.toHaveBeenCalled();
            expect(
                roleDomain.incrementPolicyRevisionInTx
            ).not.toHaveBeenCalled();
        });

        it('update validates conditions against the stored subject (Analytic stored + conditions → conditionsNotAllowed)', async () => {
            policyRepository.findOneByRoleIdAndId.mockResolvedValue({
                ...policy,
                subject: EnumPolicySubject.Analytic,
            });

            await expect(
                service.updateByAdmin(role, policy.id, {
                    action: [EnumPolicyAction.read],
                    conditions: { userId: '${userId}' },
                })
            ).rejects.toMatchObject({
                messagePath: 'policy.error.invalidRule.conditionsNotAllowed',
            });
            expect(policyRepository.updateInTx).not.toHaveBeenCalled();
            expect(activityLogDomain.prepare).not.toHaveBeenCalled();
        });

        it('update accepts conditions on a stored model subject', async () => {
            policyRepository.findOneByRoleIdAndId.mockResolvedValue(policy);
            policyRepository.updateInTx.mockResolvedValue(policy);

            await expect(
                service.updateByAdmin(role, policy.id, {
                    action: [EnumPolicyAction.read],
                    conditions: { userId: '${userId}' },
                })
            ).resolves.toBe(policy);
        });
    });

    describe('createByAdmin', () => {
        it('creates a policy on the given role and stages its activity', async () => {
            const event = mock<ReturnType<ActivityLogDomain['prepare']>>();
            policyRepository.createInTx.mockResolvedValue(policy);
            activityLogDomain.prepare.mockReturnValue(event);

            await expect(
                service.createByAdmin(role, ruleRequest)
            ).resolves.toBe(policy);
            expect(policyRepository.createInTx).toHaveBeenCalledWith(
                tx,
                'role-id',
                ruleRequest
            );
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.adminPolicyCreate,
            });
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                event,
            ]);
            expect(roleDomain.incrementPolicyRevisionInTx).toHaveBeenCalledWith(
                tx,
                'role-id'
            );
        });

        it('rethrows any other write error and stages nothing', async () => {
            const error = new Error('boom');
            policyRepository.createInTx.mockRejectedValue(error);

            await expect(service.createByAdmin(role, ruleRequest)).rejects.toBe(
                error
            );
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
        });

        it('when the increment throws, the error propagates and no activity is staged', async () => {
            const error = new Error('increment failed');
            policyRepository.createInTx.mockResolvedValue(policy);
            roleDomain.incrementPolicyRevisionInTx.mockRejectedValue(error);

            await expect(service.createByAdmin(role, ruleRequest)).rejects.toBe(
                error
            );
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
        });

        it('prepares the activity before the transaction and stages it after', async () => {
            const callOrder: string[] = [];
            const event = mock<ReturnType<ActivityLogDomain['prepare']>>();
            activityLogDomain.prepare.mockImplementation(() => {
                callOrder.push('prepare');
                return event;
            });
            databaseService.withTransaction.mockImplementation(
                async callback => {
                    callOrder.push('begin');
                    const result = await callback(tx);
                    callOrder.push('commit');
                    return result;
                }
            );
            policyRepository.createInTx.mockImplementation(async () => {
                callOrder.push('write');
                return policy;
            });
            roleDomain.incrementPolicyRevisionInTx.mockImplementation(
                async () => {
                    callOrder.push('increment');
                }
            );
            activityLogDomain.stagePrepared.mockImplementation(() => {
                callOrder.push('stage');
            });

            await service.createByAdmin(role, ruleRequest);

            expect(callOrder).toEqual([
                'prepare',
                'begin',
                'write',
                'increment',
                'commit',
                'stage',
            ]);
        });
    });

    describe('updateByAdmin', () => {
        it('throws PolicyNotFoundException when the policy id is not on role.id', async () => {
            policyRepository.findOneByRoleIdAndId.mockResolvedValue(null);

            await expect(
                service.updateByAdmin(role, 'other-role-policy', ruleUpdate)
            ).rejects.toBeInstanceOf(PolicyNotFoundException);
            expect(policyRepository.findOneByRoleIdAndId).toHaveBeenCalledWith(
                'role-id',
                'other-role-policy'
            );
            expect(policyRepository.updateInTx).not.toHaveBeenCalled();
        });

        it('updates a policy and stages its activity', async () => {
            const event = mock<ReturnType<ActivityLogDomain['prepare']>>();
            policyRepository.findOneByRoleIdAndId.mockResolvedValue(policy);
            policyRepository.updateInTx.mockResolvedValue(policy);
            activityLogDomain.prepare.mockReturnValue(event);

            await expect(
                service.updateByAdmin(role, policy.id, ruleUpdate)
            ).resolves.toBe(policy);
            expect(policyRepository.updateInTx).toHaveBeenCalledWith(
                tx,
                policy.id,
                ruleUpdate
            );
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.adminPolicyUpdate,
            });
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                event,
            ]);
            expect(roleDomain.incrementPolicyRevisionInTx).toHaveBeenCalledWith(
                tx,
                'role-id'
            );
        });

        it('rethrows any other write error and stages nothing', async () => {
            const error = new Error('boom');
            policyRepository.findOneByRoleIdAndId.mockResolvedValue(policy);
            policyRepository.updateInTx.mockRejectedValue(error);

            await expect(
                service.updateByAdmin(role, policy.id, ruleUpdate)
            ).rejects.toBe(error);
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
        });

        it('when the increment throws, the error propagates and no activity is staged', async () => {
            const error = new Error('increment failed');
            policyRepository.findOneByRoleIdAndId.mockResolvedValue(policy);
            policyRepository.updateInTx.mockResolvedValue(policy);
            roleDomain.incrementPolicyRevisionInTx.mockRejectedValue(error);

            await expect(
                service.updateByAdmin(role, policy.id, ruleUpdate)
            ).rejects.toBe(error);
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
        });
    });

    describe('deleteByAdmin', () => {
        it('throws PolicyNotFoundException when the policy id is not on role.id', async () => {
            policyRepository.existsByRoleIdAndId.mockResolvedValue(false);

            await expect(
                service.deleteByAdmin(role, 'other-role-policy')
            ).rejects.toBeInstanceOf(PolicyNotFoundException);
            expect(policyRepository.existsByRoleIdAndId).toHaveBeenCalledWith(
                'role-id',
                'other-role-policy'
            );
            expect(policyRepository.deleteInTx).not.toHaveBeenCalled();
        });

        it('deletes a policy and stages its activity', async () => {
            policyRepository.existsByRoleIdAndId.mockResolvedValue(true);
            policyRepository.deleteInTx.mockResolvedValue(policy);

            await expect(service.deleteByAdmin(role, policy.id)).resolves.toBe(
                policy
            );
            expect(policyRepository.deleteInTx).toHaveBeenCalledWith(
                tx,
                policy.id
            );
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledOnce();
            expect(roleDomain.incrementPolicyRevisionInTx).toHaveBeenCalledWith(
                tx,
                'role-id'
            );
        });

        it('when the increment throws, the error propagates and no activity is staged', async () => {
            const error = new Error('increment failed');
            policyRepository.existsByRoleIdAndId.mockResolvedValue(true);
            policyRepository.deleteInTx.mockResolvedValue(policy);
            roleDomain.incrementPolicyRevisionInTx.mockRejectedValue(error);

            await expect(service.deleteByAdmin(role, policy.id)).rejects.toBe(
                error
            );
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
        });
    });

    describe('policy cache', () => {
        it('calls no PolicyCache method on create, update or delete', async () => {
            policyRepository.createInTx.mockResolvedValue(policy);
            policyRepository.findOneByRoleIdAndId.mockResolvedValue(policy);
            policyRepository.updateInTx.mockResolvedValue(policy);
            policyRepository.existsByRoleIdAndId.mockResolvedValue(true);
            policyRepository.deleteInTx.mockResolvedValue(policy);

            await service.createByAdmin(role, ruleRequest);
            await service.updateByAdmin(role, policy.id, ruleUpdate);
            await service.deleteByAdmin(role, policy.id);

            expect(policyCache.getByRoleRevisions).not.toHaveBeenCalled();
        });
    });

    describe('super administrator policy immutability', () => {
        it.each([
            [
                'create',
                () => service.createByAdmin(superAdminRole, ruleRequest),
            ],
            [
                'update',
                () =>
                    service.updateByAdmin(
                        superAdminRole,
                        policy.id,
                        ruleUpdate
                    ),
            ],
            ['delete', () => service.deleteByAdmin(superAdminRole, policy.id)],
        ])(
            'throws PolicyImmutableException on %s before any repository read or write and before any activity log stage',
            async (_name, run) => {
                await expect(run()).rejects.toBeInstanceOf(
                    PolicyImmutableException
                );
                expect(
                    policyRepository.findOneByRoleIdAndId
                ).not.toHaveBeenCalled();
                expect(
                    policyRepository.existsByRoleIdAndId
                ).not.toHaveBeenCalled();
                expect(policyRepository.createInTx).not.toHaveBeenCalled();
                expect(policyRepository.updateInTx).not.toHaveBeenCalled();
                expect(policyRepository.deleteInTx).not.toHaveBeenCalled();
                expect(activityLogDomain.prepare).not.toHaveBeenCalled();
                expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
                expect(
                    roleDomain.incrementPolicyRevisionInTx
                ).not.toHaveBeenCalled();
            }
        );

        it.each([
            ['a workspace role sharing the key', EnumRoleScope.workspace],
            ['a project role sharing the key', EnumRoleScope.project],
        ])('does not reject %s', async (_name, scope) => {
            policyRepository.createInTx.mockResolvedValue(policy);

            await expect(
                service.createByAdmin(
                    { ...superAdminRole, scope },
                    {
                        subject: EnumPolicySubject.ProjectMember,
                        action: [EnumPolicyAction.update],
                        conditions: { projectId: '${projectId}' },
                    }
                )
            ).resolves.toBe(policy);
        });

        it('lets a non super administrator platform role through', async () => {
            policyRepository.createInTx.mockResolvedValue(policy);

            await expect(
                service.createByAdmin(role, ruleRequest)
            ).resolves.toBe(policy);
        });
    });

    describe('role loading', () => {
        it('never calls roleDomain on create, update or delete', async () => {
            policyRepository.createInTx.mockResolvedValue(policy);
            policyRepository.findOneByRoleIdAndId.mockResolvedValue(policy);
            policyRepository.updateInTx.mockResolvedValue(policy);
            policyRepository.existsByRoleIdAndId.mockResolvedValue(true);
            policyRepository.deleteInTx.mockResolvedValue(policy);

            await service.createByAdmin(role, ruleRequest);
            await service.updateByAdmin(role, policy.id, ruleUpdate);
            await service.deleteByAdmin(role, policy.id);

            expect(roleDomain.getOne).not.toHaveBeenCalled();
            expect(roleDomain.getById).not.toHaveBeenCalled();
        });
    });
});
