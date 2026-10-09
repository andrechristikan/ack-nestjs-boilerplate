import { HttpStatus } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import type { IPaginationQueryCursorParams } from '@common/pagination/interfaces/pagination.interface';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { RequestStoreService } from '@common/request/services/request.store.service';
import {
    EnumActivityLogAction,
    EnumProjectMemberRole,
    EnumWorkspaceMemberRole,
    Prisma,
} from '@generated/prisma-client/client';
import type {
    Project,
    ProjectMember,
    WorkspaceMember,
} from '@generated/prisma-client/client';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import type {
    IActivityLogStaged,
    IActivityLogStageInput,
} from '@modules/activity-log/interfaces/activity-log.interface';
import {
    ProjectStoreKey,
    ProjectWorkspaceOwnerStoreKey,
} from '@modules/project/constants/project.constant';
import { ProjectMemberDomain } from '@modules/project/domains/project.member.domain';
import { EnumProjectStatusCodeError } from '@modules/project/enums/project.status-code.enum';
import type { IProjectMember } from '@modules/project/interfaces/project.interface';
import { ProjectMemberRepository } from '@modules/project/repositories/project.member.repository';
import { ProjectUtil } from '@modules/project/utils/project.util';
import { UserStoreKey } from '@modules/user/constants/user.constant';
import { WorkspaceMemberStoreKey } from '@modules/workspace/constants/workspace.constant';
import { expectRequestGuardMissingWithKey } from '@test/unit/helpers/test.unit.request.helper';
import { EnumWorkspaceStatusCodeError } from '@modules/workspace/enums/workspace.status-code.enum';

describe('ProjectMemberDomain', () => {
    const projectMemberRepository: MockProxy<ProjectMemberRepository> =
        mock<ProjectMemberRepository>();
    const projectUtil: MockProxy<ProjectUtil> = mock<ProjectUtil>();
    const activityLogDomain: MockProxy<ActivityLogDomain> =
        mock<ActivityLogDomain>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();
    let domain: ProjectMemberDomain;

    const baseProject: Project = {
        id: '507f1f77bcf86cd799439011',
        workspaceId: '507f1f77bcf86cd799439012',
        name: 'Website Revamp',
        slug: 'p-abc123',
        description: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
        deletedAt: null,
        deletedBy: null,
    };

    const baseProjectMember: ProjectMember = {
        id: '507f1f77bcf86cd799439021',
        projectId: '507f1f77bcf86cd799439011',
        userId: '507f1f77bcf86cd799439022',
        role: EnumProjectMemberRole.member,
        joinedAt: new Date('2026-01-01T00:00:00.000Z'),
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
    };

    const baseProjectMemberRow: IProjectMember = {
        ...baseProjectMember,
        user: {
            id: '507f1f77bcf86cd799439022',
            name: 'Jane Smith',
            username: 'meadowlark',
            photo: null,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            createdBy: null,
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedBy: null,
            deletedAt: null,
            deletedBy: null,
        },
    };

    const baseWorkspaceMember: WorkspaceMember = {
        id: '507f1f77bcf86cd799439031',
        workspaceId: '507f1f77bcf86cd799439012',
        userId: '507f1f77bcf86cd799439032',
        role: EnumWorkspaceMemberRole.member,
        joinedAt: new Date('2026-01-01T00:00:00.000Z'),
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
    };

    beforeEach(async () => {
        vi.resetAllMocks();
        activityLogDomain.prepare.mockImplementation(
            <A extends EnumActivityLogAction>(
                input: IActivityLogStageInput<A>
            ): IActivityLogStaged => ({
                onError: false,
                userId: null,
                createdBy: null,
                workspaceId: null,
                ...input,
                metadata: input.metadata ?? {},
            })
        );

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ProjectMemberDomain,
                {
                    provide: ProjectMemberRepository,
                    useValue: projectMemberRepository,
                },
                { provide: ProjectUtil, useValue: projectUtil },
                { provide: ActivityLogDomain, useValue: activityLogDomain },
                {
                    provide: RequestStoreService,
                    useValue: requestStoreService,
                },
            ],
        }).compile();
        domain = module.get(ProjectMemberDomain);
    });

    describe('validateProjectMemberGuard', () => {
        it('throws RequestGuardMissingException when userId is null', async () => {
            let thrown: unknown;
            try {
                await domain.validateProjectMemberGuard(
                    '507f1f77bcf86cd799439011',
                    null
                );
            } catch (error) {
                thrown = error;
            }

            expectRequestGuardMissingWithKey(thrown, UserStoreKey);
        });

        it('throws RequestGuardMissingException when projectId is null', async () => {
            let thrown: unknown;
            try {
                await domain.validateProjectMemberGuard(
                    null,
                    '507f1f77bcf86cd799439022'
                );
            } catch (error) {
                thrown = error;
            }

            expectRequestGuardMissingWithKey(thrown, ProjectStoreKey);
        });

        it('throws ProjectMemberForbiddenException when the caller has no member row', async () => {
            projectMemberRepository.findOneByProjectAndUser.mockResolvedValue(
                null
            );

            await expect(
                domain.validateProjectMemberGuard(
                    '507f1f77bcf86cd799439011',
                    '507f1f77bcf86cd799439022'
                )
            ).rejects.toMatchObject({
                module: 'project',
                statusCode: EnumProjectStatusCodeError.memberForbidden,
                statusCodeKey:
                    EnumProjectStatusCodeError[
                        EnumProjectStatusCodeError.memberForbidden
                    ],
                messagePath: 'project.error.memberForbidden',
            });
        });

        it('returns the resolved project member row', async () => {
            const member = baseProjectMember;
            projectMemberRepository.findOneByProjectAndUser.mockResolvedValue(
                member
            );

            const result = await domain.validateProjectMemberGuard(
                '507f1f77bcf86cd799439011',
                '507f1f77bcf86cd799439022'
            );

            expect(result).toBe(member);
            expect(
                projectMemberRepository.findOneByProjectAndUser
            ).toHaveBeenCalledWith(
                '507f1f77bcf86cd799439011',
                '507f1f77bcf86cd799439022'
            );
        });
    });

    describe('validateProjectRoleGuard', () => {
        it('throws RequestGuardMissingException when projectId is null', async () => {
            let thrown: unknown;
            try {
                await domain.validateProjectRoleGuard(
                    null,
                    baseWorkspaceMember,
                    [EnumProjectMemberRole.admin]
                );
            } catch (error) {
                thrown = error;
            }

            expectRequestGuardMissingWithKey(thrown, ProjectStoreKey);
        });

        it('throws RequestGuardMissingException when workspaceMember is null', async () => {
            let thrown: unknown;
            try {
                await domain.validateProjectRoleGuard(
                    '507f1f77bcf86cd799439011',
                    null,
                    [EnumProjectMemberRole.admin]
                );
            } catch (error) {
                thrown = error;
            }

            expectRequestGuardMissingWithKey(thrown, WorkspaceMemberStoreKey);
        });

        it('returns true with no repository lookup when the caller is the workspace owner', async () => {
            projectUtil.isWorkspaceOwner.mockReturnValue(true);
            const workspaceMember = baseWorkspaceMember;

            const result = await domain.validateProjectRoleGuard(
                '507f1f77bcf86cd799439011',
                workspaceMember,
                []
            );

            expect(result).toBe(true);
            expect(
                projectMemberRepository.findOneByProjectAndUser
            ).not.toHaveBeenCalled();
        });

        it('throws ProjectMemberForbiddenException when the caller holds no project member row', async () => {
            projectUtil.isWorkspaceOwner.mockReturnValue(false);
            projectMemberRepository.findOneByProjectAndUser.mockResolvedValue(
                null
            );
            const workspaceMember = baseWorkspaceMember;

            const rejection = domain.validateProjectRoleGuard(
                '507f1f77bcf86cd799439011',
                workspaceMember,
                [EnumProjectMemberRole.admin]
            );

            await expect(rejection).rejects.toMatchObject({
                module: 'project',
                statusCode: EnumProjectStatusCodeError.memberForbidden,
                statusCodeKey:
                    EnumProjectStatusCodeError[
                        EnumProjectStatusCodeError.memberForbidden
                    ],
                httpStatus: HttpStatus.FORBIDDEN,
                messagePath: 'project.error.memberForbidden',
            });
        });

        it('throws ProjectRoleForbiddenException when the member role is not allowed', async () => {
            projectUtil.isWorkspaceOwner.mockReturnValue(false);
            projectMemberRepository.findOneByProjectAndUser.mockResolvedValue({
                ...baseProjectMember,
                role: EnumProjectMemberRole.viewer,
            });
            const workspaceMember = baseWorkspaceMember;

            const rejection = domain.validateProjectRoleGuard(
                '507f1f77bcf86cd799439011',
                workspaceMember,
                [EnumProjectMemberRole.admin]
            );

            await expect(rejection).rejects.toMatchObject({
                module: 'project',
                statusCode: EnumProjectStatusCodeError.roleForbidden,
                statusCodeKey:
                    EnumProjectStatusCodeError[
                        EnumProjectStatusCodeError.roleForbidden
                    ],
                messagePath: 'project.error.roleForbidden',
            });
        });

        it('returns false when the member role is allowed', async () => {
            projectUtil.isWorkspaceOwner.mockReturnValue(false);
            projectMemberRepository.findOneByProjectAndUser.mockResolvedValue({
                ...baseProjectMember,
                role: EnumProjectMemberRole.admin,
            });
            const workspaceMember = baseWorkspaceMember;

            const result = await domain.validateProjectRoleGuard(
                '507f1f77bcf86cd799439011',
                workspaceMember,
                [EnumProjectMemberRole.admin]
            );

            expect(result).toBe(false);
        });
    });

    describe('getMembersList', () => {
        it('delegates to the repository for the given project', async () => {
            const project = baseProject;
            const pagination: IPaginationQueryCursorParams<Prisma.ProjectMemberWhereInput> =
                { where: {}, orderBy: [], limit: 20 };
            const page: IResponsePaginationReturn<IProjectMember> = {
                type: EnumPaginationType.cursor,
                perPage: 20,
                hasNext: false,
                data: [baseProjectMemberRow],
            };
            projectMemberRepository.findWithPaginationCursor.mockResolvedValue(
                page
            );

            const result = await domain.getMembersList(project, pagination);

            expect(result).toBe(page);
            expect(
                projectMemberRepository.findWithPaginationCursor
            ).toHaveBeenCalledWith(project.id, pagination);
        });
    });

    describe('createInTx', () => {
        it('delegates to the repository with the given transaction', async () => {
            const tx: MockProxy<IDatabaseTransactionClient> =
                mock<IDatabaseTransactionClient>();
            const created = baseProjectMemberRow;
            projectMemberRepository.createInTx.mockResolvedValue(created);

            const result = await domain.createInTx(
                tx,
                '507f1f77bcf86cd799439011',
                '507f1f77bcf86cd799439022',
                EnumProjectMemberRole.member,
                '507f1f77bcf86cd799439033'
            );

            expect(result).toBe(created);
            expect(projectMemberRepository.createInTx).toHaveBeenCalledWith(
                tx,
                '507f1f77bcf86cd799439011',
                '507f1f77bcf86cd799439022',
                EnumProjectMemberRole.member,
                '507f1f77bcf86cd799439033'
            );
        });
    });

    describe('assignMember', () => {
        it('throws ProjectMemberPeerForbiddenException when a non-owner assigns the admin role', async () => {
            requestStoreService.get.mockReturnValue(false);
            const project = baseProject;
            const targetMember = {
                ...baseWorkspaceMember,
                workspaceId: project.workspaceId,
            };

            await expect(
                domain.assignMember(
                    project,
                    '507f1f77bcf86cd799439033',
                    targetMember,
                    EnumProjectMemberRole.admin
                )
            ).rejects.toMatchObject({
                module: 'project',
                statusCode: EnumProjectStatusCodeError.memberPeerForbidden,
                statusCodeKey:
                    EnumProjectStatusCodeError[
                        EnumProjectStatusCodeError.memberPeerForbidden
                    ],
                messagePath: 'project.error.memberPeerForbidden',
            });
            expect(
                projectMemberRepository.findOneByProjectAndUser
            ).not.toHaveBeenCalled();
        });

        it('throws WorkspaceMemberNotFoundException when targetMember is null', async () => {
            requestStoreService.get.mockReturnValue(true);
            const project = baseProject;

            await expect(
                domain.assignMember(
                    project,
                    '507f1f77bcf86cd799439033',
                    null,
                    EnumProjectMemberRole.member
                )
            ).rejects.toMatchObject({
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.memberNotFound,
                statusCodeKey:
                    EnumWorkspaceStatusCodeError[
                        EnumWorkspaceStatusCodeError.memberNotFound
                    ],
                messagePath: 'workspace.error.memberNotFound',
            });
        });

        it('throws WorkspaceMemberNotFoundException when targetMember belongs to another workspace', async () => {
            requestStoreService.get.mockReturnValue(true);
            const project = baseProject;
            const targetMember = {
                ...baseWorkspaceMember,
                workspaceId: '507f1f77bcf86cd799439099',
            };

            const rejection = domain.assignMember(
                project,
                '507f1f77bcf86cd799439033',
                targetMember,
                EnumProjectMemberRole.member
            );

            await expect(rejection).rejects.toMatchObject({
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.memberNotFound,
                statusCodeKey:
                    EnumWorkspaceStatusCodeError[
                        EnumWorkspaceStatusCodeError.memberNotFound
                    ],
                messagePath: 'workspace.error.memberNotFound',
            });
        });

        it('throws ProjectMemberAlreadyAssignedException when the target already has a project member row', async () => {
            requestStoreService.get.mockReturnValue(true);
            const project = baseProject;
            const targetMember = {
                ...baseWorkspaceMember,
                workspaceId: project.workspaceId,
            };
            projectMemberRepository.findOneByProjectAndUser.mockResolvedValue({
                ...baseProjectMember,
                userId: targetMember.userId,
            });

            await expect(
                domain.assignMember(
                    project,
                    '507f1f77bcf86cd799439033',
                    targetMember,
                    EnumProjectMemberRole.member
                )
            ).rejects.toMatchObject({
                module: 'project',
                statusCode: EnumProjectStatusCodeError.memberAlreadyAssigned,
                statusCodeKey:
                    EnumProjectStatusCodeError[
                        EnumProjectStatusCodeError.memberAlreadyAssigned
                    ],
                messagePath: 'project.error.memberAlreadyAssigned',
            });
        });

        it('assigns the target member and stages both activity logs when the actor differs from the target', async () => {
            requestStoreService.get.mockReturnValue(true);
            const project = baseProject;
            const actorId = '507f1f77bcf86cd799439033';
            const targetMember = {
                ...baseWorkspaceMember,
                workspaceId: project.workspaceId,
                userId: '507f1f77bcf86cd799439044',
            };
            projectMemberRepository.findOneByProjectAndUser.mockResolvedValue(
                null
            );
            const created = {
                ...baseProjectMemberRow,
                userId: targetMember.userId,
            };
            projectMemberRepository.create.mockResolvedValue(created);

            const result = await domain.assignMember(
                project,
                actorId,
                targetMember,
                EnumProjectMemberRole.member
            );

            expect(result).toBe(created);
            expect(projectMemberRepository.create).toHaveBeenCalledWith(
                project.id,
                targetMember.userId,
                EnumProjectMemberRole.member,
                actorId
            );
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                {
                    action: EnumActivityLogAction.projectMemberAssigned,
                    userId: actorId,
                    createdBy: actorId,
                    workspaceId: project.workspaceId,
                    metadata: { targetUserId: targetMember.userId },
                    onError: false,
                },
                {
                    action: EnumActivityLogAction.projectMemberAssignedByAdmin,
                    userId: targetMember.userId,
                    createdBy: actorId,
                    workspaceId: project.workspaceId,
                    metadata: { actorUserId: actorId },
                    onError: false,
                },
            ]);
        });

        it('stages one activity log when the actor assigns themselves', async () => {
            requestStoreService.get.mockReturnValue(true);
            const project = baseProject;
            const actorId = '507f1f77bcf86cd799439033';
            const targetMember = {
                ...baseWorkspaceMember,
                workspaceId: project.workspaceId,
                userId: actorId,
            };
            projectMemberRepository.findOneByProjectAndUser.mockResolvedValue(
                null
            );
            projectMemberRepository.create.mockResolvedValue({
                ...baseProjectMemberRow,
                userId: actorId,
            });

            await domain.assignMember(
                project,
                actorId,
                targetMember,
                EnumProjectMemberRole.member
            );

            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                {
                    action: EnumActivityLogAction.projectMemberAssigned,
                    userId: actorId,
                    createdBy: actorId,
                    workspaceId: project.workspaceId,
                    metadata: { targetUserId: actorId },
                    onError: false,
                },
            ]);
        });
    });

    describe('updateMemberRole', () => {
        it('throws ProjectMemberNotFoundException when the target member does not exist', async () => {
            projectMemberRepository.findByIdAndProject.mockResolvedValue(null);
            const project = baseProject;

            const rejection = domain.updateMemberRole(
                project,
                '507f1f77bcf86cd799439033',
                '507f1f77bcf86cd799439021',
                EnumProjectMemberRole.admin
            );

            await expect(rejection).rejects.toMatchObject({
                module: 'project',
                statusCode: EnumProjectStatusCodeError.memberNotFound,
                statusCodeKey:
                    EnumProjectStatusCodeError[
                        EnumProjectStatusCodeError.memberNotFound
                    ],
                messagePath: 'project.error.memberNotFound',
            });
        });

        it('throws ProjectMemberPeerForbiddenException when a non-owner touches an admin role', async () => {
            const project = baseProject;
            const targetMember = {
                ...baseProjectMember,
                role: EnumProjectMemberRole.admin,
            };
            projectMemberRepository.findByIdAndProject.mockResolvedValue(
                targetMember
            );
            requestStoreService.get.mockReturnValue(false);

            const rejection = domain.updateMemberRole(
                project,
                '507f1f77bcf86cd799439033',
                targetMember.id,
                EnumProjectMemberRole.viewer
            );

            await expect(rejection).rejects.toMatchObject({
                module: 'project',
                statusCode: EnumProjectStatusCodeError.memberPeerForbidden,
                statusCodeKey:
                    EnumProjectStatusCodeError[
                        EnumProjectStatusCodeError.memberPeerForbidden
                    ],
                messagePath: 'project.error.memberPeerForbidden',
            });
        });

        it('updates the role and stages both activity logs when the actor differs from the target', async () => {
            const project = baseProject;
            const actorId = '507f1f77bcf86cd799439033';
            const targetMember = {
                ...baseProjectMember,
                userId: '507f1f77bcf86cd799439044',
                role: EnumProjectMemberRole.member,
            };
            projectMemberRepository.findByIdAndProject.mockResolvedValue(
                targetMember
            );
            requestStoreService.get.mockReturnValue(true);

            await domain.updateMemberRole(
                project,
                actorId,
                targetMember.id,
                EnumProjectMemberRole.admin
            );

            expect(projectMemberRepository.updateRole).toHaveBeenCalledWith(
                targetMember.id,
                EnumProjectMemberRole.admin
            );
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                {
                    action: EnumActivityLogAction.projectMemberRoleUpdated,
                    userId: actorId,
                    createdBy: actorId,
                    workspaceId: project.workspaceId,
                    metadata: { targetUserId: targetMember.userId },
                    onError: false,
                },
                {
                    action: EnumActivityLogAction.projectMemberRoleUpdatedByAdmin,
                    userId: targetMember.userId,
                    createdBy: actorId,
                    workspaceId: project.workspaceId,
                    metadata: { actorUserId: actorId },
                    onError: false,
                },
            ]);
        });

        it('stages one activity log when the actor updates their own role', async () => {
            const project = baseProject;
            const actorId = '507f1f77bcf86cd799439033';
            const targetMember = {
                ...baseProjectMember,
                userId: actorId,
                role: EnumProjectMemberRole.member,
            };
            projectMemberRepository.findByIdAndProject.mockResolvedValue(
                targetMember
            );
            requestStoreService.get.mockReturnValue(true);

            await domain.updateMemberRole(
                project,
                actorId,
                targetMember.id,
                EnumProjectMemberRole.admin
            );

            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                {
                    action: EnumActivityLogAction.projectMemberRoleUpdated,
                    userId: actorId,
                    createdBy: actorId,
                    workspaceId: project.workspaceId,
                    metadata: { targetUserId: actorId },
                    onError: false,
                },
            ]);
        });
    });

    describe('removeMember', () => {
        it('throws ProjectMemberNotFoundException when the target member does not exist', async () => {
            projectMemberRepository.findByIdAndProject.mockResolvedValue(null);
            const project = baseProject;

            const rejection = domain.removeMember(
                project,
                '507f1f77bcf86cd799439033',
                '507f1f77bcf86cd799439021'
            );

            await expect(rejection).rejects.toMatchObject({
                module: 'project',
                statusCode: EnumProjectStatusCodeError.memberNotFound,
                statusCodeKey:
                    EnumProjectStatusCodeError[
                        EnumProjectStatusCodeError.memberNotFound
                    ],
                messagePath: 'project.error.memberNotFound',
            });
        });

        it('throws ProjectMemberPeerForbiddenException when the actor targets themselves', async () => {
            const project = baseProject;
            const actorId = '507f1f77bcf86cd799439033';
            const targetMember = { ...baseProjectMember, userId: actorId };
            projectMemberRepository.findByIdAndProject.mockResolvedValue(
                targetMember
            );

            const rejection = domain.removeMember(
                project,
                actorId,
                targetMember.id
            );

            await expect(rejection).rejects.toMatchObject({
                module: 'project',
                statusCode: EnumProjectStatusCodeError.memberPeerForbidden,
                statusCodeKey:
                    EnumProjectStatusCodeError[
                        EnumProjectStatusCodeError.memberPeerForbidden
                    ],
                messagePath: 'project.error.memberPeerForbidden',
            });
        });

        it('throws ProjectMemberPeerForbiddenException when a non-owner removes an admin', async () => {
            const project = baseProject;
            const targetMember = {
                ...baseProjectMember,
                role: EnumProjectMemberRole.admin,
            };
            projectMemberRepository.findByIdAndProject.mockResolvedValue(
                targetMember
            );
            requestStoreService.get.mockReturnValue(false);

            const rejection = domain.removeMember(
                project,
                '507f1f77bcf86cd799439033',
                targetMember.id
            );

            await expect(rejection).rejects.toMatchObject({
                module: 'project',
                statusCode: EnumProjectStatusCodeError.memberPeerForbidden,
                statusCodeKey:
                    EnumProjectStatusCodeError[
                        EnumProjectStatusCodeError.memberPeerForbidden
                    ],
                messagePath: 'project.error.memberPeerForbidden',
            });
        });

        it('removes the member and stages both activity logs', async () => {
            const project = baseProject;
            const actorId = '507f1f77bcf86cd799439033';
            const targetMember = {
                ...baseProjectMember,
                userId: '507f1f77bcf86cd799439044',
                role: EnumProjectMemberRole.member,
            };
            projectMemberRepository.findByIdAndProject.mockResolvedValue(
                targetMember
            );
            requestStoreService.get.mockReturnValue(true);

            await domain.removeMember(project, actorId, targetMember.id);

            expect(projectMemberRepository.removeMember).toHaveBeenCalledWith(
                targetMember.id
            );
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                {
                    action: EnumActivityLogAction.projectMemberRemoved,
                    userId: actorId,
                    createdBy: actorId,
                    workspaceId: project.workspaceId,
                    metadata: { targetUserId: targetMember.userId },
                    onError: false,
                },
                {
                    action: EnumActivityLogAction.projectMemberRemovedByAdmin,
                    userId: targetMember.userId,
                    createdBy: actorId,
                    workspaceId: project.workspaceId,
                    metadata: { actorUserId: actorId },
                    onError: false,
                },
            ]);
        });
    });

    describe('leaveProject', () => {
        it('removes the member and stages the left activity log', async () => {
            const project = baseProject;
            const member = baseProjectMember;

            await domain.leaveProject(project, member);

            expect(projectMemberRepository.removeMember).toHaveBeenCalledWith(
                member.id
            );
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                {
                    action: EnumActivityLogAction.projectMemberLeft,
                    userId: member.userId,
                    createdBy: member.userId,
                    workspaceId: project.workspaceId,
                    metadata: {},
                    onError: false,
                },
            ]);
        });
    });

    describe('currentActorIsWorkspaceOwner', () => {
        it('returns true when the store holds true', () => {
            requestStoreService.get.mockReturnValue(true);

            const result = domain['currentActorIsWorkspaceOwner']();

            expect(result).toBe(true);
            expect(requestStoreService.get).toHaveBeenCalledWith(
                ProjectWorkspaceOwnerStoreKey
            );
        });

        it('returns false when the store holds false', () => {
            requestStoreService.get.mockReturnValue(false);

            expect(domain['currentActorIsWorkspaceOwner']()).toBe(false);
        });

        it('returns false when the store holds nothing', () => {
            requestStoreService.get.mockReturnValue(null);

            expect(domain['currentActorIsWorkspaceOwner']()).toBe(false);
        });
    });

    describe('assertProjectMemberPeerAllowed', () => {
        it('does not throw when the actor is the workspace owner', () => {
            expect(() =>
                domain['assertProjectMemberPeerAllowed'](
                    true,
                    EnumProjectMemberRole.admin
                )
            ).not.toThrow();
        });

        it('does not throw when no role involved is admin', () => {
            expect(() =>
                domain['assertProjectMemberPeerAllowed'](
                    false,
                    EnumProjectMemberRole.member,
                    EnumProjectMemberRole.viewer
                )
            ).not.toThrow();
        });

        it('throws ProjectMemberPeerForbiddenException when a non-owner touches an admin role', () => {
            let captured: unknown;
            try {
                domain['assertProjectMemberPeerAllowed'](
                    false,
                    EnumProjectMemberRole.member,
                    EnumProjectMemberRole.admin
                );
            } catch (error) {
                captured = error;
            }

            expect(captured).toMatchObject({
                module: 'project',
                statusCode: EnumProjectStatusCodeError.memberPeerForbidden,
                statusCodeKey:
                    EnumProjectStatusCodeError[
                        EnumProjectStatusCodeError.memberPeerForbidden
                    ],
                messagePath: 'project.error.memberPeerForbidden',
            });
        });
    });
});
