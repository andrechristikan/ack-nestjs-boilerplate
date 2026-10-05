import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { IAnalyticStatusCount } from '@modules/analytic/interfaces/analytic.interface';
import { WorkspaceInviteAnalyticDomain } from '@modules/workspace/domains/workspace.invite.analytic.domain';
import { WorkspaceInviteAnalyticRepository } from '@modules/workspace/repositories/workspace.invite.analytic.repository';

describe('WorkspaceInviteAnalyticDomain', () => {
    const workspaceInviteAnalyticRepository: MockProxy<WorkspaceInviteAnalyticRepository> =
        mock<WorkspaceInviteAnalyticRepository>();
    let domain: WorkspaceInviteAnalyticDomain;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkspaceInviteAnalyticDomain,
                {
                    provide: WorkspaceInviteAnalyticRepository,
                    useValue: workspaceInviteAnalyticRepository,
                },
            ],
        }).compile();

        domain = module.get(WorkspaceInviteAnalyticDomain);
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

            const result = await domain.getFunnel(
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

            await domain.getFunnel(startDate, endDate, null);

            expect(
                workspaceInviteAnalyticRepository.groupByStatus
            ).toHaveBeenCalledWith(startDate, endDate, null);
        });
    });
});
