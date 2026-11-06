import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
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

    const pageSize = 2;

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
                {
                    provide: ConfigService,
                    useValue: { get: vi.fn().mockReturnValue(pageSize) },
                },
            ],
        }).compile();

        domain = module.get(ActivityLogAnalyticDomain);
    });

    describe('getCountByActionsInRange', () => {
        it('delegates to the repository with the actions and the range', async () => {
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
                endDate
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

            await domain.getGroupByActionInRange(
                [EnumActivityLogAction.userLogout],
                null,
                null
            );

            expect(
                activityLogAnalyticRepository.groupByActionInRange
            ).toHaveBeenCalledWith(
                [EnumActivityLogAction.userLogout],
                null,
                null
            );
        });
    });

    describe('getPageByActionsInRange', () => {
        const row = {
            id: 'a',
            userId: 'user-1',
            action: EnumActivityLogAction.userLogout,
            ipAddress: null,
            createdAt: startDate,
            workspaceId: null,
            userAgent: null,
        };

        it('reads one page from the repository at the configured page size', async () => {
            const page = {
                type: EnumPaginationType.cursor as const,
                perPage: pageSize,
                hasNext: true,
                cursor: 'next-cursor',
                data: [row],
            };
            activityLogAnalyticRepository.findPageByActionsInRange.mockResolvedValue(
                page
            );

            const result = await domain.getPageByActionsInRange(
                [EnumActivityLogAction.userLogout],
                startDate,
                endDate,
                'prev-cursor'
            );

            expect(result).toBe(page);
            expect(
                activityLogAnalyticRepository.findPageByActionsInRange
            ).toHaveBeenCalledWith(
                [EnumActivityLogAction.userLogout],
                startDate,
                endDate,
                'prev-cursor',
                pageSize
            );
        });

        it('passes a null cursor for the first page', async () => {
            const page = {
                type: EnumPaginationType.cursor as const,
                perPage: pageSize,
                hasNext: false,
                data: [],
            };
            activityLogAnalyticRepository.findPageByActionsInRange.mockResolvedValue(
                page
            );

            await domain.getPageByActionsInRange(
                [EnumActivityLogAction.userLogout],
                startDate,
                endDate,
                null
            );

            expect(
                activityLogAnalyticRepository.findPageByActionsInRange
            ).toHaveBeenCalledWith(
                [EnumActivityLogAction.userLogout],
                startDate,
                endDate,
                null,
                pageSize
            );
        });
    });

    describe('getGroupUserByActions', () => {
        it('passes the actions, range, and minimum count to the repository', async () => {
            const rows = [{ userId: 'user-1', count: 6 }];
            activityLogAnalyticRepository.groupUserByActions.mockResolvedValue(
                rows
            );

            const result = await domain.getGroupUserByActions(
                [EnumActivityLogAction.userRefreshToken],
                startDate,
                endDate,
                5
            );

            expect(result).toBe(rows);
            expect(
                activityLogAnalyticRepository.groupUserByActions
            ).toHaveBeenCalledWith(
                [EnumActivityLogAction.userRefreshToken],
                startDate,
                endDate,
                5
            );
        });
    });

    describe('getGroupUserIdByIps', () => {
        it('passes the actions, range, and ips to the repository', async () => {
            activityLogAnalyticRepository.groupUserIdByIps.mockResolvedValue([
                'user-1',
            ]);

            const result = await domain.getGroupUserIdByIps(
                [EnumActivityLogAction.userSignedUp],
                startDate,
                endDate,
                ['10.0.0.1']
            );

            expect(result).toEqual(['user-1']);
            expect(
                activityLogAnalyticRepository.groupUserIdByIps
            ).toHaveBeenCalledWith(
                [EnumActivityLogAction.userSignedUp],
                startDate,
                endDate,
                ['10.0.0.1']
            );
        });
    });

    describe('getGroupIpUserByActions', () => {
        it('passes the actions and range to the repository', async () => {
            const rows = [
                { ipAddress: '10.0.0.1', userId: 'user-1', count: 3 },
            ];
            activityLogAnalyticRepository.groupIpUserByActions.mockResolvedValue(
                rows
            );

            const result = await domain.getGroupIpUserByActions(
                [EnumActivityLogAction.userLoginFailed],
                startDate,
                endDate
            );

            expect(result).toBe(rows);
            expect(
                activityLogAnalyticRepository.groupIpUserByActions
            ).toHaveBeenCalledWith(
                [EnumActivityLogAction.userLoginFailed],
                startDate,
                endDate
            );
        });
    });

    describe('getOneByUserActionsInRange', () => {
        it('passes the user, actions, and range to the repository', async () => {
            const row = {
                id: 'a',
                userId: 'user-1',
                action: EnumActivityLogAction.userLoginCredential,
                ipAddress: null,
                createdAt: startDate,
                workspaceId: null,
                userAgent: null,
            };
            activityLogAnalyticRepository.findOneByUserActionsInRange.mockResolvedValue(
                row
            );

            const result = await domain.getOneByUserActionsInRange(
                'user-1',
                [EnumActivityLogAction.userLoginCredential],
                startDate,
                endDate
            );

            expect(result).toBe(row);
            expect(
                activityLogAnalyticRepository.findOneByUserActionsInRange
            ).toHaveBeenCalledWith(
                'user-1',
                [EnumActivityLogAction.userLoginCredential],
                startDate,
                endDate
            );
        });
    });

    describe('getCreatedAtByUserActionsInRange', () => {
        it('passes the limit and answers oldest first', async () => {
            activityLogAnalyticRepository.findCreatedAtByUserActionsInRange.mockResolvedValue(
                [endDate, startDate]
            );

            const result = await domain.getCreatedAtByUserActionsInRange(
                'user-1',
                [EnumActivityLogAction.userLoginCredential],
                startDate,
                endDate,
                1000
            );

            expect(result).toEqual([startDate, endDate]);
            expect(
                activityLogAnalyticRepository.findCreatedAtByUserActionsInRange
            ).toHaveBeenCalledWith(
                'user-1',
                [EnumActivityLogAction.userLoginCredential],
                startDate,
                endDate,
                1000
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

    describe('getGroupIpByActions', () => {
        it('passes the actions, range, and minimum count to the repository', async () => {
            const rows = [{ ipAddress: '10.0.0.1', count: 6 }];
            activityLogAnalyticRepository.groupIpByActions.mockResolvedValue(
                rows
            );

            const result = await domain.getGroupIpByActions(
                [
                    EnumActivityLogAction.userSignedUp,
                    EnumActivityLogAction.userCreated,
                ],
                startDate,
                endDate,
                5
            );

            expect(result).toBe(rows);
            expect(
                activityLogAnalyticRepository.groupIpByActions
            ).toHaveBeenCalledWith(
                [
                    EnumActivityLogAction.userSignedUp,
                    EnumActivityLogAction.userCreated,
                ],
                startDate,
                endDate,
                5
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
