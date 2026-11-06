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
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
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

describe('ActivityLogDomain', () => {
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

    let domain: ActivityLogDomain;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
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
                { provide: ActivityLogQueue, useValue: activityLogQueue },
                { provide: DatabaseUtil, useValue: databaseUtil },
                { provide: HelperDateService, useValue: helperDateService },
                { provide: SentryService, useValue: sentryService },
            ],
        }).compile();

        domain = module.get(ActivityLogDomain);
    });

    describe('prepare', () => {
        beforeEach(() => {
            activityLogUtil.getContract.mockReturnValue(targetContract);
            activityLogUtil.parseMetadata.mockReturnValue({
                success: true,
                data: {},
            });
            activityLogUtil.isTargetOnlyFieldValid.mockReturnValue(true);
            activityLogUtil.isWorkspaceFieldValid.mockReturnValue(true);
        });

        it('stages the entry with the parsed metadata and its fields checked against the contract', () => {
            const input: IActivityLogStageInput<EnumActivityLogAction> = {
                action: EnumActivityLogAction.userLoginCredential,
                userId: 'user-1',
                createdBy: 'creator-1',
            };

            const result = domain.prepare(input);

            expect(result).toEqual({
                action: EnumActivityLogAction.userLoginCredential,
                metadata: {},
                userId: 'user-1',
                createdBy: 'creator-1',
                workspaceId: null,
            });
            expect(activityLogUtil.parseMetadata).toHaveBeenCalledWith(
                targetContract,
                {}
            );
            expect(activityLogUtil.isTargetOnlyFieldValid).toHaveBeenCalledWith(
                targetContract.user,
                'user-1'
            );
            expect(activityLogUtil.isTargetOnlyFieldValid).toHaveBeenCalledWith(
                targetContract.user,
                'creator-1'
            );
            expect(activityLogUtil.isWorkspaceFieldValid).toHaveBeenCalledWith(
                targetContract.workspace,
                null
            );
        });

        it('stages null userId, createdBy, and workspaceId when the input omits them', () => {
            const result = domain.prepare({
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
            const result = domain.prepare({
                action: EnumActivityLogAction.workspaceCreated,
                userId: 'user-1',
                createdBy: 'creator-1',
                workspaceId: 'workspace-1',
            });

            expect(result.workspaceId).toBe('workspace-1');
            expect(activityLogUtil.isWorkspaceFieldValid).toHaveBeenCalledWith(
                targetContract.workspace,
                'workspace-1'
            );
        });

        it('throws when the action carries no contract', () => {
            activityLogUtil.getContract.mockReturnValue(null);

            let thrown: unknown;
            try {
                domain.prepare({
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
            activityLogUtil.parseMetadata.mockReturnValue(failedParse);

            let thrown: unknown;
            try {
                domain.prepare({
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
            activityLogUtil.isTargetOnlyFieldValid.mockReturnValueOnce(false);

            let thrown: unknown;
            try {
                domain.prepare({
                    action: EnumActivityLogAction.userLoginCredential,
                    createdBy: 'creator-1',
                });
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toMatchObject(contractInvalid);
        });

        it('throws when the workspace field breaks the contract', () => {
            activityLogUtil.isWorkspaceFieldValid.mockReturnValue(false);

            let thrown: unknown;
            try {
                domain.prepare({
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
            domain.stagePrepared([]);

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

            domain.stagePrepared(activityLogs);

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

            domain.stagePrepared(activityLogs);

            expect(requestStoreService.set).toHaveBeenCalledWith(
                ActivityLogStageStoreKey,
                [alreadyStaged, ...activityLogs]
            );
        });
    });

    describe('flushStaged', () => {
        beforeEach(() => {
            activityLogUtil.getContract.mockReturnValue(targetContract);
            activityLogUtil.parseMetadata.mockReturnValue({
                success: true,
                data: {},
            });
            activityLogUtil.resolveWorkspaceId.mockReturnValue(null);
            activityLogUtil.isWorkspaceFieldValid.mockReturnValue(true);
            activityLogUtil.getDescription.mockReturnValue('Description');
        });

        it('does nothing when nothing is staged', async () => {
            requestStoreService.get.mockReturnValue(null);

            await domain.flushStaged({ payloadUserId: null });

            expect(activityLogQueue.createMany).not.toHaveBeenCalled();
        });

        it('does nothing when the staged list is empty', async () => {
            requestStoreService.get.mockReturnValue([]);

            await domain.flushStaged({ payloadUserId: null });

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

            await domain.flushStaged({ payloadUserId: 'payload-user-1' });

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
            activityLogUtil.resolveUserId
                .mockReturnValueOnce('user-1')
                .mockReturnValueOnce('payload-user-1');
            activityLogUtil.resolveCreatedBy
                .mockReturnValueOnce('creator-1')
                .mockReturnValueOnce('payload-user-1');
            databaseUtil.createId
                .mockReturnValueOnce('aaaaaaaaaaaaaaaaaaaaaaaa')
                .mockReturnValueOnce('bbbbbbbbbbbbbbbbbbbbbbbb');
            helperDateService.create.mockReturnValue(createdAt);

            await domain.flushStaged({ payloadUserId: 'payload-user-1' });

            expect(activityLogUtil.resolveUserId).toHaveBeenCalledWith(
                targetContract.user,
                null,
                'payload-user-1'
            );
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
            activityLogUtil.resolveUserId
                .mockReturnValueOnce(null)
                .mockReturnValueOnce('user-1');
            activityLogUtil.resolveCreatedBy.mockReturnValue('creator-1');
            databaseUtil.createId.mockReturnValue('aaaaaaaaaaaaaaaaaaaaaaaa');
            helperDateService.create.mockReturnValue(createdAt);

            await domain.flushStaged({ payloadUserId: null });

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
            activityLogUtil.resolveUserId.mockReturnValue(null);
            helperDateService.create.mockReturnValue(createdAt);

            await domain.flushStaged({ payloadUserId: null });

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
            activityLogUtil.resolveUserId.mockReturnValue('user-1');
            activityLogUtil.resolveCreatedBy.mockReturnValue('creator-1');
            databaseUtil.createId.mockReturnValue('aaaaaaaaaaaaaaaaaaaaaaaa');
            helperDateService.create.mockReturnValue(createdAt);
            activityLogQueue.createMany.mockRejectedValue(failure);

            const rejection = domain.flushStaged({ payloadUserId: null });

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

            await domain.createMany(rows);

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

            const result = await domain.getListOffsetByUser(
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

            const result = await domain.getListCursorByUser(
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

            const result = await domain.getListOffsetByWorkspace(
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

            const result = await domain.getListCursorByWorkspace(
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
        it('returns the contract the util resolves', () => {
            activityLogUtil.getContract.mockReturnValue(targetContract);

            const result = domain['getContract'](
                EnumActivityLogAction.userLoginCredential
            );

            expect(result).toBe(targetContract);
            expect(activityLogUtil.getContract).toHaveBeenCalledWith(
                EnumActivityLogAction.userLoginCredential
            );
        });

        it('throws when the action carries no contract', () => {
            activityLogUtil.getContract.mockReturnValue(null);

            let thrown: unknown;
            try {
                domain['getContract']('notAnAction' as EnumActivityLogAction);
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toMatchObject(contractInvalid);
        });
    });

    describe('validateMetadata', () => {
        beforeEach(() => {
            activityLogUtil.getContract.mockReturnValue(targetContract);
        });

        it('returns the parsed metadata when it matches the contract', () => {
            activityLogUtil.parseMetadata.mockReturnValue({
                success: true,
                data: { targetUserId: 'user-1' },
            });

            const result = domain['validateMetadata'](
                EnumActivityLogAction.userLoginCredential,
                { targetUserId: 'user-1' }
            );

            expect(result).toEqual({ targetUserId: 'user-1' });
            expect(activityLogUtil.parseMetadata).toHaveBeenCalledWith(
                targetContract,
                { targetUserId: 'user-1' }
            );
        });

        it('throws with the zod error as the raw error when metadata breaks the contract', () => {
            const failedParse = ActivityLogEmptyMetadataSchema.safeParse({
                unexpected: 'value',
            });
            activityLogUtil.parseMetadata.mockReturnValue(failedParse);

            let thrown: unknown;
            try {
                domain['validateMetadata'](
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

    describe('resolveUserId', () => {
        it('returns the userId the util resolves', () => {
            activityLogUtil.resolveUserId.mockReturnValue('user-1');

            const result = domain['resolveUserId'](
                EnumActivityLogUser.target,
                'user-1',
                null
            );

            expect(result).toBe('user-1');
            expect(activityLogUtil.resolveUserId).toHaveBeenCalledWith(
                EnumActivityLogUser.target,
                'user-1',
                null
            );
        });

        it('throws when the util resolves no userId', () => {
            activityLogUtil.resolveUserId.mockReturnValue(null);

            let thrown: unknown;
            try {
                domain['resolveUserId'](EnumActivityLogUser.target, null, null);
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toMatchObject(contractInvalid);
        });
    });

    describe('resolveCreatedBy', () => {
        it('returns the createdBy the util resolves', () => {
            activityLogUtil.resolveCreatedBy.mockReturnValue('creator-1');

            const result = domain['resolveCreatedBy'](
                EnumActivityLogUser.target,
                'creator-1',
                'user-1'
            );

            expect(result).toBe('creator-1');
            expect(activityLogUtil.resolveCreatedBy).toHaveBeenCalledWith(
                EnumActivityLogUser.target,
                'creator-1',
                'user-1'
            );
        });

        it('throws when the util resolves no createdBy', () => {
            activityLogUtil.resolveCreatedBy.mockReturnValue(null);

            let thrown: unknown;
            try {
                domain['resolveCreatedBy'](
                    EnumActivityLogUser.target,
                    null,
                    'user-1'
                );
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toMatchObject(contractInvalid);
        });
    });

    describe('resolveWorkspaceId', () => {
        it('returns the workspaceId the util resolves once it passes the contract check', () => {
            activityLogUtil.resolveWorkspaceId.mockReturnValue('workspace-1');
            activityLogUtil.isWorkspaceFieldValid.mockReturnValue(true);

            const result = domain['resolveWorkspaceId'](
                EnumActivityLogWorkspace.target,
                'workspace-1'
            );

            expect(result).toBe('workspace-1');
            expect(activityLogUtil.resolveWorkspaceId).toHaveBeenCalledWith(
                EnumActivityLogWorkspace.target,
                'workspace-1'
            );
            expect(activityLogUtil.isWorkspaceFieldValid).toHaveBeenCalledWith(
                EnumActivityLogWorkspace.target,
                'workspace-1'
            );
            expect(requestStoreService.get).not.toHaveBeenCalled();
        });

        it('throws when the resolved workspaceId fails the contract check', () => {
            activityLogUtil.resolveWorkspaceId.mockReturnValue(null);
            activityLogUtil.isWorkspaceFieldValid.mockReturnValue(false);

            let thrown: unknown;
            try {
                domain['resolveWorkspaceId'](
                    EnumActivityLogWorkspace.target,
                    null
                );
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toMatchObject(contractInvalid);
        });

        it('returns the id of the workspace store for a payload resolution', () => {
            requestStoreService.get.mockReturnValue(workspace);

            const result = domain['resolveWorkspaceId'](
                EnumActivityLogWorkspace.payload,
                null
            );

            expect(result).toBe('workspace-1');
            expect(requestStoreService.get).toHaveBeenCalledWith(
                WorkspaceStoreKey
            );
            expect(activityLogUtil.resolveWorkspaceId).not.toHaveBeenCalled();
        });

        it('throws for a payload resolution with no workspace in the store', () => {
            requestStoreService.get.mockReturnValue(null);

            let thrown: unknown;
            try {
                domain['resolveWorkspaceId'](
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
            activityLogUtil.getContract.mockReturnValue(targetContract);
            activityLogUtil.parseMetadata.mockReturnValue({
                success: true,
                data: {},
            });
            activityLogUtil.resolveUserId.mockReturnValue('user-1');
            activityLogUtil.resolveCreatedBy.mockReturnValue('creator-1');
            activityLogUtil.resolveWorkspaceId.mockReturnValue(null);
            activityLogUtil.isWorkspaceFieldValid.mockReturnValue(true);
            activityLogUtil.getDescription.mockReturnValue(
                'User login with credential'
            );
            databaseUtil.createId.mockReturnValue('aaaaaaaaaaaaaaaaaaaaaaaa');

            const result = domain['buildFlushCreate'](
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
            expect(activityLogUtil.resolveCreatedBy).toHaveBeenCalledWith(
                targetContract.user,
                'creator-1',
                'user-1'
            );
            expect(activityLogUtil.getDescription).toHaveBeenCalledWith(
                EnumActivityLogAction.userLoginCredential,
                {}
            );
        });
    });
});
