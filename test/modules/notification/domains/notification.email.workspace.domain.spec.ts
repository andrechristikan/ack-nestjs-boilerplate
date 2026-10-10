import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { ConfigService } from '@nestjs/config';
import { EnumWorkspaceJoinRejectReason } from '@generated/prisma-client/client';

import { AwsSESService } from '@common/aws/services/aws.ses.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperEncryptionService } from '@common/helper/services/helper.encryption.service';
import { MessageService } from '@common/message/services/message.service';
import { NotificationPayloadEncryptionPurpose } from '@modules/notification/constants/notification.constant';
import { NotificationEmailWorkspaceDomain } from '@modules/notification/domains/notification.email.workspace.domain';
import type {
    INotificationEmailSendPayload,
    INotificationEmailSendUnregisteredPayload,
    INotificationWorkspaceInviteEncryptedPayload,
    INotificationWorkspaceInviteUnregisteredEncryptedPayload,
    INotificationWorkspaceJoinAcceptedPayload,
    INotificationWorkspaceJoinRejectedPayload,
    INotificationWorkspaceJoinRequestEncryptedPayload,
} from '@modules/notification/interfaces/notification.interface';

describe('NotificationEmailWorkspaceDomain', () => {
    const awsSESService: MockProxy<AwsSESService> = mock<AwsSESService>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const messageService: MockProxy<MessageService> = mock<MessageService>();
    const helperEncryptionService: MockProxy<HelperEncryptionService> =
        mock<HelperEncryptionService>();
    const payload = mock<INotificationEmailSendPayload>({
        userId: 'user-id',
        email: 'user@example.com',
        username: 'user',
        notificationId: 'notification-id',
    });
    const invite = mock<INotificationWorkspaceInviteEncryptedPayload>({
        encryptedInviteAcceptLink: 'invite-ciphertext',
        reference: 'WI-REF',
        workspaceRoleName: 'Member',
    });
    const unregistered = mock<INotificationEmailSendUnregisteredPayload>({
        email: 'invitee@example.com',
    });
    const unregisteredInvite =
        mock<INotificationWorkspaceInviteUnregisteredEncryptedPayload>({
            encryptedInviteAcceptLink: 'unregistered-ciphertext',
            reference: 'WI-UNREGISTERED',
            workspaceRoleName: 'Member',
        });
    const request = mock<INotificationWorkspaceJoinRequestEncryptedPayload>({
        encryptedJoinRequestReviewLink: 'review-ciphertext',
    });
    const accepted = mock<INotificationWorkspaceJoinAcceptedPayload>();
    const rejected = mock<INotificationWorkspaceJoinRejectedPayload>({
        rejectReasonCode: EnumWorkspaceJoinRejectReason.memberLimitReached,
    });
    const cases = [
        [
            'workspace invite',
            (p: INotificationEmailSendPayload) =>
                service.processWorkspaceInvite(p, invite),
        ],
        [
            'join request',
            (p: INotificationEmailSendPayload) =>
                service.processWorkspaceJoinRequest(p, request),
        ],
        [
            'join accepted',
            (p: INotificationEmailSendPayload) =>
                service.processWorkspaceJoinAccepted(p, accepted),
        ],
        [
            'join rejected',
            (p: INotificationEmailSendPayload) =>
                service.processWorkspaceJoinRejected(p, rejected),
        ],
    ] as const;
    let service: NotificationEmailWorkspaceDomain;

    beforeEach(() => {
        Reflect.set(
            configService,
            'get',
            vi.fn(
                (key: string | symbol) =>
                    ({
                        'email.noreply': 'no-reply@example.com',
                        'email.support': 'support@example.com',
                        'home.name': 'ACK',
                        'home.url': 'https://example.com',
                        'app.encryptionSecretKey': 'root-secret',
                    })[String(key)]
            )
        );
        helperEncryptionService.aes256Decrypt.mockReturnValue('plaintext-link');
        helperDateService.createFromIso.mockReturnValue(
            new Date('2026-01-01T00:00:00.000Z')
        );
        helperDateService.formatToRFC2822.mockReturnValue(
            'Thu, 01 Jan 2026 00:00:00 GMT'
        );
        messageService.setMessage.mockReturnValue('Capacity reached');
        awsSESService.send.mockResolvedValue({
            $metadata: {},
            MessageId: 'message-id',
        });
        service = new NotificationEmailWorkspaceDomain(
            awsSESService,
            configService,
            helperDateService,
            messageService,
            helperEncryptionService
        );
    });

    it.each(cases)(
        'sends %s with and without optional recipient lists',
        async (_name, process) => {
            await expect(process(payload)).resolves.toEqual(
                expect.objectContaining({
                    result: expect.objectContaining({
                        MessageId: 'message-id',
                    }),
                })
            );
            expect(awsSESService.send).toHaveBeenCalledWith(
                expect.not.objectContaining({
                    cc: expect.anything(),
                    bcc: expect.anything(),
                })
            );
            await process({
                ...payload,
                cc: ['cc@example.com'],
                bcc: ['bcc@example.com'],
            });
            expect(awsSESService.send).toHaveBeenNthCalledWith(
                2,
                expect.objectContaining({
                    cc: ['cc@example.com'],
                    bcc: ['bcc@example.com'],
                })
            );
        }
    );

    it.each(cases)(
        'rethrows provider failure for %s',
        async (_name, process) => {
            const error = new Error('SES down');
            awsSESService.send.mockRejectedValue(error);
            await expect(process(payload)).rejects.toBe(error);
        }
    );

    it('uses the invitation reference as encryption context for an unregistered recipient', async () => {
        await service.processWorkspaceInviteUnregistered(
            unregistered,
            unregisteredInvite
        );
        expect(helperEncryptionService.aes256Decrypt).toHaveBeenCalledWith(
            'unregistered-ciphertext',
            'root-secret',
            NotificationPayloadEncryptionPurpose,
            unregisteredInvite.reference
        );
        expect(awsSESService.send).toHaveBeenCalledWith(
            expect.objectContaining({
                recipients: [unregistered.email],
                templateData: expect.objectContaining({
                    inviteAcceptLink: 'plaintext-link',
                }),
            })
        );
    });

    it('puts the workspace role name in the invitation template data for registered and unregistered recipients', async () => {
        await service.processWorkspaceInvite(payload, invite);
        await service.processWorkspaceInviteUnregistered(
            unregistered,
            unregisteredInvite
        );

        for (const call of awsSESService.send.mock.calls) {
            expect(call[0].templateData).toEqual(
                expect.objectContaining({ workspaceRoleName: 'Member' })
            );
            expect(call[0].templateData).not.toHaveProperty(
                'workspaceMemberRole'
            );
        }
        expect(awsSESService.send).toHaveBeenCalledTimes(2);
    });

    it('rethrows unregistered invitation provider failures', async () => {
        const error = new Error('SES down');
        awsSESService.send.mockRejectedValue(error);
        await expect(
            service.processWorkspaceInviteUnregistered(
                unregistered,
                unregisteredInvite
            )
        ).rejects.toBe(error);
    });

    it('localizes the workspace rejection reason', async () => {
        await service.processWorkspaceJoinRejected(payload, rejected);
        expect(messageService.setMessage).toHaveBeenCalledWith(
            'notification.rejectReason.memberLimitReached'
        );
    });
});
