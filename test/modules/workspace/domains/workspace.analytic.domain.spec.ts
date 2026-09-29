import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { IAnalyticCountBucket } from '@modules/analytic/interfaces/analytic.interface';
import { WorkspaceAnalyticDomain } from '@modules/workspace/domains/workspace.analytic.domain';
import { WorkspaceAnalyticRepository } from '@modules/workspace/repositories/workspace.analytic.repository';

describe('WorkspaceAnalyticDomain', () => {
    const workspaceAnalyticRepository: MockProxy<WorkspaceAnalyticRepository> =
        mock<WorkspaceAnalyticRepository>();
    let domain: WorkspaceAnalyticDomain;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkspaceAnalyticDomain,
                {
                    provide: WorkspaceAnalyticRepository,
                    useValue: workspaceAnalyticRepository,
                },
            ],
        }).compile();

        domain = module.get(WorkspaceAnalyticDomain);
    });

    describe('countCreated', () => {
        it('delegates to the repository count of created workspaces', async () => {
            const startDate = new Date('2026-01-01T00:00:00.000Z');
            const endDate = new Date('2026-02-01T00:00:00.000Z');
            workspaceAnalyticRepository.countCreated.mockResolvedValue(4);

            const result = await domain.countCreated(startDate, endDate);

            expect(result).toBe(4);
            expect(
                workspaceAnalyticRepository.countCreated
            ).toHaveBeenCalledWith(startDate, endDate);
        });
    });

    describe('groupByVisibility', () => {
        it('delegates to the repository visibility grouping', async () => {
            const rows: IAnalyticCountBucket[] = [{ key: 'private', count: 3 }];
            workspaceAnalyticRepository.groupByVisibility.mockResolvedValue(
                rows
            );

            const result = await domain.groupByVisibility();

            expect(result).toBe(rows);
        });
    });

    describe('countActive', () => {
        it('delegates to the repository active count', async () => {
            workspaceAnalyticRepository.countActive.mockResolvedValue(7);

            const result = await domain.countActive();

            expect(result).toBe(7);
        });
    });
});
