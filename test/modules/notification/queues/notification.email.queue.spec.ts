import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';

import { HelperEncryptionService } from '@common/helper/services/helper.encryption.service';
import { NotificationPayloadEncryptionPurpose } from '@modules/notification/constants/notification.constant';
import type {
    INotificationEmailSendPayload,
    INotificationForgotPasswordEncryptedPayload,
    INotificationNewDeviceLoginPayload,
    INotificationPublishTermPolicyPayload,
    INotificationTemporaryPasswordEncryptedPayload,
    INotificationVerificationEmailEncryptedPayload,
    INotificationVerifiedEmailPayload,
    INotificationVerifiedMobileNumberPayload,
    INotificationWelcomeByAdminEncryptedPayload,
    INotificationWorkspaceInviteEncryptedPayload,
    INotificationWorkspaceInviteUnregisteredPayload,
    INotificationWorkspaceJoinAcceptedPayload,
    INotificationWorkspaceJoinRejectedPayload,
    INotificationWorkspaceJoinRequestEncryptedPayload,
} from '@modules/notification/interfaces/notification.interface';
import { NotificationEmailQueue } from '@modules/notification/queues/notification.email.queue';

describe('NotificationEmailQueue', () => {
    const queue: MockProxy<Queue> = mock<Queue>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>();
    const encryption: MockProxy<HelperEncryptionService> =
        mock<HelperEncryptionService>();
    const send = mock<INotificationEmailSendPayload>({
        userId: 'user-id',
        email: 'user@example.com',
        username: 'user',
        notificationId: 'notification-id',
    });
    let service: NotificationEmailQueue;

    beforeEach(() => {
        Reflect.set(
            configService,
            'get',
            vi.fn(
                (key: string | symbol) =>
                    ({
                        'notification.dedupTtlInMs': 1_000,
                        'verification.expiredInMs': 2_000,
                        'verification.resendInMs': 3_000,
                        'forgotPassword.resendInMs': 4_000,
                        'app.encryptionSecretKey': 'secret',
                    })[String(key)]
            )
        );
        encryption.aes256Encrypt.mockReturnValue('ciphertext');
        service = new NotificationEmailQueue(queue, configService, encryption);
    });

    it('enqueues every supported email process', async () => {
        await service.sendWelcomeByAdmin(
            send,
            mock<INotificationWelcomeByAdminEncryptedPayload>()
        );
        await service.sendTemporaryPasswordByAdmin(
            send,
            mock<INotificationTemporaryPasswordEncryptedPayload>()
        );
        await service.sendResetPassword(send);
        await service.sendChangePassword(send);
        await service.sendVerificationEmail(
            send,
            mock<INotificationVerificationEmailEncryptedPayload>()
        );
        await service.sendWelcome(send);
        await service.sendWelcomeSocial(send);
        await service.sendVerifiedEmail(
            send,
            mock<INotificationVerifiedEmailPayload>()
        );
        await service.sendForgotPassword(
            send,
            mock<INotificationForgotPasswordEncryptedPayload>()
        );
        await service.sendVerifiedMobileNumber(
            send,
            mock<INotificationVerifiedMobileNumberPayload>()
        );
        await service.sendResetTwoFactorByAdmin(send);
        await service.sendNewDeviceLogin(
            send,
            mock<INotificationNewDeviceLoginPayload>()
        );
        await service.sendPublishTermPolicy(
            [send],
            mock<INotificationPublishTermPolicyPayload>()
        );
        await service.sendWorkspaceInvite(
            send,
            mock<INotificationWorkspaceInviteEncryptedPayload>()
        );
        await service.sendWorkspaceInviteUnregistered(
            'guest@example.com',
            mock<INotificationWorkspaceInviteUnregisteredPayload>({
                inviteAcceptLink: 'plain-link',
                reference: 'invite-ref',
            })
        );
        await service.sendWorkspaceJoinRequest(
            send,
            mock<INotificationWorkspaceJoinRequestEncryptedPayload>()
        );
        await service.sendWorkspaceJoinAccepted(
            send,
            mock<INotificationWorkspaceJoinAcceptedPayload>()
        );
        await service.sendWorkspaceJoinRejected(
            send,
            mock<INotificationWorkspaceJoinRejectedPayload>()
        );

        expect(queue.add).toHaveBeenCalledTimes(18);
    });

    it('seals unregistered invite links to the invite reference', async () => {
        await service.sendWorkspaceInviteUnregistered(
            'guest@example.com',
            mock<INotificationWorkspaceInviteUnregisteredPayload>({
                inviteAcceptLink: 'plain-link',
                reference: 'invite-ref',
            })
        );

        expect(encryption.aes256Encrypt).toHaveBeenCalledWith(
            'plain-link',
            'secret',
            NotificationPayloadEncryptionPurpose,
            'invite-ref'
        );
        expect(queue.add).toHaveBeenCalledWith(
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
                data: expect.objectContaining({
                    inviteAcceptLink: 'plain-link',
                }),
            }),
            expect.any(Object)
        );
    });
});
