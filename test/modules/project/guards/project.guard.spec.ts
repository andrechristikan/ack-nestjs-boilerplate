import { createMock } from '@golevelup/ts-vitest';
import type { ExecutionContext } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RequestStoreService } from '@common/request/services/request.store.service';
import { ProjectStoreKey } from '@modules/project/constants/project.constant';
import { ProjectDomain } from '@modules/project/domains/project.domain';
import { ProjectGuard } from '@modules/project/guards/project.guard';
import { WorkspaceStoreKey } from '@modules/workspace/constants/workspace.constant';

describe('ProjectGuard', () => {
    const projectDomain = createMock<ProjectDomain>();
    const requestStoreService = createMock<RequestStoreService>();

    beforeEach(() => vi.resetAllMocks());

    it('resolves the route project within the stored workspace', async () => {
        const project =
            createMock<
                Awaited<ReturnType<ProjectDomain['validateProjectGuard']>>
            >();
        requestStoreService.get.mockReturnValue({ id: 'workspace-id' });
        projectDomain.validateProjectGuard.mockResolvedValue(project);
        const context = createMock<ExecutionContext>({
            switchToHttp: () => ({
                getRequest: () => ({ params: { projectId: 'project-id' } }),
            }),
        });
        const guard = new ProjectGuard(projectDomain, requestStoreService);

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
        const context = createMock<ExecutionContext>({
            switchToHttp: () => ({
                getRequest: () => ({ params: { projectId: 'project-id' } }),
            }),
        });
        const guard = new ProjectGuard(projectDomain, requestStoreService);

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
                createMock<
                    Awaited<ReturnType<ProjectDomain['validateProjectGuard']>>
                >()
            );
            const context = createMock<ExecutionContext>({
                switchToHttp: () => ({
                    getRequest: () => ({ params }),
                }),
            });
            const guard = new ProjectGuard(projectDomain, requestStoreService);

            await expect(guard.canActivate(context)).resolves.toBe(true);

            expect(projectDomain.validateProjectGuard).toHaveBeenCalledWith(
                ...expected
            );
        }
    );
});
