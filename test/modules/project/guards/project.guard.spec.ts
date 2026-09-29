import type { ExecutionContext } from '@nestjs/common';
import type { HttpArgumentsHost } from '@nestjs/common/interfaces/index';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { IRequestApp } from '@common/request/interfaces/request.interface';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { Project, Workspace } from '@generated/prisma-client/client';
import { ProjectStoreKey } from '@modules/project/constants/project.constant';
import { ProjectDomain } from '@modules/project/domains/project.domain';
import { ProjectGuard } from '@modules/project/guards/project.guard';
import { WorkspaceStoreKey } from '@modules/workspace/constants/workspace.constant';

describe('ProjectGuard', () => {
    const projectDomain = mock<ProjectDomain>();
    const requestStoreService = mock<RequestStoreService>();
    let guard: ProjectGuard;

    beforeEach(async () => {
        vi.resetAllMocks();
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ProjectGuard,
                { provide: ProjectDomain, useValue: projectDomain },
                {
                    provide: RequestStoreService,
                    useValue: requestStoreService,
                },
            ],
        }).compile();
        guard = module.get(ProjectGuard);
    });

    describe('canActivate', () => {
        function buildContext(request: IRequestApp): ExecutionContext {
            const executionContext = mock<ExecutionContext>();
            const httpArgumentsHost = mock<HttpArgumentsHost>();
            executionContext.switchToHttp.mockReturnValue(httpArgumentsHost);
            httpArgumentsHost.getRequest.mockReturnValue(request);

            return executionContext;
        }

        const project: Project = {
            id: '507f1f77bcf86cd799439011',
            workspaceId: '507f1f77bcf86cd799439013',
            name: 'Launch',
            slug: 'launch',
            description: null,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            createdBy: null,
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedBy: null,
            deletedAt: null,
            deletedBy: null,
        };
        const workspace: Workspace = {
            id: '507f1f77bcf86cd799439013',
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            createdBy: null,
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedBy: null,
            deletedAt: null,
            deletedBy: null,
            name: 'Acme',
            slug: 'acme-team',
            description: null,
            isPublic: false,
        };

        it('validates and stores the project resolved for the workspace and projectId param', async () => {
            const request = mock<IRequestApp>();
            request.params = { projectId: '507f1f77bcf86cd799439012' };
            requestStoreService.get.mockReturnValue(workspace);
            projectDomain.validateProjectGuard.mockResolvedValue(project);
            const executionContext = buildContext(request);

            await expect(guard.canActivate(executionContext)).resolves.toBe(
                true
            );
            expect(requestStoreService.get).toHaveBeenCalledWith(
                WorkspaceStoreKey
            );
            expect(projectDomain.validateProjectGuard).toHaveBeenCalledWith(
                '507f1f77bcf86cd799439013',
                '507f1f77bcf86cd799439012'
            );
            expect(requestStoreService.set).toHaveBeenCalledWith(
                ProjectStoreKey,
                project
            );
        });

        it('validates with a null workspaceId when no workspace is stored', async () => {
            const request = mock<IRequestApp>();
            request.params = { projectId: '507f1f77bcf86cd799439012' };
            requestStoreService.get.mockReturnValue(null);
            projectDomain.validateProjectGuard.mockResolvedValue(project);
            const executionContext = buildContext(request);

            await guard.canActivate(executionContext);

            expect(projectDomain.validateProjectGuard).toHaveBeenCalledWith(
                null,
                '507f1f77bcf86cd799439012'
            );
        });

        it('validates with a null projectId when the route carries none', async () => {
            const request = mock<IRequestApp>();
            request.params = {};
            requestStoreService.get.mockReturnValue(workspace);
            projectDomain.validateProjectGuard.mockResolvedValue(project);
            const executionContext = buildContext(request);

            await guard.canActivate(executionContext);

            expect(projectDomain.validateProjectGuard).toHaveBeenCalledWith(
                '507f1f77bcf86cd799439013',
                null
            );
        });
    });
});
