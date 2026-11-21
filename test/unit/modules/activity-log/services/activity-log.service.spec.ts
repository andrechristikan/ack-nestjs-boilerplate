import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import type { IRequestLog } from '@common/request/interfaces/request.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import type { UserAgent } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import type { IActivityLogCreate } from '@modules/activity-log/interfaces/activity-log.interface';
import { ActivityLogRepository } from '@modules/activity-log/repositories/activity-log.repository';

describe('ActivityLogService', () => {
    const activityLogRepository: MockProxy<ActivityLogRepository> =
        mock<ActivityLogRepository>();
    const createdAt = new Date('2026-01-01T00:00:00.000Z');

    const userAgent: UserAgent = {
        ua: null,
        browser: null,
        cpu: { architecture: null },
        device: { type: null, vendor: null, model: null },
        engine: { name: null, version: null },
        os: { name: null, version: null },
    };
    const requestLog: IRequestLog = {
        userAgent,
        ipAddress: '127.0.0.1',
        geoLocation: null,
    };

    let service: ActivityLogService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ActivityLogService,
                {
                    provide: ActivityLogRepository,
                    useValue: activityLogRepository,
                },
            ],
        }).compile();

        service = module.get(ActivityLogService);
    });

    describe('createMany', () => {
        it('writes the rows through the repository', async () => {
            const rows: IActivityLogCreate[] = [
                {
                    id: 'aaaaaaaaaaaaaaaaaaaaaaaa',
                    userId: 'user-1',
                    createdBy: 'creator-1',
                    workspaceId: null,
                    action: EnumActivityLogAction.userLoggedInWithCredential,
                    description: 'Description',
                    requestLog,
                    metadata: {},
                    createdAt,
                },
            ];

            await service.createMany(rows);

            expect(activityLogRepository.createMany).toHaveBeenCalledWith(rows);
        });
    });

    describe('getListOffsetByUser', () => {
        it('delegates to the repository and returns its page', async () => {
            const pagination = { skip: 0, limit: 20, orderBy: [] };
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
            activityLogRepository.findUserScopedWithPaginationOffset.mockResolvedValue(
                page
            );

            const result = await service.getListOffsetByUser(
                'user-1',
                pagination
            );

            expect(result).toBe(page);
            expect(
                activityLogRepository.findUserScopedWithPaginationOffset
            ).toHaveBeenCalledWith('user-1', pagination);
        });
    });

    describe('getListCursorByUser', () => {
        it('delegates to the repository and returns its page', async () => {
            const pagination = {
                limit: 20,
                orderBy: [],
                fingerprint: 'aaaaaaaaaaaaaaaa',
            };
            const page = {
                type: EnumPaginationType.cursor as const,
                perPage: 20,
                hasNext: false,
                data: [],
            };
            activityLogRepository.findUserScopedWithPaginationCursor.mockResolvedValue(
                page
            );

            const result = await service.getListCursorByUser(
                'user-1',
                pagination
            );

            expect(result).toBe(page);
            expect(
                activityLogRepository.findUserScopedWithPaginationCursor
            ).toHaveBeenCalledWith('user-1', pagination);
        });
    });

    describe('getListOffsetByWorkspace', () => {
        it('delegates to the repository and returns its page', async () => {
            const pagination = { skip: 0, limit: 20, orderBy: [] };
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
            activityLogRepository.findByWorkspaceWithPaginationOffset.mockResolvedValue(
                page
            );

            const result = await service.getListOffsetByWorkspace(
                'workspace-1',
                'user-1',
                pagination
            );

            expect(result).toBe(page);
            expect(
                activityLogRepository.findByWorkspaceWithPaginationOffset
            ).toHaveBeenCalledWith('workspace-1', 'user-1', pagination);
        });
    });

    describe('getListCursorByWorkspace', () => {
        it('delegates to the repository and returns its page', async () => {
            const pagination = {
                limit: 20,
                orderBy: [],
                fingerprint: 'aaaaaaaaaaaaaaaa',
            };
            const page = {
                type: EnumPaginationType.cursor as const,
                perPage: 20,
                hasNext: false,
                data: [],
            };
            activityLogRepository.findByWorkspaceWithPaginationCursor.mockResolvedValue(
                page
            );

            const result = await service.getListCursorByWorkspace(
                'workspace-1',
                null,
                pagination
            );

            expect(result).toBe(page);
            expect(
                activityLogRepository.findByWorkspaceWithPaginationCursor
            ).toHaveBeenCalledWith('workspace-1', null, pagination);
        });
    });
});
