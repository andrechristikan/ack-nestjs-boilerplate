import {
    buildPolicyAbility,
    buildPolicyContext,
    buildPolicyRule,
} from '@test/unit/helpers/test.unit.policy.helper';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { subject } from '@casl/ability';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@generated/prisma-client/client';
import { buildRoleRef } from '@test/unit/helpers/test.unit.request.helper';
import { EnumRoleScope } from '@generated/prisma-client/client';
import { EnumPolicyConditionPlaceholder } from '@modules/policy/enums/policy.enum';
import { PolicyAbilityFactory } from '@modules/policy/factories/policy.ability.factory';
import type {
    IPolicyAbility,
    IPolicyRule,
} from '@modules/policy/interfaces/policy.interface';
import { PolicyService } from '@modules/policy/services/policy.service';
import type { IProjectContext } from '@modules/project/interfaces/project.interface';
import type { IUserContext } from '@modules/user/interfaces/user.interface';
import type { IWorkspaceContext } from '@modules/workspace/interfaces/workspace.interface';
import { PolicyForbiddenException } from '@modules/policy/exceptions/policy.forbidden.exception';
import { PolicyAbilityService } from '@modules/policy/services/policy.ability.service';

describe('PolicyAbilityService', () => {
    let service: PolicyAbilityService;
    const policyService: MockProxy<PolicyService> = mock<PolicyService>();
    const policyAbilityFactory: MockProxy<PolicyAbilityFactory> =
        mock<PolicyAbilityFactory>();

    beforeEach(async () => {
        vi.resetAllMocks();
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PolicyAbilityService,
                { provide: PolicyService, useValue: policyService },
                {
                    provide: PolicyAbilityFactory,
                    useValue: policyAbilityFactory,
                },
            ],
        }).compile();

        service = module.get(PolicyAbilityService);
    });

    describe('createAbility', () => {
        const platformRole = {
            ...buildRoleRef(EnumRoleScope.platform, 'user', 'role-platform'),
            policyRevision: 2,
        };
        const workspaceRole = {
            ...buildRoleRef(EnumRoleScope.workspace, 'admin', 'role-workspace'),
            policyRevision: 5,
        };
        const projectRole = {
            ...buildRoleRef(EnumRoleScope.project, 'member', 'role-project'),
            policyRevision: 1,
        };
        const rules: IPolicyRule[] = [buildPolicyRule()];
        const builtAbility = buildPolicyAbility([]);
        const userContext = {
            user: { id: 'user-1', role: platformRole },
        } as IUserContext;
        const workspaceContext = {
            workspaceId: 'workspace-1',
            workspace: { id: 'workspace-1' },
            workspaceMember: { role: workspaceRole },
        } as IWorkspaceContext;

        beforeEach(() => {
            policyService.getRulesByRoleRevisions.mockResolvedValue(rules);
            policyAbilityFactory.build.mockReturnValue(builtAbility);
        });

        it('reads the platform then the workspace revision only when the project member is null', async () => {
            const projectContext = {
                project: { id: 'project-1' },
                projectMember: null,
            } as IProjectContext;

            const ability = await service.createAbility(
                userContext,
                workspaceContext,
                projectContext
            );

            expect(policyService.getRulesByRoleRevisions).toHaveBeenCalledWith([
                { roleId: 'role-platform', policyRevision: 2 },
                { roleId: 'role-workspace', policyRevision: 5 },
            ]);
            expect(ability).toBe(builtAbility);
        });

        it('reads the platform revision alone and builds with null placeholders when the route has no workspace or project', async () => {
            await service.createAbility(userContext, null, null);

            expect(policyService.getRulesByRoleRevisions).toHaveBeenCalledWith([
                { roleId: 'role-platform', policyRevision: 2 },
            ]);
            expect(policyAbilityFactory.build).toHaveBeenCalledWith(rules, {
                [EnumPolicyConditionPlaceholder.userId]: 'user-1',
                [EnumPolicyConditionPlaceholder.workspaceId]: null,
                [EnumPolicyConditionPlaceholder.projectId]: null,
            });
        });

        it('reads platform, workspace, then project revisions and fills every placeholder on a project route with a member', async () => {
            const projectContext = {
                project: { id: 'project-1' },
                projectMember: { role: projectRole },
            } as IProjectContext;

            await service.createAbility(
                userContext,
                workspaceContext,
                projectContext
            );

            expect(policyService.getRulesByRoleRevisions).toHaveBeenCalledWith([
                { roleId: 'role-platform', policyRevision: 2 },
                { roleId: 'role-workspace', policyRevision: 5 },
                { roleId: 'role-project', policyRevision: 1 },
            ]);
            expect(policyAbilityFactory.build).toHaveBeenCalledWith(rules, {
                [EnumPolicyConditionPlaceholder.userId]: 'user-1',
                [EnumPolicyConditionPlaceholder.workspaceId]: 'workspace-1',
                [EnumPolicyConditionPlaceholder.projectId]: 'project-1',
            });
        });
    });

    describe('validatePolicyGuard', () => {
        it('passes when every required action on every subject is allowed', () => {
            const policyContext = buildPolicyContext(
                buildPolicyAbility([
                    buildPolicyRule({
                        action: [
                            EnumPolicyAction.read,
                            EnumPolicyAction.update,
                        ],
                    }),
                    buildPolicyRule({ subject: EnumPolicySubject.Role }),
                ])
            );

            expect(() =>
                service.validatePolicyGuard(policyContext, [
                    {
                        subject: EnumPolicySubject.User,
                        action: [
                            EnumPolicyAction.read,
                            EnumPolicyAction.update,
                        ],
                    },
                    {
                        subject: EnumPolicySubject.Role,
                        action: [EnumPolicyAction.read],
                    },
                ])
            ).not.toThrow();
        });

        it('throws forbidden grouping every denied action by subject', () => {
            const policyContext = buildPolicyContext(
                buildPolicyAbility([buildPolicyRule()])
            );

            expect(() =>
                service.validatePolicyGuard(policyContext, [
                    {
                        subject: EnumPolicySubject.User,
                        action: [
                            EnumPolicyAction.read,
                            EnumPolicyAction.delete,
                        ],
                    },
                    {
                        subject: EnumPolicySubject.Role,
                        action: [
                            EnumPolicyAction.read,
                            EnumPolicyAction.create,
                        ],
                    },
                ])
            ).toThrow(
                expect.objectContaining({
                    metadata: {
                        missing: [
                            {
                                subject: EnumPolicySubject.User,
                                actions: [EnumPolicyAction.delete],
                            },
                            {
                                subject: EnumPolicySubject.Role,
                                actions: [
                                    EnumPolicyAction.read,
                                    EnumPolicyAction.create,
                                ],
                            },
                        ],
                    },
                })
            );
        });

        it('carries the reason of the first inverted rule that denied an action', () => {
            const policyContext = buildPolicyContext(
                buildPolicyAbility([
                    buildPolicyRule({ action: [EnumPolicyAction.manage] }),
                    buildPolicyRule({
                        action: [EnumPolicyAction.delete],
                        inverted: true,
                        reason: 'no deletes',
                    }),
                ])
            );

            expect(() =>
                service.validatePolicyGuard(policyContext, [
                    {
                        subject: EnumPolicySubject.User,
                        action: [EnumPolicyAction.delete],
                    },
                    {
                        subject: EnumPolicySubject.Role,
                        action: [EnumPolicyAction.read],
                    },
                ])
            ).toThrow(
                expect.objectContaining({
                    metadata: expect.objectContaining({
                        reason: 'no deletes',
                        missing: [
                            {
                                subject: EnumPolicySubject.User,
                                actions: [EnumPolicyAction.delete],
                            },
                            {
                                subject: EnumPolicySubject.Role,
                                actions: [EnumPolicyAction.read],
                            },
                        ],
                    }),
                })
            );
        });

        it('carries no reason when the denying inverted rule has none', () => {
            const policyContext = buildPolicyContext(
                buildPolicyAbility([
                    buildPolicyRule({ action: [EnumPolicyAction.manage] }),
                    buildPolicyRule({
                        action: [EnumPolicyAction.delete],
                        inverted: true,
                    }),
                ])
            );

            expect(() =>
                service.validatePolicyGuard(policyContext, [
                    {
                        subject: EnumPolicySubject.User,
                        action: [EnumPolicyAction.delete],
                    },
                ])
            ).toThrow(
                expect.objectContaining({
                    metadata: expect.not.objectContaining({
                        reason: expect.anything(),
                    }),
                })
            );
        });

        it('denies an empty requirement list', () => {
            const policyContext = buildPolicyContext(
                buildPolicyAbility([buildPolicyRule()])
            );

            expect(() =>
                service.validatePolicyGuard(policyContext, [])
            ).toThrow(PolicyForbiddenException);
        });
    });

    describe('scope', () => {
        it('returns the where-input the ability grants for a subject', () => {
            const policyContext = buildPolicyContext(
                buildPolicyAbility([
                    buildPolicyRule({
                        subject: EnumPolicySubject.Workspace,
                        conditions: { id: '${workspaceId}' },
                    }),
                ])
            );

            const where = service.scope(
                policyContext,
                EnumPolicyAction.read,
                EnumPolicySubject.Workspace
            );

            expect(where).toEqual({ OR: [{ id: 'workspace-1' }] });
        });

        it('throws forbidden naming the missing action when the ability holds no rule', () => {
            const policyContext = buildPolicyContext(buildPolicyAbility([]));

            expect(() =>
                service.scope(
                    policyContext,
                    EnumPolicyAction.read,
                    EnumPolicySubject.User
                )
            ).toThrow(
                expect.objectContaining({
                    metadata: {
                        missing: [
                            {
                                subject: EnumPolicySubject.User,
                                actions: [EnumPolicyAction.read],
                            },
                        ],
                    },
                })
            );
        });
    });

    describe('authorize', () => {
        it('passes when the ability allows the action on the record', () => {
            const policyContext = buildPolicyContext(
                buildPolicyAbility([
                    buildPolicyRule({
                        subject: EnumPolicySubject.Project,
                        action: [EnumPolicyAction.create],
                        conditions: { workspaceId: '${workspaceId}' },
                    }),
                ])
            );

            expect(() =>
                service.authorize(
                    policyContext,
                    EnumPolicyAction.create,
                    subject(EnumPolicySubject.Project, {
                        workspaceId: 'workspace-1',
                    })
                )
            ).not.toThrow();
        });

        it('throws forbidden when the record falls outside the rule conditions', () => {
            const policyContext = buildPolicyContext(
                buildPolicyAbility([
                    buildPolicyRule({
                        subject: EnumPolicySubject.Project,
                        action: [EnumPolicyAction.create],
                        conditions: { workspaceId: '${workspaceId}' },
                    }),
                ])
            );

            expect(() =>
                service.authorize(
                    policyContext,
                    EnumPolicyAction.create,
                    subject(EnumPolicySubject.Project, {
                        workspaceId: 'workspace-2',
                    })
                )
            ).toThrow(PolicyForbiddenException);
        });

        it('carries the reason of the inverted rule that denied the action', () => {
            const policyContext = buildPolicyContext(
                buildPolicyAbility([
                    buildPolicyRule({ action: [EnumPolicyAction.manage] }),
                    buildPolicyRule({
                        action: [EnumPolicyAction.delete],
                        inverted: true,
                        reason: 'no deletes',
                    }),
                ])
            );

            expect(() =>
                service.authorize(
                    policyContext,
                    EnumPolicyAction.delete,
                    EnumPolicySubject.User
                )
            ).toThrow(
                expect.objectContaining({
                    metadata: {
                        missing: [
                            {
                                subject: EnumPolicySubject.User,
                                actions: [EnumPolicyAction.delete],
                            },
                        ],
                        reason: 'no deletes',
                    },
                })
            );
        });

        it('leaves the reason out when the denial has no inverted rule', () => {
            const policyContext = buildPolicyContext(buildPolicyAbility([]));

            expect(() =>
                service.authorize(
                    policyContext,
                    EnumPolicyAction.read,
                    EnumPolicySubject.Role
                )
            ).toThrow(
                expect.objectContaining({
                    metadata: {
                        missing: [
                            {
                                subject: EnumPolicySubject.Role,
                                actions: [EnumPolicyAction.read],
                            },
                        ],
                    },
                })
            );
        });

        it('carries no reason key when a non-inverted rule is the one that applies', () => {
            const policyContext = buildPolicyContext(
                buildPolicyAbility([
                    buildPolicyRule({
                        subject: EnumPolicySubject.Role,
                        action: [EnumPolicyAction.read],
                    }),
                ])
            );

            let metadata: object | null = null;
            try {
                service.authorize(
                    policyContext,
                    EnumPolicyAction.delete,
                    EnumPolicySubject.Role
                );
            } catch (error: unknown) {
                expect(error).toBeInstanceOf(PolicyForbiddenException);
                metadata =
                    error instanceof PolicyForbiddenException
                        ? (error.metadata ?? null)
                        : null;
            }

            expect(metadata).not.toBeNull();
            expect(metadata).not.toHaveProperty('reason');
        });

        it('carries no reason key when the denying inverted rule has none', () => {
            const policyContext = buildPolicyContext(
                buildPolicyAbility([
                    buildPolicyRule({ action: [EnumPolicyAction.manage] }),
                    buildPolicyRule({
                        action: [EnumPolicyAction.delete],
                        inverted: true,
                    }),
                ])
            );

            expect(() =>
                service.authorize(
                    policyContext,
                    EnumPolicyAction.delete,
                    EnumPolicySubject.User
                )
            ).toThrow(
                expect.objectContaining({
                    metadata: {
                        missing: [
                            {
                                subject: EnumPolicySubject.User,
                                actions: [EnumPolicyAction.delete],
                            },
                        ],
                    },
                })
            );
        });

        it('names the subject of a tagged record in the missing permission', () => {
            const policyContext = buildPolicyContext(buildPolicyAbility([]));

            expect(() =>
                service.authorize(
                    policyContext,
                    EnumPolicyAction.update,
                    subject(EnumPolicySubject.Role, { id: 'role-1' })
                )
            ).toThrow(
                expect.objectContaining({
                    metadata: {
                        missing: [
                            {
                                subject: EnumPolicySubject.Role,
                                actions: [EnumPolicyAction.update],
                            },
                        ],
                    },
                })
            );
        });
    });

    describe('authorize with a failing ability', () => {
        it('wraps a failure that is not a forbidden error as unknown', () => {
            const failing = mock<IPolicyAbility>();
            failing.can.mockImplementation(() => {
                throw new Error('boom');
            });
            failing.relevantRuleFor.mockImplementation(() => {
                throw new Error('boom');
            });
            const policyContext = buildPolicyContext(failing);

            expect(() =>
                service.authorize(
                    policyContext,
                    EnumPolicyAction.read,
                    EnumPolicySubject.User
                )
            ).toThrow(AppUnknownException);
        });
    });

    describe('getEffectivePermissions', () => {
        it('lists the concrete actions per subject and omits a subject with none', () => {
            const policyContext = buildPolicyContext(
                buildPolicyAbility([
                    buildPolicyRule({
                        subject: EnumPolicySubject.Workspace,
                        action: [
                            EnumPolicyAction.read,
                            EnumPolicyAction.update,
                        ],
                    }),
                ])
            );

            const permissions = service.getEffectivePermissions(policyContext, [
                EnumPolicySubject.Workspace,
                EnumPolicySubject.Project,
            ]);

            expect(permissions).toEqual([
                {
                    subject: EnumPolicySubject.Workspace,
                    actions: [EnumPolicyAction.read, EnumPolicyAction.update],
                },
            ]);
        });

        it('expands a manage rule into every concrete action', () => {
            const policyContext = buildPolicyContext(
                buildPolicyAbility([
                    buildPolicyRule({
                        subject: EnumPolicySubject.all,
                        action: [EnumPolicyAction.manage],
                    }),
                ])
            );

            const [permission] = service.getEffectivePermissions(
                policyContext,
                [EnumPolicySubject.Project]
            );

            expect(permission?.actions).toEqual(
                expect.arrayContaining([
                    EnumPolicyAction.read,
                    EnumPolicyAction.create,
                    EnumPolicyAction.update,
                    EnumPolicyAction.delete,
                ])
            );
        });
    });
});
