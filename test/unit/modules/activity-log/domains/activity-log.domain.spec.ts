import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { RequestLogStoreKey } from '@common/request/constants/request.constant';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import type { IRequestLog } from '@common/request/interfaces/request.interface';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import type { UserAgent, Workspace } from '@generated/prisma-client/client';
import { ActivityLogStageStoreKey } from '@modules/activity-log/constants/activity-log.constant';
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
            ],
        }).compile();

        domain = module.get(ActivityLogDomain);
    });

    describe('prepare', () => {
        it('stages a target-user activity log with the staged user, createdBy, and no workspace', () => {
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
        });

        it('stages null userId, createdBy, and workspaceId for a payload-user, no-workspace action', () => {
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

        it('stages a target-workspace activity log with its workspaceId', () => {
            const result = domain.prepare({
                action: EnumActivityLogAction.workspaceCreated,
                userId: 'user-1',
                createdBy: 'creator-1',
                workspaceId: 'workspace-1',
            });

            expect(result).toEqual({
                action: EnumActivityLogAction.workspaceCreated,
                metadata: {},
                userId: 'user-1',
                createdBy: 'creator-1',
                workspaceId: 'workspace-1',
            });
        });

        it('throws when the action carries no contract', () => {
            let thrown: unknown;
            try {
                domain.prepare({
                    action: 'notAnAction' as EnumActivityLogAction,
                });
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toMatchObject({
                constructor: ActivityLogContractInvalidException,
                module: 'activityLog',
                statusCode: EnumActivityLogStatusCodeError.contractInvalid,
                statusCodeKey:
                    EnumActivityLogStatusCodeError[
                        EnumActivityLogStatusCodeError.contractInvalid
                    ],
                messagePath: 'activityLog.error.contractInvalid',
            });
        });

        it('throws when metadata breaks the action contract', () => {
            const expectedRawError = ActivityLogEmptyMetadataSchema.safeParse({
                unexpected: 'value',
            }).error;

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
                constructor: ActivityLogContractInvalidException,
                module: 'activityLog',
                statusCode: EnumActivityLogStatusCodeError.contractInvalid,
                statusCodeKey:
                    EnumActivityLogStatusCodeError[
                        EnumActivityLogStatusCodeError.contractInvalid
                    ],
                messagePath: 'activityLog.error.contractInvalid',
                rawError: expectedRawError,
            });
        });

        it('throws when a target-user action carries no userId', () => {
            let thrown: unknown;
            try {
                domain.prepare({
                    action: EnumActivityLogAction.userLoginCredential,
                    createdBy: 'creator-1',
                });
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toMatchObject({
                constructor: ActivityLogContractInvalidException,
                module: 'activityLog',
                statusCode: EnumActivityLogStatusCodeError.contractInvalid,
                statusCodeKey:
                    EnumActivityLogStatusCodeError[
                        EnumActivityLogStatusCodeError.contractInvalid
                    ],
                messagePath: 'activityLog.error.contractInvalid',
            });
        });

        it('throws when a target-workspace action carries no workspaceId', () => {
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

            expect(thrown).toMatchObject({
                constructor: ActivityLogContractInvalidException,
                module: 'activityLog',
                statusCode: EnumActivityLogStatusCodeError.contractInvalid,
                statusCodeKey:
                    EnumActivityLogStatusCodeError[
                        EnumActivityLogStatusCodeError.contractInvalid
                    ],
                messagePath: 'activityLog.error.contractInvalid',
            });
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

        it('throws when the request log is missing', async () => {
            const staged: IActivityLogStaged[] = [
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
                    return null;
                }
            );

            await expect(
                domain.flushStaged({ payloadUserId: null })
            ).rejects.toMatchObject({
                constructor: ActivityLogContractInvalidException,
                module: 'activityLog',
                statusCode: EnumActivityLogStatusCodeError.contractInvalid,
                statusCodeKey:
                    EnumActivityLogStatusCodeError[
                        EnumActivityLogStatusCodeError.contractInvalid
                    ],
                messagePath: 'activityLog.error.contractInvalid',
            });
            expect(activityLogQueue.createMany).not.toHaveBeenCalled();
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
            activityLogUtil.getDescription.mockReturnValue('Description');

            await domain.flushStaged({ payloadUserId: 'payload-user-1' });

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

        it('keeps the staged list when the enqueue fails', async () => {
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
            activityLogUtil.getDescription.mockReturnValue('Description');
            activityLogQueue.createMany.mockRejectedValue(failure);

            const rejection = domain.flushStaged({ payloadUserId: null });

            await expect(rejection).rejects.toBe(failure);
            expect(requestStoreService.set).not.toHaveBeenCalled();
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
            const pagination = { limit: 20, orderBy: [] };
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
            const pagination = { limit: 20, orderBy: [] };
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
        it('returns the contract for a known action', () => {
            const result = domain['getContract'](
                EnumActivityLogAction.userLoginCredential
            );

            expect(result).toMatchObject({
                user: EnumActivityLogUser.target,
                workspace: EnumActivityLogWorkspace.none,
            });
        });

        it('throws when the action carries no contract', () => {
            let thrown: unknown;
            try {
                domain['getContract']('notAnAction' as EnumActivityLogAction);
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toMatchObject({
                constructor: ActivityLogContractInvalidException,
                module: 'activityLog',
                statusCode: EnumActivityLogStatusCodeError.contractInvalid,
                statusCodeKey:
                    EnumActivityLogStatusCodeError[
                        EnumActivityLogStatusCodeError.contractInvalid
                    ],
                messagePath: 'activityLog.error.contractInvalid',
            });
        });
    });

    describe('validateMetadata', () => {
        it('returns the parsed metadata when it matches the contract', () => {
            const result = domain['validateMetadata'](
                EnumActivityLogAction.userLoginCredential,
                {}
            );

            expect(result).toEqual({});
        });

        it('throws with the zod error as the raw error when metadata breaks the contract', () => {
            const expectedRawError = ActivityLogEmptyMetadataSchema.safeParse({
                unexpected: 'value',
            }).error;

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
                constructor: ActivityLogContractInvalidException,
                module: 'activityLog',
                statusCode: EnumActivityLogStatusCodeError.contractInvalid,
                statusCodeKey:
                    EnumActivityLogStatusCodeError[
                        EnumActivityLogStatusCodeError.contractInvalid
                    ],
                messagePath: 'activityLog.error.contractInvalid',
                rawError: expectedRawError,
            });
        });
    });

    describe('assertTargetOnlyField', () => {
        it('accepts a target resolution with a value', () => {
            expect(() =>
                domain['assertTargetOnlyField'](
                    EnumActivityLogUser.target,
                    'user-1'
                )
            ).not.toThrow();
        });

        it('throws for a target resolution with no value', () => {
            let thrown: unknown;
            try {
                domain['assertTargetOnlyField'](
                    EnumActivityLogUser.target,
                    null
                );
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toMatchObject({
                constructor: ActivityLogContractInvalidException,
                module: 'activityLog',
                statusCode: EnumActivityLogStatusCodeError.contractInvalid,
                statusCodeKey:
                    EnumActivityLogStatusCodeError[
                        EnumActivityLogStatusCodeError.contractInvalid
                    ],
                messagePath: 'activityLog.error.contractInvalid',
            });
        });

        it('accepts a payload resolution with no value', () => {
            expect(() =>
                domain['assertTargetOnlyField'](
                    EnumActivityLogUser.payload,
                    null
                )
            ).not.toThrow();
        });

        it('throws for a payload resolution carrying a value', () => {
            let thrown: unknown;
            try {
                domain['assertTargetOnlyField'](
                    EnumActivityLogUser.payload,
                    'user-1'
                );
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toMatchObject({
                constructor: ActivityLogContractInvalidException,
                module: 'activityLog',
                statusCode: EnumActivityLogStatusCodeError.contractInvalid,
                statusCodeKey:
                    EnumActivityLogStatusCodeError[
                        EnumActivityLogStatusCodeError.contractInvalid
                    ],
                messagePath: 'activityLog.error.contractInvalid',
            });
        });
    });

    describe('assertWorkspaceFields', () => {
        it('accepts a target resolution with a workspaceId', () => {
            expect(() =>
                domain['assertWorkspaceFields'](
                    EnumActivityLogWorkspace.target,
                    'workspace-1'
                )
            ).not.toThrow();
        });

        it('throws for a target resolution with no workspaceId', () => {
            let thrown: unknown;
            try {
                domain['assertWorkspaceFields'](
                    EnumActivityLogWorkspace.target,
                    null
                );
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toMatchObject({
                constructor: ActivityLogContractInvalidException,
                module: 'activityLog',
                statusCode: EnumActivityLogStatusCodeError.contractInvalid,
                statusCodeKey:
                    EnumActivityLogStatusCodeError[
                        EnumActivityLogStatusCodeError.contractInvalid
                    ],
                messagePath: 'activityLog.error.contractInvalid',
            });
        });

        it('accepts a none resolution with an null workspaceId', () => {
            expect(() =>
                domain['assertWorkspaceFields'](
                    EnumActivityLogWorkspace.none,
                    null
                )
            ).not.toThrow();
        });

        it('throws for a none resolution carrying a workspaceId', () => {
            let thrown: unknown;
            try {
                domain['assertWorkspaceFields'](
                    EnumActivityLogWorkspace.none,
                    'workspace-1'
                );
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toMatchObject({
                constructor: ActivityLogContractInvalidException,
                module: 'activityLog',
                statusCode: EnumActivityLogStatusCodeError.contractInvalid,
                statusCodeKey:
                    EnumActivityLogStatusCodeError[
                        EnumActivityLogStatusCodeError.contractInvalid
                    ],
                messagePath: 'activityLog.error.contractInvalid',
            });
        });

        it('accepts a payload resolution with an null workspaceId', () => {
            expect(() =>
                domain['assertWorkspaceFields'](
                    EnumActivityLogWorkspace.payload,
                    null
                )
            ).not.toThrow();
        });

        it('throws for a payload resolution carrying a workspaceId', () => {
            let thrown: unknown;
            try {
                domain['assertWorkspaceFields'](
                    EnumActivityLogWorkspace.payload,
                    'workspace-1'
                );
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toMatchObject({
                constructor: ActivityLogContractInvalidException,
                module: 'activityLog',
                statusCode: EnumActivityLogStatusCodeError.contractInvalid,
                statusCodeKey:
                    EnumActivityLogStatusCodeError[
                        EnumActivityLogStatusCodeError.contractInvalid
                    ],
                messagePath: 'activityLog.error.contractInvalid',
            });
        });
    });

    describe('resolveUserId', () => {
        it('returns the staged userId for a target resolution', () => {
            const result = domain['resolveUserId'](
                EnumActivityLogUser.target,
                'user-1',
                null
            );

            expect(result).toBe('user-1');
        });

        it('throws for a target resolution with no staged userId', () => {
            let thrown: unknown;
            try {
                domain['resolveUserId'](EnumActivityLogUser.target, null, null);
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toMatchObject({
                constructor: ActivityLogContractInvalidException,
                module: 'activityLog',
                statusCode: EnumActivityLogStatusCodeError.contractInvalid,
                statusCodeKey:
                    EnumActivityLogStatusCodeError[
                        EnumActivityLogStatusCodeError.contractInvalid
                    ],
                messagePath: 'activityLog.error.contractInvalid',
            });
        });

        it('returns the payload userId for a payload resolution', () => {
            const result = domain['resolveUserId'](
                EnumActivityLogUser.payload,
                null,
                'payload-user-1'
            );

            expect(result).toBe('payload-user-1');
        });

        it('throws for a payload resolution with no payload userId', () => {
            let thrown: unknown;
            try {
                domain['resolveUserId'](
                    EnumActivityLogUser.payload,
                    null,
                    null
                );
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toMatchObject({
                constructor: ActivityLogContractInvalidException,
                module: 'activityLog',
                statusCode: EnumActivityLogStatusCodeError.contractInvalid,
                statusCodeKey:
                    EnumActivityLogStatusCodeError[
                        EnumActivityLogStatusCodeError.contractInvalid
                    ],
                messagePath: 'activityLog.error.contractInvalid',
            });
        });
    });

    describe('resolveCreatedBy', () => {
        it('returns the staged createdBy for a target resolution', () => {
            const result = domain['resolveCreatedBy'](
                EnumActivityLogUser.target,
                'creator-1',
                'user-1'
            );

            expect(result).toBe('creator-1');
        });

        it('throws for a target resolution with no staged createdBy', () => {
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

            expect(thrown).toMatchObject({
                constructor: ActivityLogContractInvalidException,
                module: 'activityLog',
                statusCode: EnumActivityLogStatusCodeError.contractInvalid,
                statusCodeKey:
                    EnumActivityLogStatusCodeError[
                        EnumActivityLogStatusCodeError.contractInvalid
                    ],
                messagePath: 'activityLog.error.contractInvalid',
            });
        });

        it('returns the resolved userId for a payload resolution', () => {
            const result = domain['resolveCreatedBy'](
                EnumActivityLogUser.payload,
                null,
                'user-1'
            );

            expect(result).toBe('user-1');
        });
    });

    describe('resolveWorkspaceId', () => {
        it('returns null for a none resolution', () => {
            const result = domain['resolveWorkspaceId'](
                EnumActivityLogWorkspace.none,
                'workspace-1'
            );

            expect(result).toBeNull();
        });

        it('returns the staged workspaceId for a target resolution', () => {
            const result = domain['resolveWorkspaceId'](
                EnumActivityLogWorkspace.target,
                'workspace-1'
            );

            expect(result).toBe('workspace-1');
        });

        it('throws for a target resolution with no staged workspaceId', () => {
            let thrown: unknown;
            try {
                domain['resolveWorkspaceId'](
                    EnumActivityLogWorkspace.target,
                    null
                );
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toMatchObject({
                constructor: ActivityLogContractInvalidException,
                module: 'activityLog',
                statusCode: EnumActivityLogStatusCodeError.contractInvalid,
                statusCodeKey:
                    EnumActivityLogStatusCodeError[
                        EnumActivityLogStatusCodeError.contractInvalid
                    ],
                messagePath: 'activityLog.error.contractInvalid',
            });
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

            expect(thrown).toMatchObject({
                constructor: ActivityLogContractInvalidException,
                module: 'activityLog',
                statusCode: EnumActivityLogStatusCodeError.contractInvalid,
                statusCodeKey:
                    EnumActivityLogStatusCodeError[
                        EnumActivityLogStatusCodeError.contractInvalid
                    ],
                messagePath: 'activityLog.error.contractInvalid',
            });
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
        });
    });
});
