import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import type { Workspace } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import type { IActivityLogStaged } from '@modules/activity-log/interfaces/activity-log.interface';
import type { WorkspaceUpdateIsPublicRequestDto } from '@modules/workspace/dtos/request/workspace.update-is-public.request.dto';
import { WorkspaceService } from '@modules/workspace/services/workspace.service';
import { WorkspaceUpdateIsPublicUseCase } from '@modules/workspace/use-cases/workspace.update-is-public.use-case';

describe('WorkspaceUpdateIsPublicUseCase', () => {
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
    let useCase: WorkspaceUpdateIsPublicUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();
        activityLogService.prepare.mockReturnValue(stagedActivityLog);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkspaceUpdateIsPublicUseCase,
                { provide: WorkspaceService, useValue: workspaceService },
                { provide: ActivityLogService, useValue: activityLogService },
            ],
        }).compile();

        useCase = module.get(WorkspaceUpdateIsPublicUseCase);
    });

    describe('execute', () => {
        it('prepares the visibility activity, writes, stages it, and wraps the workspace', async () => {
            const body: WorkspaceUpdateIsPublicRequestDto = { isPublic: true };
            workspaceService.updateWorkspaceIsPublic.mockResolvedValue(
                workspace
            );

            const result = await useCase.execute('workspace-1', 'user-1', body);

            expect(result).toEqual({ data: workspace });
            expect(
                workspaceService.updateWorkspaceIsPublic
            ).toHaveBeenCalledWith('workspace-1', true);
            expect(activityLogService.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.workspaceVisibilityUpdated,
                userId: 'user-1',
                createdBy: 'user-1',
                workspaceId: 'workspace-1',
            });
            expect(activityLogService.stagePrepared).toHaveBeenCalledWith([
                stagedActivityLog,
            ]);
        });
    });
});
