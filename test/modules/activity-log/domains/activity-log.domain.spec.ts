import { Test, type TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RequestStoreService } from '@common/request/services/request.store.service';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import { EnumActivityLogAction } from '@generated/prisma-client';
import { ActivityLogMetadataStoreKey } from '@modules/activity-log/constants/activity-log.constant';
import { ActivityLogRepository } from '@modules/activity-log/repositories/activity-log.repository';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import { ActivityLogUtil } from '@modules/activity-log/utils/activity-log.util';

describe('ActivityLogDomain', () => {
    const activityRepository = {
        create: vi.fn<ActivityLogRepository['create']>(),
        findUserScopedWithPaginationOffset:
            vi.fn<
                ActivityLogRepository['findUserScopedWithPaginationOffset']
            >(),
        findUserScopedWithPaginationCursor:
            vi.fn<
                ActivityLogRepository['findUserScopedWithPaginationCursor']
            >(),
        findByWorkspaceWithPaginationOffset:
            vi.fn<
                ActivityLogRepository['findByWorkspaceWithPaginationOffset']
            >(),
        findByWorkspaceWithPaginationCursor:
            vi.fn<
                ActivityLogRepository['findByWorkspaceWithPaginationCursor']
            >(),
    } satisfies Pick<
        ActivityLogRepository,
        | 'create'
        | 'findUserScopedWithPaginationOffset'
        | 'findUserScopedWithPaginationCursor'
        | 'findByWorkspaceWithPaginationOffset'
        | 'findByWorkspaceWithPaginationCursor'
    >;
    const activityLogUtil = {
        getDescription: vi.fn<ActivityLogUtil['getDescription']>(),
    } satisfies Pick<ActivityLogUtil, 'getDescription'>;
    const requestStoreGet = vi.fn((_key: string): unknown => null);
    const requestStoreService = {
        get<T>(key: string): T | null {
            return requestStoreGet(key) as T | null;
        },
    } satisfies Pick<RequestStoreService, 'get'>;

    const requestLog = {
        userAgent: { ua: 'browser' },
        ipAddress: '127.0.0.1',
        geoLocation: null,
    };
    const metadata = { workspaceId: 'workspace-id' };

    let service: ActivityLogDomain;

    beforeEach(async () => {
        vi.resetAllMocks();
        requestStoreGet.mockImplementation((key: string) => {
            if (key === ActivityLogMetadataStoreKey) {
                return metadata;
            }

            return requestLog;
        });
        activityLogUtil.getDescription.mockReturnValue('User did something');
        activityRepository.findUserScopedWithPaginationOffset.mockResolvedValue(
            {
                type: EnumPaginationType.offset,
                data: [],
                count: 0,
                perPage: 10,
                hasNext: false,
                hasPrevious: false,
                page: 1,
                totalPage: 0,
            }
        );
        activityRepository.findUserScopedWithPaginationCursor.mockResolvedValue(
            {
                type: EnumPaginationType.cursor,
                data: [],
                perPage: 10,
                hasNext: false,
            }
        );
        activityRepository.findByWorkspaceWithPaginationOffset.mockResolvedValue(
            {
                type: EnumPaginationType.offset,
                data: [],
                count: 0,
                perPage: 10,
                hasNext: false,
                hasPrevious: false,
                page: 1,
                totalPage: 0,
            }
        );
        activityRepository.findByWorkspaceWithPaginationCursor.mockResolvedValue(
            {
                type: EnumPaginationType.cursor,
                data: [],
                perPage: 10,
                hasNext: false,
            }
        );

        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                ActivityLogDomain,
                {
                    provide: ActivityLogRepository,
                    useValue: activityRepository,
                },
                { provide: ActivityLogUtil, useValue: activityLogUtil },
                { provide: RequestStoreService, useValue: requestStoreService },
            ],
        }).compile();

        service = moduleRef.get(ActivityLogDomain);
    });

    describe('create', () => {
        it('writes the action description with request metadata', async () => {
            await service.create(
                'user-id',
                EnumActivityLogAction.userUpdateProfile,
                null
            );

            expect(activityLogUtil.getDescription).toHaveBeenCalledWith(
                EnumActivityLogAction.userUpdateProfile,
                metadata
            );
            expect(activityRepository.create).toHaveBeenCalledWith(
                'user-id',
                EnumActivityLogAction.userUpdateProfile,
                'User did something',
                requestLog,
                metadata
            );
        });

        it('adds serialized HttpException details to the description and metadata', async () => {
            const error = new BadRequestException({ message: 'Invalid input' });

            await service.create(
                'user-id',
                EnumActivityLogAction.userUpdateProfile,
                error
            );

            expect(activityRepository.create).toHaveBeenCalledWith(
                'user-id',
                EnumActivityLogAction.userUpdateProfile,
                expect.stringContaining('Error: Invalid input'),
                requestLog,
                expect.objectContaining({
                    ...metadata,
                    errorMessage: 'Invalid input',
                })
            );
        });

        it('does not propagate repository failures', async () => {
            activityRepository.create.mockRejectedValue(new Error('db down'));

            await expect(
                service.create(
                    'user-id',
                    EnumActivityLogAction.userUpdateProfile,
                    null
                )
            ).resolves.toBeUndefined();
        });
    });

    it('delegates user and workspace list methods to the repository', async () => {
        const offsetPagination = { skip: 0, limit: 10 };
        const cursorPagination = { cursor: 'cursor', limit: 10 };

        await service.getListOffsetByUser('user-id', offsetPagination);
        await service.getListCursorByUser('user-id', cursorPagination);
        await service.getListOffsetByWorkspace(
            'workspace-id',
            'user-id',
            offsetPagination
        );
        await service.getListCursorByWorkspace(
            'workspace-id',
            null,
            cursorPagination
        );

        expect(
            activityRepository.findUserScopedWithPaginationOffset
        ).toHaveBeenCalledWith('user-id', offsetPagination);
        expect(
            activityRepository.findUserScopedWithPaginationCursor
        ).toHaveBeenCalledWith('user-id', cursorPagination);
        expect(
            activityRepository.findByWorkspaceWithPaginationOffset
        ).toHaveBeenCalledWith('workspace-id', 'user-id', offsetPagination);
        expect(
            activityRepository.findByWorkspaceWithPaginationCursor
        ).toHaveBeenCalledWith('workspace-id', null, cursorPagination);
    });
});
