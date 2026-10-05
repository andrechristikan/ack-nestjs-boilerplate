import { getQueueToken } from '@nestjs/bullmq';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import type { Queue } from 'bullmq';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { HelperEncryptionService } from '@common/helper/services/helper.encryption.service';
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
    INotificationEmailSendPayload,
    INotificationEmailSendUnregisteredPayload,
    INotificationNewDeviceLoginPayload,
    INotificationPublishTermPolicyPayload,
    INotificationWorkspaceInviteUnregisteredPayload,
    INotificationWorkspaceJoinRejectedPayload,
} from '@modules/notification/interfaces/notification.interface';
import { EnumQueue, EnumQueuePriority } from '@queues/enums/queue.enum';

describe('NotificationEmailQueue', () => {
    const emailQueue: MockProxy<Queue> = mock<Queue>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>();
    const helperEncryptionService: MockProxy<HelperEncryptionService> =
        mock<HelperEncryptionService>();
    let queue: NotificationEmailQueue;

    const send: INotificationEmailSendPayload = {
        userId: 'user-id',
        notificationId: 'notification-id',
        email: 'nadia@example.com',
        username: 'nadia',
    };

    beforeEach(async () => {
        vi.resetAllMocks();
        vi.mocked(configService.get).mockImplementation((key: string) => {
            const values: Record<string, unknown> = {
                'notification.dedupTtlInMs': 60_000,
                'verification.expiredInMs': 900_000,
                'verification.resendInMs': 120_000,
                'forgotPassword.resendInMs': 300_000,
                'app.encryptionSecretKey': 'secret-key',
            };

            return values[key];
        });
        const module = await Test.createTestingModule({
            providers: [
                NotificationEmailQueue,
                {
                    provide: getQueueToken(EnumQueue.notificationEmail),
                    useValue: emailQueue,
                },
                { provide: ConfigService, useValue: configService },
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
                    jobId: `${EnumNotificationProcess.welcomeByAdmin}-${send.userId}`,
                    deduplication: {
                        id: `${EnumNotificationProcess.welcomeByAdmin}-${send.userId}`,
                        ttl: 60_000,
                    },
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
                    deduplication: {
                        id: `${EnumNotificationProcess.temporaryPasswordByAdmin}-${send.userId}`,
                        ttl: 60_000,
                    },
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
                { send },
                {
                    priority: EnumQueuePriority.low,
                    deduplication: {
                        id: `${EnumNotificationProcess.resetPassword}-${send.userId}`,
                        ttl: 60_000,
                    },
                }
            );
        });
    });

    describe('sendChangePassword', () => {
        it('enqueues the changePassword job with low priority', async () => {
            await queue.sendChangePassword(send);

            expect(emailQueue.add).toHaveBeenCalledWith(
                EnumNotificationProcess.changePassword,
                { send },
                {
                    priority: EnumQueuePriority.low,
                    deduplication: {
                        id: `${EnumNotificationProcess.changePassword}-${send.userId}`,
                        ttl: 60_000,
                    },
                }
            );
        });
    });

    describe('sendVerificationEmail', () => {
        it('enqueues the verificationEmail job deduplicated by the verification TTL, high priority', async () => {
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
                    deduplication: {
                        id: `${EnumNotificationProcess.verificationEmail}-${send.userId}`,
                        ttl: 900_000,
                    },
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
                { send },
                {
                    jobId: `${EnumNotificationProcess.welcome}-${send.userId}`,
                    deduplication: {
                        id: `${EnumNotificationProcess.welcome}-${send.userId}`,
                        ttl: 60_000,
                    },
                    priority: EnumQueuePriority.low,
                }
            );
        });
    });

    describe('sendWelcomeSocial', () => {
        it('enqueues the welcomeSocial job with low priority', async () => {
            await queue.sendWelcomeSocial(send);

            expect(emailQueue.add).toHaveBeenCalledWith(
                EnumNotificationProcess.welcomeSocial,
                { send },
                {
                    jobId: `${EnumNotificationProcess.welcomeSocial}-${send.userId}`,
                    deduplication: {
                        id: `${EnumNotificationProcess.welcomeSocial}-${send.userId}`,
                        ttl: 60_000,
                    },
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
                    jobId: `${EnumNotificationProcess.verifiedEmail}-${send.userId}`,
                    deduplication: {
                        id: `${EnumNotificationProcess.verifiedEmail}-${send.userId}`,
                        ttl: 60_000,
                    },
                    priority: EnumQueuePriority.low,
                }
            );
        });
    });

    describe('sendForgotPassword', () => {
        it('enqueues the forgotPassword job deduplicated by the forgot-password resend TTL, high priority', async () => {
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
                    deduplication: {
                        id: `${EnumNotificationProcess.forgotPassword}-${send.userId}`,
                        ttl: 300_000,
                    },
                    priority: EnumQueuePriority.high,
                }
            );
        });
    });

    describe('sendVerifiedMobileNumber', () => {
        it('enqueues the verifiedMobileNumber job deduplicated by the verification resend TTL, low priority', async () => {
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
                    jobId: `${EnumNotificationProcess.verifiedMobileNumber}-${send.userId}`,
                    deduplication: {
                        id: `${EnumNotificationProcess.verifiedMobileNumber}-${send.userId}`,
                        ttl: 120_000,
                    },
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
                { send },
                {
                    deduplication: {
                        id: `${EnumNotificationProcess.resetTwoFactorByAdmin}-${send.userId}`,
                        ttl: 60_000,
                    },
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
                    deduplication: {
                        id: `${EnumNotificationProcess.newDeviceLogin}-${send.userId}`,
                        ttl: 60_000,
                    },
                    priority: EnumQueuePriority.high,
                }
            );
        });
    });

    describe('sendPublishTermPolicy', () => {
        it('enqueues one bulk publishTermPolicy job deduplicated by type and version, medium priority', async () => {
            const data: INotificationPublishTermPolicyPayload = {
                type: EnumTermPolicyType.privacy,
                version: 3,
            };

            await queue.sendPublishTermPolicy([send], data);

            expect(emailQueue.add).toHaveBeenCalledWith(
                EnumNotificationProcess.publishTermPolicy,
                { send: [send], data },
                {
                    priority: EnumQueuePriority.medium,
                    deduplication: {
                        id: `${EnumNotificationProcess.publishTermPolicy}-${data.type}-${data.version}`,
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
                encryptedInviteAcceptLink: 'cipher-link',
                reference: 'ref-1',
                expiredAt: '2024-02-01T00:00:00.000Z',
            };

            await queue.sendWorkspaceInvite(send, data);

            expect(emailQueue.add).toHaveBeenCalledWith(
                EnumNotificationProcess.workspaceInvite,
                { send, data },
                {
                    priority: EnumQueuePriority.high,
                    deduplication: {
                        id: `${EnumNotificationProcess.workspaceInvite}-${data.reference}`,
                        ttl: 60_000,
                    },
                }
            );
        });
    });

    describe('sendWorkspaceInviteUnregistered', () => {
        it('encrypts the invite link and enqueues the workspaceInviteUnregistered job deduplicated by reference', async () => {
            const invite: INotificationWorkspaceInviteUnregisteredPayload = {
                workspaceId: 'workspace-id',
                workspaceName: 'Acme',
                inviterName: 'Omar',
                workspaceMemberRole: EnumWorkspaceMemberRole.member,
                inviteAcceptLink: 'https://invite.example.com',
                reference: 'ref-1',
                expiredAt: '2024-02-01T00:00:00.000Z',
            };
            helperEncryptionService.aes256Encrypt.mockReturnValue(
                'cipher-invite-link'
            );

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
            const expectedSend: INotificationEmailSendUnregisteredPayload = {
                email: 'invitee@example.com',
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
                    priority: EnumQueuePriority.high,
                    deduplication: {
                        id: `${EnumNotificationProcess.workspaceInviteUnregistered}-${invite.reference}`,
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
                encryptedJoinRequestReviewLink: 'cipher-review-link',
            };

            await queue.sendWorkspaceJoinRequest(send, data);

            expect(emailQueue.add).toHaveBeenCalledWith(
                EnumNotificationProcess.workspaceJoinRequest,
                { send, data },
                {
                    priority: EnumQueuePriority.medium,
                    deduplication: {
                        id: `${EnumNotificationProcess.workspaceJoinRequest}-${data.workspaceId}-${send.userId}`,
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

            expect(emailQueue.add).toHaveBeenCalledWith(
                EnumNotificationProcess.workspaceJoinAccepted,
                { send, data },
                {
                    priority: EnumQueuePriority.medium,
                    deduplication: {
                        id: `${EnumNotificationProcess.workspaceJoinAccepted}-${data.workspaceId}-${send.userId}`,
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

            expect(emailQueue.add).toHaveBeenCalledWith(
                EnumNotificationProcess.workspaceJoinRejected,
                { send, data },
                {
                    priority: EnumQueuePriority.medium,
                    deduplication: {
                        id: `${EnumNotificationProcess.workspaceJoinRejected}-${data.workspaceId}-${send.userId}`,
                        ttl: 60_000,
                    },
                }
            );
        });
    });
});
