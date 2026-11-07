import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import type { Workspace } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import type { IActivityLogStaged } from '@modules/activity-log/interfaces/activity-log.interface';
import { WorkspaceNotFoundException } from '@modules/workspace/exceptions/workspace.not-found.exception';
import type { WorkspaceUpdateSlugRequestDto } from '@modules/workspace/dtos/request/workspace.update-slug.request.dto';
import { WorkspaceService } from '@modules/workspace/services/workspace.service';
import { WorkspaceUpdateSlugUseCase } from '@modules/workspace/use-cases/workspace.update-slug.use-case';

describe('WorkspaceUpdateSlugUseCase', () => {
    const workspaceService: MockProxy<WorkspaceService> =
        mock<WorkspaceService>();
    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();
    const workspace: Workspace = {
        id: 'workspace-1',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: 'user-1',
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: 'user-1',
        deletedAt: null,
        deletedBy: null,
        name: 'Acme',
        slug: 'acme-team',
        description: null,
        isPublic: false,
    };
    const stagedActivityLog: IActivityLogStaged = {
        action: EnumActivityLogAction.workspaceCreated,
        metadata: {},
        userId: null,
        createdBy: null,
        workspaceId: null,
    };
    let useCase: WorkspaceUpdateSlugUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();
        activityLogService.prepare.mockReturnValue(stagedActivityLog);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkspaceUpdateSlugUseCase,
                { provide: WorkspaceService, useValue: workspaceService },
                { provide: ActivityLogService, useValue: activityLogService },
            ],
        }).compile();

        useCase = module.get(WorkspaceUpdateSlugUseCase);
    });

    describe('execute', () => {
        it('prepares the updated activity, writes the slug, stages it, and wraps the workspace', async () => {
            const body: WorkspaceUpdateSlugRequestDto = { slug: 'new-slug' };
            workspaceService.updateWorkspaceSlug.mockResolvedValue(workspace);

            const result = await useCase.execute('workspace-1', 'user-1', body);

            expect(result).toEqual({ data: workspace });
            expect(workspaceService.updateWorkspaceSlug).toHaveBeenCalledWith(
                'workspace-1',
                'new-slug'
            );
            expect(activityLogService.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.workspaceUpdated,
                userId: 'user-1',
                createdBy: 'user-1',
                workspaceId: 'workspace-1',
            });
            expect(activityLogService.stagePrepared).toHaveBeenCalledWith([
                stagedActivityLog,
            ]);
        });

        it('stages nothing when the slug write rejects', async () => {
            workspaceService.updateWorkspaceSlug.mockRejectedValue(
                new WorkspaceNotFoundException()
            );

            await expect(
                useCase.execute('workspace-1', 'user-1', {
                    slug: 'new-slug',
                })
            ).rejects.toBeInstanceOf(WorkspaceNotFoundException);
            expect(activityLogService.stagePrepared).not.toHaveBeenCalled();
        });
    });
});
