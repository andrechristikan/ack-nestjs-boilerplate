import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { IAnalyticCountBucket } from '@modules/analytic/interfaces/analytic.interface';
import { WorkspaceAnalyticService } from '@modules/workspace/services/workspace.analytic.service';
import { WorkspaceAnalyticRepository } from '@modules/workspace/repositories/workspace.analytic.repository';

describe('WorkspaceAnalyticService', () => {
    const workspaceAnalyticRepository: MockProxy<WorkspaceAnalyticRepository> =
        mock<WorkspaceAnalyticRepository>();
    let service: WorkspaceAnalyticService;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkspaceAnalyticService,
                {
                    provide: WorkspaceAnalyticRepository,
                    useValue: workspaceAnalyticRepository,
                },
            ],
        }).compile();

        service = module.get(WorkspaceAnalyticService);
    });

    describe('getCountCreated', () => {
        it('delegates to the repository count of created workspaces', async () => {
            const startDate = new Date('2026-01-01T00:00:00.000Z');
            const endDate = new Date('2026-02-01T00:00:00.000Z');
            workspaceAnalyticRepository.countCreated.mockResolvedValue(4);

            const result = await service.getCountCreated(startDate, endDate);

            expect(result).toBe(4);
            expect(
                workspaceAnalyticRepository.countCreated
            ).toHaveBeenCalledWith(startDate, endDate);
        });
    });

    describe('getGroupByVisibility', () => {
        it('delegates to the repository visibility grouping', async () => {
            const rows: IAnalyticCountBucket[] = [{ key: 'private', count: 3 }];
            workspaceAnalyticRepository.groupByVisibility.mockResolvedValue(
                rows
            );

            const result = await service.getGroupByVisibility();

            expect(result).toBe(rows);
        });
    });

    describe('getCountActive', () => {
        it('delegates to the repository active count', async () => {
            workspaceAnalyticRepository.countActive.mockResolvedValue(7);

            const result = await service.getCountActive();

            expect(result).toBe(7);
        });
    });
});
