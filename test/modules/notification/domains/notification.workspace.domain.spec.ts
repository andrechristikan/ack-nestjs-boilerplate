import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';

import { DatabaseUtil } from '@common/database/utils/database.util';
import { EnumWorkspaceJoinRejectReason } from '@generated/prisma-client/client';
import type { User } from '@generated/prisma-client';
import { DeviceDomain } from '@modules/device/domains/device.domain';
import type { IDeviceOwnershipWithDevice } from '@modules/device/interfaces/device.interface';
import { NotificationWorkspaceDomain } from '@modules/notification/domains/notification.workspace.domain';
import type {
    INotificationWorkspaceInviteEncryptedPayload,
    INotificationWorkspaceJoinAcceptedPayload,
    INotificationWorkspaceJoinRejectedPayload,
    INotificationWorkspaceJoinRequestEncryptedPayload,
} from '@modules/notification/interfaces/notification.interface';
import { NotificationEmailQueue } from '@modules/notification/queues/notification.email.queue';
import { NotificationPushQueue } from '@modules/notification/queues/notification.push.queue';
import { NotificationRepository } from '@modules/notification/repositories/notification.repository';
import { UserDomain } from '@modules/user/domains/user.domain';

describe('NotificationWorkspaceDomain', () => {
    const notificationRepository: MockProxy<NotificationRepository> =
        mock<NotificationRepository>();
    const userDomain: MockProxy<UserDomain> = mock<UserDomain>();
    const deviceDomain: MockProxy<DeviceDomain> = mock<DeviceDomain>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();
    const notificationEmailQueue: MockProxy<NotificationEmailQueue> =
        mock<NotificationEmailQueue>();
    const notificationPushQueue: MockProxy<NotificationPushQueue> =
        mock<NotificationPushQueue>();
    const service = new NotificationWorkspaceDomain(
        notificationRepository,
        userDomain,
        deviceDomain,
        databaseUtil,
        notificationEmailQueue,
        notificationPushQueue
    );
    const user = mock<User>({
        id: 'user-id',
        email: 'user@example.com',
        username: 'user',
    });
    const invite = mock<INotificationWorkspaceInviteEncryptedPayload>({
        encryptedInviteAcceptLink: 'ciphertext',
        workspaceId: 'workspace-id',
        workspaceName: 'Workspace',
        inviterName: 'Inviter',
        workspaceRoleName: 'Member',
    });
    const request = mock<INotificationWorkspaceJoinRequestEncryptedPayload>({
        encryptedJoinRequestReviewLink: 'ciphertext',
        workspaceId: 'workspace-id',
        workspaceName: 'Workspace',
        requesterName: 'Requester',
    });
    const accepted = mock<INotificationWorkspaceJoinAcceptedPayload>({
        workspaceId: 'workspace-id',
        workspaceName: 'Workspace',
    });
    const rejected = mock<INotificationWorkspaceJoinRejectedPayload>({
        workspaceId: 'workspace-id',
        workspaceName: 'Workspace',
        rejectReasonCode: EnumWorkspaceJoinRejectReason.other,
    });
    const cases = [
        [
            'invite',
            () => service.processWorkspaceInvite(user.id, 'actor-id', invite),
        ],
        [
            'join request',
            () =>
                service.processWorkspaceJoinRequest(
                    user.id,
                    'actor-id',
                    request
                ),
        ],
        [
            'join accepted',
            () =>
                service.processWorkspaceJoinAccepted(
                    user.id,
                    'actor-id',
                    accepted
                ),
        ],
        [
            'join rejected',
            () =>
                service.processWorkspaceJoinRejected(
                    user.id,
                    'actor-id',
                    rejected
                ),
        ],
    ] as const;

    beforeEach(() => {
        userDomain.getOneActive.mockResolvedValue(user);
        deviceDomain.getOwnershipsWithNotificationToken.mockResolvedValue([]);
        databaseUtil.createId.mockReturnValue('notification-id');
    });

    it.each(cases)(
        'skips workspace %s when the user is unavailable',
        async (_name, process) => {
            userDomain.getOneActive.mockResolvedValue(null);
            const result = await process();
            expect(result.message).toContain('User not found');
        }
    );

    it.each(cases)(
        'persists and sends workspace %s without push recipients',
        async (_name, process) => {
            const result = await process();
            expect(result.message).toContain('processed');
            expect(result.results).toHaveLength(2);
        }
    );

    it.each(cases)(
        'fans workspace %s out to filtered push recipients',
        async (_name, process) => {
            deviceDomain.getOwnershipsWithNotificationToken.mockResolvedValue([
                mock<IDeviceOwnershipWithDevice>({
                    device: mock({ notificationToken: 'push-token' }),
                }),
                mock<IDeviceOwnershipWithDevice>({
                    device: mock({ notificationToken: null }),
                }),
            ]);
            notificationRepository.create.mockRejectedValue(
                new Error('database down')
            );
            const result = await process();
            expect(result.results).toHaveLength(3);
            expect(result.results).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({ status: 'rejected' }),
                ])
            );
        }
    );

    it('keeps encrypted invitation and review links on email-only calls', async () => {
        deviceDomain.getOwnershipsWithNotificationToken.mockResolvedValue([
            mock<IDeviceOwnershipWithDevice>({
                device: mock({ notificationToken: 'push-token' }),
            }),
        ]);
        await service.processWorkspaceInvite(user.id, 'actor-id', invite);
        await service.processWorkspaceJoinRequest(user.id, 'actor-id', request);
        expect(notificationEmailQueue.sendWorkspaceInvite).toHaveBeenCalledWith(
            expect.any(Object),
            invite
        );
        expect(
            notificationEmailQueue.sendWorkspaceJoinRequest
        ).toHaveBeenCalledWith(expect.any(Object), request);
        expect(notificationPushQueue.sendWorkspaceInvite).toHaveBeenCalledWith(
            expect.any(Object),
            expect.not.objectContaining({
                encryptedInviteAcceptLink: expect.any(String),
            })
        );
        expect(notificationPushQueue.sendWorkspaceInvite).toHaveBeenCalledWith(
            expect.any(Object),
            expect.objectContaining({ workspaceRoleName: 'Member' })
        );
        expect(
            notificationPushQueue.sendWorkspaceJoinRequest
        ).toHaveBeenCalledWith(
            expect.any(Object),
            expect.not.objectContaining({
                encryptedJoinRequestReviewLink: expect.any(String),
            })
        );
    });
});
