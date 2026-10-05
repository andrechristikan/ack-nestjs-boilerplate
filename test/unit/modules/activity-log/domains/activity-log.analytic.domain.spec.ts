import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import { ActivityLogAnalyticDomain } from '@modules/activity-log/domains/activity-log.analytic.domain';
import { ActivityLogWorkspaceVolumeContract } from '@modules/activity-log/contracts/activity-log.workspace-volume.contract';
import { ActivityLogAnalyticRepository } from '@modules/activity-log/repositories/activity-log.analytic.repository';

describe('ActivityLogAnalyticDomain', () => {
    const activityLogAnalyticRepository: MockProxy<ActivityLogAnalyticRepository> =
        mock<ActivityLogAnalyticRepository>();

    const startDate: Date = new Date('2026-01-01T00:00:00.000Z');
    const endDate: Date = new Date('2026-02-01T00:00:00.000Z');

    let domain: ActivityLogAnalyticDomain;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ActivityLogAnalyticDomain,
                {
                    provide: ActivityLogAnalyticRepository,
                    useValue: activityLogAnalyticRepository,
                },
            ],
        }).compile();

        domain = module.get(ActivityLogAnalyticDomain);
    });

    describe('getCountByActionsInRange', () => {
        it('delegates to the repository with the given workspace', async () => {
            activityLogAnalyticRepository.countByActionsInRange.mockResolvedValue(
                3
            );

            const result = await domain.getCountByActionsInRange(
                [EnumActivityLogAction.userLoginCredential],
                startDate,
                endDate,
                'workspace-1'
            );

            expect(result).toBe(3);
            expect(
                activityLogAnalyticRepository.countByActionsInRange
            ).toHaveBeenCalledWith(
                [EnumActivityLogAction.userLoginCredential],
                startDate,
                endDate,
                'workspace-1'
            );
        });

        it('delegates to the repository with no workspace', async () => {
            activityLogAnalyticRepository.countByActionsInRange.mockResolvedValue(
                7
            );

            const result = await domain.getCountByActionsInRange(
                [EnumActivityLogAction.userLogout],
                startDate,
                endDate
            );

            expect(result).toBe(7);
            expect(
                activityLogAnalyticRepository.countByActionsInRange
            ).toHaveBeenCalledWith(
                [EnumActivityLogAction.userLogout],
                startDate,
                endDate,
                undefined
            );
        });
    });

    describe('getGroupByActionInRange', () => {
        it('delegates to the repository with an explicit range', async () => {
            const rows = [
                { action: EnumActivityLogAction.userLogout, count: 4 },
            ];
            activityLogAnalyticRepository.groupByActionInRange.mockResolvedValue(
                rows
            );

            const result = await domain.getGroupByActionInRange(
                [EnumActivityLogAction.userLogout],
                startDate,
                endDate
            );

            expect(result).toBe(rows);
            expect(
                activityLogAnalyticRepository.groupByActionInRange
            ).toHaveBeenCalledWith(
                [EnumActivityLogAction.userLogout],
                startDate,
                endDate
            );
        });

        it('delegates to the repository with no range', async () => {
            activityLogAnalyticRepository.groupByActionInRange.mockResolvedValue(
                []
            );

            await domain.getGroupByActionInRange([
                EnumActivityLogAction.userLogout,
            ]);

            expect(
                activityLogAnalyticRepository.groupByActionInRange
            ).toHaveBeenCalledWith(
                [EnumActivityLogAction.userLogout],
                undefined,
                undefined
            );
        });
    });

    describe('getManyByActionsInRange', () => {
        it('delegates to the repository', async () => {
            const rows = [
                {
                    id: 'activity-log-1',
                    userId: 'user-1',
                    action: EnumActivityLogAction.userLogout,
                    ipAddress: null,
                    createdAt: startDate,
                    workspaceId: null,
                },
            ];
            activityLogAnalyticRepository.findManyByActionsInRange.mockResolvedValue(
                rows
            );

            const result = await domain.getManyByActionsInRange(
                [EnumActivityLogAction.userLogout],
                startDate,
                endDate
            );

            expect(result).toBe(rows);
            expect(
                activityLogAnalyticRepository.findManyByActionsInRange
            ).toHaveBeenCalledWith(
                [EnumActivityLogAction.userLogout],
                startDate,
                endDate
            );
        });
    });

    describe('getCountByWorkspaceInRange', () => {
        it('passes the workspace-volume action list to the repository', async () => {
            activityLogAnalyticRepository.countByWorkspaceInRange.mockResolvedValue(
                5
            );

            const result = await domain.getCountByWorkspaceInRange(
                'workspace-1',
                startDate,
                endDate
            );

            expect(result).toBe(5);
            expect(
                activityLogAnalyticRepository.countByWorkspaceInRange
            ).toHaveBeenCalledWith(
                [...ActivityLogWorkspaceVolumeContract],
                'workspace-1',
                startDate,
                endDate
            );
        });
    });

    describe('getGroupActivityByWorkspaceOffset', () => {
        it('passes the workspace-volume action list and pagination to the repository', async () => {
            const params = { skip: 0, limit: 20, orderBy: [] };
            const page = {
                type: EnumPaginationType.offset as const,
                count: 0,
                perPage: 20,
                hasNext: false,
                hasPrevious: false,
                page: 1,
                totalPage: 1,
                data: [],
            };
            activityLogAnalyticRepository.groupActivityByWorkspaceOffset.mockResolvedValue(
                page
            );

            const result = await domain.getGroupActivityByWorkspaceOffset(
                startDate,
                endDate,
                params
            );

            expect(result).toBe(page);
            expect(
                activityLogAnalyticRepository.groupActivityByWorkspaceOffset
            ).toHaveBeenCalledWith(
                [...ActivityLogWorkspaceVolumeContract],
                startDate,
                endDate,
                params
            );
        });
    });
});
