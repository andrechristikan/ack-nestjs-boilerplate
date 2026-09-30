import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { subject } from '@casl/ability';
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
import type { PolicyAbility } from '@modules/policy/interfaces/policy.interface';
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
    const ability: MockProxy<PolicyAbility> = mock<PolicyAbility>();

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
                    createPrismaAbility<PolicyAbility>([
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

        it('combines multiple allow rules into an OR where clause', () => {
            expect(
                service.accessibleWhere(
                    createPrismaAbility<PolicyAbility>([
                        {
                            action: EnumPolicyAction.read,
                            subject: 'Project',
                            conditions: { workspaceId: 'workspace-1' },
                        },
                        {
                            action: EnumPolicyAction.read,
                            subject: 'Project',
                            conditions: { workspaceId: 'workspace-2' },
                        },
                    ]),
                    EnumPolicyAction.read,
                    EnumPolicySubject.Project
                )
            ).toEqual({
                OR: [
                    { workspaceId: 'workspace-2' },
                    { workspaceId: 'workspace-1' },
                ],
            });
        });

        it('translates an inverted condition into a denying Prisma clause', () => {
            expect(
                service.accessibleWhere(
                    createPrismaAbility<PolicyAbility>([
                        {
                            action: EnumPolicyAction.read,
                            subject: 'Project',
                            conditions: {},
                        },
                        {
                            action: EnumPolicyAction.read,
                            subject: 'Project',
                            inverted: true,
                            conditions: { archived: true },
                        },
                    ]),
                    EnumPolicyAction.read,
                    EnumPolicySubject.Project
                )
            ).toEqual({
                OR: [{ AND: [{}, { NOT: { archived: true } }] }],
            });
        });
    });

    describe('assertCan', () => {
        beforeEach(() => {
            ability.detectSubjectType.mockReturnValue(
                'Project' as ReturnType<PolicyAbility['detectSubjectType']>
            );
        });

        it('passes when a non-inverted rule matches the action and subject', () => {
            ability.relevantRuleFor.mockReturnValue({
                inverted: false,
                reason: undefined,
            } as ReturnType<PolicyAbility['relevantRuleFor']>);

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
            } as ReturnType<PolicyAbility['relevantRuleFor']>);

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

        it('checks a subject-tagged record', () => {
            const record = { id: 'workspace-1' };
            const target = subject(EnumPolicySubject.Workspace, record);
            ability.relevantRuleFor.mockReturnValue(null);

            try {
                service.assertCan(ability, EnumPolicyAction.update, target);
                throw new Error('expected throw');
            } catch {
                expect(ability.relevantRuleFor).toHaveBeenCalledWith(
                    EnumPolicyAction.update,
                    target,
                    undefined
                );
            }
        });

        it('rethrows errors that are not CASL forbidden errors', () => {
            const error = new Error('ability failure');
            ability.relevantRuleFor.mockImplementation(() => {
                throw error;
            });

            expect(() =>
                service.assertCan(
                    ability,
                    EnumPolicyAction.read,
                    EnumPolicySubject.Project
                )
            ).toThrow(error);
            expect(ability.relevantRuleFor).toHaveBeenCalledOnce();
        });

        it('allows a matching conditional record and denies a different record', () => {
            const realAbility = createPrismaAbility<PolicyAbility>([
                {
                    action: EnumPolicyAction.update,
                    subject: 'Workspace',
                    conditions: { id: 'workspace-1' },
                },
            ]);

            expect(() =>
                service.assertCan(
                    realAbility,
                    EnumPolicyAction.update,
                    subject(EnumPolicySubject.Workspace, { id: 'workspace-1' })
                )
            ).not.toThrow();
            expect(() =>
                service.assertCan(
                    realAbility,
                    EnumPolicyAction.update,
                    subject(EnumPolicySubject.Workspace, { id: 'workspace-2' })
                )
            ).toThrow(PolicyForbiddenException);
        });
    });

    describe('getEffectivePermissions', () => {
        it('returns only the concrete actions granted for each subject', () => {
            ability.can.mockImplementation(
                (action, subjectName) =>
                    subjectName === EnumPolicySubject.User &&
                    action === EnumPolicyAction.read
            );

            expect(
                service.getEffectivePermissions(ability, [
                    EnumPolicySubject.User,
                    EnumPolicySubject.Project,
                ])
            ).toEqual([
                {
                    subject: EnumPolicySubject.User,
                    actions: [EnumPolicyAction.read],
                },
            ]);
        });

        it('omits a subject when an inverse rule denies every action', () => {
            ability.can.mockReturnValue(false);

            expect(
                service.getEffectivePermissions(ability, [
                    EnumPolicySubject.Workspace,
                ])
            ).toEqual([]);
            expect(ability.can).toHaveBeenCalledTimes(
                Object.values(EnumPolicyAction).length
            );
        });
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
                    conditions: { projectId: '${projectId}' },
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
