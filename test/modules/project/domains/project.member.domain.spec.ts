import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import type { Project, WorkspaceMember } from '@generated/prisma-client/client';
import {
    EnumActivityLogAction,
    EnumRoleScope,
} from '@generated/prisma-client/client';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { AuthJwtAccessTokenInvalidException } from '@modules/auth/exceptions/auth.jwt-access-token-invalid.exception';
import { ProjectMemberForbiddenException } from '@modules/project/exceptions/project.member-forbidden.exception';
import { ProjectMemberNotFoundException } from '@modules/project/exceptions/project.member-not-found.exception';
import { ProjectNotFoundException } from '@modules/project/exceptions/project.not-found.exception';
import { WorkspaceMemberNotFoundException } from '@modules/workspace/exceptions/workspace.member-not-found.exception';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import { ProjectMemberAlreadyAssignedException } from '@modules/project/exceptions/project.member-already-assigned.exception';
import { ProjectMemberLastAdminException } from '@modules/project/exceptions/project.member-last-admin.exception';
import { ProjectMemberPeerForbiddenException } from '@modules/project/exceptions/project.member-peer-forbidden.exception';
import { ProjectMemberRepository } from '@modules/project/repositories/project.member.repository';
import type {
    IProjectMember,
    IProjectMemberWithRole,
} from '@modules/project/interfaces/project.interface';
import { ProjectMemberDomain } from '@modules/project/domains/project.member.domain';
import { RoleDomain } from '@modules/role/domains/role.domain';
import { EnumRoleProjectKey } from '@modules/role/enums/role.project-key.enum';

describe('ProjectMemberDomain', () => {
    const repository: MockProxy<ProjectMemberRepository> = mock();
    const activityLog: MockProxy<ActivityLogDomain> = mock();
    const roleDomain: MockProxy<RoleDomain> = mock();
    const project = mock<Project>({
        id: 'project-id',
        workspaceId: 'workspace-id',
    });
    const member = mock<IProjectMemberWithRole>({
        id: 'member-id',
        userId: 'target-id',
        role: {
            key: EnumRoleProjectKey.member,
        } as IProjectMemberWithRole['role'],
    });
    let domain: ProjectMemberDomain;

    beforeEach(() => {
        vi.resetAllMocks();
        domain = new ProjectMemberDomain(repository, activityLog, roleDomain);
        activityLog.prepare.mockReturnValue({} as never);
    });

    it('assigns a workspace member after resolving a project role', async () => {
        const target = mock<WorkspaceMember>({
            userId: 'target-id',
            workspaceId: 'workspace-id',
        });
        const created = mock<IProjectMember>();
        roleDomain.resolve.mockResolvedValue({
            id: 'role-id',
            key: EnumRoleProjectKey.member,
        } as never);
        repository.findOneByProjectAndUser.mockResolvedValue(null);
        repository.create.mockResolvedValue(created);

        await expect(
            domain.assignMember(project, 'actor-id', target, 'role-id')
        ).resolves.toBe(created);
        expect(roleDomain.resolve).toHaveBeenCalledWith(
            'role-id',
            EnumRoleScope.project
        );
        expect(repository.create).toHaveBeenCalledWith(
            'project-id',
            'target-id',
            'role-id',
            'actor-id'
        );
    });

    it('rejects assigning an existing member', async () => {
        roleDomain.resolve.mockResolvedValue({
            id: 'role-id',
            key: EnumRoleProjectKey.member,
        } as never);
        repository.findOneByProjectAndUser.mockResolvedValue(
            mock<IProjectMember>()
        );
        await expect(
            domain.assignMember(
                project,
                'actor-id',
                mock<WorkspaceMember>({ workspaceId: 'workspace-id' }),
                'role-id'
            )
        ).rejects.toBeInstanceOf(ProjectMemberAlreadyAssignedException);
    });

    it('updates a member role without capability probing', async () => {
        roleDomain.resolve.mockResolvedValue({
            id: 'role-id',
            key: EnumRoleProjectKey.viewer,
        } as never);
        await domain.updateMemberRole(project, 'actor-id', member, 'role-id');
        expect(repository.updateRole).toHaveBeenCalledWith(
            'member-id',
            'role-id'
        );
    });

    it('protects the last administrator from demotion', async () => {
        roleDomain.resolve.mockResolvedValue({
            id: 'role-id',
            key: EnumRoleProjectKey.viewer,
        } as never);
        repository.countAdmins.mockResolvedValue(1);
        await expect(
            domain.updateMemberRole(
                project,
                'actor-id',
                {
                    ...member,
                    role: { key: EnumRoleProjectKey.admin },
                } as IProjectMemberWithRole,
                'role-id'
            )
        ).rejects.toBeInstanceOf(ProjectMemberLastAdminException);
    });

    it('rejects removing oneself', async () => {
        await expect(
            domain.removeMember(project, 'actor-id', {
                ...member,
                userId: 'actor-id',
            })
        ).rejects.toBeInstanceOf(ProjectMemberPeerForbiddenException);
    });

    it('removes a member and records the activity', async () => {
        await domain.removeMember(project, 'actor-id', member);
        expect(repository.removeMember).toHaveBeenCalledWith('member-id');
        expect(activityLog.prepare).toHaveBeenCalledWith({
            action: EnumActivityLogAction.projectMemberRemoved,
            userId: 'actor-id',
            createdBy: 'actor-id',
            workspaceId: 'workspace-id',
            metadata: { targetUserId: 'target-id' },
        });
    });

    describe('getMembersList', () => {
        const pagination = {
            where: undefined,
            limit: 10,
            cursor: undefined,
            cursorField: 'id',
            orderBy: [],
        };
        const page = {
            type: EnumPaginationType.cursor as const,
            count: 0,
            perPage: 10,
            hasNext: false,
            cursor: undefined,
            data: [],
        };

        it('forwards the accessible where to the repository', async () => {
            const accessibleWhere = { projectId: 'project-id' };
            repository.findWithPaginationCursor.mockResolvedValue(page);

            await expect(
                domain.getMembersList(project, pagination, accessibleWhere)
            ).resolves.toBe(page);
            expect(repository.findWithPaginationCursor).toHaveBeenCalledWith(
                'project-id',
                pagination,
                accessibleWhere
            );
        });

        it('passes undefined to the repository when no where is given', async () => {
            repository.findWithPaginationCursor.mockResolvedValue(page);

            await domain.getMembersList(project, pagination);

            expect(repository.findWithPaginationCursor).toHaveBeenCalledWith(
                'project-id',
                pagination,
                undefined
            );
        });
    });

    describe('validateProjectMemberGuard', () => {
        it('rejects a request without a user as an invalid access token', async () => {
            await expect(
                domain.validateProjectMemberGuard('project-id', null, true)
            ).rejects.toBeInstanceOf(AuthJwtAccessTokenInvalidException);
            expect(
                repository.findOneWithRoleByProjectAndUser
            ).not.toHaveBeenCalled();
        });

        it('rejects a request without a project as ProjectNotFoundException', async () => {
            await expect(
                domain.validateProjectMemberGuard(null, 'user-id', true)
            ).rejects.toBeInstanceOf(ProjectNotFoundException);
            expect(
                repository.findOneWithRoleByProjectAndUser
            ).not.toHaveBeenCalled();
        });

        it('rejects a non member when membership is required', async () => {
            repository.findOneWithRoleByProjectAndUser.mockResolvedValue(null);

            await expect(
                domain.validateProjectMemberGuard('project-id', 'user-id', true)
            ).rejects.toBeInstanceOf(ProjectMemberForbiddenException);
        });

        it('answers null for a non member when membership is optional', async () => {
            repository.findOneWithRoleByProjectAndUser.mockResolvedValue(null);

            await expect(
                domain.validateProjectMemberGuard(
                    'project-id',
                    'user-id',
                    false
                )
            ).resolves.toBeNull();
            expect(roleDomain.assertScope).not.toHaveBeenCalled();
        });

        it('asserts the project scope of the member role and returns the member', async () => {
            repository.findOneWithRoleByProjectAndUser.mockResolvedValue(
                member
            );

            await expect(
                domain.validateProjectMemberGuard('project-id', 'user-id', true)
            ).resolves.toBe(member);
            expect(
                repository.findOneWithRoleByProjectAndUser
            ).toHaveBeenCalledWith('project-id', 'user-id');
            expect(roleDomain.assertScope).toHaveBeenCalledWith(
                member.role,
                EnumRoleScope.project
            );
        });
    });

    describe('getOneByIdAndProject', () => {
        it('loads the member within the project and the optional where', async () => {
            const where = { userId: 'target-id' };
            repository.findByIdAndProject.mockResolvedValue(member);

            await expect(
                domain.getOneByIdAndProject('project-id', 'member-id', where)
            ).resolves.toBe(member);
            expect(repository.findByIdAndProject).toHaveBeenCalledWith(
                'member-id',
                'project-id',
                where
            );
        });

        it('throws ProjectMemberNotFoundException when the member is outside the project or the where', async () => {
            repository.findByIdAndProject.mockResolvedValue(null);

            await expect(
                domain.getOneByIdAndProject('project-id', 'member-id')
            ).rejects.toBeInstanceOf(ProjectMemberNotFoundException);
            expect(repository.findByIdAndProject).toHaveBeenCalledWith(
                'member-id',
                'project-id',
                undefined
            );
        });
    });

    describe('createInTx', () => {
        it('delegates the transactional create to the repository', async () => {
            const tx = mock<IDatabaseTransactionClient>();
            const created = mock<IProjectMember>();
            repository.createInTx.mockResolvedValue(created);

            await expect(
                domain.createInTx(
                    tx,
                    'project-id',
                    'user-id',
                    'role-id',
                    'actor-id'
                )
            ).resolves.toBe(created);
            expect(repository.createInTx).toHaveBeenCalledWith(
                tx,
                'project-id',
                'user-id',
                'role-id',
                'actor-id'
            );
        });
    });

    describe('assignMember events and guards', () => {
        const projectRole = {
            id: 'role-id',
            key: EnumRoleProjectKey.member,
        } as never;

        it.each([
            ['no workspace member', null],
            [
                'a member of another workspace',
                mock<WorkspaceMember>({
                    userId: 'target-id',
                    workspaceId: 'other-workspace',
                }),
            ],
        ])('rejects assigning %s', async (_name, target) => {
            roleDomain.resolve.mockResolvedValue(projectRole);

            await expect(
                domain.assignMember(project, 'actor-id', target, 'role-id')
            ).rejects.toBeInstanceOf(WorkspaceMemberNotFoundException);
            expect(repository.create).not.toHaveBeenCalled();
        });

        it('stages the actor event and the by-admin event when the target differs from the actor', async () => {
            roleDomain.resolve.mockResolvedValue(projectRole);
            repository.findOneByProjectAndUser.mockResolvedValue(null);
            repository.create.mockResolvedValue(mock<IProjectMember>());

            await domain.assignMember(
                project,
                'actor-id',
                mock<WorkspaceMember>({
                    userId: 'target-id',
                    workspaceId: 'workspace-id',
                }),
                'role-id'
            );

            expect(activityLog.prepare).toHaveBeenNthCalledWith(1, {
                action: EnumActivityLogAction.projectMemberAssigned,
                userId: 'actor-id',
                createdBy: 'actor-id',
                workspaceId: 'workspace-id',
                metadata: { targetUserId: 'target-id' },
            });
            expect(activityLog.prepare).toHaveBeenNthCalledWith(2, {
                action: EnumActivityLogAction.projectMemberAssignedByAdmin,
                userId: 'target-id',
                createdBy: 'actor-id',
                workspaceId: 'workspace-id',
                metadata: { actorUserId: 'actor-id' },
            });
            expect(activityLog.stagePrepared).toHaveBeenCalledWith([{}, {}]);
        });

        it('stages only the actor event when the actor assigns themselves', async () => {
            roleDomain.resolve.mockResolvedValue(projectRole);
            repository.findOneByProjectAndUser.mockResolvedValue(null);
            repository.create.mockResolvedValue(mock<IProjectMember>());

            await domain.assignMember(
                project,
                'actor-id',
                mock<WorkspaceMember>({
                    userId: 'actor-id',
                    workspaceId: 'workspace-id',
                }),
                'role-id'
            );

            expect(activityLog.prepare).toHaveBeenCalledOnce();
            expect(activityLog.stagePrepared).toHaveBeenCalledWith([{}]);
        });
    });

    describe('updateMemberRole events and last admin guard', () => {
        const adminMember = {
            ...member,
            role: { key: EnumRoleProjectKey.admin },
        } as IProjectMemberWithRole;

        it('stages the actor event and the by-admin event when the target differs from the actor', async () => {
            roleDomain.resolve.mockResolvedValue({
                id: 'role-id',
                key: EnumRoleProjectKey.viewer,
            } as never);

            await domain.updateMemberRole(
                project,
                'actor-id',
                member,
                'role-id'
            );

            expect(activityLog.prepare).toHaveBeenNthCalledWith(2, {
                action: EnumActivityLogAction.projectMemberRoleUpdatedByAdmin,
                userId: 'target-id',
                createdBy: 'actor-id',
                workspaceId: 'workspace-id',
                metadata: { actorUserId: 'actor-id' },
            });
            expect(activityLog.stagePrepared).toHaveBeenCalledWith([{}, {}]);
        });

        it('stages only the actor event when the actor updates their own role', async () => {
            roleDomain.resolve.mockResolvedValue({
                id: 'role-id',
                key: EnumRoleProjectKey.viewer,
            } as never);

            await domain.updateMemberRole(
                project,
                'target-id',
                member,
                'role-id'
            );

            expect(activityLog.prepare).toHaveBeenCalledOnce();
            expect(activityLog.stagePrepared).toHaveBeenCalledWith([{}]);
        });

        it('demotes an administrator when another administrator remains', async () => {
            roleDomain.resolve.mockResolvedValue({
                id: 'role-id',
                key: EnumRoleProjectKey.viewer,
            } as never);
            repository.countAdmins.mockResolvedValue(2);

            await domain.updateMemberRole(
                project,
                'actor-id',
                adminMember,
                'role-id'
            );

            expect(repository.countAdmins).toHaveBeenCalledWith('project-id');
            expect(repository.updateRole).toHaveBeenCalledWith(
                'member-id',
                'role-id'
            );
        });

        it('does not count administrators when the administrator keeps the admin role', async () => {
            roleDomain.resolve.mockResolvedValue({
                id: 'role-id',
                key: EnumRoleProjectKey.admin,
            } as never);

            await domain.updateMemberRole(
                project,
                'actor-id',
                adminMember,
                'role-id'
            );

            expect(repository.countAdmins).not.toHaveBeenCalled();
            expect(repository.updateRole).toHaveBeenCalledWith(
                'member-id',
                'role-id'
            );
        });
    });

    describe('removeMember last admin guard', () => {
        const adminMember = {
            ...member,
            role: { key: EnumRoleProjectKey.admin },
        } as IProjectMemberWithRole;

        it('protects the last administrator from removal', async () => {
            repository.countAdmins.mockResolvedValue(1);

            await expect(
                domain.removeMember(project, 'actor-id', adminMember)
            ).rejects.toBeInstanceOf(ProjectMemberLastAdminException);
            expect(repository.removeMember).not.toHaveBeenCalled();
        });

        it('removes an administrator when another administrator remains and stages both events', async () => {
            repository.countAdmins.mockResolvedValue(2);

            await domain.removeMember(project, 'actor-id', adminMember);

            expect(repository.removeMember).toHaveBeenCalledWith('member-id');
            expect(activityLog.prepare).toHaveBeenNthCalledWith(2, {
                action: EnumActivityLogAction.projectMemberRemovedByAdmin,
                userId: 'target-id',
                createdBy: 'actor-id',
                workspaceId: 'workspace-id',
                metadata: { actorUserId: 'actor-id' },
            });
            expect(activityLog.stagePrepared).toHaveBeenCalledWith([{}, {}]);
        });
    });

    describe('leaveProject', () => {
        const adminMember = {
            ...member,
            role: { key: EnumRoleProjectKey.admin },
        } as IProjectMemberWithRole;

        it('lets a non administrator leave and records the activity', async () => {
            await domain.leaveProject(project, member);

            expect(repository.countAdmins).not.toHaveBeenCalled();
            expect(activityLog.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.projectMemberLeft,
                userId: 'target-id',
                createdBy: 'target-id',
                workspaceId: 'workspace-id',
            });
            expect(repository.removeMember).toHaveBeenCalledWith('member-id');
            expect(activityLog.stagePrepared).toHaveBeenCalledWith([{}]);
        });

        it('protects the last administrator from leaving', async () => {
            repository.countAdmins.mockResolvedValue(1);

            await expect(
                domain.leaveProject(project, adminMember)
            ).rejects.toBeInstanceOf(ProjectMemberLastAdminException);
            expect(repository.removeMember).not.toHaveBeenCalled();
        });

        it('lets an administrator leave when another administrator remains', async () => {
            repository.countAdmins.mockResolvedValue(2);

            await domain.leaveProject(project, adminMember);

            expect(repository.removeMember).toHaveBeenCalledWith('member-id');
        });
    });
});
