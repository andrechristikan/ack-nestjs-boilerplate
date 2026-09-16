import { createMock } from '@golevelup/ts-vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RequestStoreService } from '@common/request/services/request.store.service';
import {
    EnumActivityLogAction,
    EnumProjectMemberRole,
    type Project,
    type ProjectMember,
    type WorkspaceMember,
} from '@generated/prisma-client';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import { AuthJwtAccessTokenInvalidException } from '@modules/auth/exceptions/auth.jwt-access-token-invalid.exception';
import { ProjectWorkspaceOwnerStoreKey } from '@modules/project/constants/project.constant';
import { ProjectMemberDomain } from '@modules/project/domains/project.member.domain';
import { ProjectMemberAlreadyAssignedException } from '@modules/project/exceptions/project.member-already-assigned.exception';
import { ProjectMemberForbiddenException } from '@modules/project/exceptions/project.member-forbidden.exception';
import { ProjectMemberNotFoundException } from '@modules/project/exceptions/project.member-not-found.exception';
import { ProjectMemberPeerForbiddenException } from '@modules/project/exceptions/project.member-peer-forbidden.exception';
import { ProjectNotFoundException } from '@modules/project/exceptions/project.not-found.exception';
import { ProjectRoleForbiddenException } from '@modules/project/exceptions/project.role-forbidden.exception';
import { IProjectMember } from '@modules/project/interfaces/project.interface';
import { ProjectMemberRepository } from '@modules/project/repositories/project.member.repository';
import { ProjectUtil } from '@modules/project/utils/project.util';
import { WorkspaceMemberNotFoundException } from '@modules/workspace/exceptions/workspace.member-not-found.exception';
import { createDatabaseServiceMock } from '@test/support/database.mock';

describe('ProjectMemberDomain', () => {
    const projectMemberRepository = createMock<ProjectMemberRepository>();
    const projectUtil = createMock<ProjectUtil>();
    const activityLogDomain = createMock<ActivityLogDomain>();
    const databaseService = createDatabaseServiceMock();
    const requestStoreService = createMock<RequestStoreService>();

    const project = createMock<Project>({
        id: 'project-id',
        workspaceId: 'workspace-id',
    });

    let domain: ProjectMemberDomain;

    beforeEach(() => {
        vi.resetAllMocks();
        requestStoreService.get.mockReturnValue(null);
        domain = new ProjectMemberDomain(
            projectMemberRepository,
            projectUtil,
            activityLogDomain,
            databaseService,
            requestStoreService
        );
    });

    function setWorkspaceOwner(isOwner: boolean): void {
        requestStoreService.get.mockImplementation(key => {
            if (key === ProjectWorkspaceOwnerStoreKey) return isOwner;
            return null;
        });
    }

    describe('validateProjectMemberGuard', () => {
        it('rejects validation without a user', async () => {
            await expect(
                domain.validateProjectMemberGuard('project-id', null)
            ).rejects.toBeInstanceOf(AuthJwtAccessTokenInvalidException);
        });

        it('rejects validation without a project', async () => {
            await expect(
                domain.validateProjectMemberGuard(null, 'user-id')
            ).rejects.toBeInstanceOf(ProjectNotFoundException);
        });

        it('rejects a user who is not a project member', async () => {
            projectMemberRepository.findOneByProjectAndUser.mockResolvedValue(
                null
            );
            await expect(
                domain.validateProjectMemberGuard('project-id', 'user-id')
            ).rejects.toBeInstanceOf(ProjectMemberForbiddenException);
        });

        it('returns a valid project member', async () => {
            const member = createMock<ProjectMember>({ id: 'member-id' });
            projectMemberRepository.findOneByProjectAndUser.mockResolvedValue(
                member
            );
            await expect(
                domain.validateProjectMemberGuard('project-id', 'user-id')
            ).resolves.toBe(member);
        });
    });

    describe('validateProjectRoleGuard', () => {
        it('rejects validation without a project', async () => {
            await expect(
                domain.validateProjectRoleGuard(null, null, [])
            ).rejects.toBeInstanceOf(ProjectNotFoundException);
        });

        it('rejects validation without a workspace member', async () => {
            await expect(
                domain.validateProjectRoleGuard('project-id', null, [])
            ).rejects.toBeInstanceOf(ProjectRoleForbiddenException);
        });

        it('lets a workspace owner bypass the project role check', async () => {
            const workspaceMember = createMock<WorkspaceMember>({
                userId: 'owner-id',
            });
            projectUtil.isWorkspaceOwner.mockReturnValue(true);
            await expect(
                domain.validateProjectRoleGuard(
                    'project-id',
                    workspaceMember,
                    []
                )
            ).resolves.toBe(true);
            expect(
                projectMemberRepository.findOneByProjectAndUser
            ).not.toHaveBeenCalled();
        });

        it('rejects a workspace member with no matching or allowed project role', async () => {
            const workspaceMember = createMock<WorkspaceMember>({
                userId: 'user-id',
            });
            projectUtil.isWorkspaceOwner.mockReturnValue(false);
            projectMemberRepository.findOneByProjectAndUser.mockResolvedValue(
                null
            );
            await expect(
                domain.validateProjectRoleGuard('project-id', workspaceMember, [
                    EnumProjectMemberRole.admin,
                ])
            ).rejects.toBeInstanceOf(ProjectRoleForbiddenException);
        });

        it('returns false for a non-owner project member with an allowed role', async () => {
            const workspaceMember = createMock<WorkspaceMember>({
                userId: 'user-id',
            });
            projectUtil.isWorkspaceOwner.mockReturnValue(false);
            projectMemberRepository.findOneByProjectAndUser.mockResolvedValue(
                createMock<ProjectMember>({
                    role: EnumProjectMemberRole.member,
                })
            );
            await expect(
                domain.validateProjectRoleGuard('project-id', workspaceMember, [
                    EnumProjectMemberRole.member,
                ])
            ).resolves.toBe(false);
        });
    });

    describe('assignMember', () => {
        it('assigns a member and stages activity when the actor is a workspace owner', async () => {
            setWorkspaceOwner(true);
            const targetMember = createMock<WorkspaceMember>({
                userId: 'target-id',
                workspaceId: 'workspace-id',
            });
            projectMemberRepository.findOneByProjectAndUser.mockResolvedValue(
                null
            );
            const created = createMock<IProjectMember>({
                id: 'new-member-id',
                user: {
                    id: 'target-id',
                    name: 'Target User',
                    username: 'target-user',
                    photo: null,
                    createdAt: new Date(),
                    createdBy: null,
                    updatedAt: new Date(),
                    updatedBy: null,
                    deletedAt: null,
                    deletedBy: null,
                },
            });
            projectMemberRepository.createInTx.mockResolvedValue(created);

            await expect(
                domain.assignMember(
                    project,
                    'actor-id',
                    targetMember,
                    EnumProjectMemberRole.admin
                )
            ).resolves.toBe(created);
            expect(projectMemberRepository.createInTx).toHaveBeenCalledWith(
                expect.anything(),
                project.id,
                'target-id',
                EnumProjectMemberRole.admin,
                'actor-id'
            );
            expect(activityLogDomain.stage).toHaveBeenCalledWith({
                action: EnumActivityLogAction.projectMemberAssigned,
                userId: 'actor-id',
                workspaceId: 'workspace-id',
            });
        });

        it('rejects a non-owner assigning an admin peer', async () => {
            setWorkspaceOwner(false);
            const targetMember = createMock<WorkspaceMember>({
                userId: 'target-id',
                workspaceId: 'workspace-id',
            });

            await expect(
                domain.assignMember(
                    project,
                    'actor-id',
                    targetMember,
                    EnumProjectMemberRole.admin
                )
            ).rejects.toBeInstanceOf(ProjectMemberPeerForbiddenException);
            expect(
                projectMemberRepository.findOneByProjectAndUser
            ).not.toHaveBeenCalled();
        });

        it('rejects assigning a member outside the project workspace', async () => {
            setWorkspaceOwner(true);

            await expect(
                domain.assignMember(
                    project,
                    'actor-id',
                    null,
                    EnumProjectMemberRole.member
                )
            ).rejects.toBeInstanceOf(WorkspaceMemberNotFoundException);
        });

        it('rejects assigning a member already assigned to the project', async () => {
            setWorkspaceOwner(true);
            const targetMember = createMock<WorkspaceMember>({
                userId: 'target-id',
                workspaceId: 'workspace-id',
            });
            projectMemberRepository.findOneByProjectAndUser.mockResolvedValue(
                createMock<ProjectMember>({ id: 'existing-id' })
            );

            await expect(
                domain.assignMember(
                    project,
                    'actor-id',
                    targetMember,
                    EnumProjectMemberRole.member
                )
            ).rejects.toBeInstanceOf(ProjectMemberAlreadyAssignedException);
        });
    });

    describe('updateMemberRole', () => {
        it('updates the role and stages activity', async () => {
            setWorkspaceOwner(true);
            const targetMember = createMock<ProjectMember>({
                id: 'target-member-id',
                role: EnumProjectMemberRole.member,
            });
            projectMemberRepository.findByIdAndProject.mockResolvedValue(
                targetMember
            );

            await domain.updateMemberRole(
                project,
                'actor-id',
                'target-member-id',
                EnumProjectMemberRole.admin
            );

            expect(projectMemberRepository.updateRoleInTx).toHaveBeenCalledWith(
                expect.anything(),
                'target-member-id',
                EnumProjectMemberRole.admin,
                'actor-id'
            );
            expect(activityLogDomain.stage).toHaveBeenCalledWith({
                action: EnumActivityLogAction.projectMemberRoleUpdated,
                userId: 'actor-id',
                workspaceId: 'workspace-id',
            });
        });

        it('rejects when the target member is not found', async () => {
            projectMemberRepository.findByIdAndProject.mockResolvedValue(null);

            await expect(
                domain.updateMemberRole(
                    project,
                    'actor-id',
                    'missing-id',
                    EnumProjectMemberRole.member
                )
            ).rejects.toBeInstanceOf(ProjectMemberNotFoundException);
        });

        it('rejects a non-owner changing an existing admin peer role', async () => {
            setWorkspaceOwner(false);
            const targetMember = createMock<ProjectMember>({
                id: 'target-member-id',
                role: EnumProjectMemberRole.admin,
            });
            projectMemberRepository.findByIdAndProject.mockResolvedValue(
                targetMember
            );

            await expect(
                domain.updateMemberRole(
                    project,
                    'actor-id',
                    'target-member-id',
                    EnumProjectMemberRole.member
                )
            ).rejects.toBeInstanceOf(ProjectMemberPeerForbiddenException);
        });

        it('rejects a non-owner promoting a peer to admin', async () => {
            setWorkspaceOwner(false);
            const targetMember = createMock<ProjectMember>({
                id: 'target-member-id',
                role: EnumProjectMemberRole.member,
            });
            projectMemberRepository.findByIdAndProject.mockResolvedValue(
                targetMember
            );

            await expect(
                domain.updateMemberRole(
                    project,
                    'actor-id',
                    'target-member-id',
                    EnumProjectMemberRole.admin
                )
            ).rejects.toBeInstanceOf(ProjectMemberPeerForbiddenException);
        });
    });

    describe('removeMember', () => {
        it('removes the member and stages activity', async () => {
            setWorkspaceOwner(true);
            const targetMember = createMock<ProjectMember>({
                id: 'target-member-id',
                userId: 'target-user-id',
                role: EnumProjectMemberRole.admin,
            });
            projectMemberRepository.findByIdAndProject.mockResolvedValue(
                targetMember
            );

            await domain.removeMember(project, 'actor-id', 'target-member-id');

            expect(
                projectMemberRepository.removeMemberInTx
            ).toHaveBeenCalledWith(expect.anything(), 'target-member-id');
            expect(activityLogDomain.stage).toHaveBeenCalledWith({
                action: EnumActivityLogAction.projectMemberRemoved,
                userId: 'actor-id',
                workspaceId: 'workspace-id',
            });
        });

        it('rejects when the target member is not found', async () => {
            projectMemberRepository.findByIdAndProject.mockResolvedValue(null);

            await expect(
                domain.removeMember(project, 'actor-id', 'missing-id')
            ).rejects.toBeInstanceOf(ProjectMemberNotFoundException);
        });

        it('rejects removing oneself, directing to leaveProject instead', async () => {
            const targetMember = createMock<ProjectMember>({
                id: 'target-member-id',
                userId: 'actor-id',
                role: EnumProjectMemberRole.member,
            });
            projectMemberRepository.findByIdAndProject.mockResolvedValue(
                targetMember
            );

            await expect(
                domain.removeMember(project, 'actor-id', 'target-member-id')
            ).rejects.toBeInstanceOf(ProjectMemberPeerForbiddenException);
            expect(requestStoreService.get).not.toHaveBeenCalled();
        });

        it('rejects a non-owner removing an admin peer', async () => {
            setWorkspaceOwner(false);
            const targetMember = createMock<ProjectMember>({
                id: 'target-member-id',
                userId: 'target-user-id',
                role: EnumProjectMemberRole.admin,
            });
            projectMemberRepository.findByIdAndProject.mockResolvedValue(
                targetMember
            );

            await expect(
                domain.removeMember(project, 'actor-id', 'target-member-id')
            ).rejects.toBeInstanceOf(ProjectMemberPeerForbiddenException);
        });
    });

    describe('leaveProject', () => {
        it('removes the member and stages the leave activity', async () => {
            const member = createMock<ProjectMember>({
                id: 'member-id',
                userId: 'user-id',
            });

            await domain.leaveProject(project, member);

            expect(
                projectMemberRepository.removeMemberInTx
            ).toHaveBeenCalledWith(expect.anything(), 'member-id');
            expect(activityLogDomain.stage).toHaveBeenCalledWith({
                action: EnumActivityLogAction.projectMemberLeft,
                userId: 'user-id',
                workspaceId: 'workspace-id',
            });
        });
    });
});
