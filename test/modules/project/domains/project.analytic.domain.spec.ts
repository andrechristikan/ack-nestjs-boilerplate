import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import { ProjectAnalyticDomain } from '@modules/project/domains/project.analytic.domain';
import { ProjectAnalyticRepository } from '@modules/project/repositories/project.analytic.repository';

describe('ProjectAnalyticDomain', () => {
    const projectAnalyticRepository = mock<ProjectAnalyticRepository>();
    let domain: ProjectAnalyticDomain;

    beforeEach(async () => {
        vi.resetAllMocks();
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ProjectAnalyticDomain,
                {
                    provide: ProjectAnalyticRepository,
                    useValue: projectAnalyticRepository,
                },
            ],
        }).compile();
        domain = module.get(ProjectAnalyticDomain);
    });

    describe('creation', () => {
        it('combines the created count and the per-workspace breakdown', async () => {
            const startDate = new Date('2026-01-01T00:00:00.000Z');
            const endDate = new Date('2026-02-01T00:00:00.000Z');
            projectAnalyticRepository.countCreated.mockResolvedValue(5);
            projectAnalyticRepository.perWorkspace.mockResolvedValue([
                { workspaceId: '507f1f77bcf86cd799439011', count: 5 },
            ]);

            const result = await domain.creation(startDate, endDate);

            expect(result).toEqual({
                created: 5,
                perWorkspace: [
                    { workspaceId: '507f1f77bcf86cd799439011', count: 5 },
                ],
            });
            expect(projectAnalyticRepository.countCreated).toHaveBeenCalledWith(
                startDate,
                endDate
            );
            expect(
                projectAnalyticRepository.perWorkspace
            ).toHaveBeenCalledWith();
        });
    });

    describe('countByWorkspace', () => {
        it('delegates to the repository', async () => {
            projectAnalyticRepository.countByWorkspace.mockResolvedValue(3);

            const result = await domain.countByWorkspace(
                '507f1f77bcf86cd799439011'
            );

            expect(result).toBe(3);
            expect(
                projectAnalyticRepository.countByWorkspace
            ).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
        });
    });
});
