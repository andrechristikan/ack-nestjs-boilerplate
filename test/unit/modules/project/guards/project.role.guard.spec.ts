import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { RequestStoreService } from '@common/request/services/request.store.service';
import {
    EnumProjectMemberRole,
    EnumWorkspaceMemberRole,
} from '@generated/prisma-client/client';
import type { Project, WorkspaceMember } from '@generated/prisma-client/client';
import {
    ProjectRoleMetaKey,
    ProjectStoreKey,
    ProjectWorkspaceOwnerStoreKey,
} from '@modules/project/constants/project.constant';
import { ProjectMemberDomain } from '@modules/project/domains/project.member.domain';
import { ProjectRoleGuard } from '@modules/project/guards/project.role.guard';
import { WorkspaceMemberStoreKey } from '@modules/workspace/constants/workspace.constant';

describe('ProjectRoleGuard', () => {
    const reflector: MockProxy<Reflector> = mock<Reflector>();
    const projectMemberDomain: MockProxy<ProjectMemberDomain> =
        mock<ProjectMemberDomain>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();
    let guard: ProjectRoleGuard;

    beforeEach(async () => {
        vi.resetAllMocks();
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ProjectRoleGuard,
                { provide: Reflector, useValue: reflector },
                {
                    provide: ProjectMemberDomain,
                    useValue: projectMemberDomain,
                },
                {
                    provide: RequestStoreService,
                    useValue: requestStoreService,
                },
            ],
        }).compile();
        guard = module.get(ProjectRoleGuard);
    });

    describe('canActivate', () => {
        it('validates with the declared roles, the stored project, and workspace member, then stores the bypass flag', async () => {
            const project: Project = {
                id: '507f1f77bcf86cd799439011',
                workspaceId: '507f1f77bcf86cd799439013',
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
            const workspaceMember: WorkspaceMember = {
                id: '507f1f77bcf86cd799439012',
                workspaceId: '507f1f77bcf86cd799439013',
                userId: '507f1f77bcf86cd799439014',
                role: EnumWorkspaceMemberRole.member,
                joinedAt: new Date('2026-01-01T00:00:00.000Z'),
                createdAt: new Date('2026-01-01T00:00:00.000Z'),
                createdBy: null,
                updatedAt: new Date('2026-01-01T00:00:00.000Z'),
                updatedBy: null,
            };
            reflector.get.mockReturnValue([EnumProjectMemberRole.admin]);
            requestStoreService.get.mockImplementation(key => {
                if (key === ProjectStoreKey) {
                    return project;
                } else if (key === WorkspaceMemberStoreKey) {
                    return workspaceMember;
                }

                return null;
            });
            projectMemberDomain.validateProjectRoleGuard.mockResolvedValue(
                true
            );
            const executionContext: MockProxy<ExecutionContext> =
                mock<ExecutionContext>();
            executionContext.getHandler.mockReturnValue(vi.fn());

            await expect(guard.canActivate(executionContext)).resolves.toBe(
                true
            );
            expect(reflector.get).toHaveBeenCalledWith(
                ProjectRoleMetaKey,
                executionContext.getHandler()
            );
            expect(
                projectMemberDomain.validateProjectRoleGuard
            ).toHaveBeenCalledWith(
                '507f1f77bcf86cd799439011',
                workspaceMember,
                [EnumProjectMemberRole.admin]
            );
            expect(requestStoreService.set).toHaveBeenCalledWith(
                ProjectWorkspaceOwnerStoreKey,
                true
            );
        });

        it('validates with an empty role list when the handler declares none', async () => {
            reflector.get.mockReturnValue(undefined);
            requestStoreService.get.mockReturnValue(null);
            projectMemberDomain.validateProjectRoleGuard.mockResolvedValue(
                false
            );
            const executionContext: MockProxy<ExecutionContext> =
                mock<ExecutionContext>();
            executionContext.getHandler.mockReturnValue(vi.fn());

            await guard.canActivate(executionContext);

            expect(
                projectMemberDomain.validateProjectRoleGuard
            ).toHaveBeenCalledWith(null, null, []);
            expect(requestStoreService.set).toHaveBeenCalledWith(
                ProjectWorkspaceOwnerStoreKey,
                false
            );
        });
    });
});
