import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';

import type {
    INotificationNewDeviceLoginPayload,
    INotificationSendPushPayload,
    INotificationTemporaryPasswordPushPayload,
    INotificationWorkspaceInvitePushPayload,
    INotificationWorkspaceJoinAcceptedPayload,
    INotificationWorkspaceJoinRejectedPayload,
    INotificationWorkspaceJoinRequestPushPayload,
} from '@modules/notification/interfaces/notification.interface';
import { NotificationPushQueue } from '@modules/notification/queues/notification.push.queue';

describe('NotificationPushQueue', () => {
    const queue: MockProxy<Queue> = mock<Queue>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>();
    const send = mock<INotificationSendPushPayload>({ userId: 'user-id' });
    let service: NotificationPushQueue;

    beforeEach(() => {
        Reflect.set(
            configService,
            'get',
            vi.fn(
                (key: string | symbol) =>
                    ({
                        'app.timezone': 'UTC',
                        'notification.dedupTtlInMs': 1_000,
                        'notification.push.cleanupDedupTtlInMs': 2_000,
                        'notification.push.cleanupStaleTokensCron': '0 0 * * *',
                    })[String(key)]
            )
        );
        service = new NotificationPushQueue(queue, configService);
    });

    it('enqueues every supported push delivery with its payload and options', async () => {
        await service.sendTemporaryPasswordByAdmin(
            send,
            mock<INotificationTemporaryPasswordPushPayload>()
        );
        await service.sendResetPassword(send);
        await service.sendResetTwoFactorByAdmin(send);
        await service.sendNewDeviceLogin(
            send,
            mock<INotificationNewDeviceLoginPayload>()
        );
        await service.sendWorkspaceInvite(
            send,
            mock<INotificationWorkspaceInvitePushPayload>({
                reference: 'invite-ref',
            })
        );
        await service.sendWorkspaceJoinRequest(
            send,
            mock<INotificationWorkspaceJoinRequestPushPayload>({
                workspaceId: 'workspace-id',
            })
        );
        await service.sendWorkspaceJoinAccepted(
            send,
            mock<INotificationWorkspaceJoinAcceptedPayload>({
                workspaceId: 'workspace-id',
            })
        );
        await service.sendWorkspaceJoinRejected(
            send,
            mock<INotificationWorkspaceJoinRejectedPayload>({
                workspaceId: 'workspace-id',
            })
        );

        expect(queue.add).toHaveBeenCalledTimes(8);
        expect(queue.add).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({ send }),
            expect.objectContaining({
                deduplication: expect.objectContaining({ ttl: 1_000 }),
            })
        );
    });

    it('enqueues the workspace invite push with the workspace role name', async () => {
        await service.sendWorkspaceInvite(
            send,
            mock<INotificationWorkspaceInvitePushPayload>({
                workspaceId: 'workspace-id',
                workspaceName: 'Workspace',
                inviterName: 'Inviter',
                workspaceRoleName: 'Member',
                reference: 'invite-ref',
                expiredAt: '2026-01-02T00:00:00.000Z',
            })
        );

        expect(queue.add).toHaveBeenCalledWith(
            expect.any(String),
            {
                send,
                data: {
                    workspaceId: 'workspace-id',
                    workspaceName: 'Workspace',
                    inviterName: 'Inviter',
                    workspaceRoleName: 'Member',
                    reference: 'invite-ref',
                    expiredAt: '2026-01-02T00:00:00.000Z',
                },
            },
            expect.anything()
        );
    });

    it('only schedules token cleanup when Firebase rejected tokens', async () => {
        await service.sendCleanupTokens('user-id', []);
        expect(queue.add).not.toHaveBeenCalled();

        await service.sendCleanupTokens('user-id', ['bad-token']);
        expect(queue.add).toHaveBeenCalledWith(
            expect.any(String),
            { data: { userId: 'user-id', failureTokens: ['bad-token'] } },
            expect.objectContaining({
                deduplication: expect.objectContaining({ ttl: 2_000 }),
            })
        );
    });

    it('creates or updates the stale-token schedule in the configured timezone', async () => {
        await service.sendCleanupStaleTokens();

        expect(queue.upsertJobScheduler).toHaveBeenCalledWith(
            expect.any(String),
            { pattern: '0 0 * * *', tz: 'UTC' },
            expect.objectContaining({ data: {} })
        );
    });
});
