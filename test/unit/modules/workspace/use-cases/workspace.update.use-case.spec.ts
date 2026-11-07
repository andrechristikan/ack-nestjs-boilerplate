import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import type { Workspace } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import type { IActivityLogStaged } from '@modules/activity-log/interfaces/activity-log.interface';
import { WorkspaceNotFoundException } from '@modules/workspace/exceptions/workspace.not-found.exception';
import type { WorkspaceUpdateRequestDto } from '@modules/workspace/dtos/request/workspace.update.request.dto';
import { WorkspaceService } from '@modules/workspace/services/workspace.service';
import { WorkspaceUpdateUseCase } from '@modules/workspace/use-cases/workspace.update.use-case';

describe('WorkspaceUpdateUseCase', () => {
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
    let useCase: WorkspaceUpdateUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();
        activityLogService.prepare.mockReturnValue(stagedActivityLog);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkspaceUpdateUseCase,
                { provide: WorkspaceService, useValue: workspaceService },
                { provide: ActivityLogService, useValue: activityLogService },
            ],
        }).compile();

        useCase = module.get(WorkspaceUpdateUseCase);
    });

    describe('execute', () => {
        it('prepares the updated activity before the write, stages it after, and wraps the workspace', async () => {
            const body: WorkspaceUpdateRequestDto = {
                name: 'Acme 2',
                description: 'Our team workspace',
            };
            const callOrder: string[] = [];
            activityLogService.prepare.mockImplementation(() => {
                callOrder.push('prepare');

                return stagedActivityLog;
            });
            workspaceService.updateWorkspace.mockImplementation(async () => {
                callOrder.push('update');

                return workspace;
            });
            activityLogService.stagePrepared.mockImplementation(() => {
                callOrder.push('stage');
            });

            const result = await useCase.execute('workspace-1', 'user-1', body);

            expect(result).toEqual({ data: workspace });
            expect(workspaceService.updateWorkspace).toHaveBeenCalledWith(
                'workspace-1',
                { name: 'Acme 2', description: 'Our team workspace' }
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
            expect(callOrder).toEqual(['prepare', 'update', 'stage']);
        });

        it('passes a null description through to clear it', async () => {
            const body: WorkspaceUpdateRequestDto = {
                name: 'Acme 2',
                description: null,
            };
            workspaceService.updateWorkspace.mockResolvedValue(workspace);

            await useCase.execute('workspace-1', 'user-1', body);

            expect(workspaceService.updateWorkspace).toHaveBeenCalledWith(
                'workspace-1',
                { name: 'Acme 2', description: null }
            );
        });

        it('stages nothing when the write rejects', async () => {
            workspaceService.updateWorkspace.mockRejectedValue(
                new WorkspaceNotFoundException()
            );

            await expect(
                useCase.execute('workspace-1', 'user-1', {
                    name: 'Acme 2',
                    description: null,
                })
            ).rejects.toBeInstanceOf(WorkspaceNotFoundException);
            expect(activityLogService.stagePrepared).not.toHaveBeenCalled();
        });
    });
});
