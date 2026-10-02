import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { Project, WorkspaceMember } from '@generated/prisma-client/client';
import {
    EnumActivityLogAction,
    EnumRoleScope,
} from '@generated/prisma-client/client';
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
});
