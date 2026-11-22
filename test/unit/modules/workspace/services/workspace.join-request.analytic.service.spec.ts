import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { IAnalyticStatusCount } from '@modules/analytic/interfaces/analytic.interface';
import { WorkspaceJoinRequestAnalyticService } from '@modules/workspace/services/workspace.join-request.analytic.service';
import { WorkspaceJoinRequestAnalyticRepository } from '@modules/workspace/repositories/workspace.join-request.analytic.repository';

describe('WorkspaceJoinRequestAnalyticService', () => {
    const workspaceJoinRequestAnalyticRepository: MockProxy<WorkspaceJoinRequestAnalyticRepository> =
        mock<WorkspaceJoinRequestAnalyticRepository>();
    let service: WorkspaceJoinRequestAnalyticService;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkspaceJoinRequestAnalyticService,
                {
                    provide: WorkspaceJoinRequestAnalyticRepository,
                    useValue: workspaceJoinRequestAnalyticRepository,
                },
            ],
        }).compile();

        service = module.get(WorkspaceJoinRequestAnalyticService);
    });

    describe('getOutcomes', () => {
        it('delegates to the repository status grouping', async () => {
            const startDate = new Date('2026-01-01T00:00:00.000Z');
            const endDate = new Date('2026-02-01T00:00:00.000Z');
            const rows: IAnalyticStatusCount[] = [
                { status: 'approved', count: 1 },
            ];
            workspaceJoinRequestAnalyticRepository.groupByStatus.mockResolvedValue(
                rows
            );

            const result = await service.getOutcomes(
                startDate,
                endDate,
                'workspace-1'
            );

            expect(result).toBe(rows);
            expect(
                workspaceJoinRequestAnalyticRepository.groupByStatus
            ).toHaveBeenCalledWith(startDate, endDate, 'workspace-1');
        });

        it('accepts a null workspace id', async () => {
            const startDate = new Date('2026-01-01T00:00:00.000Z');
            const endDate = new Date('2026-02-01T00:00:00.000Z');
            workspaceJoinRequestAnalyticRepository.groupByStatus.mockResolvedValue(
                []
            );

            await service.getOutcomes(startDate, endDate, null);

            expect(
                workspaceJoinRequestAnalyticRepository.groupByStatus
            ).toHaveBeenCalledWith(startDate, endDate, null);
        });
    });
});
