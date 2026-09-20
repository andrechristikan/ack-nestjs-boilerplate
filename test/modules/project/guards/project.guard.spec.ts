import type { ExecutionContext } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';

import { RequestStoreService } from '@common/request/services/request.store.service';
import { ProjectStoreKey } from '@modules/project/constants/project.constant';
import { ProjectDomain } from '@modules/project/domains/project.domain';
import { ProjectGuard } from '@modules/project/guards/project.guard';
import { WorkspaceStoreKey } from '@modules/workspace/constants/workspace.constant';

type THttpArgumentsHost = ReturnType<ExecutionContext['switchToHttp']>;
type TValidatedProject = Awaited<
    ReturnType<ProjectDomain['validateProjectGuard']>
>;

describe('ProjectGuard', () => {
    const projectDomain: MockProxy<ProjectDomain> = mock<ProjectDomain>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();
    const context: MockProxy<ExecutionContext> = mock<ExecutionContext>();
    const httpArgumentsHost: MockProxy<THttpArgumentsHost> =
        mock<THttpArgumentsHost>();

    let guard: ProjectGuard;

    beforeEach(async () => {
        vi.resetAllMocks();
        context.switchToHttp.mockReturnValue(httpArgumentsHost);
        httpArgumentsHost.getRequest.mockReturnValue({
            params: { projectId: 'project-id' },
        });

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

    it('resolves the route project within the stored workspace', async () => {
        const project = mock<TValidatedProject>();
        requestStoreService.get.mockReturnValue({ id: 'workspace-id' });
        projectDomain.validateProjectGuard.mockResolvedValue(project);

        await expect(guard.canActivate(context)).resolves.toBe(true);
        expect(requestStoreService.get).toHaveBeenCalledWith(WorkspaceStoreKey);
        expect(projectDomain.validateProjectGuard).toHaveBeenCalledWith(
            'workspace-id',
            'project-id'
        );
        expect(requestStoreService.set).toHaveBeenCalledWith(
            ProjectStoreKey,
            project
        );
    });

    it('propagates the domain rejection unchanged and publishes nothing', async () => {
        const error = new Error('project not found');
        requestStoreService.get.mockReturnValue({ id: 'workspace-id' });
        projectDomain.validateProjectGuard.mockRejectedValue(error);

        await expect(guard.canActivate(context)).rejects.toBe(error);
        expect(requestStoreService.set).not.toHaveBeenCalled();
    });

    it.each([
        {
            name: 'the workspace is not stored',
            workspace: undefined,
            params: { projectId: 'project-id' } as Record<string, string>,
            expected: [null, 'project-id'],
        },
        {
            name: 'the projectId param is missing',
            workspace: { id: 'workspace-id' },
            params: {} as Record<string, string>,
            expected: ['workspace-id', null],
        },
        {
            name: 'both are missing',
            workspace: undefined,
            params: {} as Record<string, string>,
            expected: [null, null],
        },
    ])(
        'passes null for the missing identifier when $name',
        async ({ workspace, params, expected }) => {
            requestStoreService.get.mockReturnValue(workspace);
            projectDomain.validateProjectGuard.mockResolvedValue(
                mock<TValidatedProject>()
            );
            httpArgumentsHost.getRequest.mockReturnValue({ params });

            await expect(guard.canActivate(context)).resolves.toBe(true);

            expect(projectDomain.validateProjectGuard).toHaveBeenCalledWith(
                ...expected
            );
        }
    );
});
