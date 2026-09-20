import { Test, type TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';

import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import { RequestLogStoreKey } from '@common/request/constants/request.constant';
import type { IRequestLog } from '@common/request/interfaces/request.interface';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { EnumActivityLogAction } from '@generated/prisma-client';
import { ActivityLogStageStoreKey } from '@modules/activity-log/constants/activity-log.constant';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import { ActivityLogContractInvalidException } from '@modules/activity-log/exceptions/activity-log.contract-invalid.exception';
import type { IActivityLogStagedEvent } from '@modules/activity-log/interfaces/activity-log.interface';
import { ActivityLogRepository } from '@modules/activity-log/repositories/activity-log.repository';
import { ActivityLogUtil } from '@modules/activity-log/utils/activity-log.util';
import { WorkspaceStoreKey } from '@modules/workspace/constants/workspace.constant';

describe('ActivityLogDomain', () => {
    const activityLogRepository: MockProxy<ActivityLogRepository> =
        mock<ActivityLogRepository>();
    const activityLogUtil: MockProxy<ActivityLogUtil> = mock<ActivityLogUtil>();
    const requestStore = new Map<string, unknown>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();
    const requestLog = {
        userAgent: { ua: 'browser' },
        ipAddress: '127.0.0.1',
        geoLocation: null,
    } satisfies IRequestLog;

    let domain: ActivityLogDomain;

    beforeEach(async () => {
        vi.resetAllMocks();
        requestStore.clear();
        requestStoreService.get.mockImplementation(
            (key: string) => (requestStore.get(key) as never) ?? null
        );
        requestStoreService.set.mockImplementation(
            (key: string, value: unknown): void => {
                requestStore.set(key, value);
            }
        );
        activityLogUtil.getDescription.mockImplementation(action => action);
        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                ActivityLogDomain,
                {
                    provide: ActivityLogRepository,
                    useValue: activityLogRepository,
                },
                { provide: ActivityLogUtil, useValue: activityLogUtil },
                {
                    provide: RequestStoreService,
                    useValue: requestStoreService,
                },
            ],
        }).compile();

        domain = moduleRef.get(ActivityLogDomain);
    });

    describe('prepare / stagePrepared', () => {
        it('appends a validated success event to the request store', () => {
            const event = domain.prepare({
                action: EnumActivityLogAction.userUpdateProfile,
            });
            domain.stagePrepared([event]);

            expect(requestStoreService.set).toHaveBeenCalledWith(
                ActivityLogStageStoreKey,
                [
                    {
                        action: EnumActivityLogAction.userUpdateProfile,
                        metadata: {},
                        onError: false,
                    },
                ]
            );
        });

        it('rejects an event missing its required target user', () => {
            expect(() =>
                domain.prepare({
                    action: EnumActivityLogAction.userCreated,
                })
            ).toThrow(ActivityLogContractInvalidException);
            expect(requestStoreService.set).not.toHaveBeenCalled();
        });

        it('rejects metadata outside the action contract', () => {
            expect(() =>
                domain.prepare({
                    action: EnumActivityLogAction.userUpdateProfile,
                    metadata: { unexpected: true },
                })
            ).toThrow(ActivityLogContractInvalidException);
            expect(requestStoreService.set).not.toHaveBeenCalled();
        });
    });

    describe('flushStaged', () => {
        it('writes all success events and clears the stage', async () => {
            requestStore.set(RequestLogStoreKey, requestLog);
            requestStore.set(ActivityLogStageStoreKey, [
                {
                    action: EnumActivityLogAction.userUpdateProfile,
                    metadata: {},
                    onError: false,
                },
                {
                    action: EnumActivityLogAction.userCreated,
                    metadata: {},
                    onError: false,
                    userId: 'target-id',
                    createdBy: 'target-id',
                },
            ] satisfies IActivityLogStagedEvent[]);

            await domain.flushStaged({
                payloadUserId: 'payload-id',
                isError: false,
            });

            expect(activityLogRepository.createMany).toHaveBeenCalledWith([
                {
                    userId: 'payload-id',
                    createdBy: 'payload-id',
                    workspaceId: null,
                    action: EnumActivityLogAction.userUpdateProfile,
                    description: EnumActivityLogAction.userUpdateProfile,
                    requestLog,
                    metadata: {},
                },
                {
                    userId: 'target-id',
                    createdBy: 'target-id',
                    workspaceId: null,
                    action: EnumActivityLogAction.userCreated,
                    description: EnumActivityLogAction.userCreated,
                    requestLog,
                    metadata: {},
                },
            ]);
            expect(requestStoreService.set).toHaveBeenLastCalledWith(
                ActivityLogStageStoreKey,
                []
            );
        });

        it('writes only error-enabled events after a handler failure', async () => {
            requestStore.set(RequestLogStoreKey, requestLog);
            requestStore.set(ActivityLogStageStoreKey, [
                {
                    action: EnumActivityLogAction.userUpdateProfile,
                    metadata: {},
                    onError: false,
                },
                {
                    action: EnumActivityLogAction.userLoginFailed,
                    metadata: {},
                    onError: true,
                    userId: 'target-id',
                    createdBy: 'target-id',
                },
            ] satisfies IActivityLogStagedEvent[]);

            await domain.flushStaged({
                payloadUserId: 'payload-id',
                isError: true,
            });

            expect(activityLogRepository.createMany).toHaveBeenCalledWith([
                expect.objectContaining({
                    userId: 'target-id',
                    action: EnumActivityLogAction.userLoginFailed,
                }),
            ]);
        });

        it('clears success-only events without opening a transaction on error', async () => {
            requestStore.set(ActivityLogStageStoreKey, [
                {
                    action: EnumActivityLogAction.userUpdateProfile,
                    metadata: {},
                    onError: false,
                },
            ] satisfies IActivityLogStagedEvent[]);

            await domain.flushStaged({
                payloadUserId: 'payload-id',
                isError: true,
            });

            expect(activityLogRepository.createMany).not.toHaveBeenCalled();
            expect(requestStoreService.set).toHaveBeenCalledWith(
                ActivityLogStageStoreKey,
                []
            );
        });

        it('resolves the current workspace for payload-scoped events', async () => {
            requestStore.set(RequestLogStoreKey, requestLog);
            requestStore.set(WorkspaceStoreKey, { id: 'workspace-id' });
            requestStore.set(ActivityLogStageStoreKey, [
                {
                    action: EnumActivityLogAction.workspaceJoinRequested,
                    metadata: {},
                    onError: false,
                    userId: 'target-id',
                    createdBy: 'target-id',
                    workspaceId: 'workspace-id',
                },
            ] satisfies IActivityLogStagedEvent[]);

            await domain.flushStaged({
                payloadUserId: 'payload-id',
                isError: false,
            });

            expect(activityLogRepository.createMany).toHaveBeenCalledWith([
                expect.objectContaining({
                    userId: 'target-id',
                    workspaceId: 'workspace-id',
                }),
            ]);
        });

        it('rejects a staged batch without request metadata', async () => {
            requestStore.set(ActivityLogStageStoreKey, [
                {
                    action: EnumActivityLogAction.userUpdateProfile,
                    metadata: {},
                    onError: false,
                },
            ] satisfies IActivityLogStagedEvent[]);

            await expect(
                domain.flushStaged({
                    payloadUserId: 'payload-id',
                    isError: false,
                })
            ).rejects.toBeInstanceOf(ActivityLogContractInvalidException);
            expect(activityLogRepository.createMany).not.toHaveBeenCalled();
        });
    });

    it('delegates user and workspace list methods to the repository', async () => {
        const offsetPagination = { skip: 0, limit: 10 };
        const cursorPagination = { cursor: 'cursor', limit: 10 };

        activityLogRepository.findUserScopedWithPaginationOffset.mockResolvedValue(
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
        activityLogRepository.findUserScopedWithPaginationCursor.mockResolvedValue(
            {
                type: EnumPaginationType.cursor,
                data: [],
                perPage: 10,
                hasNext: false,
            }
        );
        activityLogRepository.findByWorkspaceWithPaginationOffset.mockResolvedValue(
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
        activityLogRepository.findByWorkspaceWithPaginationCursor.mockResolvedValue(
            {
                type: EnumPaginationType.cursor,
                data: [],
                perPage: 10,
                hasNext: false,
            }
        );

        await domain.getListOffsetByUser('user-id', offsetPagination);
        await domain.getListCursorByUser('user-id', cursorPagination);
        await domain.getListOffsetByWorkspace(
            'workspace-id',
            'user-id',
            offsetPagination
        );
        await domain.getListCursorByWorkspace(
            'workspace-id',
            null,
            cursorPagination
        );

        expect(
            activityLogRepository.findUserScopedWithPaginationOffset
        ).toHaveBeenCalledWith('user-id', offsetPagination);
        expect(
            activityLogRepository.findUserScopedWithPaginationCursor
        ).toHaveBeenCalledWith('user-id', cursorPagination);
        expect(
            activityLogRepository.findByWorkspaceWithPaginationOffset
        ).toHaveBeenCalledWith('workspace-id', 'user-id', offsetPagination);
        expect(
            activityLogRepository.findByWorkspaceWithPaginationCursor
        ).toHaveBeenCalledWith('workspace-id', null, cursorPagination);
    });
});
