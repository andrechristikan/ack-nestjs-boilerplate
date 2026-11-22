import { getQueueToken } from '@nestjs/bullmq';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import type { Queue } from 'bullmq';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import {
    EnumNotificationChannel,
    EnumTermPolicyType,
    EnumWorkspaceMemberRole,
} from '@generated/prisma-client/client';
import {
    EnumNotificationEmailProcess,
    EnumNotificationKind,
    EnumNotificationQueue,
} from '@modules/notification/enums/notification.enum';
import type {
    INotificationRecipientRecord,
    INotificationSealedData,
    INotificationTermPolicyBatchRecipient,
    INotificationWorkspaceInviteFields,
} from '@modules/notification/interfaces/notification.interface';
import { NotificationEmailQueue } from '@modules/notification/queues/notification.email.queue';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import type { ITermPolicyPublishPayload } from '@modules/term-policy/interfaces/term-policy.interface';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import {
    TestUnitKitConfigValues,
    TestUnitKitProviders,
} from '@test/unit/helpers/test.unit.kit.helper';
import {
    buildUnsealedNotificationPayload,
    buildUnsealedRecipientEmails,
} from '@test/unit/helpers/test.unit.notification-push.helper';

describe('NotificationEmailQueue', () => {
    const bullQueue: MockProxy<Queue> = mock<Queue>();
    let queue: NotificationEmailQueue;

    const publishPayload: ITermPolicyPublishPayload = {
        termPolicyId: 'term-policy-id',
        type: EnumTermPolicyType.privacy,
        version: 1,
        recipientCutoffAt: '2024-01-01T00:00:00.000Z',
        resendNonce: null,
    };

    const invitePayload: INotificationWorkspaceInviteFields = {
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
                        'notification.idempotencyKey.referencePattern':
                            '{process}-{reference}',
                        'notification.idempotencyKey.stepPattern':
                            '{process}-{notificationId}',
                        'notification.idempotencyKey.termPolicyBatchPattern':
                            '{process}-{termPolicyId}-{batchId}',
                        'notification.idempotencyKey.termPolicyBatchResendPattern':
                            '{process}-{termPolicyId}-{batchId}-{resendNonce}',
                    }),
                },
                NotificationUtil,
                NotificationEmailQueue,
                {
                    provide: getQueueToken(
                        EnumNotificationQueue.notificationEmail
                    ),
                    useValue: bullQueue,
                },
            ],
        }).compile();
        queue = module.get(NotificationEmailQueue);
    });

    describe('sendEffect', () => {
        it('returns the email send effect keyed by the send process and the notification id with the kind priority', () => {
            const context: INotificationSealedData = {
                userId: 'user-id',
                proceedBy: 'actor-id',
                workspaceId: 'workspace-id',
                encryptedInviteAcceptLink: 'encrypted-link',
                snapshot: null,
                verificationId: null,
            };
            const recipient: INotificationRecipientRecord = {
                userId: 'user-id',
                username: 'invitee',
                encryptedEmail: 'encrypted-email',
                encryptedTokens: ['encrypted-token'],
                encryptedMobileNumber: null,
                channels: [EnumNotificationChannel.email],
            };

            const result = queue.sendEffect(
                EnumNotificationKind.workspaceInvite,
                'notification-id',
                context,
                recipient
            );

            expect(result).toEqual({
                queue: EnumNotificationQueue.notificationEmail,
                name: EnumNotificationEmailProcess.send,
                data: {
                    kind: EnumNotificationKind.workspaceInvite,
                    notificationId: 'notification-id',
                    userId: 'user-id',
                    username: 'invitee',
                    encryptedEmail: 'encrypted-email',
                    context,
                    completedSteps: [],
                },
                priority: EnumQueuePriority.medium,
                idempotencyKey: 'send-notification-id',
            });
        });
    });

    describe('notifyUnregisteredInvite', () => {
        it('returns the unregistered email effect with the address and link sealed against the reference', () => {
            const result = queue.notifyUnregisteredInvite(
                'invitee@example.com',
                invitePayload
            );

            expect(result).toEqual({
                queue: EnumNotificationQueue.notificationEmail,
                name: EnumNotificationEmailProcess.sendUnregistered,
                data: {
                    encryptedEmail: expect.any(String),
                    context: {
                        workspaceId: 'workspace-id',
                        workspaceName: 'Acme',
                        inviterName: 'Alice',
                        reference: 'WI-ref',
                        workspaceMemberRole: EnumWorkspaceMemberRole.member,
                        expiredAt: 'Mon, 08 Jan 2024 00:00:00 +0000',
                        encryptedInviteAcceptLink: expect.any(String),
                    },
                },
                priority: EnumQueuePriority.medium,
                idempotencyKey: 'sendUnregistered-WI-ref',
            });
            expect(
                buildUnsealedNotificationPayload(
                    result.data.encryptedEmail,
                    'WI-ref'
                )
            ).toBe('invitee@example.com');
            expect(
                buildUnsealedNotificationPayload(
                    String(result.data.context.encryptedInviteAcceptLink),
                    'WI-ref'
                )
            ).toBe('https://app.test/invite/token');
        });
    });

    describe('emailPublishTermPolicyEffect', () => {
        const recipients: INotificationTermPolicyBatchRecipient[] = [
            {
                userId: 'u1',
                notificationId: 'n-1',
                email: 'u1@example.com',
                username: 'name-u1',
            },
            {
                userId: 'u2',
                notificationId: 'n-2',
                email: 'u2@example.com',
                username: 'name-u2',
            },
        ];

        it('returns the email queue effect with each address encrypted against its user id, keyed by the batch pattern', () => {
            const result = queue.emailPublishTermPolicyEffect(
                publishPayload,
                'batch-1',
                'admin-id',
                recipients
            );

            expect(result).toEqual({
                queue: EnumNotificationQueue.notificationEmail,
                name: EnumNotificationEmailProcess.publishTermPolicy,
                data: {
                    data: publishPayload,
                    batchId: 'batch-1',
                    proceedBy: 'admin-id',
                    recipients: [
                        {
                            userId: 'u1',
                            notificationId: 'n-1',
                            encryptedEmail: expect.any(String),
                            username: 'name-u1',
                        },
                        {
                            userId: 'u2',
                            notificationId: 'n-2',
                            encryptedEmail: expect.any(String),
                            username: 'name-u2',
                        },
                    ],
                },
                priority: EnumQueuePriority.medium,
                idempotencyKey: 'publishTermPolicy-term-policy-id-batch-1',
            });
            expect(
                buildUnsealedRecipientEmails(result.data.recipients)
            ).toEqual(['u1@example.com', 'u2@example.com']);
        });

        it('keys the effect by the resend pattern and the nonce when the data carries one', () => {
            const resendData = { ...publishPayload, resendNonce: 'nonce-1' };

            const result = queue.emailPublishTermPolicyEffect(
                resendData,
                'batch-1',
                'admin-id',
                recipients
            );

            expect(result.idempotencyKey).toBe(
                'publishTermPolicy-term-policy-id-batch-1-nonce-1'
            );
            expect(result.data.data).toEqual(resendData);
        });
    });
});
