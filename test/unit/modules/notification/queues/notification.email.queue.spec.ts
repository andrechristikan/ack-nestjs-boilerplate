import { getQueueToken } from '@nestjs/bullmq';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import type { Queue } from 'bullmq';
import { SentryService } from '@common/sentry/services/sentry.service';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { HelperEncryptionService } from '@common/helper/services/helper.encryption.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import type { IRequestLog } from '@common/request/interfaces/request.interface';
import {
    EnumTermPolicyType,
    EnumUserLoginFrom,
    EnumUserLoginWith,
    EnumWorkspaceJoinRejectReason,
    EnumWorkspaceMemberRole,
} from '@generated/prisma-client/client';
import { NotificationEmailQueue } from '@modules/notification/queues/notification.email.queue';
import { EnumNotificationProcess } from '@modules/notification/enums/notification.enum';
import type {
    INotificationEmailSendEncryptedPayload,
    INotificationEmailSendUnregisteredEncryptedPayload,
    INotificationNewDeviceLoginPayload,
    INotificationPublishTermPolicyPayload,
    INotificationTermPolicyBatchRecipient,
    INotificationTermPolicyBatchRecipientEncryptedPayload,
    INotificationWorkspaceInviteUnregisteredPayload,
    INotificationWorkspaceJoinRejectedPayload,
} from '@modules/notification/interfaces/notification.interface';
import { EnumQueue, EnumQueuePriority } from '@queues/enums/queue.enum';
import { MessageService } from '@common/message/services/message.service';

describe('NotificationEmailQueue', () => {
    const messageService: MockProxy<MessageService> = mock<MessageService>();
    const emailQueue: MockProxy<Queue> = mock<Queue>();
    const sentryService: MockProxy<SentryService> = mock<SentryService>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>();
    const helperEncryptionService: MockProxy<HelperEncryptionService> =
        mock<HelperEncryptionService>();
    let queue: NotificationEmailQueue;

    const send: INotificationEmailSendEncryptedPayload = {
        userId: 'user-id',
        notificationId: 'notification-id',
        encryptedEmail: 'cipher(nadia@example.com)',
        username: 'nadia',
        cc: [],
        bcc: [],
    };

    beforeEach(async () => {
        vi.resetAllMocks();
        messageService.setMessage.mockImplementation((path: string) => path);
        vi.mocked(configService.get).mockImplementation((key: string) => {
            const values: Record<string, unknown> = {
                'app.encryptionSecretKey': 'secret-key',
                'email.batchDelayInMs': 1000,
                'notification.jobId.referencePattern': '{process}-{reference}',
                'notification.jobId.stepPattern': '{notificationId}-{step}',
                'notification.jobId.termPolicyBatchPattern':
                    '{process}-{termPolicyId}-{batchId}',
                'notification.jobId.termPolicyBatchResendPattern':
                    '{process}-{termPolicyId}-{batchId}-{resendNonce}',
            };

            return values[key];
        });
        const module = await Test.createTestingModule({
            providers: [
                { provide: MessageService, useValue: messageService },
                NotificationEmailQueue,
                {
                    provide: getQueueToken(EnumQueue.notificationEmail),
                    useValue: emailQueue,
                },
                { provide: SentryService, useValue: sentryService },
                { provide: ConfigService, useValue: configService },
                HelperStringService,
                {
                    provide: HelperEncryptionService,
                    useValue: helperEncryptionService,
                },
            ],
        }).compile();
        queue = module.get(NotificationEmailQueue);
    });

    describe('sendWelcomeByAdmin', () => {
        it('enqueues the welcomeByAdmin job with the password fields and medium priority', async () => {
            const data = {
                passwordCreatedAt: '2024-01-01T00:00:00.000Z',
                passwordExpiredAt: '2024-02-01T00:00:00.000Z',
                encryptedPassword: 'cipher-password',
            };

            await queue.sendWelcomeByAdmin(send, data);

            expect(emailQueue.add).toHaveBeenCalledWith(
                EnumNotificationProcess.welcomeByAdmin,
                { send, data },
                {
                    jobId: 'notification-id-sendEmail',
                    priority: EnumQueuePriority.medium,
                }
            );
        });
    });

    describe('sendTemporaryPasswordByAdmin', () => {
        it('enqueues the temporaryPasswordByAdmin job with the password fields and medium priority', async () => {
            const data = {
                encryptedPassword: 'cipher-password',
                passwordCreatedAt: '2024-01-01T00:00:00.000Z',
                passwordExpiredAt: '2024-02-01T00:00:00.000Z',
            };

            await queue.sendTemporaryPasswordByAdmin(send, data);

            expect(emailQueue.add).toHaveBeenCalledWith(
                EnumNotificationProcess.temporaryPasswordByAdmin,
                { send, data },
                {
                    jobId: 'notification-id-sendEmail',
                    priority: EnumQueuePriority.medium,
                }
            );
        });
    });

    describe('sendResetPassword', () => {
        it('enqueues the resetPassword job with low priority', async () => {
            await queue.sendResetPassword(send);

            expect(emailQueue.add).toHaveBeenCalledWith(
                EnumNotificationProcess.resetPassword,
                { send, data: null },
                {
                    jobId: 'notification-id-sendEmail',
                    priority: EnumQueuePriority.low,
                }
            );
        });

        it('carries the cc and bcc recipients into the enqueued send payload', async () => {
            const sendWithRecipients: INotificationEmailSendEncryptedPayload = {
                ...send,
                cc: ['cc@example.com'],
                bcc: ['bcc-1@example.com', 'bcc-2@example.com'],
            };

            await queue.sendResetPassword(sendWithRecipients);

            expect(emailQueue.add).toHaveBeenCalledWith(
                EnumNotificationProcess.resetPassword,
                { send: sendWithRecipients, data: null },
                {
                    jobId: 'notification-id-sendEmail',
                    priority: EnumQueuePriority.low,
                }
            );
        });
    });

    describe('sendChangePassword', () => {
        it('enqueues the changePassword job with low priority', async () => {
            await queue.sendChangePassword(send);

            expect(emailQueue.add).toHaveBeenCalledWith(
                EnumNotificationProcess.changePassword,
                { send, data: null },
                {
                    jobId: 'notification-id-sendEmail',
                    priority: EnumQueuePriority.low,
                }
            );
        });
    });

    describe('sendVerificationEmail', () => {
        it('enqueues the verificationEmail job with a step job id, high priority', async () => {
            const data = {
                expiredAt: '2024-02-01T00:00:00.000Z',
                expiredInMinutes: 30,
                encryptedLink: 'cipher-link',
                reference: 'ref-1',
            };

            await queue.sendVerificationEmail(send, data);

            expect(emailQueue.add).toHaveBeenCalledWith(
                EnumNotificationProcess.verificationEmail,
                { send, data },
                {
                    jobId: 'notification-id-sendVerificationEmail',
                    priority: EnumQueuePriority.high,
                }
            );
        });
    });

    describe('sendWelcome', () => {
        it('enqueues the welcome job with low priority', async () => {
            await queue.sendWelcome(send);

            expect(emailQueue.add).toHaveBeenCalledWith(
                EnumNotificationProcess.welcome,
                { send, data: null },
                {
                    jobId: 'notification-id-sendWelcomeEmail',
                    priority: EnumQueuePriority.low,
                }
            );
        });

        it('rejects and reports nothing when the add rejects', async () => {
            const error = new Error('redis down');
            emailQueue.add.mockRejectedValue(error);

            await expect(queue.sendWelcome(send)).rejects.toBe(error);

            expect(sentryService.captureException).not.toHaveBeenCalled();
        });
    });

    describe('sendWelcomeSocial', () => {
        it('enqueues the welcomeSocial job with low priority', async () => {
            await queue.sendWelcomeSocial(send);

            expect(emailQueue.add).toHaveBeenCalledWith(
                EnumNotificationProcess.welcomeSocial,
                { send, data: null },
                {
                    jobId: 'notification-id-sendEmail',
                    priority: EnumQueuePriority.low,
                }
            );
        });
    });

    describe('sendVerifiedEmail', () => {
        it('enqueues the verifiedEmail job with low priority', async () => {
            const data = { reference: 'ref-1' };

            await queue.sendVerifiedEmail(send, data);

            expect(emailQueue.add).toHaveBeenCalledWith(
                EnumNotificationProcess.verifiedEmail,
                { send, data },
                {
                    jobId: 'notification-id-sendEmail',
                    priority: EnumQueuePriority.low,
                }
            );
        });
    });

    describe('sendForgotPassword', () => {
        it('enqueues the forgotPassword job with a step job id, high priority', async () => {
            const data = {
                expiredAt: '2024-02-01T00:00:00.000Z',
                expiredInMinutes: 15,
                encryptedLink: 'cipher-link',
                reference: 'ref-1',
                resendInMinutes: 5,
            };

            await queue.sendForgotPassword(send, data);

            expect(emailQueue.add).toHaveBeenCalledWith(
                EnumNotificationProcess.forgotPassword,
                { send, data },
                {
                    jobId: 'notification-id-sendEmail',
                    priority: EnumQueuePriority.high,
                }
            );
        });
    });

    describe('sendVerifiedMobileNumber', () => {
        it('enqueues the verifiedMobileNumber job with a step job id, low priority', async () => {
            const data = {
                mobileNumber: '+15551234567',
                reference: 'ref-1',
                resendInMinutes: 5,
            };

            await queue.sendVerifiedMobileNumber(send, data);

            expect(emailQueue.add).toHaveBeenCalledWith(
                EnumNotificationProcess.verifiedMobileNumber,
                { send, data },
                {
                    jobId: 'notification-id-sendEmail',
                    priority: EnumQueuePriority.low,
                }
            );
        });
    });

    describe('sendResetTwoFactorByAdmin', () => {
        it('enqueues the resetTwoFactorByAdmin job with high priority', async () => {
            await queue.sendResetTwoFactorByAdmin(send);

            expect(emailQueue.add).toHaveBeenCalledWith(
                EnumNotificationProcess.resetTwoFactorByAdmin,
                { send, data: null },
                {
                    jobId: 'notification-id-sendEmail',
                    priority: EnumQueuePriority.high,
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

            expect(emailQueue.add).toHaveBeenCalledWith(
                EnumNotificationProcess.newDeviceLogin,
                { send, data },
                {
                    jobId: 'notification-id-sendEmail',
                    priority: EnumQueuePriority.high,
                }
            );
        });
    });

    describe('sendPublishTermPolicyBatch', () => {
        const data: INotificationPublishTermPolicyPayload = {
            termPolicyId: 'term-policy-id',
            type: EnumTermPolicyType.privacy,
            version: 3,
            recipientCutoffAt: '2024-01-01T00:00:00.000Z',
            resendNonce: null,
        };
        const recipients: INotificationTermPolicyBatchRecipient[] = [
            {
                userId: 'user-1',
                notificationId: 'notification-1',
                email: 'nadia@example.com',
                username: 'nadia',
            },
            {
                userId: 'user-2',
                notificationId: 'notification-2',
                email: 'omar@example.com',
                username: 'omar',
            },
        ];
        const encryptedRecipients: INotificationTermPolicyBatchRecipientEncryptedPayload[] =
            [
                {
                    userId: 'user-1',
                    notificationId: 'notification-1',
                    encryptedEmail: 'cipher(nadia@example.com)',
                    username: 'nadia',
                },
                {
                    userId: 'user-2',
                    notificationId: 'notification-2',
                    encryptedEmail: 'cipher(omar@example.com)',
                    username: 'omar',
                },
            ];

        beforeEach(() => {
            helperEncryptionService.aes256Encrypt.mockImplementation(
                (plaintext: string) => `cipher(${plaintext})`
            );
        });

        it('enqueues one batch job keyed by term policy and batch, carrying the encrypted recipients, medium priority, no delay at index 0', async () => {
            await queue.sendPublishTermPolicyBatch(
                data,
                'batch-id',
                'admin-id',
                0,
                recipients
            );

            expect(emailQueue.add).toHaveBeenCalledWith(
                EnumNotificationProcess.publishTermPolicy,
                {
                    data,
                    batchId: 'batch-id',
                    proceedBy: 'admin-id',
                    recipients: encryptedRecipients,
                },
                {
                    priority: EnumQueuePriority.medium,
                    jobId: 'publishTermPolicy-term-policy-id-batch-id',
                    delay: 0,
                }
            );
        });

        it('encrypts each recipient email with its own user id as context', async () => {
            await queue.sendPublishTermPolicyBatch(
                data,
                'batch-id',
                'admin-id',
                0,
                recipients
            );

            expect(helperEncryptionService.aes256Encrypt).toHaveBeenCalledTimes(
                2
            );
            expect(helperEncryptionService.aes256Encrypt).toHaveBeenCalledWith(
                'nadia@example.com',
                'secret-key',
                'notification.payload',
                'user-1'
            );
            expect(helperEncryptionService.aes256Encrypt).toHaveBeenCalledWith(
                'omar@example.com',
                'secret-key',
                'notification.payload',
                'user-2'
            );
        });

        it('uses the nonce batch job id when resendNonce is set', async () => {
            await queue.sendPublishTermPolicyBatch(
                { ...data, resendNonce: 'nonce-1' },
                'batch-id',
                'admin-id',
                0,
                recipients
            );

            expect(emailQueue.add).toHaveBeenCalledWith(
                EnumNotificationProcess.publishTermPolicy,
                expect.anything(),
                expect.objectContaining({
                    jobId: `publishTermPolicy-${data.termPolicyId}-batch-id-nonce-1`,
                })
            );
        });

        it('delays the job by index times the email batch delay', async () => {
            await queue.sendPublishTermPolicyBatch(
                data,
                'batch-id',
                'admin-id',
                2,
                recipients
            );

            expect(emailQueue.add).toHaveBeenCalledWith(
                EnumNotificationProcess.publishTermPolicy,
                expect.objectContaining({ batchId: 'batch-id' }),
                expect.objectContaining({ delay: 2000 })
            );
        });

        it('adds the batch job with the fixed job id and never reads an existing job', async () => {
            await queue.sendPublishTermPolicyBatch(
                data,
                'batch-id',
                'admin-id',
                0,
                recipients
            );

            expect(emailQueue.add).toHaveBeenCalledWith(
                EnumNotificationProcess.publishTermPolicy,
                expect.objectContaining({ batchId: 'batch-id' }),
                expect.objectContaining({
                    jobId: 'publishTermPolicy-term-policy-id-batch-id',
                })
            );
            expect(emailQueue.getJob).not.toHaveBeenCalled();
        });
    });

    describe('sendWorkspaceInvite', () => {
        it('enqueues the workspaceInvite job with a step job id, high priority', async () => {
            const data = {
                workspaceId: 'workspace-id',
                workspaceName: 'Acme',
                inviterName: 'Omar',
                workspaceMemberRole: EnumWorkspaceMemberRole.member,
                encryptedInviteAcceptLink: 'cipher-link',
                reference: 'ref-1',
                expiredAt: '2024-02-01T00:00:00.000Z',
            };

            await queue.sendWorkspaceInvite(send, data);

            expect(emailQueue.add).toHaveBeenCalledWith(
                EnumNotificationProcess.workspaceInvite,
                { send, data },
                {
                    jobId: 'notification-id-sendEmail',
                    priority: EnumQueuePriority.high,
                }
            );
        });
    });

    describe('sendWorkspaceInviteUnregistered', () => {
        it('encrypts the invite link and enqueues the workspaceInviteUnregistered job under a reference job id', async () => {
            const invite: INotificationWorkspaceInviteUnregisteredPayload = {
                workspaceId: 'workspace-id',
                workspaceName: 'Acme',
                inviterName: 'Omar',
                workspaceMemberRole: EnumWorkspaceMemberRole.member,
                inviteAcceptLink: 'https://invite.example.com',
                reference: 'ref-1',
                expiredAt: '2024-02-01T00:00:00.000Z',
            };
            helperEncryptionService.aes256Encrypt
                .mockReturnValueOnce('cipher-invite-link')
                .mockReturnValueOnce('cipher-email');

            await queue.sendWorkspaceInviteUnregistered(
                'invitee@example.com',
                invite
            );

            expect(helperEncryptionService.aes256Encrypt).toHaveBeenCalledWith(
                invite.inviteAcceptLink,
                'secret-key',
                'notification.payload',
                invite.reference
            );
            expect(helperEncryptionService.aes256Encrypt).toHaveBeenCalledWith(
                'invitee@example.com',
                'secret-key',
                'notification.payload',
                invite.reference
            );
            const expectedSend: INotificationEmailSendUnregisteredEncryptedPayload =
                {
                    encryptedEmail: 'cipher-email',
                    cc: [],
                    bcc: [],
                };
            expect(emailQueue.add).toHaveBeenCalledWith(
                EnumNotificationProcess.workspaceInviteUnregistered,
                {
                    send: expectedSend,
                    data: {
                        workspaceId: invite.workspaceId,
                        workspaceName: invite.workspaceName,
                        inviterName: invite.inviterName,
                        workspaceMemberRole: invite.workspaceMemberRole,
                        reference: invite.reference,
                        expiredAt: invite.expiredAt,
                        encryptedInviteAcceptLink: 'cipher-invite-link',
                    },
                },
                {
                    jobId: 'workspaceInviteUnregistered-ref-1',
                    priority: EnumQueuePriority.high,
                }
            );
        });

        it('resolves and reports the failure when the add rejects', async () => {
            const error = new Error('redis down');
            emailQueue.add.mockRejectedValue(error);

            await expect(
                queue.sendWorkspaceInviteUnregistered('invitee@example.com', {
                    workspaceId: 'workspace-id',
                    workspaceName: 'Acme',
                    inviterName: 'Omar',
                    workspaceMemberRole: EnumWorkspaceMemberRole.member,
                    inviteAcceptLink: 'https://invite.example.com',
                    reference: 'ref-1',
                    expiredAt: '2024-02-01T00:00:00.000Z',
                })
            ).resolves.toBeUndefined();

            expect(sentryService.captureException).toHaveBeenCalledWith(
                expect.objectContaining({
                    rawError: error,
                    message:
                        'notification.queue.email.error.enqueueWorkspaceInviteUnregistered',
                })
            );
        });
    });

    describe('sendWorkspaceJoinRequest', () => {
        it('enqueues the workspaceJoinRequest job with a step job id, medium priority', async () => {
            const data = {
                workspaceId: 'workspace-id',
                workspaceName: 'Acme',
                requesterName: 'Omar',
                joinRequestId: 'join-request-id',
                encryptedJoinRequestReviewLink: 'cipher-review-link',
            };

            await queue.sendWorkspaceJoinRequest(send, data);

            expect(emailQueue.add).toHaveBeenCalledWith(
                EnumNotificationProcess.workspaceJoinRequest,
                { send, data },
                {
                    jobId: 'notification-id-sendEmail',
                    priority: EnumQueuePriority.medium,
                }
            );
        });
    });

    describe('sendWorkspaceJoinAccepted', () => {
        it('enqueues the workspaceJoinAccepted job with a step job id, medium priority', async () => {
            const data = { workspaceId: 'workspace-id', workspaceName: 'Acme' };

            await queue.sendWorkspaceJoinAccepted(send, data);

            expect(emailQueue.add).toHaveBeenCalledWith(
                EnumNotificationProcess.workspaceJoinAccepted,
                { send, data },
                {
                    jobId: 'notification-id-sendEmail',
                    priority: EnumQueuePriority.medium,
                }
            );
        });
    });

    describe('sendWorkspaceJoinRejected', () => {
        it('enqueues the workspaceJoinRejected job with a step job id, medium priority', async () => {
            const data: INotificationWorkspaceJoinRejectedPayload = {
                workspaceId: 'workspace-id',
                workspaceName: 'Acme',
                rejectReasonCode:
                    EnumWorkspaceJoinRejectReason.memberLimitReached,
            };

            await queue.sendWorkspaceJoinRejected(send, data);

            expect(emailQueue.add).toHaveBeenCalledWith(
                EnumNotificationProcess.workspaceJoinRejected,
                { send, data },
                {
                    jobId: 'notification-id-sendEmail',
                    priority: EnumQueuePriority.medium,
                }
            );
        });
    });
});
