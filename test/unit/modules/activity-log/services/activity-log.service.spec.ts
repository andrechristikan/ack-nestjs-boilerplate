import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { RequestLogStoreKey } from '@common/request/constants/request.constant';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import type { IRequestLog } from '@common/request/interfaces/request.interface';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { SentryService } from '@common/sentry/services/sentry.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import type { UserAgent, Workspace } from '@generated/prisma-client/client';
import { ActivityLogStageStoreKey } from '@modules/activity-log/constants/activity-log.constant';
import { ActivityLogActionContract } from '@modules/activity-log/contracts/activity-log.action.contract';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import {
    EnumActivityLogUser,
    EnumActivityLogWorkspace,
} from '@modules/activity-log/enums/activity-log.enum';
import { EnumActivityLogStatusCodeError } from '@modules/activity-log/enums/activity-log.status-code.enum';
import { ActivityLogContractInvalidException } from '@modules/activity-log/exceptions/activity-log.contract-invalid.exception';
import { ActivityLogEmptyMetadataSchema } from '@modules/activity-log/dtos/activity-log.empty-metadata.dto';
import type {
    IActivityLogCreate,
    IActivityLogStaged,
    IActivityLogStageInput,
} from '@modules/activity-log/interfaces/activity-log.interface';
import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
import { ActivityLogRepository } from '@modules/activity-log/repositories/activity-log.repository';
import { ActivityLogUtil } from '@modules/activity-log/utils/activity-log.util';
import { WorkspaceStoreKey } from '@modules/workspace/constants/workspace.constant';

describe('ActivityLogService', () => {
    const activityLogRepository: MockProxy<ActivityLogRepository> =
        mock<ActivityLogRepository>();
    const activityLogUtil: MockProxy<ActivityLogUtil> = mock<ActivityLogUtil>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();
    const activityLogQueue: MockProxy<ActivityLogQueue> =
        mock<ActivityLogQueue>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const sentryService: MockProxy<SentryService> = mock<SentryService>();
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
    const workspace: Workspace = {
        id: 'workspace-1',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
        deletedAt: null,
        deletedBy: null,
        name: 'Acme',
        slug: 'acme-team',
        description: null,
        isPublic: false,
    };
    const targetContract =
        ActivityLogActionContract[EnumActivityLogAction.userLoginCredential];
    const contractInvalid = {
        constructor: ActivityLogContractInvalidException,
        module: 'activityLog',
        statusCode: EnumActivityLogStatusCodeError.contractInvalid,
        statusCodeKey:
            EnumActivityLogStatusCodeError[
                EnumActivityLogStatusCodeError.contractInvalid
            ],
        messagePath: 'activityLog.error.contractInvalid',
    };

    let service: ActivityLogService;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ActivityLogService,
                {
                    provide: ActivityLogRepository,
                    useValue: activityLogRepository,
                },
                { provide: ActivityLogUtil, useValue: activityLogUtil },
                {
                    provide: RequestStoreService,
                    useValue: requestStoreService,
                },
                { provide: ActivityLogQueue, useValue: activityLogQueue },
                { provide: DatabaseUtil, useValue: databaseUtil },
                { provide: HelperDateService, useValue: helperDateService },
                { provide: SentryService, useValue: sentryService },
            ],
        }).compile();

        service = module.get(ActivityLogService);
    });

    describe('prepare', () => {
        it('stages the entry with the parsed metadata and its fields checked against the contract', () => {
            const input: IActivityLogStageInput<EnumActivityLogAction> = {
                action: EnumActivityLogAction.userLoginCredential,
                userId: 'user-1',
                createdBy: 'creator-1',
            };

            const result = service.prepare(input);

            expect(result).toEqual({
                action: EnumActivityLogAction.userLoginCredential,
                metadata: {},
                userId: 'user-1',
                createdBy: 'creator-1',
                workspaceId: null,
            });
        });

        it('stages null userId, createdBy, and workspaceId when the input omits them', () => {
            const result = service.prepare({
                action: EnumActivityLogAction.userUpdateProfile,
            });

            expect(result).toEqual({
                action: EnumActivityLogAction.userUpdateProfile,
                metadata: {},
                userId: null,
                createdBy: null,
                workspaceId: null,
            });
        });

        it('stages the given workspaceId', () => {
            const result = service.prepare({
                action: EnumActivityLogAction.workspaceCreated,
                userId: 'user-1',
                createdBy: 'creator-1',
                workspaceId: 'workspace-1',
            });

            expect(result.workspaceId).toBe('workspace-1');
        });

        it('throws when the action carries no contract', () => {
            let thrown: unknown;
            try {
                service.prepare({
                    action: 'notAnAction' as EnumActivityLogAction,
                });
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toMatchObject(contractInvalid);
        });

        it('throws with the zod error as the raw error when metadata breaks the action contract', () => {
            const failedParse = ActivityLogEmptyMetadataSchema.safeParse({
                unexpected: 'value',
            });

            let thrown: unknown;
            try {
                service.prepare({
                    action: EnumActivityLogAction.userLoginCredential,
                    userId: 'user-1',
                    createdBy: 'creator-1',
                    metadata: { unexpected: 'value' },
                });
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toMatchObject({
                ...contractInvalid,
                rawError: failedParse.error,
            });
        });

        it('throws when a user field breaks the contract', () => {
            let thrown: unknown;
            try {
                service.prepare({
                    action: EnumActivityLogAction.userLoginCredential,
                    createdBy: 'creator-1',
                });
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toMatchObject(contractInvalid);
        });

        it('throws when the workspace field breaks the contract', () => {
            let thrown: unknown;
            try {
                service.prepare({
                    action: EnumActivityLogAction.workspaceCreated,
                    userId: 'user-1',
                    createdBy: 'creator-1',
                });
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toMatchObject(contractInvalid);
        });
    });
    describe('stagePrepared', () => {
        it('does nothing when given no activity logs', () => {
            service.stagePrepared([]);

            expect(requestStoreService.get).not.toHaveBeenCalled();
            expect(requestStoreService.set).not.toHaveBeenCalled();
        });

        it('sets the store to the given activity logs when nothing was staged before', () => {
            requestStoreService.get.mockReturnValue(null);
            const activityLogs: IActivityLogStaged[] = [
                {
                    action: EnumActivityLogAction.userLoginCredential,
                    metadata: {},
                    userId: null,
                    createdBy: null,
                    workspaceId: null,
                },
            ];

            service.stagePrepared(activityLogs);

            expect(requestStoreService.set).toHaveBeenCalledWith(
                ActivityLogStageStoreKey,
                activityLogs
            );
        });

        it('appends the given activity logs onto what was already staged', () => {
            const alreadyStaged: IActivityLogStaged = {
                action: EnumActivityLogAction.userLogout,
                metadata: {},
                userId: null,
                createdBy: null,
                workspaceId: null,
            };
            requestStoreService.get.mockReturnValue([alreadyStaged]);
            const activityLogs: IActivityLogStaged[] = [
                {
                    action: EnumActivityLogAction.userLoginCredential,
                    metadata: {},
                    userId: null,
                    createdBy: null,
                    workspaceId: null,
                },
            ];

            service.stagePrepared(activityLogs);

            expect(requestStoreService.set).toHaveBeenCalledWith(
                ActivityLogStageStoreKey,
                [alreadyStaged, ...activityLogs]
            );
        });
    });

    describe('flushStaged', () => {
        beforeEach(() => {
            activityLogUtil.getDescription.mockReturnValue('Description');
        });

        it('does nothing when nothing is staged', async () => {
            requestStoreService.get.mockReturnValue(null);

            await service.flushStaged({ payloadUserId: null });

            expect(activityLogQueue.createMany).not.toHaveBeenCalled();
        });

        it('does nothing when the staged list is empty', async () => {
            requestStoreService.get.mockReturnValue([]);

            await service.flushStaged({ payloadUserId: null });

            expect(activityLogQueue.createMany).not.toHaveBeenCalled();
        });

        it('reports every staged row and clears the store when the request log is missing', async () => {
            const staged: IActivityLogStaged[] = [
                {
                    action: EnumActivityLogAction.userLoginCredential,
                    metadata: {},
                    userId: 'user-1',
                    createdBy: 'creator-1',
                    workspaceId: null,
                },
                {
                    action: EnumActivityLogAction.userUpdateProfile,
                    metadata: {},
                    userId: null,
                    createdBy: null,
                    workspaceId: null,
                },
            ];
            requestStoreService.get.mockImplementation(
                (key: string): unknown => {
                    if (key === ActivityLogStageStoreKey) {
                        return staged;
                    }
                    return null;
                }
            );
            helperDateService.create.mockReturnValue(createdAt);

            await service.flushStaged({ payloadUserId: 'payload-user-1' });

            expect(sentryService.captureException).toHaveBeenCalledTimes(2);
            expect(sentryService.captureException).toHaveBeenCalledWith(
                expect.any(ActivityLogContractInvalidException)
            );
            expect(activityLogQueue.createMany).not.toHaveBeenCalled();
            expect(requestStoreService.set).toHaveBeenCalledWith(
                ActivityLogStageStoreKey,
                []
            );
        });

        it('enqueues once every staged activity log as a row with an id and createdAt', async () => {
            const staged: IActivityLogStaged[] = [
                {
                    action: EnumActivityLogAction.userLoginCredential,
                    metadata: {},
                    userId: 'user-1',
                    createdBy: 'creator-1',
                    workspaceId: null,
                },
                {
                    action: EnumActivityLogAction.userUpdateProfile,
                    metadata: {},
                    userId: null,
                    createdBy: null,
                    workspaceId: null,
                },
            ];
            requestStoreService.get.mockImplementation(
                (key: string): unknown => {
                    if (key === ActivityLogStageStoreKey) {
                        return staged;
                    }
                    if (key === RequestLogStoreKey) {
                        return requestLog;
                    }
                    return null;
                }
            );
            databaseUtil.createId
                .mockReturnValueOnce('aaaaaaaaaaaaaaaaaaaaaaaa')
                .mockReturnValueOnce('bbbbbbbbbbbbbbbbbbbbbbbb');
            helperDateService.create.mockReturnValue(createdAt);

            await service.flushStaged({ payloadUserId: 'payload-user-1' });

            expect(activityLogQueue.createMany).toHaveBeenCalledTimes(1);
            expect(activityLogQueue.createMany).toHaveBeenCalledWith([
                {
                    id: 'aaaaaaaaaaaaaaaaaaaaaaaa',
                    userId: 'user-1',
                    createdBy: 'creator-1',
                    workspaceId: null,
                    action: EnumActivityLogAction.userLoginCredential,
                    description: 'Description',
                    requestLog,
                    metadata: {},
                    createdAt,
                },
                {
                    id: 'bbbbbbbbbbbbbbbbbbbbbbbb',
                    userId: 'payload-user-1',
                    createdBy: 'payload-user-1',
                    workspaceId: null,
                    action: EnumActivityLogAction.userUpdateProfile,
                    description: 'Description',
                    requestLog,
                    metadata: {},
                    createdAt,
                },
            ]);
            expect(requestStoreService.set).toHaveBeenCalledWith(
                ActivityLogStageStoreKey,
                []
            );
        });

        it('reports an invalid row and enqueues the valid ones', async () => {
            const staged: IActivityLogStaged[] = [
                {
                    action: EnumActivityLogAction.userUpdateProfile,
                    metadata: {},
                    userId: null,
                    createdBy: null,
                    workspaceId: null,
                },
                {
                    action: EnumActivityLogAction.userLoginCredential,
                    metadata: {},
                    userId: 'user-1',
                    createdBy: 'creator-1',
                    workspaceId: null,
                },
            ];
            requestStoreService.get.mockImplementation(
                (key: string): unknown => {
                    if (key === ActivityLogStageStoreKey) {
                        return staged;
                    }
                    if (key === RequestLogStoreKey) {
                        return requestLog;
                    }
                    return null;
                }
            );
            databaseUtil.createId.mockReturnValue('aaaaaaaaaaaaaaaaaaaaaaaa');
            helperDateService.create.mockReturnValue(createdAt);

            await service.flushStaged({ payloadUserId: null });

            expect(sentryService.captureException).toHaveBeenCalledTimes(1);
            expect(sentryService.captureException).toHaveBeenCalledWith(
                expect.any(ActivityLogContractInvalidException)
            );
            expect(activityLogQueue.createMany).toHaveBeenCalledWith([
                expect.objectContaining({
                    id: 'aaaaaaaaaaaaaaaaaaaaaaaa',
                    action: EnumActivityLogAction.userLoginCredential,
                }),
            ]);
            expect(requestStoreService.set).toHaveBeenCalledWith(
                ActivityLogStageStoreKey,
                []
            );
        });

        it('enqueues nothing and clears the store when every entry is invalid', async () => {
            const staged: IActivityLogStaged[] = [
                {
                    action: EnumActivityLogAction.userUpdateProfile,
                    metadata: {},
                    userId: null,
                    createdBy: null,
                    workspaceId: null,
                },
            ];
            requestStoreService.get.mockImplementation(
                (key: string): unknown => {
                    if (key === ActivityLogStageStoreKey) {
                        return staged;
                    }
                    if (key === RequestLogStoreKey) {
                        return requestLog;
                    }
                    return null;
                }
            );
            helperDateService.create.mockReturnValue(createdAt);

            await service.flushStaged({ payloadUserId: null });

            expect(sentryService.captureException).toHaveBeenCalledTimes(1);
            expect(activityLogQueue.createMany).not.toHaveBeenCalled();
            expect(requestStoreService.set).toHaveBeenCalledWith(
                ActivityLogStageStoreKey,
                []
            );
        });

        it('clears the store when the enqueue fails', async () => {
            const staged: IActivityLogStaged[] = [
                {
                    action: EnumActivityLogAction.userLoginCredential,
                    metadata: {},
                    userId: 'user-1',
                    createdBy: 'creator-1',
                    workspaceId: null,
                },
            ];
            const failure = new Error('redis down');
            requestStoreService.get.mockImplementation(
                (key: string): unknown => {
                    if (key === ActivityLogStageStoreKey) {
                        return staged;
                    }
                    if (key === RequestLogStoreKey) {
                        return requestLog;
                    }
                    return null;
                }
            );
            databaseUtil.createId.mockReturnValue('aaaaaaaaaaaaaaaaaaaaaaaa');
            helperDateService.create.mockReturnValue(createdAt);
            activityLogQueue.createMany.mockRejectedValue(failure);

            const rejection = service.flushStaged({ payloadUserId: null });

            await expect(rejection).rejects.toBe(failure);
            expect(requestStoreService.set).toHaveBeenCalledWith(
                ActivityLogStageStoreKey,
                []
            );
        });
    });
    describe('createMany', () => {
        it('writes the rows through the repository', async () => {
            const rows: IActivityLogCreate[] = [
                {
                    id: 'aaaaaaaaaaaaaaaaaaaaaaaa',
                    userId: 'user-1',
                    createdBy: 'creator-1',
                    workspaceId: null,
                    action: EnumActivityLogAction.userLoginCredential,
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

    describe('getContract', () => {
        it('returns the contract for a known action', () => {
            const result = service['getContract'](
                EnumActivityLogAction.userLoginCredential
            );

            expect(result).toBe(targetContract);
        });

        it('throws when the action carries no contract', () => {
            let thrown: unknown;
            try {
                service['getContract']('notAnAction' as EnumActivityLogAction);
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toMatchObject(contractInvalid);
        });
    });

    describe('parseMetadata', () => {
        it('returns a successful parse when metadata matches the contract', () => {
            const result = service['parseMetadata'](targetContract, {});

            expect(result).toEqual({ success: true, data: {} });
        });

        it('returns the failed parse with the zod error when metadata breaks the contract', () => {
            const expectedError = ActivityLogEmptyMetadataSchema.safeParse({
                unexpected: 'value',
            }).error;

            const result = service['parseMetadata'](targetContract, {
                unexpected: 'value',
            });

            expect(result.success).toBe(false);
            expect(result.error).toEqual(expectedError);
        });
    });

    describe('validateMetadata', () => {
        it('returns the parsed metadata when it matches the contract', () => {
            const result = service['validateMetadata'](
                EnumActivityLogAction.workspaceMemberRoleUpdated,
                { targetUserId: 'user-1' }
            );

            expect(result).toEqual({ targetUserId: 'user-1' });
        });

        it('throws with the zod error as the raw error when metadata breaks the contract', () => {
            const failedParse = ActivityLogEmptyMetadataSchema.safeParse({
                unexpected: 'value',
            });

            let thrown: unknown;
            try {
                service['validateMetadata'](
                    EnumActivityLogAction.userLoginCredential,
                    { unexpected: 'value' }
                );
            } catch (error: unknown) {
                thrown = error;
            }

            expect(thrown).toMatchObject({
                ...contractInvalid,
                rawError: failedParse.error,
            });
        });
    });

    describe('isTargetOnlyFieldValid', () => {
        it('accepts a target resolution with a value', () => {
            expect(
                service['isTargetOnlyFieldValid'](
                    EnumActivityLogUser.target,
                    'user-1'
                )
            ).toBe(true);
        });

        it('rejects a target resolution with no value', () => {
            expect(
                service['isTargetOnlyFieldValid'](
                    EnumActivityLogUser.target,
                    null
                )
            ).toBe(false);
        });

        it('rejects a target resolution with an empty value', () => {
            expect(
                service['isTargetOnlyFieldValid'](
                    EnumActivityLogUser.target,
                    ''
                )
            ).toBe(false);
        });

        it('accepts a payload resolution with no value', () => {
            expect(
                service['isTargetOnlyFieldValid'](
                    EnumActivityLogUser.payload,
                    null
                )
            ).toBe(true);
        });

        it('rejects a payload resolution carrying a value', () => {
            expect(
                service['isTargetOnlyFieldValid'](
                    EnumActivityLogUser.payload,
                    'user-1'
                )
            ).toBe(false);
        });
    });

    describe('isWorkspaceFieldValid', () => {
        it('accepts a target resolution with a workspaceId', () => {
            expect(
                service['isWorkspaceFieldValid'](
                    EnumActivityLogWorkspace.target,
                    'workspace-1'
                )
            ).toBe(true);
        });

        it('rejects a target resolution with no workspaceId', () => {
            expect(
                service['isWorkspaceFieldValid'](
                    EnumActivityLogWorkspace.target,
                    null
                )
            ).toBe(false);
        });

        it('accepts a none resolution with a null workspaceId', () => {
            expect(
                service['isWorkspaceFieldValid'](
                    EnumActivityLogWorkspace.none,
                    null
                )
            ).toBe(true);
        });

        it('rejects a none resolution carrying a workspaceId', () => {
            expect(
                service['isWorkspaceFieldValid'](
                    EnumActivityLogWorkspace.none,
                    'workspace-1'
                )
            ).toBe(false);
        });

        it('accepts a payload resolution with a null workspaceId', () => {
            expect(
                service['isWorkspaceFieldValid'](
                    EnumActivityLogWorkspace.payload,
                    null
                )
            ).toBe(true);
        });

        it('rejects a payload resolution carrying a workspaceId', () => {
            expect(
                service['isWorkspaceFieldValid'](
                    EnumActivityLogWorkspace.payload,
                    'workspace-1'
                )
            ).toBe(false);
        });
    });

    describe('resolveUserId', () => {
        it('returns the staged userId for a target resolution', () => {
            const result = service['resolveUserId'](
                EnumActivityLogUser.target,
                'user-1',
                null
            );

            expect(result).toBe('user-1');
        });

        it('throws for a target resolution with no staged userId', () => {
            let thrown: unknown;
            try {
                service['resolveUserId'](
                    EnumActivityLogUser.target,
                    null,
                    'payload-user-1'
                );
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toMatchObject(contractInvalid);
        });

        it('returns the payload userId for a payload resolution', () => {
            const result = service['resolveUserId'](
                EnumActivityLogUser.payload,
                null,
                'payload-user-1'
            );

            expect(result).toBe('payload-user-1');
        });

        it('throws for a payload resolution with an empty payload userId', () => {
            let thrown: unknown;
            try {
                service['resolveUserId'](EnumActivityLogUser.payload, null, '');
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toMatchObject(contractInvalid);
        });
    });

    describe('resolveCreatedBy', () => {
        it('returns the staged createdBy for a target resolution', () => {
            const result = service['resolveCreatedBy'](
                EnumActivityLogUser.target,
                'creator-1',
                'user-1'
            );

            expect(result).toBe('creator-1');
        });

        it('throws for a target resolution with no staged createdBy', () => {
            let thrown: unknown;
            try {
                service['resolveCreatedBy'](
                    EnumActivityLogUser.target,
                    null,
                    'user-1'
                );
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toMatchObject(contractInvalid);
        });

        it('throws for a target resolution with an empty staged createdBy', () => {
            let thrown: unknown;
            try {
                service['resolveCreatedBy'](
                    EnumActivityLogUser.target,
                    '',
                    'user-1'
                );
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toMatchObject(contractInvalid);
        });

        it('returns the resolved userId for a payload resolution', () => {
            const result = service['resolveCreatedBy'](
                EnumActivityLogUser.payload,
                null,
                'user-1'
            );

            expect(result).toBe('user-1');
        });
    });

    describe('resolveWorkspaceId', () => {
        it('returns null for a none resolution', () => {
            const result = service['resolveWorkspaceId'](
                EnumActivityLogWorkspace.none,
                'workspace-1'
            );

            expect(result).toBeNull();
            expect(requestStoreService.get).not.toHaveBeenCalled();
        });

        it('returns the staged workspaceId for a target resolution', () => {
            const result = service['resolveWorkspaceId'](
                EnumActivityLogWorkspace.target,
                'workspace-1'
            );

            expect(result).toBe('workspace-1');
            expect(requestStoreService.get).not.toHaveBeenCalled();
        });

        it('throws for a target resolution with no staged workspaceId', () => {
            let thrown: unknown;
            try {
                service['resolveWorkspaceId'](
                    EnumActivityLogWorkspace.target,
                    null
                );
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toMatchObject(contractInvalid);
        });

        it('throws for a target resolution with an empty staged workspaceId', () => {
            let thrown: unknown;
            try {
                service['resolveWorkspaceId'](
                    EnumActivityLogWorkspace.target,
                    ''
                );
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toMatchObject(contractInvalid);
        });

        it('returns the id of the workspace store for a payload resolution', () => {
            requestStoreService.get.mockReturnValue(workspace);

            const result = service['resolveWorkspaceId'](
                EnumActivityLogWorkspace.payload,
                null
            );

            expect(result).toBe('workspace-1');
            expect(requestStoreService.get).toHaveBeenCalledWith(
                WorkspaceStoreKey
            );
        });

        it('throws for a payload resolution with no workspace in the store', () => {
            requestStoreService.get.mockReturnValue(null);

            let thrown: unknown;
            try {
                service['resolveWorkspaceId'](
                    EnumActivityLogWorkspace.payload,
                    null
                );
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toMatchObject(contractInvalid);
        });
    });

    describe('buildFlushCreate', () => {
        it('assembles the create row from a staged activity log', () => {
            const activityLog: IActivityLogStaged = {
                action: EnumActivityLogAction.userLoginCredential,
                metadata: {},
                userId: 'user-1',
                createdBy: 'creator-1',
                workspaceId: null,
            };
            activityLogUtil.getDescription.mockReturnValue(
                'User login with credential'
            );
            databaseUtil.createId.mockReturnValue('aaaaaaaaaaaaaaaaaaaaaaaa');

            const result = service['buildFlushCreate'](
                activityLog,
                null,
                requestLog,
                createdAt
            );

            expect(result).toEqual({
                id: 'aaaaaaaaaaaaaaaaaaaaaaaa',
                userId: 'user-1',
                createdBy: 'creator-1',
                workspaceId: null,
                action: EnumActivityLogAction.userLoginCredential,
                description: 'User login with credential',
                requestLog,
                metadata: {},
                createdAt,
            });
            expect(activityLogUtil.getDescription).toHaveBeenCalledWith(
                EnumActivityLogAction.userLoginCredential,
                {}
            );
        });
    });
});
