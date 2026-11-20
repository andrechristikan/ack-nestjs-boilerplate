import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { IRequestLog } from '@common/request/interfaces/request.interface';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import { ConfigService } from '@nestjs/config';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { MessageService } from '@common/message/services/message.service';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import {
    TestUnitKitConfigValues,
    TestUnitKitProviders,
} from '@test/unit/helpers/test.unit.kit.helper';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import type { UserAgent } from '@generated/prisma-client/client';
import { ActivityLogActionContract } from '@modules/activity-log/contracts/activity-log.action.contract';
import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
import { getQueueToken } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { CacheService } from '@common/cache/services/cache.service';
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
    IActivityLogInput,
} from '@modules/activity-log/interfaces/activity-log.interface';
import { ActivityLogUtil } from '@modules/activity-log/utils/activity-log.util';
import {
    buildRequestContext,
    buildApiKeyContext,
    buildAuthJwtAccessContext,
    buildWorkspace,
    buildWorkspaceContext,
    buildWorkspaceMember,
} from '@test/unit/helpers/test.unit.request.helper';

describe('ActivityLogQueue', () => {
    const messageService: MockProxy<MessageService> = mock<MessageService>();
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
    };

    let queue: ActivityLogQueue;

    beforeAll(() => {
        vi.useFakeTimers();
        vi.setSystemTime(createdAt);
    });

    afterAll(() => {
        vi.useRealTimers();
    });

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ActivityLogQueue,
                {
                    provide: getQueueToken(EnumActivityLogQueue.activityLog),
                    useValue: mock<Queue>(),
                },
                { provide: CacheService, useValue: mock<CacheService>() },
                ActivityLogUtil,
                { provide: MessageService, useValue: messageService },
                ...TestUnitKitProviders,
                {
                    provide: ConfigService,
                    useValue: buildConfigService(TestUnitKitConfigValues),
                },
            ],
        }).compile();

        messageService.setMessage.mockReturnValue('Description');
        vi.spyOn(module.get(DatabaseUtil), 'createId').mockReturnValue(
            'aaaaaaaaaaaaaaaaaaaaaaaa'
        );

        queue = module.get(ActivityLogQueue);
    });

    describe('toPayload', () => {
        it('carries the ids and the request log of the four contexts', () => {
            const requestContext = buildRequestContext();
            const apiKeyContext = buildApiKeyContext();
            const authContext = buildAuthJwtAccessContext('actor-1');
            const workspaceContext = buildWorkspaceContext(
                buildWorkspace(),
                buildWorkspaceMember('actor-1')
            );

            const result = queue.toPayload(
                requestContext,
                apiKeyContext,
                authContext,
                workspaceContext
            );

            expect(result).toEqual({
                apiKeyId: apiKeyContext.apiKey.id,
                actorUserId: 'actor-1',
                workspaceId: workspaceContext.workspaceId,
                requestLog: requestContext.requestLog,
            });
        });

        it('carries a null actor and workspace when the route has none', () => {
            const requestContext = buildRequestContext();
            const apiKeyContext = buildApiKeyContext();

            const result = queue.toPayload(
                requestContext,
                apiKeyContext,
                null,
                null
            );

            expect(result).toEqual({
                apiKeyId: apiKeyContext.apiKey.id,
                actorUserId: null,
                workspaceId: null,
                requestLog: requestContext.requestLog,
            });
        });
    });

    describe('recordEffect', () => {
        it('returns the createMany effect on the activityLog queue holding one row from the contexts', () => {
            const requestContext = buildRequestContext();
            const apiKeyContext = buildApiKeyContext();
            const authContext = buildAuthJwtAccessContext('actor-1');
            const workspaceContext = buildWorkspaceContext(
                buildWorkspace(),
                buildWorkspaceMember('actor-1')
            );
            const result = queue.recordEffect(
                requestContext,
                apiKeyContext,
                authContext,
                workspaceContext,
                { action: EnumActivityLogAction.userUpdateProfile }
            );

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
                            requestLog: requestContext.requestLog,
                            metadata: {},
                            createdAt: '2026-01-01T00:00:00.000Z',
                        },
                    ],
                },
                priority: EnumQueuePriority.low,
                idempotencyKey: null,
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

        it('returns the createMany effect holding one row built from the input and the payload', () => {
            const result = queue.recordEffectFromPayload(payload, {
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
        });

        it('keeps the input user and createdBy for a target action', () => {
            const result = queue.recordEffectFromPayload(payload, {
                action: EnumActivityLogAction.userLoginCredential,
                userId: 'user-1',
                createdBy: 'creator-1',
            });

            expect(result.data).toMatchObject({
                rows: [{ userId: 'user-1', createdBy: 'creator-1' }],
            });
        });

        it('records userVerifyMfaFailed on a public route with the user id and createdBy the contract requires', () => {
            const result = queue.recordEffectFromPayload(
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
                queue.recordEffectFromPayload(
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
                queue.recordEffectFromPayload(payload, {
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
                queue.recordEffectFromPayload(payload, {
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
                queue.recordEffectFromPayload(payload, {
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
                queue.recordEffectFromPayload(
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
                queue.recordEffectFromPayload(payload, {
                    action: EnumActivityLogAction.userUpdateProfile,
                    metadata: { unexpected: 'value' },
                });
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toMatchObject(contractInvalid);
        });
    });

    describe('getContract', () => {
        it('returns the contract for a known action', () => {
            const result = queue['getContract'](
                EnumActivityLogAction.userLoginCredential
            );

            expect(result).toBe(targetContract);
        });

        it('throws when the action carries no contract', () => {
            let thrown: unknown;
            try {
                queue['getContract']('notAnAction' as EnumActivityLogAction);
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toMatchObject(contractInvalid);
        });
    });

    describe('parseMetadata', () => {
        it('returns a successful parse when metadata matches the contract', () => {
            const result = queue['parseMetadata'](targetContract, {});

            expect(result).toEqual({ success: true, data: {} });
        });

        it('returns the failed parse with the zod error when metadata breaks the contract', () => {
            const expectedError = ActivityLogEmptyMetadataSchema.safeParse({
                unexpected: 'value',
            }).error;

            const result = queue['parseMetadata'](targetContract, {
                unexpected: 'value',
            });

            expect(result.error?.issues).toEqual([
                expect.objectContaining({
                    path: [],
                    code: 'unrecognized_keys',
                }),
            ]);
            expect(result.error).toEqual(expectedError);
        });
    });

    describe('validateMetadata', () => {
        it('returns the parsed metadata when it matches the contract', () => {
            const result = queue['validateMetadata'](
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
                queue['validateMetadata'](
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
                queue['isTargetOnlyFieldValid'](
                    EnumActivityLogUser.target,
                    'user-1'
                )
            ).toBe(true);
        });

        it('rejects a target resolution with no value', () => {
            expect(
                queue['isTargetOnlyFieldValid'](
                    EnumActivityLogUser.target,
                    null
                )
            ).toBe(false);
        });

        it('rejects a target resolution with an empty value', () => {
            expect(
                queue['isTargetOnlyFieldValid'](EnumActivityLogUser.target, '')
            ).toBe(false);
        });

        it('accepts a payload resolution with no value', () => {
            expect(
                queue['isTargetOnlyFieldValid'](
                    EnumActivityLogUser.payload,
                    null
                )
            ).toBe(true);
        });

        it('rejects a payload resolution carrying a value', () => {
            expect(
                queue['isTargetOnlyFieldValid'](
                    EnumActivityLogUser.payload,
                    'user-1'
                )
            ).toBe(false);
        });
    });

    describe('isWorkspaceFieldValid', () => {
        it('accepts a target resolution with a workspaceId', () => {
            expect(
                queue['isWorkspaceFieldValid'](
                    EnumActivityLogWorkspace.target,
                    'workspace-1'
                )
            ).toBe(true);
        });

        it('rejects a target resolution with no workspaceId', () => {
            expect(
                queue['isWorkspaceFieldValid'](
                    EnumActivityLogWorkspace.target,
                    null
                )
            ).toBe(false);
        });

        it('accepts a none resolution with a null workspaceId', () => {
            expect(
                queue['isWorkspaceFieldValid'](
                    EnumActivityLogWorkspace.none,
                    null
                )
            ).toBe(true);
        });

        it('rejects a none resolution carrying a workspaceId', () => {
            expect(
                queue['isWorkspaceFieldValid'](
                    EnumActivityLogWorkspace.none,
                    'workspace-1'
                )
            ).toBe(false);
        });

        it('accepts a payload resolution with a null workspaceId', () => {
            expect(
                queue['isWorkspaceFieldValid'](
                    EnumActivityLogWorkspace.payload,
                    null
                )
            ).toBe(true);
        });

        it('rejects a payload resolution carrying a workspaceId', () => {
            expect(
                queue['isWorkspaceFieldValid'](
                    EnumActivityLogWorkspace.payload,
                    'workspace-1'
                )
            ).toBe(false);
        });
    });

    describe('resolveUserId', () => {
        it('returns the staged userId for a target resolution', () => {
            const result = queue['resolveUserId'](
                EnumActivityLogUser.target,
                'user-1',
                null
            );

            expect(result).toBe('user-1');
        });

        it('throws for a target resolution with no staged userId', () => {
            let thrown: unknown;
            try {
                queue['resolveUserId'](
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
            const result = queue['resolveUserId'](
                EnumActivityLogUser.payload,
                null,
                'payload-user-1'
            );

            expect(result).toBe('payload-user-1');
        });

        it('throws for a payload resolution with an empty payload userId', () => {
            let thrown: unknown;
            try {
                queue['resolveUserId'](EnumActivityLogUser.payload, null, '');
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toMatchObject(contractInvalid);
        });
    });

    describe('resolveCreatedBy', () => {
        it('returns the staged createdBy for a target resolution', () => {
            const result = queue['resolveCreatedBy'](
                EnumActivityLogUser.target,
                'creator-1',
                'user-1'
            );

            expect(result).toBe('creator-1');
        });

        it('throws for a target resolution with no staged createdBy', () => {
            let thrown: unknown;
            try {
                queue['resolveCreatedBy'](
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
                queue['resolveCreatedBy'](
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
            const result = queue['resolveCreatedBy'](
                EnumActivityLogUser.payload,
                null,
                'user-1'
            );

            expect(result).toBe('user-1');
        });
    });

    describe('resolveWorkspaceId', () => {
        it('returns null for a none resolution', () => {
            const result = queue['resolveWorkspaceId'](
                EnumActivityLogWorkspace.none,
                'workspace-1',
                null
            );

            expect(result).toBeNull();
        });

        it('returns the staged workspaceId for a target resolution', () => {
            const result = queue['resolveWorkspaceId'](
                EnumActivityLogWorkspace.target,
                'workspace-1',
                null
            );

            expect(result).toBe('workspace-1');
        });

        it('throws for a target resolution with no staged workspaceId', () => {
            let thrown: unknown;
            try {
                queue['resolveWorkspaceId'](
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
                queue['resolveWorkspaceId'](
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
            const result = queue['resolveWorkspaceId'](
                EnumActivityLogWorkspace.payload,
                null,
                'workspace-1'
            );

            expect(result).toBe('workspace-1');
        });

        it('throws for a payload resolution with no payload workspaceId', () => {
            let thrown: unknown;
            try {
                queue['resolveWorkspaceId'](
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
                queue['resolveWorkspaceId'](
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
            messageService.setMessage.mockReturnValue(
                'User login with credential'
            );

            const result = queue['buildCreate'](
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
            expect(messageService.setMessage).toHaveBeenCalledWith(
                `activityLog.${EnumActivityLogAction.userLoginCredential}`,
                { properties: {} }
            );
        });
    });
});
