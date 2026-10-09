import { HelperStringService } from '@common/helper/services/helper.string.service';
import { getQueueToken } from '@nestjs/bullmq';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import type { Queue } from 'bullmq';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { IRequestLog } from '@common/request/interfaces/request.interface';
import {
    EnumUserLoginFrom,
    EnumUserLoginWith,
    EnumWorkspaceJoinRejectReason,
    EnumWorkspaceMemberRole,
} from '@generated/prisma-client/client';
import { EnumNotificationPushProcess } from '@modules/notification/enums/notification.enum';
import type {
    INotificationNewDeviceLoginPayload,
    INotificationSendPushPayload,
    INotificationWorkspaceJoinRejectedPayload,
} from '@modules/notification/interfaces/notification.interface';
import { NotificationPushQueue } from '@modules/notification/queues/notification.push.queue';
import { EnumQueue, EnumQueuePriority } from '@queues/enums/queue.enum';

describe('NotificationPushQueue', () => {
    const notificationPushQueue: MockProxy<Queue> = mock<Queue>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>();
    let queue: NotificationPushQueue;

    const send: INotificationSendPushPayload = {
        userId: 'user-id',
        notificationId: 'notification-id',
        notificationTokens: ['token-1'],
        username: 'nadia',
    };

    beforeEach(async () => {
        vi.resetAllMocks();
        vi.mocked(configService.get).mockImplementation((key: string) => {
            const values: Record<string, unknown> = {
                'app.timezone': 'UTC',
                'notification.dedupTtlInMs': 60_000,
                'notification.push.cleanupStaleTokensCron': '0 3 * * *',
            };

            return values[key];
        });
        const module = await Test.createTestingModule({
            providers: [
                NotificationPushQueue,
                {
                    provide: getQueueToken(EnumQueue.notificationPush),
                    useValue: notificationPushQueue,
                },
                { provide: ConfigService, useValue: configService },
                HelperStringService,
            ],
        }).compile();
        queue = module.get(NotificationPushQueue);
    });

    describe('sendTemporaryPasswordByAdmin', () => {
        it('enqueues the temporaryPasswordByAdmin job with high priority', async () => {
            const data = {
                passwordCreatedAt: '2024-01-01T00:00:00.000Z',
                passwordExpiredAt: '2024-02-01T00:00:00.000Z',
            };

            await queue.sendTemporaryPasswordByAdmin(send, data);

            expect(notificationPushQueue.add).toHaveBeenCalledWith(
                EnumNotificationPushProcess.temporaryPasswordByAdmin,
                {
                    send,
                    data,
                    completedSteps: [],
                    failureTokens: null,
                    pendingTokens: null,
                },
                {
                    jobId: 'notification-id-sendPush',
                    priority: EnumQueuePriority.high,
                    deduplication: {
                        id: 'temporaryPasswordByAdmin-user-id',
                        ttl: 60_000,
                    },
                }
            );
        });
    });

    describe('sendResetPassword', () => {
        it('enqueues the resetPassword job with medium priority', async () => {
            await queue.sendResetPassword(send);

            expect(notificationPushQueue.add).toHaveBeenCalledWith(
                EnumNotificationPushProcess.resetPassword,
                {
                    send,
                    data: null,
                    completedSteps: [],
                    failureTokens: null,
                    pendingTokens: null,
                },
                {
                    jobId: 'notification-id-sendPush',
                    priority: EnumQueuePriority.medium,
                    deduplication: {
                        id: 'resetPassword-user-id',
                        ttl: 60_000,
                    },
                }
            );
        });
    });

    describe('sendForgotPassword', () => {
        it('enqueues the forgotPassword job with high priority', async () => {
            await queue.sendForgotPassword(send);

            expect(notificationPushQueue.add).toHaveBeenCalledWith(
                EnumNotificationPushProcess.forgotPassword,
                {
                    send,
                    data: null,
                    completedSteps: [],
                    failureTokens: null,
                    pendingTokens: null,
                },
                {
                    jobId: 'notification-id-sendPush',
                    priority: EnumQueuePriority.high,
                    deduplication: {
                        id: 'forgotPassword-user-id',
                        ttl: 60_000,
                    },
                }
            );
        });
    });

    describe('sendResetTwoFactorByAdmin', () => {
        it('enqueues the resetTwoFactorByAdmin job with high priority', async () => {
            await queue.sendResetTwoFactorByAdmin(send);

            expect(notificationPushQueue.add).toHaveBeenCalledWith(
                EnumNotificationPushProcess.resetTwoFactorByAdmin,
                {
                    send,
                    data: null,
                    completedSteps: [],
                    failureTokens: null,
                    pendingTokens: null,
                },
                {
                    jobId: 'notification-id-sendPush',
                    priority: EnumQueuePriority.high,
                    deduplication: {
                        id: 'resetTwoFactorByAdmin-user-id',
                        ttl: 60_000,
                    },
                }
            );
        });
    });

    describe('sendNewDeviceLogin', () => {
        it('enqueues the newDeviceLogin job with high priority', async () => {
            const requestLog: IRequestLog = {
                userAgent: {
                    ua: null,
                    browser: null,
                    cpu: null,
                    device: null,
                    engine: null,
                    os: null,
                },
                ipAddress: null,
                geoLocation: null,
            };
            const data: INotificationNewDeviceLoginPayload = {
                loginFrom: EnumUserLoginFrom.website,
                loginWith: EnumUserLoginWith.credential,
                loginAt: '2024-01-01T00:00:00.000Z',
                requestLog,
            };

            await queue.sendNewDeviceLogin(send, data);

            expect(notificationPushQueue.add).toHaveBeenCalledWith(
                EnumNotificationPushProcess.newDeviceLogin,
                {
                    send,
                    data,
                    completedSteps: [],
                    failureTokens: null,
                    pendingTokens: null,
                },
                {
                    jobId: 'notification-id-sendPush',
                    priority: EnumQueuePriority.high,
                    deduplication: {
                        id: 'newDeviceLogin-user-id',
                        ttl: 60_000,
                    },
                }
            );
        });
    });

    describe('sendWorkspaceInvite', () => {
        it('enqueues the workspaceInvite job deduplicated by reference, high priority', async () => {
            const data = {
                workspaceId: 'workspace-id',
                workspaceName: 'Acme',
                inviterName: 'Omar',
                workspaceMemberRole: EnumWorkspaceMemberRole.member,
                reference: 'ref-1',
                expiredAt: '2024-02-01T00:00:00.000Z',
            };

            await queue.sendWorkspaceInvite(send, data);

            expect(notificationPushQueue.add).toHaveBeenCalledWith(
                EnumNotificationPushProcess.workspaceInvite,
                {
                    send,
                    data,
                    completedSteps: [],
                    failureTokens: null,
                    pendingTokens: null,
                },
                {
                    jobId: 'notification-id-sendPush',
                    priority: EnumQueuePriority.high,
                    deduplication: {
                        id: 'workspaceInvite-ref-1',
                        ttl: 60_000,
                    },
                }
            );
        });
    });

    describe('sendWorkspaceJoinRequest', () => {
        it('enqueues the workspaceJoinRequest job deduplicated by workspace and user, medium priority', async () => {
            const data = {
                workspaceId: 'workspace-id',
                workspaceName: 'Acme',
                requesterName: 'Omar',
            };

            await queue.sendWorkspaceJoinRequest(send, data);

            expect(notificationPushQueue.add).toHaveBeenCalledWith(
                EnumNotificationPushProcess.workspaceJoinRequest,
                {
                    send,
                    data,
                    completedSteps: [],
                    failureTokens: null,
                    pendingTokens: null,
                },
                {
                    jobId: 'notification-id-sendPush',
                    priority: EnumQueuePriority.medium,
                    deduplication: {
                        id: 'workspaceJoinRequest-workspace-id-user-id',
                        ttl: 60_000,
                    },
                }
            );
        });
    });

    describe('sendWorkspaceJoinAccepted', () => {
        it('enqueues the workspaceJoinAccepted job deduplicated by workspace and user, medium priority', async () => {
            const data = { workspaceId: 'workspace-id', workspaceName: 'Acme' };

            await queue.sendWorkspaceJoinAccepted(send, data);

            expect(notificationPushQueue.add).toHaveBeenCalledWith(
                EnumNotificationPushProcess.workspaceJoinAccepted,
                {
                    send,
                    data,
                    completedSteps: [],
                    failureTokens: null,
                    pendingTokens: null,
                },
                {
                    jobId: 'notification-id-sendPush',
                    priority: EnumQueuePriority.medium,
                    deduplication: {
                        id: 'workspaceJoinAccepted-workspace-id-user-id',
                        ttl: 60_000,
                    },
                }
            );
        });
    });

    describe('sendWorkspaceJoinRejected', () => {
        it('enqueues the workspaceJoinRejected job deduplicated by workspace and user, medium priority', async () => {
            const data: INotificationWorkspaceJoinRejectedPayload = {
                workspaceId: 'workspace-id',
                workspaceName: 'Acme',
                rejectReasonCode:
                    EnumWorkspaceJoinRejectReason.memberLimitReached,
            };

            await queue.sendWorkspaceJoinRejected(send, data);

            expect(notificationPushQueue.add).toHaveBeenCalledWith(
                EnumNotificationPushProcess.workspaceJoinRejected,
                {
                    send,
                    data,
                    completedSteps: [],
                    failureTokens: null,
                    pendingTokens: null,
                },
                {
                    jobId: 'notification-id-sendPush',
                    priority: EnumQueuePriority.medium,
                    deduplication: {
                        id: 'workspaceJoinRejected-workspace-id-user-id',
                        ttl: 60_000,
                    },
                }
            );
        });
    });

    describe('sendCleanupTokens', () => {
        it('enqueues the cleanupTokens job with low priority when there are failure tokens', async () => {
            await queue.sendCleanupTokens('notification-id', 'user-id', [
                'token-1',
                'token-2',
            ]);

            expect(notificationPushQueue.add).toHaveBeenCalledWith(
                EnumNotificationPushProcess.cleanupTokens,
                {
                    failureTokens: ['token-1', 'token-2'],
                    userId: 'user-id',
                },
                {
                    jobId: 'notification-id-cleanupTokens',
                    priority: EnumQueuePriority.low,
                }
            );
        });

        it('does not enqueue when there are no failure tokens', async () => {
            await queue.sendCleanupTokens('notification-id', 'user-id', []);

            expect(notificationPushQueue.add).not.toHaveBeenCalled();
        });
    });

    describe('sendCleanupStaleTokens', () => {
        it('creates or updates the recurring stale-token cleanup job scheduler', async () => {
            await queue.sendCleanupStaleTokens();

            expect(
                notificationPushQueue.upsertJobScheduler
            ).toHaveBeenCalledWith(
                EnumNotificationPushProcess.cleanupStaleTokens,
                { pattern: '0 3 * * *', tz: 'UTC' },
                {
                    name: EnumNotificationPushProcess.cleanupStaleTokens,
                    data: {},
                    opts: { priority: EnumQueuePriority.low },
                }
            );
        });
    });
});
