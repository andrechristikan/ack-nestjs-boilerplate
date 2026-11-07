import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { ProjectAnalyticService } from '@modules/project/services/project.analytic.service';
import { ProjectAnalyticRepository } from '@modules/project/repositories/project.analytic.repository';

describe('ProjectAnalyticService', () => {
    const projectAnalyticRepository: MockProxy<ProjectAnalyticRepository> =
        mock<ProjectAnalyticRepository>();
    const configGet = vi.fn<(key: string) => number>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });
    let service: ProjectAnalyticService;

    beforeEach(async () => {
        vi.resetAllMocks();
        configGet.mockReturnValue(50);
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ProjectAnalyticService,
                { provide: ConfigService, useValue: configService },
                {
                    provide: ProjectAnalyticRepository,
                    useValue: projectAnalyticRepository,
                },
            ],
        }).compile();
        service = module.get(ProjectAnalyticService);
    });

    describe('getCreation', () => {
        it('combines the created count and the bounded per-workspace breakdown', async () => {
            const startDate = new Date('2026-01-01T00:00:00.000Z');
            const endDate = new Date('2026-02-01T00:00:00.000Z');
            projectAnalyticRepository.countCreated.mockResolvedValue(5);
            projectAnalyticRepository.groupCreatedPerWorkspace.mockResolvedValue(
                [{ workspaceId: '507f1f77bcf86cd799439011', count: 5 }]
            );

            const result = await service.getCreation(startDate, endDate);

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
                projectAnalyticRepository.groupCreatedPerWorkspace
            ).toHaveBeenCalledWith(startDate, endDate, 50);
            expect(configGet).toHaveBeenCalledWith(
                'analytic.project.perWorkspaceLimit'
            );
        });
    });

    describe('getCountByWorkspace', () => {
        it('delegates to the repository', async () => {
            projectAnalyticRepository.countByWorkspace.mockResolvedValue(3);

            const result = await service.getCountByWorkspace(
                '507f1f77bcf86cd799439011'
            );

            expect(result).toBe(3);
            expect(
                projectAnalyticRepository.countByWorkspace
            ).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
        });
    });
});
