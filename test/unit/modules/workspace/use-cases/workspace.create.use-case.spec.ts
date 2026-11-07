import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import type { Workspace } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import type { IActivityLogStaged } from '@modules/activity-log/interfaces/activity-log.interface';
import { WorkspaceCapReachedException } from '@modules/workspace/exceptions/workspace.cap-reached.exception';
import type { WorkspaceCreateRequestDto } from '@modules/workspace/dtos/request/workspace.create.request.dto';
import { WorkspaceService } from '@modules/workspace/services/workspace.service';
import { WorkspaceCreateUseCase } from '@modules/workspace/use-cases/workspace.create.use-case';

describe('WorkspaceCreateUseCase', () => {
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
    let useCase: WorkspaceCreateUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();
        activityLogService.prepare.mockReturnValue(stagedActivityLog);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkspaceCreateUseCase,
                { provide: WorkspaceService, useValue: workspaceService },
                { provide: ActivityLogService, useValue: activityLogService },
            ],
        }).compile();

        useCase = module.get(WorkspaceCreateUseCase);
    });

    describe('execute', () => {
        it('creates the workspace, stages the created activity after it, and wraps it in the response envelope', async () => {
            const body: WorkspaceCreateRequestDto = {
                name: 'Acme',
                description: 'Our team workspace',
                isPublic: true,
            };
            const callOrder: string[] = [];
            workspaceService.createWorkspace.mockImplementation(async () => {
                callOrder.push('create');

                return workspace;
            });
            activityLogService.prepare.mockImplementation(() => {
                callOrder.push('prepare');

                return stagedActivityLog;
            });
            activityLogService.stagePrepared.mockImplementation(() => {
                callOrder.push('stage');
            });

            const result = await useCase.execute('user-1', body);

            expect(result).toEqual({ data: workspace });
            expect(workspaceService.createWorkspace).toHaveBeenCalledWith(
                'user-1',
                {
                    name: 'Acme',
                    description: 'Our team workspace',
                    isPublic: true,
                }
            );
            expect(activityLogService.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.workspaceCreated,
                userId: 'user-1',
                createdBy: 'user-1',
                workspaceId: 'workspace-1',
            });
            expect(activityLogService.stagePrepared).toHaveBeenCalledWith([
                stagedActivityLog,
            ]);
            expect(callOrder).toEqual(['create', 'prepare', 'stage']);
        });

        it('passes null for an omitted description and visibility', async () => {
            const body: WorkspaceCreateRequestDto = { name: 'Acme' };
            workspaceService.createWorkspace.mockResolvedValue(workspace);

            await useCase.execute('user-1', body);

            expect(workspaceService.createWorkspace).toHaveBeenCalledWith(
                'user-1',
                { name: 'Acme', description: null, isPublic: null }
            );
        });

        it('stages nothing when the domain rejects', async () => {
            workspaceService.createWorkspace.mockRejectedValue(
                new WorkspaceCapReachedException()
            );

            await expect(
                useCase.execute('user-1', { name: 'Acme' })
            ).rejects.toBeInstanceOf(WorkspaceCapReachedException);
            expect(activityLogService.stagePrepared).not.toHaveBeenCalled();
        });
    });
});
