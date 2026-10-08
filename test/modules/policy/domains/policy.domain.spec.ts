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
} from '@generated/prisma-client';
import { EnumRolePlatformKey } from '@modules/role/enums/role.platform-key.enum';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import { PolicyImmutableException } from '@modules/policy/exceptions/policy.immutable.exception';
import { PolicyNotFoundException } from '@modules/policy/exceptions/policy.not-found.exception';
import type { PolicyCreateRequestDto } from '@modules/policy/dtos/request/policy.create.request.dto';
import type { PolicyUpdateRequestDto } from '@modules/policy/dtos/request/policy.update.request.dto';
import { PolicyCache } from '@modules/policy/caches/policy.cache';
import { PolicyRepository } from '@modules/policy/repositories/policy.repository';
import { PolicyDomain } from '@modules/policy/domains/policy.domain';
import { RoleDomain } from '@modules/role/domains/role.domain';
import type { IRoleWithPolicies } from '@modules/role/interfaces/role.interface';
import { RoleNotFoundException } from '@modules/role/exceptions/role.not-found.exception';

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
        description: null,
        createdAt: now,
        createdBy: null,
        updatedAt: now,
        updatedBy: null,
        policies: [],
    } satisfies IRoleWithPolicies;
    const superAdminRole = {
        ...role,
        id: 'super-admin-role-id',
        key: EnumRolePlatformKey.superAdmin,
        name: 'Super Admin',
    } satisfies IRoleWithPolicies;
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

    let service: PolicyDomain;

    beforeEach(async () => {
        vi.resetAllMocks();
        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                PolicyDomain,
                { provide: PolicyRepository, useValue: policyRepository },
                { provide: PolicyCache, useValue: policyCache },
                { provide: RoleDomain, useValue: roleDomain },
                { provide: ActivityLogDomain, useValue: activityLogDomain },
            ],
        }).compile();

        service = moduleRef.get(PolicyDomain);
    });

    it('returns no policies when the role does not exist', async () => {
        policyRepository.findManyByRoleId.mockResolvedValue([]);

        await expect(service.findManyByRole('missing')).resolves.toEqual([]);
        expect(roleDomain.getById).not.toHaveBeenCalled();
    });

    it('returns policies for an existing role', async () => {
        roleDomain.getById.mockResolvedValue(role);
        policyRepository.findManyByRoleId.mockResolvedValue([policy]);

        await expect(service.findManyByRole('role-id')).resolves.toEqual([
            policy,
        ]);
    });

    it('forwards the role where to the repository', async () => {
        const roleWhere = { scope: EnumRoleScope.platform };
        policyRepository.findManyByRoleId.mockResolvedValue([policy]);

        await service.findManyByRole('role-id', roleWhere);

        expect(policyRepository.findManyByRoleId).toHaveBeenCalledWith(
            'role-id',
            roleWhere
        );
    });

    describe('findManyByRoleIds', () => {
        it('reads the rules of every role through the policy cache', async () => {
            policyCache.getByRoleIdsAndCache.mockResolvedValue([policy]);

            await expect(service.findManyByRoleIds('a', 'b')).resolves.toEqual([
                policy,
            ]);
            expect(policyCache.getByRoleIdsAndCache).toHaveBeenCalledWith([
                'a',
                'b',
            ]);
            expect(policyRepository.findManyByRoleIds).not.toHaveBeenCalled();
        });
    });

    describe('createByAdmin', () => {
        it('creates a policy and stages its activity', async () => {
            const event = mock<ReturnType<ActivityLogDomain['prepare']>>();
            roleDomain.getOne.mockResolvedValue(role);
            policyRepository.create.mockResolvedValue(policy);
            activityLogDomain.prepare.mockReturnValue(event);

            await expect(
                service.createByAdmin('role-id', ruleRequest)
            ).resolves.toBe(policy);
            expect(policyRepository.create).toHaveBeenCalledWith(
                'role-id',
                ruleRequest
            );
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.adminPolicyCreate,
            });
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                event,
            ]);
            expect(policyCache.deleteCacheByRoleId).toHaveBeenCalledWith(
                'role-id'
            );
        });

        it('rethrows any other write error and stages nothing', async () => {
            const error = new Error('boom');
            roleDomain.getOne.mockResolvedValue(role);
            policyRepository.create.mockRejectedValue(error);

            await expect(
                service.createByAdmin('role-id', ruleRequest)
            ).rejects.toBe(error);
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
        });
    });

    it('rejects the write when the cache invalidation fails', async () => {
        const error = new Error('redis down');
        roleDomain.getOne.mockResolvedValue(role);
        policyRepository.create.mockResolvedValue(policy);
        policyCache.deleteCacheByRoleId.mockRejectedValue(error);

        await expect(
            service.createByAdmin('role-id', ruleRequest)
        ).rejects.toBe(error);
        expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
    });

    describe('updateByAdmin', () => {
        it('rejects when the policy does not exist on the role', async () => {
            roleDomain.getOne.mockResolvedValue(role);
            policyRepository.findOneByRoleIdAndId.mockResolvedValue(null);

            await expect(
                service.updateByAdmin('role-id', 'missing', ruleUpdate)
            ).rejects.toBeInstanceOf(PolicyNotFoundException);
            expect(policyRepository.update).not.toHaveBeenCalled();
        });

        it('updates a policy and stages its activity', async () => {
            const event = mock<ReturnType<ActivityLogDomain['prepare']>>();
            roleDomain.getOne.mockResolvedValue(role);
            policyRepository.findOneByRoleIdAndId.mockResolvedValue(policy);
            policyRepository.update.mockResolvedValue(policy);
            activityLogDomain.prepare.mockReturnValue(event);

            await expect(
                service.updateByAdmin('role-id', policy.id, ruleUpdate)
            ).resolves.toBe(policy);
            expect(policyRepository.update).toHaveBeenCalledWith(
                policy.id,
                ruleUpdate
            );
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.adminPolicyUpdate,
            });
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                event,
            ]);
            expect(policyCache.deleteCacheByRoleId).toHaveBeenCalledWith(
                'role-id'
            );
        });

        it('rethrows any other write error and stages nothing', async () => {
            const error = new Error('boom');
            roleDomain.getOne.mockResolvedValue(role);
            policyRepository.findOneByRoleIdAndId.mockResolvedValue(policy);
            policyRepository.update.mockRejectedValue(error);

            await expect(
                service.updateByAdmin('role-id', policy.id, ruleUpdate)
            ).rejects.toBe(error);
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
        });
    });

    describe('deleteByAdmin', () => {
        it('rejects when the policy does not exist', async () => {
            roleDomain.getOne.mockResolvedValue(role);
            policyRepository.existsByRoleIdAndId.mockResolvedValue(false);

            await expect(
                service.deleteByAdmin('role-id', 'missing')
            ).rejects.toBeInstanceOf(PolicyNotFoundException);
        });
    });

    it('deletes a policy and stages its activity', async () => {
        roleDomain.getOne.mockResolvedValue(role);
        policyRepository.existsByRoleIdAndId.mockResolvedValue(true);
        policyRepository.delete.mockResolvedValue(policy);

        await expect(service.deleteByAdmin('role-id', policy.id)).resolves.toBe(
            policy
        );
        expect(policyRepository.delete).toHaveBeenCalledWith(policy.id);
        expect(activityLogDomain.stagePrepared).toHaveBeenCalledOnce();
        expect(policyCache.deleteCacheByRoleId).toHaveBeenCalledWith('role-id');
    });

    describe('super administrator policy immutability', () => {
        it.each([
            [
                'create',
                () => service.createByAdmin(superAdminRole.id, ruleRequest),
            ],
            [
                'update',
                () =>
                    service.updateByAdmin(
                        superAdminRole.id,
                        policy.id,
                        ruleUpdate
                    ),
            ],
            [
                'delete',
                () => service.deleteByAdmin(superAdminRole.id, policy.id),
            ],
        ])(
            'rejects %s before any repository read or write and before any activity log stage',
            async (_name, run) => {
                roleDomain.getOne.mockResolvedValue(superAdminRole);

                await expect(run()).rejects.toBeInstanceOf(
                    PolicyImmutableException
                );
                expect(
                    policyRepository.findOneByRoleIdAndId
                ).not.toHaveBeenCalled();
                expect(
                    policyRepository.existsByRoleIdAndId
                ).not.toHaveBeenCalled();
                expect(policyRepository.create).not.toHaveBeenCalled();
                expect(policyRepository.update).not.toHaveBeenCalled();
                expect(policyRepository.delete).not.toHaveBeenCalled();
                expect(activityLogDomain.prepare).not.toHaveBeenCalled();
                expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
                expect(policyCache.deleteCacheByRoleId).not.toHaveBeenCalled();
            }
        );

        it.each([
            ['a workspace role sharing the key', EnumRoleScope.workspace],
            ['a project role sharing the key', EnumRoleScope.project],
        ])('does not reject %s', async (_name, scope) => {
            roleDomain.getOne.mockResolvedValue({
                ...superAdminRole,
                scope,
            });
            policyRepository.create.mockResolvedValue(policy);

            await expect(
                service.createByAdmin('role-id', {
                    subject: EnumPolicySubject.ProjectMember,
                    action: [EnumPolicyAction.update],
                    conditions: { projectId: '${projectId}' },
                })
            ).resolves.toBe(policy);
        });

        it('lets a non super administrator platform role through', async () => {
            roleDomain.getOne.mockResolvedValue(role);
            policyRepository.create.mockResolvedValue(policy);

            await expect(
                service.createByAdmin('role-id', ruleRequest)
            ).resolves.toBe(policy);
        });

        it.each([
            ['create', () => service.createByAdmin('missing', ruleRequest)],
            [
                'update',
                () => service.updateByAdmin('missing', policy.id, ruleUpdate),
            ],
            ['delete', () => service.deleteByAdmin('missing', policy.id)],
        ])('rejects %s on a missing role', async (_name, run) => {
            roleDomain.getOne.mockRejectedValue(new RoleNotFoundException());

            await expect(run()).rejects.toBeInstanceOf(RoleNotFoundException);
        });
    });
});
