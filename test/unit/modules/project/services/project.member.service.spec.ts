import { HttpStatus } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import type { IPaginationQueryCursorParams } from '@common/pagination/interfaces/pagination.interface';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseUtil } from '@common/database/utils/database.util';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import {
    EnumProjectMemberRole,
    EnumWorkspaceMemberRole,
    Prisma,
} from '@generated/prisma-client/client';
import type {
    Project,
    ProjectMember,
    WorkspaceMember,
} from '@generated/prisma-client/client';
import { ProjectMemberService } from '@modules/project/services/project.member.service';
import { EnumProjectStatusCodeError } from '@modules/project/enums/project.status-code.enum';
import type {
    IProjectMember,
    IProjectMemberActor,
} from '@modules/project/interfaces/project.interface';
import { ProjectMemberRepository } from '@modules/project/repositories/project.member.repository';
import { ProjectUtil } from '@modules/project/utils/project.util';
import { EnumWorkspaceStatusCodeError } from '@modules/workspace/enums/workspace.status-code.enum';

describe('ProjectMemberService', () => {
    const projectMemberRepository: MockProxy<ProjectMemberRepository> =
        mock<ProjectMemberRepository>();
    const projectUtil: MockProxy<ProjectUtil> = mock<ProjectUtil>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();
    let service: ProjectMemberService;

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

    const bypassActor: IProjectMemberActor = {
        userId: '507f1f77bcf86cd799439033',
        hasWorkspaceBypass: true,
    };
    const plainActor: IProjectMemberActor = {
        userId: '507f1f77bcf86cd799439033',
        hasWorkspaceBypass: false,
    };

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ProjectMemberService,
                {
                    provide: ProjectMemberRepository,
                    useValue: projectMemberRepository,
                },
                { provide: ProjectUtil, useValue: projectUtil },
                { provide: DatabaseUtil, useValue: databaseUtil },
            ],
        }).compile();
        service = module.get(ProjectMemberService);
    });

    describe('validateProjectMemberGuard', () => {
        it('throws ProjectMemberForbiddenException when the caller has no member row', async () => {
            projectMemberRepository.findOneByProjectAndUser.mockResolvedValue(
                null
            );

            await expect(
                service.validateProjectMemberGuard(
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

            const result = await service.validateProjectMemberGuard(
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
        it('resolves with no value and no repository lookup when the caller is the workspace owner', async () => {
            projectUtil.hasWorkspaceBypass.mockReturnValue(true);
            const workspaceMember = baseWorkspaceMember;

            const result = await service.validateProjectRoleGuard(
                '507f1f77bcf86cd799439011',
                workspaceMember,
                []
            );

            expect(result).toBeUndefined();
            expect(
                projectMemberRepository.findOneByProjectAndUser
            ).not.toHaveBeenCalled();
        });

        it('throws ProjectMemberForbiddenException when the caller holds no project member row', async () => {
            projectUtil.hasWorkspaceBypass.mockReturnValue(false);
            projectMemberRepository.findOneByProjectAndUser.mockResolvedValue(
                null
            );
            const workspaceMember = baseWorkspaceMember;

            const rejection = service.validateProjectRoleGuard(
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
            projectUtil.hasWorkspaceBypass.mockReturnValue(false);
            projectMemberRepository.findOneByProjectAndUser.mockResolvedValue({
                ...baseProjectMember,
                role: EnumProjectMemberRole.viewer,
            });
            const workspaceMember = baseWorkspaceMember;

            const rejection = service.validateProjectRoleGuard(
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

        it('resolves with no value when the member role is allowed', async () => {
            projectUtil.hasWorkspaceBypass.mockReturnValue(false);
            projectMemberRepository.findOneByProjectAndUser.mockResolvedValue({
                ...baseProjectMember,
                role: EnumProjectMemberRole.admin,
            });
            const workspaceMember = baseWorkspaceMember;

            const result = await service.validateProjectRoleGuard(
                '507f1f77bcf86cd799439011',
                workspaceMember,
                [EnumProjectMemberRole.admin]
            );

            expect(result).toBeUndefined();
        });
    });

    describe('getMembersList', () => {
        it('delegates to the repository for the given project', async () => {
            const project = baseProject;
            const pagination: IPaginationQueryCursorParams<Prisma.ProjectMemberWhereInput> =
                {
                    fingerprint: 'aaaaaaaaaaaaaaaa',
                    where: {},
                    orderBy: [],
                    limit: 20,
                };
            const page: IResponsePaginationReturn<IProjectMember> = {
                type: EnumPaginationType.cursor,
                perPage: 20,
                hasNext: false,
                data: [baseProjectMemberRow],
            };
            projectMemberRepository.findWithPaginationCursor.mockResolvedValue(
                page
            );

            const result = await service.getMembersList(project, pagination);

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

            const result = await service.createInTx(
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

    describe('removeByWorkspaceAndUserInTx', () => {
        it('removes the user project memberships of the workspace on the given transaction and returns the count', async () => {
            const tx: MockProxy<IDatabaseTransactionClient> =
                mock<IDatabaseTransactionClient>();
            projectMemberRepository.removeByWorkspaceAndUserInTx.mockResolvedValue(
                3
            );

            const result = await service.removeByWorkspaceAndUserInTx(
                tx,
                '507f1f77bcf86cd799439012',
                '507f1f77bcf86cd799439022'
            );

            expect(result).toBe(3);
            expect(
                projectMemberRepository.removeByWorkspaceAndUserInTx
            ).toHaveBeenCalledWith(
                tx,
                '507f1f77bcf86cd799439012',
                '507f1f77bcf86cd799439022'
            );
        });
    });

    describe('removeByUserInTx', () => {
        it('removes every project membership of the user on the given transaction and returns the count', async () => {
            const tx: MockProxy<IDatabaseTransactionClient> =
                mock<IDatabaseTransactionClient>();
            projectMemberRepository.removeByUserInTx.mockResolvedValue(4);

            const result = await service.removeByUserInTx(
                tx,
                '507f1f77bcf86cd799439022'
            );

            expect(result).toBe(4);
            expect(
                projectMemberRepository.removeByUserInTx
            ).toHaveBeenCalledWith(tx, '507f1f77bcf86cd799439022');
        });
    });

    describe('assignMember', () => {
        it('throws ProjectMemberPeerForbiddenException when an actor without workspace bypass assigns the admin role', async () => {
            const project = baseProject;
            const targetMember = {
                ...baseWorkspaceMember,
                workspaceId: project.workspaceId,
            };

            await expect(
                service.assignMember(
                    project,
                    plainActor,
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
            expect(projectMemberRepository.create).not.toHaveBeenCalled();
        });

        it('throws WorkspaceMemberNotFoundException when targetMember is null', async () => {
            const project = baseProject;

            await expect(
                service.assignMember(
                    project,
                    bypassActor,
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
            const project = baseProject;
            const targetMember = {
                ...baseWorkspaceMember,
                workspaceId: '507f1f77bcf86cd799439099',
            };

            const rejection = service.assignMember(
                project,
                bypassActor,
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

        it('throws ProjectMemberAlreadyAssignedException when the create collides on the member unique index, with no read before the write', async () => {
            const project = baseProject;
            const targetMember = {
                ...baseWorkspaceMember,
                workspaceId: project.workspaceId,
            };
            const collision = new Error('member collision');
            projectMemberRepository.create.mockRejectedValue(collision);
            databaseUtil.isUniqueCollision.mockReturnValue(true);

            await expect(
                service.assignMember(
                    project,
                    bypassActor,
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
            expect(databaseUtil.isUniqueCollision).toHaveBeenCalledWith(
                collision,
                'userId'
            );
            expect(
                projectMemberRepository.findOneByProjectAndUser
            ).not.toHaveBeenCalled();
        });

        it('wraps a non-collision create error in AppUnknownException', async () => {
            const project = baseProject;
            const targetMember = {
                ...baseWorkspaceMember,
                workspaceId: project.workspaceId,
            };
            const otherError = new Error('unexpected');
            projectMemberRepository.create.mockRejectedValue(otherError);
            databaseUtil.isUniqueCollision.mockReturnValue(false);

            await expect(
                service.assignMember(
                    project,
                    bypassActor,
                    targetMember,
                    EnumProjectMemberRole.member
                )
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: otherError,
            });
        });

        it('assigns the target member and returns the created row', async () => {
            const project = baseProject;
            const targetMember = {
                ...baseWorkspaceMember,
                workspaceId: project.workspaceId,
                userId: '507f1f77bcf86cd799439044',
            };
            const created = {
                ...baseProjectMemberRow,
                userId: targetMember.userId,
            };
            projectMemberRepository.create.mockResolvedValue(created);

            const result = await service.assignMember(
                project,
                bypassActor,
                targetMember,
                EnumProjectMemberRole.member
            );

            expect(result).toBe(created);
            expect(projectMemberRepository.create).toHaveBeenCalledWith(
                project.id,
                targetMember.userId,
                EnumProjectMemberRole.member,
                bypassActor.userId
            );
        });
    });

    describe('updateMemberRole', () => {
        it('throws ProjectMemberNotFoundException when the target member does not exist', async () => {
            projectMemberRepository.findByIdAndProject.mockResolvedValue(null);
            const project = baseProject;

            const rejection = service.updateMemberRole(
                project,
                bypassActor,
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

        it('throws ProjectMemberPeerForbiddenException when an actor without workspace bypass touches an admin role', async () => {
            const project = baseProject;
            const targetMember = {
                ...baseProjectMember,
                role: EnumProjectMemberRole.admin,
            };
            projectMemberRepository.findByIdAndProject.mockResolvedValue(
                targetMember
            );

            const rejection = service.updateMemberRole(
                project,
                plainActor,
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
            expect(projectMemberRepository.updateRole).not.toHaveBeenCalled();
        });

        it('throws ProjectMemberPeerForbiddenException when the guarded write misses', async () => {
            const project = baseProject;
            const targetMember = {
                ...baseProjectMember,
                userId: '507f1f77bcf86cd799439044',
                role: EnumProjectMemberRole.member,
            };
            projectMemberRepository.findByIdAndProject.mockResolvedValue(
                targetMember
            );
            projectMemberRepository.updateRole.mockResolvedValue(false);

            const rejection = service.updateMemberRole(
                project,
                plainActor,
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

        it('updates the role guarded on the role it read and returns the member it changed', async () => {
            const project = baseProject;
            const targetMember = {
                ...baseProjectMember,
                userId: '507f1f77bcf86cd799439044',
                role: EnumProjectMemberRole.member,
            };
            projectMemberRepository.findByIdAndProject.mockResolvedValue(
                targetMember
            );
            projectMemberRepository.updateRole.mockResolvedValue(true);

            const result = await service.updateMemberRole(
                project,
                bypassActor,
                targetMember.id,
                EnumProjectMemberRole.admin
            );

            expect(result).toBe(targetMember);
            expect(projectMemberRepository.updateRole).toHaveBeenCalledWith(
                targetMember.id,
                EnumProjectMemberRole.member,
                EnumProjectMemberRole.admin
            );
        });
    });

    describe('removeMember', () => {
        it('throws ProjectMemberNotFoundException when the target member does not exist', async () => {
            projectMemberRepository.findByIdAndProject.mockResolvedValue(null);
            const project = baseProject;

            const rejection = service.removeMember(
                project,
                bypassActor,
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
            const targetMember = {
                ...baseProjectMember,
                userId: bypassActor.userId,
            };
            projectMemberRepository.findByIdAndProject.mockResolvedValue(
                targetMember
            );

            const rejection = service.removeMember(
                project,
                bypassActor,
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

        it('throws ProjectMemberPeerForbiddenException when an actor without workspace bypass removes an admin', async () => {
            const project = baseProject;
            const targetMember = {
                ...baseProjectMember,
                role: EnumProjectMemberRole.admin,
            };
            projectMemberRepository.findByIdAndProject.mockResolvedValue(
                targetMember
            );

            const rejection = service.removeMember(
                project,
                plainActor,
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
            expect(projectMemberRepository.removeMember).not.toHaveBeenCalled();
        });

        it('throws ProjectMemberPeerForbiddenException when the guarded write misses', async () => {
            const project = baseProject;
            const targetMember = {
                ...baseProjectMember,
                userId: '507f1f77bcf86cd799439044',
                role: EnumProjectMemberRole.member,
            };
            projectMemberRepository.findByIdAndProject.mockResolvedValue(
                targetMember
            );
            projectMemberRepository.removeMember.mockResolvedValue(false);

            const rejection = service.removeMember(
                project,
                plainActor,
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

        it('removes the member guarded on the role it read and returns the member it removed', async () => {
            const project = baseProject;
            const targetMember = {
                ...baseProjectMember,
                userId: '507f1f77bcf86cd799439044',
                role: EnumProjectMemberRole.member,
            };
            projectMemberRepository.findByIdAndProject.mockResolvedValue(
                targetMember
            );
            projectMemberRepository.removeMember.mockResolvedValue(true);

            const result = await service.removeMember(
                project,
                bypassActor,
                targetMember.id
            );

            expect(result).toBe(targetMember);
            expect(projectMemberRepository.removeMember).toHaveBeenCalledWith(
                targetMember.id,
                EnumProjectMemberRole.member
            );
        });
    });

    describe('leaveProject', () => {
        it('throws ProjectMemberNotFoundException when the row is gone', async () => {
            projectMemberRepository.removeById.mockResolvedValue(false);

            const rejection = service.leaveProject(baseProjectMember);

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

        it('removes the member by id whatever its role', async () => {
            const member = baseProjectMember;
            projectMemberRepository.removeById.mockResolvedValue(true);

            await service.leaveProject(member);

            expect(projectMemberRepository.removeById).toHaveBeenCalledWith(
                member.id
            );
            expect(projectMemberRepository.removeMember).not.toHaveBeenCalled();
        });
    });

    describe('assertPeerAllowed', () => {
        it('does not throw when the actor has workspace bypass', () => {
            expect(() =>
                service.assertPeerAllowed(
                    bypassActor,
                    EnumProjectMemberRole.admin
                )
            ).not.toThrow();
        });

        it('does not throw when no role involved is admin', () => {
            expect(() =>
                service.assertPeerAllowed(
                    plainActor,
                    EnumProjectMemberRole.member,
                    EnumProjectMemberRole.viewer
                )
            ).not.toThrow();
        });

        it('throws ProjectMemberPeerForbiddenException when an actor without workspace bypass touches an admin role', () => {
            let captured: unknown;
            try {
                service.assertPeerAllowed(
                    plainActor,
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
