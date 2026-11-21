import { getQueueToken } from '@nestjs/bullmq';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import type { Queue } from 'bullmq';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { CacheService } from '@common/cache/services/cache.service';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import {
    EnumTermPolicyType,
    EnumUserReauthenticationAction,
    EnumWorkspaceMemberRole,
} from '@generated/prisma-client/client';
import {
    EnumNotificationKind,
    EnumNotificationLoginLockedMethod,
    EnumNotificationProcess,
    EnumNotificationQueue,
} from '@modules/notification/enums/notification.enum';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import {
    TestUnitKitConfigValues,
    TestUnitKitProviders,
} from '@test/unit/helpers/test.unit.kit.helper';
import { buildUnsealedNotificationPayload } from '@test/unit/helpers/test.unit.notification-push.helper';
import type { INotificationWorkspaceInviteContext } from '@modules/notification/interfaces/notification.interface';

describe('NotificationQueue', () => {
    const bullQueue: MockProxy<Queue> = mock<Queue>();
    const cacheService: MockProxy<CacheService> = mock<CacheService>();
    let queue: NotificationQueue;

    const inviteContext: INotificationWorkspaceInviteContext = {
        userId: 'user-id',
        proceedBy: 'actor-id',
        workspaceId: 'workspace-id',
        workspaceName: 'Acme',
        inviterName: 'Alice',
        reference: 'WI-ref',
        workspaceMemberRole: EnumWorkspaceMemberRole.member,
        expiredAt: 'Mon, 08 Jan 2024 00:00:00 +0000',
        inviteAcceptLink: 'https://app.test/invite/token',
    };

    beforeEach(async () => {
        const module = await Test.createTestingModule({
            providers: [
                ...TestUnitKitProviders,
                {
                    provide: ConfigService,
                    useValue: buildConfigService({
                        ...TestUnitKitConfigValues,
                        'notification.idempotencyKey.userPattern':
                            '{process}-{userId}',
                        'notification.idempotencyKey.referencePattern':
                            '{process}-{reference}',
                        'notification.idempotencyKey.joinRequestPattern':
                            '{process}-{joinRequestId}-{userId}',
                        'notification.idempotencyKey.userTermPolicyPattern':
                            '{process}-{userId}-{termPolicyId}',
                    }),
                },
                NotificationUtil,
                NotificationQueue,
                {
                    provide: getQueueToken(EnumNotificationQueue.notification),
                    useValue: bullQueue,
                },
                { provide: CacheService, useValue: cacheService },
            ],
        }).compile();
        queue = module.get(NotificationQueue);
    });

    describe('notify', () => {
        it('seals a context that carries a null snapshot and a null verificationId for a kind with neither', () => {
            const result = queue.notify(EnumNotificationKind.changePassword, {
                userId: 'user-id',
                proceedBy: 'user-id',
            });

            expect(result.data.context).toEqual({
                userId: 'user-id',
                proceedBy: 'user-id',
                snapshot: null,
                verificationId: null,
            });
        });

        it('seals the snapshot and a null verificationId for a snapshot kind', () => {
            const snapshot = {
                username: 'name',
                encryptedEmail: 'encrypted-email',
                encryptedTokens: ['encrypted-token'],
            };

            const result = queue.notify(EnumNotificationKind.resetPassword, {
                userId: 'user-id',
                proceedBy: 'user-id',
                snapshot,
            });

            expect(result.data.context).toEqual({
                userId: 'user-id',
                proceedBy: 'user-id',
                snapshot,
                verificationId: null,
            });
        });

        it('returns no idempotency key for a kind that may repeat', () => {
            const result = queue.notify(EnumNotificationKind.changePassword, {
                userId: 'user-id',
                proceedBy: 'user-id',
            });

            expect(result).toEqual({
                queue: EnumNotificationQueue.notification,
                name: EnumNotificationProcess.notify,
                data: {
                    kind: EnumNotificationKind.changePassword,
                    context: {
                        userId: 'user-id',
                        proceedBy: 'user-id',
                        snapshot: null,
                        verificationId: null,
                    },
                    recipient: null,
                    notificationId: null,
                },
                priority: EnumQueuePriority.medium,
                idempotencyKey: null,
            });
        });

        it('returns the reauthentication code effect with the code sealed against the recipient and no idempotency key', () => {
            const result = queue.notify(
                EnumNotificationKind.reauthenticationOtp,
                {
                    userId: 'user-id',
                    proceedBy: 'user-id',
                    verificationId: 'verification-id',
                    otp: '482913',
                    action: EnumUserReauthenticationAction.deleteSelf,
                    expiredInMinutes: 5,
                }
            );

            expect(result).toEqual({
                queue: EnumNotificationQueue.notification,
                name: EnumNotificationProcess.notify,
                data: {
                    kind: EnumNotificationKind.reauthenticationOtp,
                    context: {
                        userId: 'user-id',
                        proceedBy: 'user-id',
                        verificationId: 'verification-id',
                        encryptedOtp: expect.any(String),
                        action: EnumUserReauthenticationAction.deleteSelf,
                        expiredInMinutes: 5,
                        snapshot: null,
                    },
                    recipient: null,
                    notificationId: null,
                },
                priority: EnumQueuePriority.high,
                idempotencyKey: null,
            });
            expect(
                buildUnsealedNotificationPayload(
                    String(result.data.context.encryptedOtp),
                    'user-id'
                )
            ).toBe('482913');
        });

        it('returns the login locked effect with the context and no idempotency key', () => {
            const context = {
                userId: 'user-id',
                proceedBy: 'user-id',
                method: EnumNotificationLoginLockedMethod.password,
                methodLabel: 'Password',
                lockedUntil: '2026-01-01T00:15:00.000Z',
            };

            const result = queue.notify(
                EnumNotificationKind.loginLocked,
                context
            );

            expect(result).toEqual({
                queue: EnumNotificationQueue.notification,
                name: EnumNotificationProcess.notify,
                data: {
                    kind: EnumNotificationKind.loginLocked,
                    context: {
                        ...context,
                        snapshot: null,
                        verificationId: null,
                    },
                    recipient: null,
                    notificationId: null,
                },
                priority: EnumQueuePriority.medium,
                idempotencyKey: null,
            });
        });

        it('returns the notify effect with the link sealed against the recipient and the reference key', () => {
            const result = queue.notify(
                EnumNotificationKind.workspaceInvite,
                inviteContext
            );

            expect(result).toEqual({
                queue: EnumNotificationQueue.notification,
                name: EnumNotificationProcess.notify,
                data: {
                    kind: EnumNotificationKind.workspaceInvite,
                    context: {
                        userId: 'user-id',
                        proceedBy: 'actor-id',
                        workspaceId: 'workspace-id',
                        workspaceName: 'Acme',
                        inviterName: 'Alice',
                        reference: 'WI-ref',
                        workspaceMemberRole: EnumWorkspaceMemberRole.member,
                        expiredAt: 'Mon, 08 Jan 2024 00:00:00 +0000',
                        encryptedInviteAcceptLink: expect.any(String),
                        snapshot: null,
                        verificationId: null,
                    },
                    recipient: null,
                    notificationId: null,
                },
                priority: EnumQueuePriority.medium,
                idempotencyKey: 'workspaceInvite-WI-ref',
            });
            expect(
                buildUnsealedNotificationPayload(
                    String(result.data.context.encryptedInviteAcceptLink),
                    'user-id'
                )
            ).toBe('https://app.test/invite/token');
        });

        it('returns the verificationMobileNumber effect with the code sealed against the recipient and the reference key', () => {
            const result = queue.notify(
                EnumNotificationKind.verificationMobileNumber,
                {
                    userId: 'user-id',
                    proceedBy: 'user-id',
                    verificationId: 'verification-id',
                    otp: '482913',
                    reference: 'VRF-abc',
                    expiredInMinutes: 5,
                }
            );

            expect(result).toEqual({
                queue: EnumNotificationQueue.notification,
                name: EnumNotificationProcess.notify,
                data: {
                    kind: EnumNotificationKind.verificationMobileNumber,
                    context: {
                        userId: 'user-id',
                        proceedBy: 'user-id',
                        verificationId: 'verification-id',
                        encryptedOtp: expect.any(String),
                        reference: 'VRF-abc',
                        expiredInMinutes: 5,
                        snapshot: null,
                    },
                    recipient: null,
                    notificationId: null,
                },
                priority: EnumQueuePriority.medium,
                idempotencyKey: 'verificationMobileNumber-VRF-abc',
            });
            expect(
                buildUnsealedNotificationPayload(
                    String(result.data.context.encryptedOtp),
                    'user-id'
                )
            ).toBe('482913');
        });

        it('returns the userImportResult effect on the notification queue keyed by the import row id with the counts and reasons unsealed', () => {
            const result = queue.notify(EnumNotificationKind.userImportResult, {
                userId: 'admin-id',
                proceedBy: 'admin-id',
                reference: 'outbox-id',
                created: 0,
                failed: 2,
                reasons: ['Username already exists.'],
            });

            expect(result).toEqual({
                queue: EnumNotificationQueue.notification,
                name: EnumNotificationProcess.notify,
                data: {
                    kind: EnumNotificationKind.userImportResult,
                    context: {
                        userId: 'admin-id',
                        proceedBy: 'admin-id',
                        reference: 'outbox-id',
                        created: 0,
                        failed: 2,
                        reasons: ['Username already exists.'],
                        snapshot: null,
                        verificationId: null,
                    },
                    recipient: null,
                    notificationId: null,
                },
                priority: EnumQueuePriority.medium,
                idempotencyKey: 'userImportResult-outbox-id',
            });
        });

        it('returns the userExportResult effect keyed by the reference with the link sealed against the recipient and the count and expiry plain', () => {
            const result = queue.notify(EnumNotificationKind.userExportResult, {
                userId: 'admin-id',
                proceedBy: 'admin-id',
                reference: 'outbox-id',
                link: 'https://s3.test/export.csv?sig=abc',
                count: 12,
                expiredAt: '2026-01-02T00:00:00.000Z',
            });

            expect(result).toEqual({
                queue: EnumNotificationQueue.notification,
                name: EnumNotificationProcess.notify,
                data: {
                    kind: EnumNotificationKind.userExportResult,
                    context: {
                        userId: 'admin-id',
                        proceedBy: 'admin-id',
                        reference: 'outbox-id',
                        encryptedLink: expect.any(String),
                        count: 12,
                        expiredAt: '2026-01-02T00:00:00.000Z',
                        snapshot: null,
                        verificationId: null,
                    },
                    recipient: null,
                    notificationId: null,
                },
                priority: EnumQueuePriority.medium,
                idempotencyKey: 'userExportResult-outbox-id',
            });
            expect(result.data.context).not.toHaveProperty('link');
            expect(
                buildUnsealedNotificationPayload(
                    String(result.data.context.encryptedLink),
                    'admin-id'
                )
            ).toBe('https://s3.test/export.csv?sig=abc');
        });

        it('leaves a non-string context field out of the idempotency key values', () => {
            const result = queue.notify(
                EnumNotificationKind.userAcceptTermPolicy,
                {
                    userId: 'user-id',
                    proceedBy: 'user-id',
                    termPolicyId: 'term-policy-id',
                    type: EnumTermPolicyType.privacy,
                    version: 3,
                }
            );

            expect(result.idempotencyKey).toBe(
                'userAcceptTermPolicy-user-id-term-policy-id'
            );
        });
    });
});
