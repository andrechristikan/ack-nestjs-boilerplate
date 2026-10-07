import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { RequestLogStoreKey } from '@common/request/constants/request.constant';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import type { IRequestLog } from '@common/request/interfaces/request.interface';
import { RequestStoreService } from '@common/request/services/request.store.service';
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
    IActivityLogStagedEvent,
    IActivityLogStageInput,
} from '@modules/activity-log/interfaces/activity-log.interface';
import { ActivityLogRepository } from '@modules/activity-log/repositories/activity-log.repository';
import { ActivityLogUtil } from '@modules/activity-log/utils/activity-log.util';
import { WorkspaceStoreKey } from '@modules/workspace/constants/workspace.constant';

describe('ActivityLogDomain', () => {
    const activityLogRepository: MockProxy<ActivityLogRepository> =
        mock<ActivityLogRepository>();
    const activityLogUtil: MockProxy<ActivityLogUtil> = mock<ActivityLogUtil>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();

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
            ],
        }).compile();

        domain = module.get(ActivityLogDomain);
    });

    describe('prepare', () => {
        it('stages a target-user event with the staged user, createdBy, and no workspace', () => {
            const input: IActivityLogStageInput<EnumActivityLogAction> = {
                action: EnumActivityLogAction.userLoginCredential,
                userId: 'user-1',
                createdBy: 'creator-1',
            };

            const result = domain.prepare(input);

            expect(result).toEqual({
                action: EnumActivityLogAction.userLoginCredential,
                metadata: {},
                onError: false,
                userId: 'user-1',
                createdBy: 'creator-1',
                workspaceId: null,
            });
        });

        it('marks the event onError when onError is true', () => {
            const result = domain.prepare({
                action: EnumActivityLogAction.userLoginCredential,
                userId: 'user-1',
                createdBy: 'creator-1',
                onError: true,
            });

            expect(result.onError).toBe(true);
        });

        it('stages null userId, createdBy, and workspaceId for a payload-user, no-workspace action', () => {
            const result = domain.prepare({
                action: EnumActivityLogAction.userUpdateProfile,
            });

            expect(result).toEqual({
                action: EnumActivityLogAction.userUpdateProfile,
                metadata: {},
                onError: false,
                userId: null,
                createdBy: null,
                workspaceId: null,
            });
        });

        it('stages a target-workspace event with its workspaceId', () => {
            const result = domain.prepare({
                action: EnumActivityLogAction.workspaceCreated,
                userId: 'user-1',
                createdBy: 'creator-1',
                workspaceId: 'workspace-1',
            });

            expect(result).toEqual({
                action: EnumActivityLogAction.workspaceCreated,
                metadata: {},
                onError: false,
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
        it('does nothing when given no events', () => {
            domain.stagePrepared([]);

            expect(requestStoreService.get).not.toHaveBeenCalled();
            expect(requestStoreService.set).not.toHaveBeenCalled();
        });

        it('sets the store to the given events when nothing was staged before', () => {
            requestStoreService.get.mockReturnValue(null);
            const events: IActivityLogStagedEvent[] = [
                {
                    action: EnumActivityLogAction.userLoginCredential,
                    metadata: {},
                    onError: false,
                    userId: null,
                    createdBy: null,
                    workspaceId: null,
                },
            ];

            domain.stagePrepared(events);

            expect(requestStoreService.set).toHaveBeenCalledWith(
                ActivityLogStageStoreKey,
                events
            );
        });

        it('appends the given events onto what was already staged', () => {
            const alreadyStaged: IActivityLogStagedEvent = {
                action: EnumActivityLogAction.userLogout,
                metadata: {},
                onError: false,
                userId: null,
                createdBy: null,
                workspaceId: null,
            };
            requestStoreService.get.mockReturnValue([alreadyStaged]);
            const events: IActivityLogStagedEvent[] = [
                {
                    action: EnumActivityLogAction.userLoginCredential,
                    metadata: {},
                    onError: false,
                    userId: null,
                    createdBy: null,
                    workspaceId: null,
                },
            ];

            domain.stagePrepared(events);

            expect(requestStoreService.set).toHaveBeenCalledWith(
                ActivityLogStageStoreKey,
                [alreadyStaged, ...events]
            );
        });
    });

    describe('flushStaged', () => {
        it('does nothing when nothing is staged', async () => {
            requestStoreService.get.mockReturnValue(null);

            await domain.flushStaged({ payloadUserId: null, isError: false });

            expect(activityLogRepository.createMany).not.toHaveBeenCalled();
        });

        it('does nothing when the staged list is empty', async () => {
            requestStoreService.get.mockReturnValue([]);

            await domain.flushStaged({ payloadUserId: null, isError: false });

            expect(activityLogRepository.createMany).not.toHaveBeenCalled();
        });

        it('resets the store and skips the repository when every staged event fails the error filter', async () => {
            const staged: IActivityLogStagedEvent[] = [
                {
                    action: EnumActivityLogAction.userLoginCredential,
                    metadata: {},
                    onError: false,
                    userId: null,
                    createdBy: null,
                    workspaceId: null,
                },
            ];
            requestStoreService.get.mockReturnValue(staged);

            await domain.flushStaged({ payloadUserId: null, isError: true });

            expect(activityLogRepository.createMany).not.toHaveBeenCalled();
            expect(requestStoreService.set).toHaveBeenCalledWith(
                ActivityLogStageStoreKey,
                []
            );
        });

        it('throws when the request log is missing', async () => {
            const staged: IActivityLogStagedEvent[] = [
                {
                    action: EnumActivityLogAction.userLoginCredential,
                    metadata: {},
                    onError: false,
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
                domain.flushStaged({ payloadUserId: null, isError: false })
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
        });

        it('flushes every staged event for a target-user action on success', async () => {
            const staged: IActivityLogStagedEvent[] = [
                {
                    action: EnumActivityLogAction.userLoginCredential,
                    metadata: {},
                    onError: false,
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
            activityLogUtil.getDescription.mockReturnValue(
                'User login with credential'
            );

            await domain.flushStaged({ payloadUserId: null, isError: false });

            expect(activityLogRepository.createMany).toHaveBeenCalledWith([
                {
                    userId: 'user-1',
                    createdBy: 'creator-1',
                    workspaceId: null,
                    action: EnumActivityLogAction.userLoginCredential,
                    description: 'User login with credential',
                    requestLog,
                    metadata: {},
                },
            ]);
            expect(requestStoreService.set).toHaveBeenCalledWith(
                ActivityLogStageStoreKey,
                []
            );
        });

        it('flushes only the onError events for a payload-user action on error', async () => {
            const staged: IActivityLogStagedEvent[] = [
                {
                    action: EnumActivityLogAction.userUpdateProfile,
                    metadata: {},
                    onError: true,
                    userId: null,
                    createdBy: null,
                    workspaceId: null,
                },
                {
                    action: EnumActivityLogAction.userLogout,
                    metadata: {},
                    onError: false,
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
            activityLogUtil.getDescription.mockReturnValue('Profile updated');

            await domain.flushStaged({
                payloadUserId: 'payload-user-1',
                isError: true,
            });

            expect(activityLogRepository.createMany).toHaveBeenCalledWith([
                {
                    userId: 'payload-user-1',
                    createdBy: 'payload-user-1',
                    workspaceId: null,
                    action: EnumActivityLogAction.userUpdateProfile,
                    description: 'Profile updated',
                    requestLog,
                    metadata: {},
                },
            ]);
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
        it('assembles the create row from a staged event', () => {
            const event: IActivityLogStagedEvent = {
                action: EnumActivityLogAction.userLoginCredential,
                metadata: {},
                onError: false,
                userId: 'user-1',
                createdBy: 'creator-1',
                workspaceId: null,
            };
            activityLogUtil.getDescription.mockReturnValue(
                'User login with credential'
            );

            const result = domain['buildFlushCreate'](event, null, requestLog);

            expect(result).toEqual({
                userId: 'user-1',
                createdBy: 'creator-1',
                workspaceId: null,
                action: EnumActivityLogAction.userLoginCredential,
                description: 'User login with credential',
                requestLog,
                metadata: {},
            });
        });
    });
});
