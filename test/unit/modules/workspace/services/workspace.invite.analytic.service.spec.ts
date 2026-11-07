import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { IAnalyticStatusCount } from '@modules/analytic/interfaces/analytic.interface';
import { WorkspaceInviteAnalyticService } from '@modules/workspace/services/workspace.invite.analytic.service';
import { WorkspaceInviteAnalyticRepository } from '@modules/workspace/repositories/workspace.invite.analytic.repository';

describe('WorkspaceInviteAnalyticService', () => {
    const workspaceInviteAnalyticRepository: MockProxy<WorkspaceInviteAnalyticRepository> =
        mock<WorkspaceInviteAnalyticRepository>();
    let service: WorkspaceInviteAnalyticService;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkspaceInviteAnalyticService,
                {
                    provide: WorkspaceInviteAnalyticRepository,
                    useValue: workspaceInviteAnalyticRepository,
                },
            ],
        }).compile();

        service = module.get(WorkspaceInviteAnalyticService);
    });

    describe('getFunnel', () => {
        it('delegates to the repository status grouping', async () => {
            const startDate = new Date('2026-01-01T00:00:00.000Z');
            const endDate = new Date('2026-02-01T00:00:00.000Z');
            const rows: IAnalyticStatusCount[] = [
                { status: 'pending', count: 2 },
            ];
            workspaceInviteAnalyticRepository.groupByStatus.mockResolvedValue(
                rows
            );

            const result = await service.getFunnel(
                startDate,
                endDate,
                'workspace-1'
            );

            expect(result).toBe(rows);
            expect(
                workspaceInviteAnalyticRepository.groupByStatus
            ).toHaveBeenCalledWith(startDate, endDate, 'workspace-1');
        });

        it('accepts a null workspace id', async () => {
            const startDate = new Date('2026-01-01T00:00:00.000Z');
            const endDate = new Date('2026-02-01T00:00:00.000Z');
            workspaceInviteAnalyticRepository.groupByStatus.mockResolvedValue(
                []
            );

            await service.getFunnel(startDate, endDate, null);

            expect(
                workspaceInviteAnalyticRepository.groupByStatus
            ).toHaveBeenCalledWith(startDate, endDate, null);
        });
    });
});
