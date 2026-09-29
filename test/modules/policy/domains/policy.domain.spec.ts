import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { createPrismaAbility } from '@casl/prisma';
import {
    EnumPolicyAction,
    EnumPolicySubject,
    EnumRoleScope,
    EnumActivityLogAction,
    type Policy,
} from '@generated/prisma-client';
import { EnumRolePlatformKey } from '@modules/role/enums/role.platform-key.enum';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import { EnumPolicyStatusCodeError } from '@modules/policy/enums/policy.status-code.enum';
import { PolicyForbiddenException } from '@modules/policy/exceptions/policy.forbidden.exception';
import { PolicyImmutableException } from '@modules/policy/exceptions/policy.immutable.exception';
import { PolicyNotFoundException } from '@modules/policy/exceptions/policy.not-found.exception';
import type { PolicyCreateRequestDto } from '@modules/policy/dtos/request/policy.create.request.dto';
import type { PolicyUpdateRequestDto } from '@modules/policy/dtos/request/policy.update.request.dto';
import type { IPolicyAbility } from '@modules/policy/interfaces/policy.interface';
import { PolicyRepository } from '@modules/policy/repositories/policy.repository';
import { PolicyDomain } from '@modules/policy/domains/policy.domain';
import { RoleDomain } from '@modules/role/domains/role.domain';
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
    };
    const superAdminRole = {
        id: 'super-admin-role-id',
        scope: EnumRoleScope.platform,
        key: EnumRolePlatformKey.superAdmin,
        name: 'Super Admin',
    };
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
    const roleDomain: MockProxy<RoleDomain> = mock<RoleDomain>();
    const activityLogDomain: MockProxy<ActivityLogDomain> =
        mock<ActivityLogDomain>();
    const ability: MockProxy<IPolicyAbility> = mock<IPolicyAbility>();

    let service: PolicyDomain;

    beforeEach(async () => {
        vi.resetAllMocks();
        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                PolicyDomain,
                { provide: PolicyRepository, useValue: policyRepository },
                { provide: RoleDomain, useValue: roleDomain },
                { provide: ActivityLogDomain, useValue: activityLogDomain },
            ],
        }).compile();

        service = moduleRef.get(PolicyDomain);
    });

    describe('accessibleWhere', () => {
        it('returns null when the ability has no rules for the subject', () => {
            ability.rulesFor.mockReturnValue([]);

            expect(
                service.accessibleWhere(
                    ability,
                    EnumPolicyAction.read,
                    EnumPolicySubject.Project
                )
            ).toBeNull();
        });

        it('converts matching CASL rules into a Prisma where clause', () => {
            expect(
                service.accessibleWhere(
                    createPrismaAbility<IPolicyAbility>([
                        {
                            action: EnumPolicyAction.read,
                            subject: 'Project',
                            conditions: { workspaceId: 'workspace-1' },
                        },
                    ]),
                    EnumPolicyAction.read,
                    EnumPolicySubject.Project
                )
            ).toEqual({ OR: [{ workspaceId: 'workspace-1' }] });
        });
    });

    describe('assertCan', () => {
        beforeEach(() => {
            ability.detectSubjectType.mockReturnValue(
                'Project' as ReturnType<IPolicyAbility['detectSubjectType']>
            );
        });

        it('passes when a non-inverted rule matches the action and subject', () => {
            ability.relevantRuleFor.mockReturnValue({
                inverted: false,
                reason: undefined,
            } as ReturnType<IPolicyAbility['relevantRuleFor']>);

            expect(() =>
                service.assertCan(
                    ability,
                    EnumPolicyAction.read,
                    EnumPolicySubject.Project
                )
            ).not.toThrow();
        });

        it('throws PolicyForbiddenException with no reason when no rule matches', () => {
            ability.relevantRuleFor.mockReturnValue(null);

            try {
                service.assertCan(
                    ability,
                    EnumPolicyAction.delete,
                    EnumPolicySubject.Project
                );
                throw new Error('expected throw');
            } catch (error) {
                expect(error).toBeInstanceOf(PolicyForbiddenException);
                expect(error).toMatchObject({
                    module: 'policy',
                    statusCode: EnumPolicyStatusCodeError.forbidden,
                    messagePath: 'policy.error.forbidden',
                });
                expect(
                    (error as PolicyForbiddenException).metadata
                ).toBeUndefined();
            }
        });

        it('throws PolicyForbiddenException carrying the reason of the matched inverted rule', () => {
            ability.relevantRuleFor.mockReturnValue({
                inverted: true,
                reason: 'blocked by rule',
            } as ReturnType<IPolicyAbility['relevantRuleFor']>);

            try {
                service.assertCan(
                    ability,
                    EnumPolicyAction.delete,
                    EnumPolicySubject.Project
                );
                throw new Error('expected throw');
            } catch (error) {
                expect(error).toBeInstanceOf(PolicyForbiddenException);
                expect((error as PolicyForbiddenException).metadata).toEqual({
                    reason: 'blocked by rule',
                });
            }
        });

        it('checks the subject-tagged record when the input carries one', () => {
            const record = { id: 'workspace-1' };
            ability.relevantRuleFor.mockReturnValue(null);

            try {
                service.assertCan(
                    ability,
                    EnumPolicyAction.update,
                    EnumPolicySubject.Workspace,
                    record
                );
                throw new Error('expected throw');
            } catch {
                expect(ability.relevantRuleFor).toHaveBeenCalledWith(
                    EnumPolicyAction.update,
                    expect.objectContaining(record),
                    undefined
                );
            }
        });
    });

    it('rejects role-scoped reads when the role does not exist', async () => {
        roleDomain.getById.mockResolvedValue(null);

        await expect(service.findManyByRole('missing')).rejects.toBeInstanceOf(
            RoleNotFoundException
        );
    });

    it('returns policies for an existing role', async () => {
        roleDomain.getById.mockResolvedValue(role);
        policyRepository.findManyByRoleId.mockResolvedValue([policy]);

        await expect(service.findManyByRole('role-id')).resolves.toEqual([
            policy,
        ]);
    });

    describe('createByAdmin', () => {
        it('creates a policy and stages its activity', async () => {
            const event = mock<ReturnType<ActivityLogDomain['prepare']>>();
            roleDomain.getById.mockResolvedValue(role);
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
        });

        it('persists a structurally valid rule without role-scope validation', async () => {
            roleDomain.getById.mockResolvedValue({
                ...role,
                scope: EnumRoleScope.project,
            });
            policyRepository.create.mockResolvedValue(policy);

            await expect(
                service.createByAdmin('role-id', {
                    subject: EnumPolicySubject.all,
                    action: [EnumPolicyAction.manage],
                })
            ).resolves.toBe(policy);
            expect(policyRepository.create).toHaveBeenCalledWith('role-id', {
                subject: EnumPolicySubject.all,
                action: [EnumPolicyAction.manage],
            });
        });

        it('rethrows any other write error and stages nothing', async () => {
            const error = new Error('boom');
            roleDomain.getById.mockResolvedValue(role);
            policyRepository.create.mockRejectedValue(error);

            await expect(
                service.createByAdmin('role-id', ruleRequest)
            ).rejects.toBe(error);
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
        });
    });

    describe('updateByAdmin', () => {
        it('rejects when the policy does not exist on the role', async () => {
            roleDomain.getById.mockResolvedValue(role);
            policyRepository.findOneByRoleIdAndId.mockResolvedValue(null);

            await expect(
                service.updateByAdmin('role-id', 'missing', ruleUpdate)
            ).rejects.toBeInstanceOf(PolicyNotFoundException);
            expect(policyRepository.update).not.toHaveBeenCalled();
        });

        it('updates a policy and stages its activity', async () => {
            const event = mock<ReturnType<ActivityLogDomain['prepare']>>();
            roleDomain.getById.mockResolvedValue(role);
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
        });

        it('rethrows any other write error and stages nothing', async () => {
            const error = new Error('boom');
            roleDomain.getById.mockResolvedValue(role);
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
            roleDomain.getById.mockResolvedValue(role);
            policyRepository.existsByRoleIdAndId.mockResolvedValue(false);

            await expect(
                service.deleteByAdmin('role-id', 'missing')
            ).rejects.toBeInstanceOf(PolicyNotFoundException);
        });
    });

    it('deletes a policy and stages its activity', async () => {
        roleDomain.getById.mockResolvedValue(role);
        policyRepository.existsByRoleIdAndId.mockResolvedValue(true);
        policyRepository.delete.mockResolvedValue(policy);

        await expect(service.deleteByAdmin('role-id', policy.id)).resolves.toBe(
            policy
        );
        expect(policyRepository.delete).toHaveBeenCalledWith(policy.id);
        expect(activityLogDomain.stagePrepared).toHaveBeenCalledOnce();
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
                roleDomain.getById.mockResolvedValue(superAdminRole);

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
            }
        );

        it.each([
            ['a workspace role sharing the key', EnumRoleScope.workspace],
            ['a project role sharing the key', EnumRoleScope.project],
        ])('does not reject %s', async (_name, scope) => {
            roleDomain.getById.mockResolvedValue({
                ...superAdminRole,
                scope,
            });
            policyRepository.create.mockResolvedValue(policy);

            await expect(
                service.createByAdmin('role-id', {
                    subject: EnumPolicySubject.ProjectMember,
                    action: [EnumPolicyAction.update],
                    conditions: { projectId: '${project.id}' },
                })
            ).resolves.toBe(policy);
        });

        it('lets a non super administrator platform role through', async () => {
            roleDomain.getById.mockResolvedValue(role);
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
            roleDomain.getById.mockResolvedValue(null);

            await expect(run()).rejects.toBeInstanceOf(RoleNotFoundException);
        });
    });
});
