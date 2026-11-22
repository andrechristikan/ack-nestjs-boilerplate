import {
    ProjectContextStoreKey,
    ProjectRoleMetaKey,
} from '@modules/project/constants/project.constant';
import { WorkspaceContextStoreKey } from '@modules/workspace/constants/workspace.constant';
import { HttpStatus } from '@nestjs/common';
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
import type {
    Project,
    ProjectMember,
    WorkspaceMember,
} from '@generated/prisma-client/client';
import { EnumProjectStatusCodeError } from '@modules/project/enums/project.status-code.enum';
import { EnumWorkspaceStatusCodeError } from '@modules/workspace/enums/workspace.status-code.enum';
import { ProjectMemberService } from '@modules/project/services/project.member.service';
import { ProjectRoleGuard } from '@modules/project/guards/project.role.guard';

describe('ProjectRoleGuard', () => {
    const reflector: MockProxy<Reflector> = mock<Reflector>();
    const projectMemberService: MockProxy<ProjectMemberService> =
        mock<ProjectMemberService>();
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
                    provide: ProjectMemberService,
                    useValue: projectMemberService,
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
        const stubProject: Project = {
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
        const stubWorkspaceMember: WorkspaceMember = {
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

        it('validates with the declared roles, the stored project, and workspace member, and merges the returned member into the project context', async () => {
            const project = stubProject;
            const workspaceMember = stubWorkspaceMember;
            reflector.get.mockReturnValue([EnumProjectMemberRole.admin]);
            const store: Record<string, unknown> = {
                [ProjectContextStoreKey]: { project: project },
                [WorkspaceContextStoreKey]: {
                    workspaceMember: workspaceMember,
                },
            };
            requestStoreService.get.mockImplementation(
                key => store[key] ?? null
            );
            const projectMember: ProjectMember = {
                id: '507f1f77bcf86cd799439015',
                projectId: project.id,
                userId: workspaceMember.userId,
                role: EnumProjectMemberRole.admin,
                joinedAt: new Date('2026-01-01T00:00:00.000Z'),
                createdAt: new Date('2026-01-01T00:00:00.000Z'),
                createdBy: null,
                updatedAt: new Date('2026-01-01T00:00:00.000Z'),
                updatedBy: null,
            };
            projectMemberService.validateProjectRoleGuard.mockResolvedValue(
                projectMember
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
                projectMemberService.validateProjectRoleGuard
            ).toHaveBeenCalledWith(project.id, workspaceMember, [
                EnumProjectMemberRole.admin,
            ]);
            expect(requestStoreService.merge).toHaveBeenCalledWith(
                ProjectContextStoreKey,
                { projectMember }
            );
        });

        it('merges a null project member when the workspace bypass returns no member', async () => {
            reflector.get.mockReturnValue([EnumProjectMemberRole.admin]);
            const store: Record<string, unknown> = {
                [ProjectContextStoreKey]: { project: stubProject },
                [WorkspaceContextStoreKey]: {
                    workspaceMember: stubWorkspaceMember,
                },
            };
            requestStoreService.get.mockImplementation(
                key => store[key] ?? null
            );
            projectMemberService.validateProjectRoleGuard.mockResolvedValue(
                null
            );
            const executionContext: MockProxy<ExecutionContext> =
                mock<ExecutionContext>();
            executionContext.getHandler.mockReturnValue(vi.fn());

            await guard.canActivate(executionContext);

            expect(requestStoreService.merge).toHaveBeenCalledWith(
                ProjectContextStoreKey,
                { projectMember: null }
            );
        });

        it('validates with an empty role list when the handler declares none', async () => {
            reflector.get.mockReturnValue(undefined);
            const store: Record<string, unknown> = {
                [ProjectContextStoreKey]: { project: stubProject },
                [WorkspaceContextStoreKey]: {
                    workspaceMember: stubWorkspaceMember,
                },
            };
            requestStoreService.get.mockImplementation(
                key => store[key] ?? null
            );
            projectMemberService.validateProjectRoleGuard.mockResolvedValue(
                null
            );
            const executionContext: MockProxy<ExecutionContext> =
                mock<ExecutionContext>();
            executionContext.getHandler.mockReturnValue(vi.fn());

            await guard.canActivate(executionContext);

            expect(
                projectMemberService.validateProjectRoleGuard
            ).toHaveBeenCalledWith(stubProject.id, stubWorkspaceMember, []);
        });

        it.each([null, {}])(
            'throws ProjectGuardMissingException before the domain call when the store holds no project',
            async projectContext => {
                reflector.get.mockReturnValue([EnumProjectMemberRole.admin]);
                requestStoreService.get.mockImplementation(key =>
                    key === ProjectContextStoreKey ? projectContext : null
                );
                const executionContext: MockProxy<ExecutionContext> =
                    mock<ExecutionContext>();
                executionContext.getHandler.mockReturnValue(vi.fn());

                await expect(
                    guard.canActivate(executionContext)
                ).rejects.toMatchObject({
                    module: 'project',
                    statusCode: EnumProjectStatusCodeError.guardMissing,
                    statusCodeKey:
                        EnumProjectStatusCodeError[
                            EnumProjectStatusCodeError.guardMissing
                        ],
                    messagePath: 'project.error.guardMissing',
                    httpStatus: HttpStatus.FORBIDDEN,
                });
                expect(
                    projectMemberService.validateProjectRoleGuard
                ).not.toHaveBeenCalled();
            }
        );

        it('throws WorkspaceMemberGuardMissingException before the domain call when the store holds no workspace member', async () => {
            reflector.get.mockReturnValue([EnumProjectMemberRole.admin]);
            const store: Record<string, unknown> = {
                [ProjectContextStoreKey]: { project: stubProject },
            };
            requestStoreService.get.mockImplementation(
                key => store[key] ?? null
            );
            const executionContext: MockProxy<ExecutionContext> =
                mock<ExecutionContext>();
            executionContext.getHandler.mockReturnValue(vi.fn());

            await expect(
                guard.canActivate(executionContext)
            ).rejects.toMatchObject({
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.memberGuardMissing,
                statusCodeKey:
                    EnumWorkspaceStatusCodeError[
                        EnumWorkspaceStatusCodeError.memberGuardMissing
                    ],
                messagePath: 'workspace.error.memberGuardMissing',
                httpStatus: HttpStatus.FORBIDDEN,
            });
            expect(
                projectMemberService.validateProjectRoleGuard
            ).not.toHaveBeenCalled();
        });
    });
});
