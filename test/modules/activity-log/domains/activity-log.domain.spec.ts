import { Test, type TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';

import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import { RequestLogStoreKey } from '@common/request/constants/request.constant';
import type { IRequestLog } from '@common/request/interfaces/request.interface';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { EnumActivityLogAction } from '@generated/prisma-client';
import {
    EnumActivityLogUser,
    EnumActivityLogWorkspace,
} from '@modules/activity-log/enums/activity-log.enum';
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

        it('carries the target user, creator, workspace and error flag the caller supplied', () => {
            expect(
                domain.prepare({
                    action: EnumActivityLogAction.workspaceJoinRequested,
                    userId: 'target-id',
                    createdBy: 'creator-id',
                    workspaceId: 'workspace-id',
                    onError: true,
                })
            ).toEqual({
                action: EnumActivityLogAction.workspaceJoinRequested,
                metadata: {},
                onError: true,
                userId: 'target-id',
                createdBy: 'creator-id',
                workspaceId: 'workspace-id',
            });
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

    it('delegates the offset and cursor lists to the repository with the scope', async () => {
        const offsetPagination = { skip: 0, limit: 10 };
        const cursorPagination = { cursor: 'cursor', limit: 10 };
        const offsetPage = {
            type: EnumPaginationType.offset,
            data: [],
            count: 0,
            perPage: 10,
            hasNext: false,
            hasPrevious: false,
            page: 1,
            totalPage: 0,
        };
        const cursorPage = {
            type: EnumPaginationType.cursor as const,
            data: [],
            perPage: 10,
            hasNext: false,
        };
        activityLogRepository.findWithPaginationOffset.mockResolvedValue(
            offsetPage
        );
        activityLogRepository.findWithPaginationCursor.mockResolvedValue(
            cursorPage
        );

        const userScope = { userId: 'user-id' };
        const workspaceScope = { workspaceId: 'workspace-id' };

        await domain.getListOffset(userScope, offsetPagination);
        await domain.getListCursor(workspaceScope, cursorPagination);

        expect(
            activityLogRepository.findWithPaginationOffset
        ).toHaveBeenCalledWith(userScope, offsetPagination, undefined);
        expect(
            activityLogRepository.findWithPaginationCursor
        ).toHaveBeenCalledWith(workspaceScope, cursorPagination, undefined);
    });

    it('forwards the accessible where as the trailing repository argument', async () => {
        const offsetPagination = { skip: 0, limit: 10 };
        const cursorPagination = { cursor: 'cursor', limit: 10 };
        const accessibleWhere = { userId: 'user-id' };
        const scope = { workspaceId: 'workspace-id', userId: 'user-id' };

        await domain.getListOffset(scope, offsetPagination, accessibleWhere);
        await domain.getListCursor(scope, cursorPagination, accessibleWhere);

        expect(
            activityLogRepository.findWithPaginationOffset
        ).toHaveBeenCalledWith(scope, offsetPagination, accessibleWhere);
        expect(
            activityLogRepository.findWithPaginationCursor
        ).toHaveBeenCalledWith(scope, cursorPagination, accessibleWhere);
    });

    describe('getContract', () => {
        it('throws ActivityLogContractInvalidException when the action has no contract', () => {
            expect(() => domain['getContract']('unknown' as never)).toThrow(
                ActivityLogContractInvalidException
            );
        });

        it('returns the contract of a known action', () => {
            expect(
                domain['getContract'](EnumActivityLogAction.userUpdateProfile)
            ).toEqual(
                expect.objectContaining({ user: EnumActivityLogUser.payload })
            );
        });
    });

    describe('assertTargetOnlyField', () => {
        it('requires a value when the contract resolves the user from the target', () => {
            expect(() =>
                domain['assertTargetOnlyField'](
                    EnumActivityLogUser.target,
                    undefined
                )
            ).toThrow(ActivityLogContractInvalidException);
            expect(() =>
                domain['assertTargetOnlyField'](
                    EnumActivityLogUser.target,
                    'user-id'
                )
            ).not.toThrow();
        });

        it('forbids a value when the contract resolves the user from the payload', () => {
            expect(() =>
                domain['assertTargetOnlyField'](
                    EnumActivityLogUser.payload,
                    'user-id'
                )
            ).toThrow(ActivityLogContractInvalidException);
            expect(() =>
                domain['assertTargetOnlyField'](
                    EnumActivityLogUser.payload,
                    undefined
                )
            ).not.toThrow();
        });
    });

    describe('assertWorkspaceFields', () => {
        it('requires a workspace id when the contract resolves the workspace from the target', () => {
            expect(() =>
                domain['assertWorkspaceFields'](
                    EnumActivityLogWorkspace.target,
                    undefined
                )
            ).toThrow(ActivityLogContractInvalidException);
            expect(() =>
                domain['assertWorkspaceFields'](
                    EnumActivityLogWorkspace.target,
                    'workspace-id'
                )
            ).not.toThrow();
        });

        it('forbids a workspace id when the contract has no workspace', () => {
            expect(() =>
                domain['assertWorkspaceFields'](
                    EnumActivityLogWorkspace.none,
                    'workspace-id'
                )
            ).toThrow(ActivityLogContractInvalidException);
            expect(() =>
                domain['assertWorkspaceFields'](
                    EnumActivityLogWorkspace.none,
                    undefined
                )
            ).not.toThrow();
            expect(() =>
                domain['assertWorkspaceFields'](
                    EnumActivityLogWorkspace.none,
                    null
                )
            ).not.toThrow();
        });

        it('forbids a workspace id when the contract resolves the workspace from the payload', () => {
            expect(() =>
                domain['assertWorkspaceFields'](
                    EnumActivityLogWorkspace.payload,
                    'workspace-id'
                )
            ).toThrow(ActivityLogContractInvalidException);
            expect(() =>
                domain['assertWorkspaceFields'](
                    EnumActivityLogWorkspace.payload,
                    undefined
                )
            ).not.toThrow();
        });
    });

    describe('resolveUserId', () => {
        it('uses the staged user for a target contract and rejects a missing one', () => {
            expect(
                domain['resolveUserId'](
                    EnumActivityLogUser.target,
                    'staged-id',
                    'payload-id'
                )
            ).toBe('staged-id');
            expect(() =>
                domain['resolveUserId'](
                    EnumActivityLogUser.target,
                    undefined,
                    'payload-id'
                )
            ).toThrow(ActivityLogContractInvalidException);
        });

        it('uses the payload user for a payload contract and rejects a missing one', () => {
            expect(
                domain['resolveUserId'](
                    EnumActivityLogUser.payload,
                    undefined,
                    'payload-id'
                )
            ).toBe('payload-id');
            expect(() =>
                domain['resolveUserId'](
                    EnumActivityLogUser.payload,
                    undefined,
                    null
                )
            ).toThrow(ActivityLogContractInvalidException);
        });
    });

    describe('resolveCreatedBy', () => {
        it('uses the staged creator for a target contract and rejects a missing one', () => {
            expect(
                domain['resolveCreatedBy'](
                    EnumActivityLogUser.target,
                    'staged-by',
                    'user-id'
                )
            ).toBe('staged-by');
            expect(() =>
                domain['resolveCreatedBy'](
                    EnumActivityLogUser.target,
                    undefined,
                    'user-id'
                )
            ).toThrow(ActivityLogContractInvalidException);
        });

        it('falls back to the resolved user for a payload contract', () => {
            expect(
                domain['resolveCreatedBy'](
                    EnumActivityLogUser.payload,
                    undefined,
                    'user-id'
                )
            ).toBe('user-id');
        });
    });

    describe('resolveWorkspaceId', () => {
        it('resolves to null when the contract has no workspace', () => {
            expect(
                domain['resolveWorkspaceId'](
                    EnumActivityLogWorkspace.none,
                    undefined
                )
            ).toBeNull();
        });

        it('uses the staged workspace for a target contract and rejects a missing one', () => {
            expect(
                domain['resolveWorkspaceId'](
                    EnumActivityLogWorkspace.target,
                    'workspace-id'
                )
            ).toBe('workspace-id');
            expect(() =>
                domain['resolveWorkspaceId'](
                    EnumActivityLogWorkspace.target,
                    null
                )
            ).toThrow(ActivityLogContractInvalidException);
        });

        it('reads the request workspace for a payload contract and rejects a missing one', () => {
            requestStore.set(WorkspaceStoreKey, { id: 'request-workspace' });
            expect(
                domain['resolveWorkspaceId'](
                    EnumActivityLogWorkspace.payload,
                    undefined
                )
            ).toBe('request-workspace');

            requestStore.delete(WorkspaceStoreKey);
            expect(() =>
                domain['resolveWorkspaceId'](
                    EnumActivityLogWorkspace.payload,
                    undefined
                )
            ).toThrow(ActivityLogContractInvalidException);
        });
    });

    describe('stagePrepared and flushStaged guards', () => {
        it('stages nothing for an empty batch', () => {
            domain.stagePrepared([]);

            expect(requestStoreService.set).not.toHaveBeenCalled();
        });

        it('appends to an already staged batch', () => {
            const existing = {
                action: EnumActivityLogAction.userUpdateProfile,
                metadata: {},
                onError: false,
            } satisfies IActivityLogStagedEvent;
            requestStore.set(ActivityLogStageStoreKey, [existing]);

            domain.stagePrepared([existing]);

            expect(requestStoreService.set).toHaveBeenCalledWith(
                ActivityLogStageStoreKey,
                [existing, existing]
            );
        });

        it('returns without writing when nothing is staged', async () => {
            await domain.flushStaged({
                payloadUserId: 'payload-id',
                isError: false,
            });

            expect(activityLogRepository.createMany).not.toHaveBeenCalled();
            expect(requestStoreService.set).not.toHaveBeenCalled();
        });
    });
});
