import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { IRequestApp } from '@common/request/interfaces/request.interface';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { Project, Workspace } from '@generated/prisma-client/client';
import { ProjectStoreKey } from '@modules/project/constants/project.constant';
import { ProjectDomain } from '@modules/project/domains/project.domain';
import { ProjectGuard } from '@modules/project/guards/project.guard';
import { WorkspaceStoreKey } from '@modules/workspace/constants/workspace.constant';
import { buildHttpExecutionContext } from '@test/unit/helpers/test.unit.execution-context.helper';

describe('ProjectGuard', () => {
    const projectDomain: MockProxy<ProjectDomain> = mock<ProjectDomain>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();
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
            const request: MockProxy<IRequestApp> = mock<IRequestApp>();
            request.params = { projectId: '507f1f77bcf86cd799439012' };
            requestStoreService.get.mockReturnValue(workspace);
            projectDomain.validateProjectGuard.mockResolvedValue(project);
            const executionContext = buildHttpExecutionContext(request);

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
            const request: MockProxy<IRequestApp> = mock<IRequestApp>();
            request.params = { projectId: '507f1f77bcf86cd799439012' };
            requestStoreService.get.mockReturnValue(null);
            projectDomain.validateProjectGuard.mockResolvedValue(project);
            const executionContext = buildHttpExecutionContext(request);

            await guard.canActivate(executionContext);

            expect(projectDomain.validateProjectGuard).toHaveBeenCalledWith(
                null,
                '507f1f77bcf86cd799439012'
            );
        });

        it('validates with a null projectId when the route carries none', async () => {
            const request: MockProxy<IRequestApp> = mock<IRequestApp>();
            request.params = {};
            requestStoreService.get.mockReturnValue(workspace);
            projectDomain.validateProjectGuard.mockResolvedValue(project);
            const executionContext = buildHttpExecutionContext(request);

            await guard.canActivate(executionContext);

            expect(projectDomain.validateProjectGuard).toHaveBeenCalledWith(
                '507f1f77bcf86cd799439013',
                null
            );
        });
    });
});
