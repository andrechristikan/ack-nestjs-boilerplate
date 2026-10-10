import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';

import { HelperEncryptionService } from '@common/helper/services/helper.encryption.service';
import { NotificationPayloadEncryptionPurpose } from '@modules/notification/constants/notification.constant';
import type {
    INotificationAcceptTermPolicyPayload,
    INotificationForgotPasswordPayload,
    INotificationNewDeviceLoginPayload,
    INotificationPublishTermPolicyPayload,
    INotificationTemporaryPasswordPayload,
    INotificationVerificationEmailPayload,
    INotificationVerifiedEmailPayload,
    INotificationVerifiedMobileNumberPayload,
    INotificationWelcomeByAdminPayload,
    INotificationWorkspaceInvitePayload,
    INotificationWorkspaceJoinAcceptedPayload,
    INotificationWorkspaceJoinRejectedPayload,
    INotificationWorkspaceJoinRequestPayload,
} from '@modules/notification/interfaces/notification.interface';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';

describe('NotificationQueue', () => {
    const queue: MockProxy<Queue> = mock<Queue>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>();
    const encryption: MockProxy<HelperEncryptionService> =
        mock<HelperEncryptionService>();
    const userId = 'user-id';
    let service: NotificationQueue;

    beforeEach(() => {
        Reflect.set(
            configService,
            'get',
            vi.fn(
                (key: string | symbol) =>
                    ({
                        'notification.dedupTtlInMs': 1_000,
                        'app.encryptionSecretKey': 'secret',
                    })[String(key)]
            )
        );
        encryption.aes256Encrypt.mockReturnValue('ciphertext');
        service = new NotificationQueue(queue, configService, encryption);
    });

    it('enqueues every supported notification process', async () => {
        await service.sendWelcomeByAdmin(
            userId,
            mock<INotificationWelcomeByAdminPayload>({
                password: 'welcome-password',
            }),
            'admin-id'
        );
        await service.sendWelcome(
            userId,
            mock<INotificationVerificationEmailPayload>({
                link: 'welcome-link',
            })
        );
        await service.sendWelcomeSocial(userId);
        await service.sendTemporaryPasswordByAdmin(
            userId,
            mock<INotificationTemporaryPasswordPayload>({
                password: 'temporary-password',
            }),
            'admin-id'
        );
        await service.sendChangePassword(userId);
        await service.sendVerifiedEmail(
            userId,
            mock<INotificationVerifiedEmailPayload>()
        );
        await service.sendVerificationEmail(
            userId,
            mock<INotificationVerificationEmailPayload>({
                link: 'verification-link',
            })
        );
        await service.sendForgotPassword(
            userId,
            mock<INotificationForgotPasswordPayload>({ link: 'forgot-link' })
        );
        await service.sendResetPassword(userId);
        await service.sendResetTwoFactorByAdmin(userId, 'admin-id');
        await service.sendNewDeviceLogin(
            userId,
            mock<INotificationNewDeviceLoginPayload>()
        );
        await service.sendPublishTermPolicy(
            mock<INotificationPublishTermPolicyPayload>(),
            'admin-id'
        );
        await service.sendVerifiedMobileNumber(
            userId,
            mock<INotificationVerifiedMobileNumberPayload>()
        );
        await service.sendUserAcceptTermPolicy(
            userId,
            mock<INotificationAcceptTermPolicyPayload>()
        );
        await service.sendWorkspaceInvite(
            userId,
            mock<INotificationWorkspaceInvitePayload>({
                inviteAcceptLink: 'invite-link',
            }),
            'inviter-id'
        );
        await service.sendWorkspaceJoinRequest(
            userId,
            mock<INotificationWorkspaceJoinRequestPayload>({
                joinRequestReviewLink: 'review-link',
            }),
            'requester-id'
        );
        await service.sendWorkspaceJoinAccepted(
            userId,
            mock<INotificationWorkspaceJoinAcceptedPayload>(),
            'reviewer-id'
        );
        await service.sendWorkspaceJoinRejected(
            userId,
            mock<INotificationWorkspaceJoinRejectedPayload>(),
            'reviewer-id'
        );

        expect(queue.add).toHaveBeenCalledTimes(18);
        expect(queue.add).toHaveBeenCalledWith(
            expect.any(String),
            expect.any(Object),
            expect.objectContaining({
                deduplication: expect.objectContaining({ ttl: 1_000 }),
            })
        );
    });

    it('encrypts sensitive values for the recipient and never queues plaintext', async () => {
        await service.sendWelcomeByAdmin(
            userId,
            mock<INotificationWelcomeByAdminPayload>({
                password: 'plain-password',
            }),
            'admin-id'
        );
        await service.sendWorkspaceInvite(
            userId,
            mock<INotificationWorkspaceInvitePayload>({
                inviteAcceptLink: 'plain-link',
            }),
            'inviter-id'
        );

        expect(encryption.aes256Encrypt).toHaveBeenNthCalledWith(
            1,
            'plain-password',
            'secret',
            NotificationPayloadEncryptionPurpose,
            userId
        );
        expect(encryption.aes256Encrypt).toHaveBeenNthCalledWith(
            2,
            'plain-link',
            'secret',
            NotificationPayloadEncryptionPurpose,
            userId
        );
        expect(queue.add).toHaveBeenNthCalledWith(
            1,
            expect.any(String),
            expect.objectContaining({
                data: expect.objectContaining({
                    encryptedPassword: 'ciphertext',
                }),
            }),
            expect.any(Object)
        );
        expect(queue.add).toHaveBeenNthCalledWith(
            2,
            expect.any(String),
            expect.objectContaining({
                data: expect.objectContaining({
                    encryptedInviteAcceptLink: 'ciphertext',
                }),
            }),
            expect.any(Object)
        );
        expect(queue.add).not.toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({
                data: expect.objectContaining({ password: 'plain-password' }),
            }),
            expect.any(Object)
        );
        expect(queue.add).not.toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({
                data: expect.objectContaining({
                    inviteAcceptLink: 'plain-link',
                }),
            }),
            expect.any(Object)
        );
    });
});
