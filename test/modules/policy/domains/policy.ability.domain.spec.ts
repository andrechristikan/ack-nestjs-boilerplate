import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';

import {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@generated/prisma-client/client';
import type { Policy } from '@generated/prisma-client/client';
import { EnumPolicyConditionPlaceholder } from '@modules/policy/constants/policy.constant';
import { PolicyAbilityDomain } from '@modules/policy/domains/policy.ability.domain';
import { EnumPolicyAbilityScope } from '@modules/policy/enums/policy.enum';
import { PolicyAbilityFactory } from '@modules/policy/factories/policy.factory';
import type {
    PolicyAbility,
    PolicyAbilityRule,
} from '@modules/policy/interfaces/policy.interface';
import { PolicyRepository } from '@modules/policy/repositories/policy.repository';

describe('PolicyAbilityDomain', () => {
    const policyRepository: MockProxy<PolicyRepository> =
        mock<PolicyRepository>();
    const policyAbilityFactory: MockProxy<PolicyAbilityFactory> =
        mock<PolicyAbilityFactory>();
    const now = new Date('2026-01-01T00:00:00.000Z');
    const buildPolicy = (roleId: string): Policy => ({
        id: `policy-${roleId}`,
        roleId,
        subject: EnumPolicySubject.Workspace,
        action: [EnumPolicyAction.read],
        conditions: null,
        inverted: false,
        reason: null,
        createdAt: now,
        createdBy: null,
        updatedAt: now,
        updatedBy: null,
    });
    const buildRule = (subject: EnumPolicySubject): PolicyAbilityRule => ({
        subject,
        action: [EnumPolicyAction.read],
        inverted: false,
    });
    const userPolicies = [buildPolicy('user-role')];
    const workspacePolicies = [buildPolicy('workspace-role')];
    const projectPolicies = [buildPolicy('project-role')];
    const platformRule = buildRule(EnumPolicySubject.User);
    const workspaceRule = buildRule(EnumPolicySubject.Workspace);
    const projectRule = buildRule(EnumPolicySubject.Project);
    const platformAbility = { rules: [platformRule] } as PolicyAbility;
    const workspaceAbility = { rules: [workspaceRule] } as PolicyAbility;
    const projectAbility = { rules: [projectRule] } as PolicyAbility;
    const composedAbility: MockProxy<PolicyAbility> = mock<PolicyAbility>();
    const user = { id: 'user-id', roleId: 'user-role' };
    const workspace = {
        id: 'workspace-id',
        member: { id: 'workspace-member-id', roleId: 'workspace-role' },
    };
    let domain: PolicyAbilityDomain;

    beforeEach(async () => {
        vi.resetAllMocks();
        policyRepository.findManyByRoleId.mockImplementation(async roleId => {
            const rowsByRole: Record<string, Policy[]> = {
                'user-role': userPolicies,
                'workspace-role': workspacePolicies,
                'project-role': projectPolicies,
            };

            return rowsByRole[roleId] ?? [];
        });
        policyAbilityFactory.buildFromPolicies.mockImplementation(policies => {
            const rolesByPolicies = new Map<Policy[], PolicyAbility>([
                [userPolicies, platformAbility],
                [workspacePolicies, workspaceAbility],
                [projectPolicies, projectAbility],
            ]);

            return rolesByPolicies.get(policies ?? []) ?? composedAbility;
        });
        policyAbilityFactory.build.mockReturnValue(composedAbility);

        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                PolicyAbilityDomain,
                { provide: PolicyRepository, useValue: policyRepository },
                {
                    provide: PolicyAbilityFactory,
                    useValue: policyAbilityFactory,
                },
            ],
        }).compile();
        domain = moduleRef.get(PolicyAbilityDomain);
    });

    describe('buildAbility', () => {
        describe('platform scope', () => {
            it('loads only the user role and resolves only the user placeholder without route ids', async () => {
                const ability = await domain.buildAbility({
                    scope: EnumPolicyAbilityScope.platform,
                    user,
                    routeWorkspaceId: null,
                    routeProjectId: null,
                });

                expect(ability).toBe(composedAbility);
                expect(policyRepository.findManyByRoleId).toHaveBeenCalledTimes(
                    1
                );
                expect(policyRepository.findManyByRoleId).toHaveBeenCalledWith(
                    'user-role'
                );
                expect(
                    policyAbilityFactory.buildFromPolicies
                ).toHaveBeenCalledTimes(1);
                expect(
                    policyAbilityFactory.buildFromPolicies
                ).toHaveBeenCalledWith(userPolicies, {
                    [EnumPolicyConditionPlaceholder.userId]: 'user-id',
                });
                expect(policyAbilityFactory.build).toHaveBeenCalledWith([
                    platformRule,
                ]);
            });

            it('adds the route workspace and project placeholders when the route carries them', async () => {
                await domain.buildAbility({
                    scope: EnumPolicyAbilityScope.platform,
                    user,
                    routeWorkspaceId: 'route-workspace-id',
                    routeProjectId: 'route-project-id',
                });

                expect(
                    policyAbilityFactory.buildFromPolicies
                ).toHaveBeenCalledWith(userPolicies, {
                    [EnumPolicyConditionPlaceholder.userId]: 'user-id',
                    [EnumPolicyConditionPlaceholder.workspaceId]:
                        'route-workspace-id',
                    [EnumPolicyConditionPlaceholder.projectId]:
                        'route-project-id',
                });
            });

            it('leaves the placeholder out when only one route id is supplied', async () => {
                await domain.buildAbility({
                    scope: EnumPolicyAbilityScope.platform,
                    user,
                    routeWorkspaceId: 'route-workspace-id',
                    routeProjectId: null,
                });

                expect(
                    policyAbilityFactory.buildFromPolicies
                ).toHaveBeenCalledWith(userPolicies, {
                    [EnumPolicyConditionPlaceholder.userId]: 'user-id',
                    [EnumPolicyConditionPlaceholder.workspaceId]:
                        'route-workspace-id',
                });
            });
        });

        describe('workspace scope', () => {
            it('unions the platform role rules and the acting workspace member role rules', async () => {
                const ability = await domain.buildAbility({
                    scope: EnumPolicyAbilityScope.workspace,
                    user,
                    workspace,
                });

                expect(ability).toBe(composedAbility);
                expect(policyRepository.findManyByRoleId).toHaveBeenCalledTimes(
                    2
                );
                expect(policyRepository.findManyByRoleId).toHaveBeenCalledWith(
                    'user-role'
                );
                expect(policyRepository.findManyByRoleId).toHaveBeenCalledWith(
                    'workspace-role'
                );
                expect(policyAbilityFactory.build).toHaveBeenCalledWith([
                    platformRule,
                    workspaceRule,
                ]);
            });

            it('resolves the workspace placeholders for both layers', async () => {
                await domain.buildAbility({
                    scope: EnumPolicyAbilityScope.workspace,
                    user,
                    workspace,
                });

                const placeholders = {
                    [EnumPolicyConditionPlaceholder.userId]: 'user-id',
                    [EnumPolicyConditionPlaceholder.workspaceId]:
                        'workspace-id',
                    [EnumPolicyConditionPlaceholder.workspaceMemberId]:
                        'workspace-member-id',
                };
                expect(
                    policyAbilityFactory.buildFromPolicies
                ).toHaveBeenCalledWith(userPolicies, placeholders);
                expect(
                    policyAbilityFactory.buildFromPolicies
                ).toHaveBeenCalledWith(workspacePolicies, placeholders);
            });

            it('never loads a project role', async () => {
                await domain.buildAbility({
                    scope: EnumPolicyAbilityScope.workspace,
                    user,
                    workspace,
                });

                expect(
                    policyRepository.findManyByRoleId
                ).not.toHaveBeenCalledWith('project-role');
            });
        });

        describe('project scope', () => {
            const projectPlaceholders = {
                [EnumPolicyConditionPlaceholder.userId]: 'user-id',
                [EnumPolicyConditionPlaceholder.workspaceId]: 'workspace-id',
                [EnumPolicyConditionPlaceholder.workspaceMemberId]:
                    'workspace-member-id',
                [EnumPolicyConditionPlaceholder.projectId]: 'project-id',
            };

            it('unions platform, workspace member and project member rules when a project member row exists', async () => {
                const ability = await domain.buildAbility({
                    scope: EnumPolicyAbilityScope.project,
                    user,
                    workspace,
                    project: {
                        id: 'project-id',
                        member: {
                            id: 'project-member-id',
                            roleId: 'project-role',
                        },
                    },
                });

                expect(ability).toBe(composedAbility);
                expect(policyRepository.findManyByRoleId).toHaveBeenCalledTimes(
                    3
                );
                expect(policyAbilityFactory.build).toHaveBeenCalledWith([
                    platformRule,
                    workspaceRule,
                    projectRule,
                ]);
            });

            it('resolves the project id for the platform and workspace layers and the project member id only for the project layer', async () => {
                await domain.buildAbility({
                    scope: EnumPolicyAbilityScope.project,
                    user,
                    workspace,
                    project: {
                        id: 'project-id',
                        member: {
                            id: 'project-member-id',
                            roleId: 'project-role',
                        },
                    },
                });

                expect(
                    policyAbilityFactory.buildFromPolicies
                ).toHaveBeenCalledWith(userPolicies, projectPlaceholders);
                expect(
                    policyAbilityFactory.buildFromPolicies
                ).toHaveBeenCalledWith(workspacePolicies, projectPlaceholders);
                expect(
                    policyAbilityFactory.buildFromPolicies
                ).toHaveBeenCalledWith(projectPolicies, {
                    ...projectPlaceholders,
                    [EnumPolicyConditionPlaceholder.projectMemberId]:
                        'project-member-id',
                });
            });

            it('unions platform and workspace rules only when the caller holds no project member row', async () => {
                const ability = await domain.buildAbility({
                    scope: EnumPolicyAbilityScope.project,
                    user,
                    workspace,
                    project: { id: 'project-id', member: null },
                });

                expect(ability).toBe(composedAbility);
                expect(policyRepository.findManyByRoleId).toHaveBeenCalledTimes(
                    2
                );
                expect(
                    policyRepository.findManyByRoleId
                ).not.toHaveBeenCalledWith('project-role');
                expect(
                    policyAbilityFactory.buildFromPolicies
                ).toHaveBeenCalledWith(workspacePolicies, projectPlaceholders);
                expect(policyAbilityFactory.build).toHaveBeenCalledWith([
                    platformRule,
                    workspaceRule,
                ]);
            });
        });
    });

    describe('buildLayer', () => {
        it('loads the role rows and returns the rules of the ability built from them', async () => {
            const rules = await domain['buildLayer']('workspace-role', {
                [EnumPolicyConditionPlaceholder.userId]: 'user-id',
            });

            expect(policyRepository.findManyByRoleId).toHaveBeenCalledWith(
                'workspace-role'
            );
            expect(policyAbilityFactory.buildFromPolicies).toHaveBeenCalledWith(
                workspacePolicies,
                { [EnumPolicyConditionPlaceholder.userId]: 'user-id' }
            );
            expect(rules).toEqual([workspaceRule]);
        });
    });

    describe('buildPlatform', () => {
        it('returns the platform rules resolved with the user placeholder', async () => {
            const rules = await domain['buildPlatform']({
                scope: EnumPolicyAbilityScope.platform,
                user,
                routeWorkspaceId: null,
                routeProjectId: null,
            });

            expect(rules).toEqual([platformRule]);
        });
    });

    describe('buildWorkspace', () => {
        it('returns the platform then the workspace member role rules', async () => {
            const rules = await domain['buildWorkspace']({
                user,
                workspace,
            });

            expect(rules).toEqual([platformRule, workspaceRule]);
        });
    });

    describe('buildProject', () => {
        it('returns platform, workspace and project member rules when a project member exists', async () => {
            const rules = await domain['buildProject']({
                scope: EnumPolicyAbilityScope.project,
                user,
                workspace,
                project: {
                    id: 'project-id',
                    member: {
                        id: 'project-member-id',
                        roleId: 'project-role',
                    },
                },
            });

            expect(rules).toEqual([platformRule, workspaceRule, projectRule]);
        });

        it('returns platform and workspace rules when the caller holds no project member', async () => {
            const rules = await domain['buildProject']({
                scope: EnumPolicyAbilityScope.project,
                user,
                workspace,
                project: { id: 'project-id', member: null },
            });

            expect(rules).toEqual([platformRule, workspaceRule]);
        });
    });
});
