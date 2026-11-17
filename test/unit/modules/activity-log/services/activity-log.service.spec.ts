import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import type { IRequestLog } from '@common/request/interfaces/request.interface';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import type { UserAgent } from '@generated/prisma-client/client';
import { ActivityLogActionContract } from '@modules/activity-log/contracts/activity-log.action.contract';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import {
    EnumActivityLogProcess,
    EnumActivityLogQueue,
    EnumActivityLogUser,
    EnumActivityLogWorkspace,
} from '@modules/activity-log/enums/activity-log.enum';
import { EnumActivityLogStatusCodeError } from '@modules/activity-log/enums/activity-log.status-code.enum';
import { ActivityLogContractInvalidException } from '@modules/activity-log/exceptions/activity-log.contract-invalid.exception';
import { ActivityLogEmptyMetadataSchema } from '@modules/activity-log/dtos/activity-log.empty-metadata.dto';
import type {
    IActivityLogContextPayload,
    IActivityLogCreate,
    IActivityLogInput,
} from '@modules/activity-log/interfaces/activity-log.interface';
import { ActivityLogRepository } from '@modules/activity-log/repositories/activity-log.repository';
import { ActivityLogUtil } from '@modules/activity-log/utils/activity-log.util';
import {
    buildRequestContext,
    buildApiKeyContext,
    buildAuthJwtAccessContext,
} from '@test/unit/helpers/test.unit.request.helper';

describe('ActivityLogService', () => {
    const activityLogRepository: MockProxy<ActivityLogRepository> =
        mock<ActivityLogRepository>();
    const activityLogUtil: MockProxy<ActivityLogUtil> = mock<ActivityLogUtil>();
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
                { provide: DatabaseUtil, useValue: databaseUtil },
                { provide: HelperDateService, useValue: helperDateService },
            ],
        }).compile();

        service = module.get(ActivityLogService);
    });

    describe('recordEffect', () => {
        it('builds the payload from the four contexts and records the entry from it', () => {
            const requestContext = buildRequestContext();
            const apiKeyContext = buildApiKeyContext();
            const authContext = buildAuthJwtAccessContext('actor-1');
            const payload: IActivityLogContextPayload = {
                apiKeyId: 'api-key-1',
                actorUserId: 'actor-1',
                workspaceId: null,
                requestLog,
            };
            activityLogUtil.toPayload.mockReturnValue(payload);
            activityLogUtil.getDescription.mockReturnValue('Description');
            databaseUtil.createId.mockReturnValue('aaaaaaaaaaaaaaaaaaaaaaaa');
            helperDateService.create.mockReturnValue(createdAt);
            helperDateService.formatToIso.mockReturnValue(
                '2026-01-01T00:00:00.000Z'
            );

            const result = service.recordEffect(
                requestContext,
                apiKeyContext,
                authContext,
                null,
                { action: EnumActivityLogAction.userUpdateProfile }
            );

            expect(activityLogUtil.toPayload).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                null
            );
            expect(result.data).toMatchObject({
                rows: [{ userId: 'actor-1', requestLog }],
            });
        });
    });

    describe('recordEffectFromPayload', () => {
        const payload: IActivityLogContextPayload = {
            actorUserId: 'actor-1',
            workspaceId: 'workspace-1',
            apiKeyId: 'api-key-1',
            requestLog,
        };

        beforeEach(() => {
            activityLogUtil.getDescription.mockReturnValue('Description');
            databaseUtil.createId.mockReturnValue('aaaaaaaaaaaaaaaaaaaaaaaa');
            helperDateService.create.mockReturnValue(createdAt);
            helperDateService.formatToIso.mockReturnValue(
                '2026-01-01T00:00:00.000Z'
            );
        });

        it('returns the createMany effect holding one row built from the input and the payload', () => {
            const result = service.recordEffectFromPayload(payload, {
                action: EnumActivityLogAction.userUpdateProfile,
                metadata: {},
            });

            expect(result).toEqual({
                queue: EnumActivityLogQueue.activityLog,
                name: EnumActivityLogProcess.createMany,
                data: {
                    rows: [
                        {
                            id: 'aaaaaaaaaaaaaaaaaaaaaaaa',
                            userId: 'actor-1',
                            createdBy: 'actor-1',
                            workspaceId: null,
                            action: EnumActivityLogAction.userUpdateProfile,
                            description: 'Description',
                            requestLog,
                            metadata: {},
                            createdAt: '2026-01-01T00:00:00.000Z',
                        },
                    ],
                },
                priority: EnumQueuePriority.low,
                idempotencyKey: null,
            });
            expect(helperDateService.formatToIso).toHaveBeenCalledWith(
                createdAt
            );
        });

        it('keeps the input user and createdBy for a target action', () => {
            const result = service.recordEffectFromPayload(payload, {
                action: EnumActivityLogAction.userLoginCredential,
                userId: 'user-1',
                createdBy: 'creator-1',
            });

            expect(result.data).toMatchObject({
                rows: [{ userId: 'user-1', createdBy: 'creator-1' }],
            });
        });

        it('records userVerifyMfaFailed on a public route with the user id and createdBy the contract requires', () => {
            const result = service.recordEffectFromPayload(
                { ...payload, actorUserId: null, workspaceId: null },
                {
                    action: EnumActivityLogAction.userVerifyMfaFailed,
                    userId: 'user-1',
                    createdBy: 'user-1',
                }
            );

            expect(result.data).toMatchObject({
                rows: [
                    {
                        action: EnumActivityLogAction.userVerifyMfaFailed,
                        userId: 'user-1',
                        createdBy: 'user-1',
                        workspaceId: null,
                    },
                ],
            });
        });

        it('throws for userVerifyMfaFailed on a public route when the entry omits the user id and createdBy', () => {
            let thrown: unknown;
            try {
                service.recordEffectFromPayload(
                    { ...payload, actorUserId: null, workspaceId: null },
                    { action: EnumActivityLogAction.userVerifyMfaFailed }
                );
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toMatchObject(contractInvalid);
        });

        it('throws when the action carries no contract', () => {
            let thrown: unknown;
            try {
                service.recordEffectFromPayload(payload, {
                    action: 'notAnAction' as EnumActivityLogAction,
                });
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toMatchObject(contractInvalid);
        });

        it('throws when a target action omits its user field', () => {
            let thrown: unknown;
            try {
                service.recordEffectFromPayload(payload, {
                    action: EnumActivityLogAction.userLoginCredential,
                    createdBy: 'creator-1',
                });
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toMatchObject(contractInvalid);
        });

        it('throws when a workspace target action omits its workspaceId', () => {
            let thrown: unknown;
            try {
                service.recordEffectFromPayload(payload, {
                    action: EnumActivityLogAction.workspaceCreated,
                    userId: 'user-1',
                    createdBy: 'creator-1',
                });
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toMatchObject(contractInvalid);
        });

        it('throws when a payload action has no actor in the payload', () => {
            let thrown: unknown;
            try {
                service.recordEffectFromPayload(
                    { ...payload, actorUserId: null },
                    { action: EnumActivityLogAction.userUpdateProfile }
                );
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toMatchObject(contractInvalid);
        });

        it('throws with the zod error as the raw error when metadata breaks the contract', () => {
            let thrown: unknown;
            try {
                service.recordEffectFromPayload(payload, {
                    action: EnumActivityLogAction.userUpdateProfile,
                    metadata: { unexpected: 'value' },
                });
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toMatchObject(contractInvalid);
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
                'workspace-1',
                null
            );

            expect(result).toBeNull();
        });

        it('returns the staged workspaceId for a target resolution', () => {
            const result = service['resolveWorkspaceId'](
                EnumActivityLogWorkspace.target,
                'workspace-1',
                null
            );

            expect(result).toBe('workspace-1');
        });

        it('throws for a target resolution with no staged workspaceId', () => {
            let thrown: unknown;
            try {
                service['resolveWorkspaceId'](
                    EnumActivityLogWorkspace.target,
                    null,
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
                    '',
                    null
                );
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toMatchObject(contractInvalid);
        });

        it('returns the payload workspaceId for a payload resolution', () => {
            const result = service['resolveWorkspaceId'](
                EnumActivityLogWorkspace.payload,
                null,
                'workspace-1'
            );

            expect(result).toBe('workspace-1');
        });

        it('throws for a payload resolution with no payload workspaceId', () => {
            let thrown: unknown;
            try {
                service['resolveWorkspaceId'](
                    EnumActivityLogWorkspace.payload,
                    null,
                    null
                );
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toMatchObject(contractInvalid);
        });

        it('throws for a payload resolution with an empty payload workspaceId', () => {
            let thrown: unknown;
            try {
                service['resolveWorkspaceId'](
                    EnumActivityLogWorkspace.payload,
                    null,
                    ''
                );
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toMatchObject(contractInvalid);
        });
    });

    describe('buildCreate', () => {
        it('assembles the create row from an activity log input', () => {
            const activityLog: IActivityLogInput<EnumActivityLogAction> = {
                action: EnumActivityLogAction.userLoginCredential,
                metadata: {},
                userId: 'user-1',
                createdBy: 'creator-1',
            };
            activityLogUtil.getDescription.mockReturnValue(
                'User login with credential'
            );
            databaseUtil.createId.mockReturnValue('aaaaaaaaaaaaaaaaaaaaaaaa');

            const result = service['buildCreate'](
                activityLog,
                null,
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
