import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';

import {
    EnumActivityLogAction,
    EnumPolicyAction,
    EnumPolicySubject,
    EnumRoleScope,
    type Project,
    type ProjectMember,
    type WorkspaceMember,
} from '@generated/prisma-client';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { AuthJwtAccessTokenInvalidException } from '@modules/auth/exceptions/auth.jwt-access-token-invalid.exception';
import { PolicyAbilityStoreKey } from '@modules/policy/constants/policy.constant';
import type { PolicyAbility } from '@modules/policy/interfaces/policy.interface';
import { ProjectMemberDomain } from '@modules/project/domains/project.member.domain';
import { ProjectMemberAlreadyAssignedException } from '@modules/project/exceptions/project.member-already-assigned.exception';
import { ProjectMemberLastAdminException } from '@modules/project/exceptions/project.member-last-admin.exception';
import { ProjectMemberForbiddenException } from '@modules/project/exceptions/project.member-forbidden.exception';
import { ProjectMemberNotFoundException } from '@modules/project/exceptions/project.member-not-found.exception';
import { ProjectMemberPeerForbiddenException } from '@modules/project/exceptions/project.member-peer-forbidden.exception';
import { ProjectNotFoundException } from '@modules/project/exceptions/project.not-found.exception';
import type {
    IProjectMember,
    IProjectMemberWithRole,
    IProjectMemberWithRolePolicies,
} from '@modules/project/interfaces/project.interface';
import { ProjectMemberRepository } from '@modules/project/repositories/project.member.repository';
import { RoleDomain } from '@modules/role/domains/role.domain';
import { EnumRoleProjectKey } from '@modules/role/enums/role.project-key.enum';
import { RoleNotFoundException } from '@modules/role/exceptions/role.not-found.exception';
import { RoleScopeMismatchException } from '@modules/role/exceptions/role.scope-mismatch.exception';
import type { IRole } from '@modules/role/interfaces/role.interface';
import { WorkspaceMemberNotFoundException } from '@modules/workspace/exceptions/workspace.member-not-found.exception';

function buildRole(key: EnumRoleProjectKey): IRole {
    return {
        id: `${key}-role-id`,
        scope: EnumRoleScope.project,
        key,
        name: key,
    };
}

function buildMemberWithRole(
    key: EnumRoleProjectKey,
    overrides: Partial<ProjectMember> = {}
): IProjectMemberWithRolePolicies {
    const at = new Date('2026-01-01T00:00:00.000Z');
    const role = buildRole(key);

    return {
        id: 'target-member-id',
        projectId: 'project-id',
        userId: 'target-user-id',
        roleId: role.id,
        role: {
            ...role,
            description: null,
            createdAt: at,
            createdBy: null,
            updatedAt: at,
            updatedBy: null,
            policies: [],
        },
        joinedAt: at,
        createdAt: at,
        createdBy: null,
        updatedAt: at,
        updatedBy: null,
        ...overrides,
    };
}

describe('ProjectMemberDomain', () => {
    const projectMemberRepository: MockProxy<ProjectMemberRepository> =
        mock<ProjectMemberRepository>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();
    const ability: MockProxy<PolicyAbility> = mock<PolicyAbility>();
    const activityLogDomain: MockProxy<ActivityLogDomain> =
        mock<ActivityLogDomain>();
    const roleDomain: MockProxy<RoleDomain> = mock<RoleDomain>();

    const project = mock<Project>({
        id: 'project-id',
        workspaceId: 'workspace-id',
    });

    let domain: ProjectMemberDomain;

    beforeEach(async () => {
        vi.resetAllMocks();
        requestStoreService.get.mockImplementation(key =>
            key === PolicyAbilityStoreKey ? ability : null
        );
        ability.can.mockReturnValue(false);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ProjectMemberDomain,
                {
                    provide: ProjectMemberRepository,
                    useValue: projectMemberRepository,
                },
                { provide: RequestStoreService, useValue: requestStoreService },
                { provide: ActivityLogDomain, useValue: activityLogDomain },
                { provide: RoleDomain, useValue: roleDomain },
            ],
        }).compile();

        domain = module.get(ProjectMemberDomain);
    });

    function setCanManage(allowed: boolean): void {
        ability.can.mockReturnValue(allowed);
    }

    describe('validateProjectMemberGuard', () => {
        it('rejects validation without a user', async () => {
            await expect(
                domain.validateProjectMemberGuard('project-id', null, true)
            ).rejects.toBeInstanceOf(AuthJwtAccessTokenInvalidException);
        });

        it('rejects validation without a project', async () => {
            await expect(
                domain.validateProjectMemberGuard(null, 'user-id', true)
            ).rejects.toBeInstanceOf(ProjectNotFoundException);
        });

        it('rejects a user without a project member row when the row is required', async () => {
            projectMemberRepository.findOneWithRoleByProjectAndUser.mockResolvedValue(
                null
            );
            await expect(
                domain.validateProjectMemberGuard('project-id', 'user-id', true)
            ).rejects.toBeInstanceOf(ProjectMemberForbiddenException);
            expect(
                projectMemberRepository.findOneWithRoleByProjectAndUser
            ).toHaveBeenCalledWith('project-id', 'user-id');
        });

        it('returns null for a user without a row when the row is optional', async () => {
            projectMemberRepository.findOneWithRoleByProjectAndUser.mockResolvedValue(
                null
            );
            await expect(
                domain.validateProjectMemberGuard(
                    'project-id',
                    'user-id',
                    false
                )
            ).resolves.toBeNull();
            expect(roleDomain.assertScope).not.toHaveBeenCalled();
        });

        it.each([true, false])(
            'returns the member with its role after asserting the project scope when required is %s',
            async required => {
                const member = buildMemberWithRole(EnumRoleProjectKey.member);
                projectMemberRepository.findOneWithRoleByProjectAndUser.mockResolvedValue(
                    member
                );

                await expect(
                    domain.validateProjectMemberGuard(
                        'project-id',
                        'user-id',
                        required
                    )
                ).resolves.toBe(member);
                expect(roleDomain.assertScope).toHaveBeenCalledWith(
                    member.role,
                    EnumRoleScope.project
                );
            }
        );

        it('propagates a role scope mismatch', async () => {
            projectMemberRepository.findOneWithRoleByProjectAndUser.mockResolvedValue(
                buildMemberWithRole(EnumRoleProjectKey.member)
            );
            roleDomain.assertScope.mockImplementation(() => {
                throw new RoleScopeMismatchException();
            });

            await expect(
                domain.validateProjectMemberGuard('project-id', 'user-id', true)
            ).rejects.toBeInstanceOf(RoleScopeMismatchException);
        });
    });

    describe('createInTx', () => {
        it('creates the member with the resolved role id inside the caller transaction', async () => {
            const tx = mock<Parameters<ProjectMemberDomain['createInTx']>[0]>();
            const created = mock<IProjectMember>({ id: 'new-member-id' });
            projectMemberRepository.createInTx.mockResolvedValue(created);

            await expect(
                domain.createInTx(
                    tx,
                    'project-id',
                    'user-id',
                    'role-id',
                    'actor-id'
                )
            ).resolves.toBe(created);
            expect(projectMemberRepository.createInTx).toHaveBeenCalledWith(
                tx,
                'project-id',
                'user-id',
                'role-id',
                'actor-id'
            );
        });
    });

    describe('assignMember', () => {
        it('resolves the role in the project scope, assigns the member and stages activity when the actor holds update on projectMember', async () => {
            setCanManage(true);
            roleDomain.resolve.mockResolvedValue(
                buildRole(EnumRoleProjectKey.admin)
            );
            const targetMember = mock<WorkspaceMember>({
                userId: 'target-id',
                workspaceId: 'workspace-id',
            });
            projectMemberRepository.findOneByProjectAndUser.mockResolvedValue(
                null
            );
            const created = mock<IProjectMember>({ id: 'new-member-id' });
            projectMemberRepository.create.mockResolvedValue(created);

            await expect(
                domain.assignMember(
                    project,
                    'actor-id',
                    targetMember,
                    'admin-role-id'
                )
            ).resolves.toBe(created);
            expect(roleDomain.resolve).toHaveBeenCalledWith(
                'admin-role-id',
                EnumRoleScope.project
            );
            expect(ability.can).toHaveBeenCalledWith(
                EnumPolicyAction.update,
                EnumPolicySubject.ProjectMember
            );
            expect(projectMemberRepository.create).toHaveBeenCalledWith(
                project.id,
                'target-id',
                'admin-role-id',
                'actor-id'
            );
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.projectMemberAssigned,
                userId: 'actor-id',
                createdBy: 'actor-id',
                workspaceId: 'workspace-id',
                metadata: { targetUserId: 'target-id' },
            });
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.projectMemberAssignedByAdmin,
                userId: 'target-id',
                createdBy: 'actor-id',
                workspaceId: 'workspace-id',
                metadata: { actorUserId: 'actor-id' },
            });
        });

        it('stages no by-admin event when the actor assigns themselves', async () => {
            setCanManage(true);
            roleDomain.resolve.mockResolvedValue(
                buildRole(EnumRoleProjectKey.member)
            );
            projectMemberRepository.findOneByProjectAndUser.mockResolvedValue(
                null
            );
            projectMemberRepository.create.mockResolvedValue(
                mock<IProjectMember>()
            );

            await domain.assignMember(
                project,
                'actor-id',
                mock<WorkspaceMember>({
                    userId: 'actor-id',
                    workspaceId: 'workspace-id',
                }),
                'member-role-id'
            );

            expect(activityLogDomain.prepare).toHaveBeenCalledTimes(1);
        });

        it('rejects an actor without manage on workspace assigning an admin role', async () => {
            setCanManage(false);
            roleDomain.resolve.mockResolvedValue(
                buildRole(EnumRoleProjectKey.admin)
            );
            const targetMember = mock<WorkspaceMember>({
                userId: 'target-id',
                workspaceId: 'workspace-id',
            });

            await expect(
                domain.assignMember(
                    project,
                    'actor-id',
                    targetMember,
                    'admin-role-id'
                )
            ).rejects.toBeInstanceOf(ProjectMemberPeerForbiddenException);
            expect(
                projectMemberRepository.findOneByProjectAndUser
            ).not.toHaveBeenCalled();
        });

        it.each([EnumRoleProjectKey.member, EnumRoleProjectKey.viewer])(
            'lets an actor without manage on workspace assign the %s role',
            async key => {
                setCanManage(false);
                roleDomain.resolve.mockResolvedValue(buildRole(key));
                projectMemberRepository.findOneByProjectAndUser.mockResolvedValue(
                    null
                );
                projectMemberRepository.create.mockResolvedValue(
                    mock<IProjectMember>()
                );

                await expect(
                    domain.assignMember(
                        project,
                        'actor-id',
                        mock<WorkspaceMember>({
                            userId: 'target-id',
                            workspaceId: 'workspace-id',
                        }),
                        `${key}-role-id`
                    )
                ).resolves.toBeDefined();
            }
        );

        it.each([
            ['not found', RoleNotFoundException],
            ['a scope mismatch', RoleScopeMismatchException],
        ])(
            'propagates the role resolution failure (%s) before anything is written',
            async (_name, Failure) => {
                roleDomain.resolve.mockRejectedValue(new Failure());

                await expect(
                    domain.assignMember(
                        project,
                        'actor-id',
                        mock<WorkspaceMember>({
                            userId: 'target-id',
                            workspaceId: 'workspace-id',
                        }),
                        'bad-role-id'
                    )
                ).rejects.toBeInstanceOf(Failure);
                expect(projectMemberRepository.create).not.toHaveBeenCalled();
            }
        );

        it('rejects assigning a member outside the project workspace', async () => {
            setCanManage(true);
            roleDomain.resolve.mockResolvedValue(
                buildRole(EnumRoleProjectKey.member)
            );

            await expect(
                domain.assignMember(project, 'actor-id', null, 'member-role-id')
            ).rejects.toBeInstanceOf(WorkspaceMemberNotFoundException);
        });

        it('rejects assigning a workspace member of another workspace', async () => {
            setCanManage(true);
            roleDomain.resolve.mockResolvedValue(
                buildRole(EnumRoleProjectKey.member)
            );

            await expect(
                domain.assignMember(
                    project,
                    'actor-id',
                    mock<WorkspaceMember>({
                        userId: 'target-id',
                        workspaceId: 'other-workspace-id',
                    }),
                    'member-role-id'
                )
            ).rejects.toBeInstanceOf(WorkspaceMemberNotFoundException);
        });

        it('rejects assigning a member already assigned to the project', async () => {
            setCanManage(true);
            roleDomain.resolve.mockResolvedValue(
                buildRole(EnumRoleProjectKey.member)
            );
            projectMemberRepository.findOneByProjectAndUser.mockResolvedValue(
                mock<ProjectMember>({ id: 'existing-id' })
            );

            await expect(
                domain.assignMember(
                    project,
                    'actor-id',
                    mock<WorkspaceMember>({
                        userId: 'target-id',
                        workspaceId: 'workspace-id',
                    }),
                    'member-role-id'
                )
            ).rejects.toBeInstanceOf(ProjectMemberAlreadyAssignedException);
        });
    });

    describe('updateMemberRole', () => {
        it('resolves the role in the project scope, updates it and stages activity', async () => {
            setCanManage(true);
            roleDomain.resolve.mockResolvedValue(
                buildRole(EnumRoleProjectKey.admin)
            );
            projectMemberRepository.findByIdAndProject.mockResolvedValue(
                buildMemberWithRole(EnumRoleProjectKey.member)
            );

            await domain.updateMemberRole(
                project,
                'actor-id',
                'target-member-id',
                'admin-role-id'
            );

            expect(roleDomain.resolve).toHaveBeenCalledWith(
                'admin-role-id',
                EnumRoleScope.project
            );
            expect(projectMemberRepository.updateRole).toHaveBeenCalledWith(
                'target-member-id',
                'admin-role-id'
            );
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.projectMemberRoleUpdated,
                userId: 'actor-id',
                createdBy: 'actor-id',
                workspaceId: 'workspace-id',
                metadata: { targetUserId: 'target-user-id' },
            });
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.projectMemberRoleUpdatedByAdmin,
                userId: 'target-user-id',
                createdBy: 'actor-id',
                workspaceId: 'workspace-id',
                metadata: { actorUserId: 'actor-id' },
            });
        });

        it('stages no by-admin event when the actor changes their own role', async () => {
            setCanManage(true);
            roleDomain.resolve.mockResolvedValue(
                buildRole(EnumRoleProjectKey.viewer)
            );
            projectMemberRepository.findByIdAndProject.mockResolvedValue(
                buildMemberWithRole(EnumRoleProjectKey.member, {
                    userId: 'actor-id',
                })
            );

            await domain.updateMemberRole(
                project,
                'actor-id',
                'target-member-id',
                'viewer-role-id'
            );

            expect(activityLogDomain.prepare).toHaveBeenCalledTimes(1);
        });

        it('rejects when the target member is not found', async () => {
            projectMemberRepository.findByIdAndProject.mockResolvedValue(null);

            await expect(
                domain.updateMemberRole(
                    project,
                    'actor-id',
                    'missing-id',
                    'member-role-id'
                )
            ).rejects.toBeInstanceOf(ProjectMemberNotFoundException);
        });

        it.each([
            ['not found', RoleNotFoundException],
            ['a scope mismatch', RoleScopeMismatchException],
        ])(
            'propagates the role resolution failure (%s) and writes nothing',
            async (_name, Failure) => {
                projectMemberRepository.findByIdAndProject.mockResolvedValue(
                    buildMemberWithRole(EnumRoleProjectKey.member)
                );
                roleDomain.resolve.mockRejectedValue(new Failure());

                await expect(
                    domain.updateMemberRole(
                        project,
                        'actor-id',
                        'target-member-id',
                        'bad-role-id'
                    )
                ).rejects.toBeInstanceOf(Failure);
                expect(
                    projectMemberRepository.updateRole
                ).not.toHaveBeenCalled();
            }
        );

        it('rejects an actor without manage on workspace changing the role of an existing admin', async () => {
            setCanManage(false);
            roleDomain.resolve.mockResolvedValue(
                buildRole(EnumRoleProjectKey.member)
            );
            projectMemberRepository.findByIdAndProject.mockResolvedValue(
                buildMemberWithRole(EnumRoleProjectKey.admin)
            );

            await expect(
                domain.updateMemberRole(
                    project,
                    'actor-id',
                    'target-member-id',
                    'member-role-id'
                )
            ).rejects.toBeInstanceOf(ProjectMemberPeerForbiddenException);
            expect(projectMemberRepository.updateRole).not.toHaveBeenCalled();
        });

        it('rejects an actor without manage on workspace promoting a peer to admin', async () => {
            setCanManage(false);
            roleDomain.resolve.mockResolvedValue(
                buildRole(EnumRoleProjectKey.admin)
            );
            projectMemberRepository.findByIdAndProject.mockResolvedValue(
                buildMemberWithRole(EnumRoleProjectKey.member)
            );

            await expect(
                domain.updateMemberRole(
                    project,
                    'actor-id',
                    'target-member-id',
                    'admin-role-id'
                )
            ).rejects.toBeInstanceOf(ProjectMemberPeerForbiddenException);
        });

        it('lets an actor without manage on workspace move a member between non-admin roles', async () => {
            setCanManage(false);
            roleDomain.resolve.mockResolvedValue(
                buildRole(EnumRoleProjectKey.viewer)
            );
            projectMemberRepository.findByIdAndProject.mockResolvedValue(
                buildMemberWithRole(EnumRoleProjectKey.member)
            );

            await domain.updateMemberRole(
                project,
                'actor-id',
                'target-member-id',
                'viewer-role-id'
            );

            expect(projectMemberRepository.updateRole).toHaveBeenCalledWith(
                'target-member-id',
                'viewer-role-id'
            );
        });
    });

    describe('updateMemberRole last admin', () => {
        it('rejects demoting the last admin', async () => {
            setCanManage(true);
            projectMemberRepository.findByIdAndProject.mockResolvedValue(
                buildMemberWithRole(EnumRoleProjectKey.admin)
            );
            roleDomain.resolve.mockResolvedValue(
                buildRole(EnumRoleProjectKey.viewer)
            );
            projectMemberRepository.countAdmins.mockResolvedValue(1);

            await expect(
                domain.updateMemberRole(
                    project,
                    'actor-id',
                    'target-member-id',
                    'viewer-role-id'
                )
            ).rejects.toBeInstanceOf(ProjectMemberLastAdminException);
            expect(projectMemberRepository.updateRole).not.toHaveBeenCalled();
        });

        it('allows demoting an admin when another admin remains', async () => {
            setCanManage(true);
            projectMemberRepository.findByIdAndProject.mockResolvedValue(
                buildMemberWithRole(EnumRoleProjectKey.admin)
            );
            roleDomain.resolve.mockResolvedValue(
                buildRole(EnumRoleProjectKey.viewer)
            );
            projectMemberRepository.countAdmins.mockResolvedValue(2);

            await domain.updateMemberRole(
                project,
                'actor-id',
                'target-member-id',
                'viewer-role-id'
            );

            expect(projectMemberRepository.updateRole).toHaveBeenCalledWith(
                'target-member-id',
                'viewer-role-id'
            );
        });

        it('allows re-assigning the admin role to the last admin without counting', async () => {
            setCanManage(true);
            projectMemberRepository.findByIdAndProject.mockResolvedValue(
                buildMemberWithRole(EnumRoleProjectKey.admin)
            );
            roleDomain.resolve.mockResolvedValue(
                buildRole(EnumRoleProjectKey.admin)
            );

            await domain.updateMemberRole(
                project,
                'actor-id',
                'target-member-id',
                'admin-role-id'
            );

            expect(projectMemberRepository.countAdmins).not.toHaveBeenCalled();
            expect(projectMemberRepository.updateRole).toHaveBeenCalled();
        });

        it('does not count admins when the target is not an admin', async () => {
            setCanManage(false);
            projectMemberRepository.findByIdAndProject.mockResolvedValue(
                buildMemberWithRole(EnumRoleProjectKey.member)
            );
            roleDomain.resolve.mockResolvedValue(
                buildRole(EnumRoleProjectKey.viewer)
            );

            await domain.updateMemberRole(
                project,
                'actor-id',
                'target-member-id',
                'viewer-role-id'
            );

            expect(projectMemberRepository.countAdmins).not.toHaveBeenCalled();
        });
    });

    describe('removeMember', () => {
        it('removes the member and stages activity', async () => {
            setCanManage(true);
            projectMemberRepository.findByIdAndProject.mockResolvedValue(
                buildMemberWithRole(EnumRoleProjectKey.admin)
            );
            projectMemberRepository.countAdmins.mockResolvedValue(2);

            await domain.removeMember(project, 'actor-id', 'target-member-id');

            expect(projectMemberRepository.removeMember).toHaveBeenCalledWith(
                'target-member-id'
            );
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.projectMemberRemoved,
                userId: 'actor-id',
                createdBy: 'actor-id',
                workspaceId: 'workspace-id',
                metadata: { targetUserId: 'target-user-id' },
            });
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.projectMemberRemovedByAdmin,
                userId: 'target-user-id',
                createdBy: 'actor-id',
                workspaceId: 'workspace-id',
                metadata: { actorUserId: 'actor-id' },
            });
        });

        it('rejects when the target member is not found', async () => {
            projectMemberRepository.findByIdAndProject.mockResolvedValue(null);

            await expect(
                domain.removeMember(project, 'actor-id', 'missing-id')
            ).rejects.toBeInstanceOf(ProjectMemberNotFoundException);
        });

        it('rejects removing oneself, directing to leaveProject instead', async () => {
            projectMemberRepository.findByIdAndProject.mockResolvedValue(
                buildMemberWithRole(EnumRoleProjectKey.member, {
                    userId: 'actor-id',
                })
            );

            await expect(
                domain.removeMember(project, 'actor-id', 'target-member-id')
            ).rejects.toBeInstanceOf(ProjectMemberPeerForbiddenException);
            expect(ability.can).not.toHaveBeenCalled();
        });

        it('rejects removing the last admin', async () => {
            setCanManage(true);
            projectMemberRepository.findByIdAndProject.mockResolvedValue(
                buildMemberWithRole(EnumRoleProjectKey.admin)
            );
            projectMemberRepository.countAdmins.mockResolvedValue(1);

            await expect(
                domain.removeMember(project, 'actor-id', 'target-member-id')
            ).rejects.toBeInstanceOf(ProjectMemberLastAdminException);
            expect(projectMemberRepository.countAdmins).toHaveBeenCalledWith(
                'project-id'
            );
            expect(projectMemberRepository.removeMember).not.toHaveBeenCalled();
        });

        it('does not count admins when removing a non-admin member', async () => {
            setCanManage(true);
            projectMemberRepository.findByIdAndProject.mockResolvedValue(
                buildMemberWithRole(EnumRoleProjectKey.viewer)
            );

            await domain.removeMember(project, 'actor-id', 'target-member-id');

            expect(projectMemberRepository.countAdmins).not.toHaveBeenCalled();
        });

        it('rejects an actor without manage on workspace removing an admin', async () => {
            setCanManage(false);
            projectMemberRepository.findByIdAndProject.mockResolvedValue(
                buildMemberWithRole(EnumRoleProjectKey.admin)
            );

            await expect(
                domain.removeMember(project, 'actor-id', 'target-member-id')
            ).rejects.toBeInstanceOf(ProjectMemberPeerForbiddenException);
            expect(projectMemberRepository.removeMember).not.toHaveBeenCalled();
        });

        it('lets an actor without manage on workspace remove a non-admin member', async () => {
            setCanManage(false);
            projectMemberRepository.findByIdAndProject.mockResolvedValue(
                buildMemberWithRole(EnumRoleProjectKey.viewer)
            );

            await domain.removeMember(project, 'actor-id', 'target-member-id');

            expect(projectMemberRepository.removeMember).toHaveBeenCalledWith(
                'target-member-id'
            );
        });
    });

    describe('leaveProject', () => {
        function buildLeaver(key: EnumRoleProjectKey): IProjectMemberWithRole {
            return {
                ...buildMemberWithRole(key, {
                    id: 'member-id',
                    userId: 'user-id',
                }),
            };
        }

        it('removes a non-admin member and stages the leave activity', async () => {
            await domain.leaveProject(
                project,
                buildLeaver(EnumRoleProjectKey.member)
            );

            expect(projectMemberRepository.countAdmins).not.toHaveBeenCalled();
            expect(projectMemberRepository.removeMember).toHaveBeenCalledWith(
                'member-id'
            );
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.projectMemberLeft,
                userId: 'user-id',
                createdBy: 'user-id',
                workspaceId: 'workspace-id',
            });
        });

        it('lets an admin leave when another admin remains', async () => {
            projectMemberRepository.countAdmins.mockResolvedValue(2);

            await domain.leaveProject(
                project,
                buildLeaver(EnumRoleProjectKey.admin)
            );

            expect(projectMemberRepository.countAdmins).toHaveBeenCalledWith(
                'project-id'
            );
            expect(projectMemberRepository.removeMember).toHaveBeenCalledWith(
                'member-id'
            );
        });

        it('rejects the last admin leaving', async () => {
            projectMemberRepository.countAdmins.mockResolvedValue(1);

            await expect(
                domain.leaveProject(
                    project,
                    buildLeaver(EnumRoleProjectKey.admin)
                )
            ).rejects.toBeInstanceOf(ProjectMemberLastAdminException);
            expect(projectMemberRepository.removeMember).not.toHaveBeenCalled();
        });
    });
});
