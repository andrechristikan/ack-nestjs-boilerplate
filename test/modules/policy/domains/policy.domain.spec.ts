import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';

import {
    EnumPolicyAction,
    EnumPolicySubject,
    EnumRoleScope,
    EnumActivityLogAction,
    EnumUserGender,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
    type Policy,
} from '@generated/prisma-client';
import { EnumRolePlatformKey } from '@modules/role/enums/role.platform-key.enum';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import { RequestLanguageStoreKey } from '@common/request/constants/request.constant';
import {
    PolicyAbilityStoreKey,
    PolicyStoreKey,
    ProjectMemberPolicyStoreKey,
    WorkspaceMemberPolicyStoreKey,
} from '@modules/policy/constants/policy.constant';
import {
    ProjectMemberStoreKey,
    ProjectStoreKey,
} from '@modules/project/constants/project.constant';
import {
    WorkspaceMemberStoreKey,
    WorkspaceStoreKey,
} from '@modules/workspace/constants/workspace.constant';
import { UserStoreKey } from '@modules/user/constants/user.constant';
import { EnumPolicyStatusCodeError } from '@modules/policy/enums/policy.status-code.enum';
import { PolicyForbiddenException } from '@modules/policy/exceptions/policy.forbidden.exception';
import { PolicyImmutableException } from '@modules/policy/exceptions/policy.immutable.exception';
import { PolicyNotFoundException } from '@modules/policy/exceptions/policy.not-found.exception';
import { EnumPolicyRuleInvalidReason } from '@modules/policy/enums/policy.rule-invalid-reason.enum';
import type { PolicyCreateRequestDto } from '@modules/policy/dtos/request/policy.create.request.dto';
import type { PolicyUpdateRequestDto } from '@modules/policy/dtos/request/policy.update.request.dto';
import type {
    IPolicyAbility,
    IPolicyAbilityRule,
    IPolicyPlaceholderContext,
    IPolicyRequestContext,
    IPolicySubjectInput,
} from '@modules/policy/interfaces/policy.interface';
import { PolicyAbilityFactory } from '@modules/policy/factories/policy.factory';
import { PolicyRepository } from '@modules/policy/repositories/policy.repository';
import { PolicyDomain } from '@modules/policy/domains/policy.domain';
import type { IRole } from '@modules/role/interfaces/role.interface';
import { RoleDomain } from '@modules/role/domains/role.domain';
import { RoleNotFoundException } from '@modules/role/exceptions/role.not-found.exception';
import type { IUser } from '@modules/user/interfaces/user.interface';

describe('PolicyDomain', () => {
    const now = new Date('2026-01-01T00:00:00.000Z');
    const policy = {
        id: 'policy-id',
        roleId: 'role-id',
        subject: EnumPolicySubject.user,
        action: [EnumPolicyAction.read, EnumPolicyAction.update],
        conditions: null,
        inverted: false,
        reason: null,
        createdAt: now,
        createdBy: null,
        updatedAt: now,
        updatedBy: null,
    } satisfies Policy;
    const user = {
        id: 'user-id',
        name: 'User',
        username: 'user',
        isVerified: true,
        verifiedAt: now,
        email: 'user@example.com',
        roleId: 'role-id',
        password: 'hash',
        passwordExpired: null,
        passwordCreated: now,
        passwordAttempt: 0,
        signUpAt: now,
        signUpFrom: EnumUserSignUpFrom.website,
        signUpWith: EnumUserSignUpWith.credential,
        status: EnumUserStatus.active,
        gender: EnumUserGender.male,
        countryId: 'country-id',
        lastLoginAt: null,
        lastIPAddress: null,
        lastLoginFrom: null,
        lastLoginWith: null,
        lastWorkspaceId: null,
        lastWorkspaceChangedAt: null,
        createdAt: now,
        createdBy: null,
        updatedAt: now,
        updatedBy: null,
        deletedAt: null,
        deletedBy: null,
        termsOfServiceAccepted: true,
        privacyAccepted: true,
        cookiesAccepted: false,
        marketingAccepted: false,
        role: {
            id: 'role-id',
            name: 'User',
            description: null,
            scope: EnumRoleScope.platform,
            key: EnumRolePlatformKey.user,
            createdAt: now,
            createdBy: null,
            updatedAt: now,
            updatedBy: null,
            policies: [policy],
        },
        twoFactor: null,
    } satisfies IUser;
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
        subject: EnumPolicySubject.user,
        action: [EnumPolicyAction.read],
    };
    const ruleUpdate: PolicyUpdateRequestDto = {
        action: [EnumPolicyAction.read],
        inverted: true,
        reason: 'why',
    };
    const buildPolicy = (overrides: Partial<Policy> = {}): Policy => ({
        ...policy,
        ...overrides,
    });
    const placeholderContext: IPolicyPlaceholderContext = {
        user: { id: 'user-id', roleId: 'role-id', role: { key: 'admin' } },
        workspace: { id: 'workspace-1' },
        workspaceMember: null,
        project: null,
        projectMember: null,
        language: 'en',
    };
    const policyRepository: MockProxy<PolicyRepository> =
        mock<PolicyRepository>();
    const policyAbilityFactory: MockProxy<PolicyAbilityFactory> =
        mock<PolicyAbilityFactory>();
    const roleDomain: MockProxy<RoleDomain> = mock<RoleDomain>();
    const activityLogDomain: MockProxy<ActivityLogDomain> =
        mock<ActivityLogDomain>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();
    const ability: MockProxy<IPolicyAbility> = mock<IPolicyAbility>();

    let service: PolicyDomain;

    beforeEach(async () => {
        vi.resetAllMocks();
        policyAbilityFactory.build.mockReturnValue(ability);
        requestStoreService.get.mockReturnValue(null);

        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                PolicyDomain,
                {
                    provide: PolicyAbilityFactory,
                    useValue: policyAbilityFactory,
                },
                { provide: PolicyRepository, useValue: policyRepository },
                { provide: RoleDomain, useValue: roleDomain },
                { provide: ActivityLogDomain, useValue: activityLogDomain },
                {
                    provide: RequestStoreService,
                    useValue: requestStoreService,
                },
            ],
        }).compile();

        service = moduleRef.get(PolicyDomain);
    });

    describe('buildForRequest', () => {
        const buildContext = (
            overrides: Partial<IPolicyRequestContext> = {}
        ): IPolicyRequestContext => ({
            platform: null,
            workspace: null,
            project: null,
            placeholders: placeholderContext,
            ...overrides,
        });

        it('composes platform, then workspace, then project rules', () => {
            const platform = buildPolicy({ id: 'platform' });
            const workspace = buildPolicy({ id: 'workspace' });
            const project = buildPolicy({ id: 'project' });
            service.buildForRequest(
                buildContext({
                    platform: [platform],
                    workspace: [
                        buildPolicy({
                            ...workspace,
                            subject: EnumPolicySubject.workspace,
                        }),
                    ],
                    project: [
                        buildPolicy({
                            ...project,
                            subject: EnumPolicySubject.project,
                        }),
                    ],
                })
            );

            expect(policyAbilityFactory.build).toHaveBeenCalledWith([
                expect.objectContaining({ subject: 'User' }),
                expect.objectContaining({ subject: 'Workspace' }),
                expect.objectContaining({ subject: 'Project' }),
            ]);
        });

        it('keeps an inverted rule after the allow it narrows', () => {
            service.buildForRequest(
                buildContext({
                    workspace: [buildPolicy()],
                    project: [
                        buildPolicy({
                            inverted: true,
                            reason: 'narrowed',
                        }),
                    ],
                })
            );

            expect(policyAbilityFactory.build).toHaveBeenCalledWith([
                expect.objectContaining({ inverted: false }),
                expect.objectContaining({
                    inverted: true,
                    reason: 'narrowed',
                }),
            ]);
        });

        it('builds an empty ability when no source carries policies', () => {
            service.buildForRequest(buildContext());

            expect(policyAbilityFactory.build).toHaveBeenCalledWith([]);
        });

        it('maps a policy row onto an ability rule with its actions, inversion and reason', () => {
            service.buildForRequest(
                buildContext({
                    platform: [
                        buildPolicy({
                            action: [EnumPolicyAction.read],
                            inverted: true,
                            reason: 'why',
                        }),
                    ],
                })
            );

            expect(policyAbilityFactory.build).toHaveBeenCalledWith([
                {
                    subject: 'User',
                    action: [EnumPolicyAction.read],
                    conditions: null,
                    inverted: true,
                    reason: 'why',
                },
            ] satisfies IPolicyAbilityRule[]);
        });

        it('resolves the placeholders of a rule against the request context', () => {
            service.buildForRequest(
                buildContext({
                    workspace: [
                        buildPolicy({
                            conditions: { workspaceId: '${workspace.id}' },
                        }),
                    ],
                })
            );

            expect(policyAbilityFactory.build).toHaveBeenCalledWith([
                expect.objectContaining({
                    conditions: { workspaceId: 'workspace-1' },
                }),
            ]);
        });

        it('drops an allow rule whose placeholder cannot be resolved', () => {
            service.buildForRequest(
                buildContext({
                    project: [
                        buildPolicy({ conditions: { id: '${project.id}' } }),
                    ],
                })
            );

            expect(policyAbilityFactory.build).toHaveBeenCalledWith([]);
        });

        it('keeps an inverted rule whose placeholder cannot be resolved as an unconditional deny', () => {
            service.buildForRequest(
                buildContext({
                    project: [
                        buildPolicy({
                            conditions: { id: '${project.id}' },
                            inverted: true,
                            reason: 'blocked',
                        }),
                    ],
                })
            );

            expect(policyAbilityFactory.build).toHaveBeenCalledWith([
                {
                    subject: 'User',
                    action: policy.action,
                    conditions: null,
                    inverted: true,
                    reason: 'blocked',
                },
            ] satisfies IPolicyAbilityRule[]);
        });

        it.each([
            ['an array', []],
            ['a string', 'x'],
        ])(
            'treats stored conditions that are %s as unresolvable',
            (_name, conditions) => {
                service.buildForRequest(
                    buildContext({
                        platform: [
                            buildPolicy({ conditions }),
                            buildPolicy({
                                conditions,
                                inverted: true,
                            }),
                        ],
                    })
                );

                expect(policyAbilityFactory.build).toHaveBeenCalledWith([
                    expect.objectContaining({
                        conditions: null,
                        inverted: true,
                    }),
                ]);
            }
        );

        it('stores and returns the built ability', () => {
            const result = service.buildForRequest(buildContext());

            expect(result).toBe(ability);
            expect(requestStoreService.set).toHaveBeenCalledWith(
                PolicyAbilityStoreKey,
                ability
            );
        });
    });

    describe('getCurrentAbility', () => {
        const stubStore = (entries: Record<string, unknown>): void => {
            requestStoreService.get.mockImplementation(
                (key: unknown) => (entries[key as string] ?? null) as never
            );
        };

        it('returns the stored ability without building another', () => {
            stubStore({ [PolicyAbilityStoreKey]: ability });

            const result = service.getCurrentAbility();

            expect(result).toBe(ability);
            expect(policyAbilityFactory.build).not.toHaveBeenCalled();
            expect(requestStoreService.set).not.toHaveBeenCalled();
        });

        it('builds once from the guard store entries and stores the ability', () => {
            const platform = buildPolicy({ id: 'platform' });
            const workspace = buildPolicy({ id: 'workspace' });
            const project = buildPolicy({ id: 'project' });
            stubStore({
                [PolicyStoreKey]: [platform],
                [WorkspaceMemberPolicyStoreKey]: [workspace],
                [ProjectMemberPolicyStoreKey]: [project],
            });

            const result = service.getCurrentAbility();

            expect(result).toBe(ability);
            expect(policyAbilityFactory.build).toHaveBeenCalledTimes(1);
            expect(policyAbilityFactory.build).toHaveBeenCalledWith([
                expect.objectContaining({ subject: 'User' }),
                expect.objectContaining({ subject: 'User' }),
                expect.objectContaining({ subject: 'User' }),
            ]);
            expect(requestStoreService.set).toHaveBeenCalledTimes(1);
            expect(requestStoreService.set).toHaveBeenCalledWith(
                PolicyAbilityStoreKey,
                ability
            );
        });

        it('builds the rule from the placeholder context read out of the request store', () => {
            stubStore({
                [PolicyStoreKey]: [
                    buildPolicy({ conditions: { id: '${user.id}' } }),
                ],
                [UserStoreKey]: user,
                [WorkspaceStoreKey]: { id: 'workspace-1' },
                [WorkspaceMemberStoreKey]: {
                    id: 'wm-1',
                    roleId: 'wm-role',
                    role: { key: 'owner' },
                },
                [ProjectStoreKey]: { id: 'project-1' },
                [ProjectMemberStoreKey]: {
                    id: 'pm-1',
                    roleId: 'pm-role',
                    role: { key: 'viewer' },
                },
                [RequestLanguageStoreKey]: 'en',
            });

            service.getCurrentAbility();

            expect(policyAbilityFactory.build).toHaveBeenCalledWith([
                expect.objectContaining({
                    conditions: { id: 'user-id' },
                }),
            ]);
        });

        it('builds from empty rules when the store holds nothing', () => {
            stubStore({});

            const result = service.getCurrentAbility();

            expect(result).toBe(ability);
            expect(policyAbilityFactory.build).toHaveBeenCalledWith([]);
        });
    });

    describe('can', () => {
        beforeEach(() => {
            requestStoreService.get
                .calledWith(PolicyAbilityStoreKey)
                .mockReturnValue(ability);
        });

        it.each([true, false])(
            'answers %s from the current ability for the registry model of an enum subject',
            allowed => {
                ability.can.mockReturnValue(allowed);

                const result = service.can(
                    EnumPolicyAction.read,
                    EnumPolicySubject.project
                );

                expect(result).toBe(allowed);
                expect(ability.can).toHaveBeenCalledWith(
                    EnumPolicyAction.read,
                    'Project'
                );
            }
        );

        it('checks the subject-tagged record when the input carries one', () => {
            const record = {
                id: 'workspace-1',
                createdBy: null,
                isPublic: false,
                deletedAt: null,
            };
            let target: unknown;
            ability.can.mockImplementation((_action, subject) => {
                target = subject;
                return true;
            });
            const input = {
                subject: EnumPolicySubject.workspace,
                record,
            } as IPolicySubjectInput;

            const result = service.can(EnumPolicyAction.update, input);

            expect(result).toBe(true);
            expect(target).toMatchObject(record);
            expect(target).toHaveProperty('__caslSubjectType__', 'Workspace');
        });

        it('returns false without consulting the ability when the action is not registered for the subject', () => {
            const result = service.can(
                EnumPolicyAction.manage,
                EnumPolicySubject.workspaceMember
            );

            expect(result).toBe(false);
            expect(ability.can).not.toHaveBeenCalled();
        });

        it('checks the all subject through its manage action', () => {
            ability.can.mockReturnValue(true);

            const result = service.can(
                EnumPolicyAction.manage,
                EnumPolicySubject.all
            );

            expect(result).toBe(true);
            expect(ability.can).toHaveBeenCalledWith(
                EnumPolicyAction.manage,
                'all'
            );
        });
    });

    describe('assertCan', () => {
        beforeEach(() => {
            requestStoreService.get
                .calledWith(PolicyAbilityStoreKey)
                .mockReturnValue(ability);
        });

        it('passes when the ability allows the action', () => {
            ability.can.mockReturnValue(true);

            expect(() =>
                service.assertCan(
                    EnumPolicyAction.read,
                    EnumPolicySubject.project
                )
            ).not.toThrow();
        });

        it.each([
            [
                'the ability denies the action',
                EnumPolicyAction.delete,
                EnumPolicySubject.project,
            ],
            [
                'the action is not registered for the subject',
                EnumPolicyAction.manage,
                EnumPolicySubject.workspaceMember,
            ],
        ])(
            'throws PolicyForbiddenException when %s',
            (_name, action, subject) => {
                ability.can.mockReturnValue(false);

                try {
                    service.assertCan(action, subject);
                    throw new Error('expected throw');
                } catch (error) {
                    expect(error).toBeInstanceOf(PolicyForbiddenException);
                    expect(error).toMatchObject({
                        module: 'policy',
                        statusCode: EnumPolicyStatusCodeError.forbidden,
                        messagePath: 'policy.error.forbidden',
                    });
                }
            }
        );
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
        const workspaceRole = {
            id: 'workspace-role-id',
            scope: EnumRoleScope.workspace,
            key: 'owner',
            name: 'Owner',
        };
        const projectRole = {
            id: 'project-role-id',
            scope: EnumRoleScope.project,
            key: 'admin',
            name: 'Project admin',
        };
        const workspacePair = { workspaceId: '${workspace.id}' };
        const projectPair = { projectId: '${project.id}' };

        it.each([
            [
                'an action outside the subject registry',
                role,
                EnumPolicySubject.workspaceMember,
                [EnumPolicyAction.create],
                null,
                false,
                EnumPolicyRuleInvalidReason.actionNotAllowed,
            ],
            [
                'the all subject on an API write',
                role,
                EnumPolicySubject.all,
                [EnumPolicyAction.manage],
                null,
                false,
                EnumPolicyRuleInvalidReason.roleScopeInvalid,
            ],
            [
                'a workspace subject on a project role',
                projectRole,
                EnumPolicySubject.workspace,
                [EnumPolicyAction.read],
                { id: '${workspace.id}' },
                false,
                EnumPolicyRuleInvalidReason.roleScopeInvalid,
            ],
            [
                'a platform subject on a project role',
                projectRole,
                EnumPolicySubject.user,
                [EnumPolicyAction.read],
                null,
                false,
                EnumPolicyRuleInvalidReason.roleScopeInvalid,
            ],
            [
                'a workspace rule without conditions',
                workspaceRole,
                EnumPolicySubject.workspaceMember,
                [EnumPolicyAction.update],
                null,
                false,
                EnumPolicyRuleInvalidReason.scopeMissing,
            ],
            [
                'a scope pair only under OR',
                workspaceRole,
                EnumPolicySubject.workspaceMember,
                [EnumPolicyAction.update],
                { OR: [workspacePair] },
                false,
                EnumPolicyRuleInvalidReason.scopeMissing,
            ],
            [
                'a scope pair whose value is not the placeholder',
                workspaceRole,
                EnumPolicySubject.workspaceMember,
                [EnumPolicyAction.update],
                { workspaceId: 'other' },
                false,
                EnumPolicyRuleInvalidReason.scopeMissing,
            ],
            [
                'a project create combined with another action and no pair',
                workspaceRole,
                EnumPolicySubject.project,
                [EnumPolicyAction.create, EnumPolicyAction.read],
                null,
                false,
                EnumPolicyRuleInvalidReason.scopeMissing,
            ],
            [
                'a workspace role analytic rule without the scope pair',
                workspaceRole,
                EnumPolicySubject.analytic,
                [EnumPolicyAction.read],
                null,
                false,
                EnumPolicyRuleInvalidReason.scopeMissing,
            ],
        ])(
            'rejects %s before any write or activity',
            async (
                _name,
                targetRole,
                subject,
                action,
                conditions,
                inverted,
                reason
            ) => {
                roleDomain.getById.mockResolvedValue(targetRole);

                await expect(
                    service.createByAdmin('role-id', {
                        subject,
                        action,
                        conditions: conditions ?? undefined,
                        inverted,
                    })
                ).rejects.toMatchObject({
                    module: 'policy',
                    statusCode: EnumPolicyStatusCodeError.invalidRule,
                    reason,
                });
                expect(policyRepository.create).not.toHaveBeenCalled();
                expect(activityLogDomain.prepare).not.toHaveBeenCalled();
                expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
            }
        );

        const acceptedRules: [
            string,
            IRole,
            EnumPolicySubject,
            EnumPolicyAction[],
            PolicyCreateRequestDto['conditions'] | null,
            boolean,
        ][] = [
            [
                'a scope pair inside a top-level AND',
                workspaceRole,
                EnumPolicySubject.workspaceMember,
                [EnumPolicyAction.update],
                { AND: [workspacePair, { userId: 'x' }] },
                false,
            ],
            [
                'an inverted rule without a scope pair',
                workspaceRole,
                EnumPolicySubject.workspaceMember,
                [EnumPolicyAction.update],
                null,
                true,
            ],
            [
                'a project create with no scope pair',
                workspaceRole,
                EnumPolicySubject.project,
                [EnumPolicyAction.create],
                null,
                false,
            ],
            [
                'a project member create keyed on projectId only',
                projectRole,
                EnumPolicySubject.projectMember,
                [EnumPolicyAction.create],
                projectPair,
                false,
            ],
            [
                'a platform role rule with no scope pair',
                role,
                EnumPolicySubject.workspaceMember,
                [EnumPolicyAction.update],
                null,
                false,
            ],
            [
                'an analytic rule scoped to the workspace',
                workspaceRole,
                EnumPolicySubject.analytic,
                [EnumPolicyAction.read],
                workspacePair,
                false,
            ],
            [
                'a platform role analytic rule with no scope pair',
                role,
                EnumPolicySubject.analytic,
                [EnumPolicyAction.read],
                null,
                false,
            ],
            [
                'a role relation filtered by key',
                role,
                EnumPolicySubject.workspaceMember,
                [EnumPolicyAction.update],
                { role: { is: { key: 'x' } } },
                false,
            ],
            [
                'a role relation filtered by scope and key together',
                role,
                EnumPolicySubject.workspaceMember,
                [EnumPolicyAction.update],
                { role: { is: { scope: 'workspace', key: 'x' } } },
                false,
            ],
            [
                'operators, OR and NOT over allowed columns',
                role,
                EnumPolicySubject.workspaceMember,
                [EnumPolicyAction.update],
                {
                    OR: [{ userId: { in: ['a', 'b'] } }, { roleId: null }],
                    NOT: { id: { equals: 'x' } },
                },
                false,
            ],
            [
                'a non-array-required operator whose operand is an array of literals',
                role,
                EnumPolicySubject.workspaceMember,
                [EnumPolicyAction.update],
                { userId: { equals: ['a', 'b'] } },
                false,
            ],
        ];

        it.each(acceptedRules)(
            'accepts %s',
            async (
                _name,
                targetRole,
                subject,
                action,
                conditions,
                inverted
            ) => {
                roleDomain.getById.mockResolvedValue(targetRole);
                policyRepository.create.mockResolvedValue(policy);

                await expect(
                    service.createByAdmin('role-id', {
                        subject,
                        action,
                        conditions: conditions ?? undefined,
                        inverted,
                    })
                ).resolves.toBe(policy);
            }
        );

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

        it('validates the rule against the stored subject', async () => {
            roleDomain.getById.mockResolvedValue(role);
            policyRepository.findOneByRoleIdAndId.mockResolvedValue({
                ...policy,
                subject: EnumPolicySubject.workspaceMember,
            });

            await expect(
                service.updateByAdmin('role-id', policy.id, {
                    action: [EnumPolicyAction.create],
                })
            ).rejects.toMatchObject({
                reason: EnumPolicyRuleInvalidReason.actionNotAllowed,
            });
            expect(policyRepository.update).not.toHaveBeenCalled();
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
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
                    subject: EnumPolicySubject.projectMember,
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
