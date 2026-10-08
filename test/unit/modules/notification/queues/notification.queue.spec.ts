import { getQueueToken } from '@nestjs/bullmq';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import type { Queue } from 'bullmq';
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
import { EnumNotificationProcess } from '@modules/notification/enums/notification.enum';
import type {
    INotificationAcceptTermPolicyPayload,
    INotificationForgotPasswordPayload,
    INotificationNewDeviceLoginPayload,
    INotificationTemporaryPasswordPayload,
    INotificationVerificationEmailPayload,
    INotificationWelcomeByAdminPayload,
    INotificationWorkspaceInvitePayload,
    INotificationWorkspaceJoinAcceptedPayload,
    INotificationWorkspaceJoinRejectedPayload,
    INotificationWorkspaceJoinRequestPayload,
} from '@modules/notification/interfaces/notification.interface';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { EnumQueue, EnumQueuePriority } from '@queues/enums/queue.enum';

describe('NotificationQueue', () => {
    const notificationQueue: MockProxy<Queue> = mock<Queue>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>();
    const helperEncryptionService: MockProxy<HelperEncryptionService> =
        mock<HelperEncryptionService>();
    let queue: NotificationQueue;

    beforeEach(async () => {
        vi.resetAllMocks();
        vi.mocked(configService.get).mockImplementation((key: string) => {
            const values: Record<string, unknown> = {
                'notification.dedupTtlInMs': 60_000,
                'app.encryptionSecretKey': 'secret-key',
            };

            return values[key];
        });
        helperEncryptionService.aes256Encrypt.mockImplementation(
            (plaintext: string) => `cipher(${plaintext})`
        );
        const module = await Test.createTestingModule({
            providers: [
                NotificationQueue,
                {
                    provide: getQueueToken(EnumQueue.notification),
                    useValue: notificationQueue,
                },
                { provide: ConfigService, useValue: configService },
                HelperStringService,
                {
                    provide: HelperEncryptionService,
                    useValue: helperEncryptionService,
                },
            ],
        }).compile();
        queue = module.get(NotificationQueue);
    });

    describe('sendWelcomeByAdmin', () => {
        it('encrypts the password and enqueues the welcomeByAdmin job, medium priority', async () => {
            const payload: INotificationWelcomeByAdminPayload = {
                password: 'plain-password',
                passwordCreatedAt: '2024-01-01T00:00:00.000Z',
                passwordExpiredAt: '2024-02-01T00:00:00.000Z',
            };

            await queue.sendWelcomeByAdmin('user-id', payload, 'admin-id');

            expect(helperEncryptionService.aes256Encrypt).toHaveBeenCalledWith(
                payload.password,
                'secret-key',
                'notification.payload',
                'user-id'
            );
            expect(notificationQueue.add).toHaveBeenCalledWith(
                EnumNotificationProcess.welcomeByAdmin,
                {
                    userId: 'user-id',
                    proceedBy: 'admin-id',
                    data: {
                        encryptedPassword: 'cipher(plain-password)',
                        passwordCreatedAt: payload.passwordCreatedAt,
                        passwordExpiredAt: payload.passwordExpiredAt,
                    },
                },
                {
                    priority: EnumQueuePriority.medium,
                    deduplication: {
                        id: 'welcomeByAdmin-user-id',
                        ttl: 60_000,
                    },
                }
            );
        });
    });

    describe('sendWelcome', () => {
        it('encrypts the link and enqueues the welcome job, medium priority', async () => {
            const payload: INotificationVerificationEmailPayload = {
                link: 'https://verify.example.com',
                expiredAt: '2024-02-01T00:00:00.000Z',
                expiredInMinutes: 30,
                reference: 'ref-1',
            };

            await queue.sendWelcome('user-id', payload);

            expect(helperEncryptionService.aes256Encrypt).toHaveBeenCalledWith(
                payload.link,
                'secret-key',
                'notification.payload',
                'user-id'
            );
            expect(notificationQueue.add).toHaveBeenCalledWith(
                EnumNotificationProcess.welcome,
                {
                    userId: 'user-id',
                    proceedBy: 'user-id',
                    data: {
                        encryptedLink: 'cipher(https://verify.example.com)',
                        expiredAt: payload.expiredAt,
                        expiredInMinutes: payload.expiredInMinutes,
                        reference: payload.reference,
                    },
                },
                {
                    priority: EnumQueuePriority.medium,
                    deduplication: {
                        id: 'welcome-user-id',
                        ttl: 60_000,
                    },
                }
            );
        });
    });

    describe('sendWelcomeSocial', () => {
        it('enqueues the welcomeSocial job with no data, medium priority', async () => {
            await queue.sendWelcomeSocial('user-id');

            expect(notificationQueue.add).toHaveBeenCalledWith(
                EnumNotificationProcess.welcomeSocial,
                { userId: 'user-id', proceedBy: 'user-id', data: null },
                {
                    priority: EnumQueuePriority.medium,
                    deduplication: {
                        id: 'welcomeSocial-user-id',
                        ttl: 60_000,
                    },
                }
            );
        });
    });

    describe('sendTemporaryPasswordByAdmin', () => {
        it('encrypts the password and enqueues the temporaryPasswordByAdmin job, high priority', async () => {
            const payload: INotificationTemporaryPasswordPayload = {
                password: 'plain-password',
                passwordCreatedAt: '2024-01-01T00:00:00.000Z',
                passwordExpiredAt: '2024-02-01T00:00:00.000Z',
            };

            await queue.sendTemporaryPasswordByAdmin(
                'user-id',
                payload,
                'admin-id'
            );

            expect(helperEncryptionService.aes256Encrypt).toHaveBeenCalledWith(
                payload.password,
                'secret-key',
                'notification.payload',
                'user-id'
            );
            expect(notificationQueue.add).toHaveBeenCalledWith(
                EnumNotificationProcess.temporaryPasswordByAdmin,
                {
                    userId: 'user-id',
                    proceedBy: 'admin-id',
                    data: {
                        encryptedPassword: 'cipher(plain-password)',
                        passwordCreatedAt: payload.passwordCreatedAt,
                        passwordExpiredAt: payload.passwordExpiredAt,
                    },
                },
                {
                    priority: EnumQueuePriority.high,
                    deduplication: {
                        id: 'temporaryPasswordByAdmin-user-id',
                        ttl: 60_000,
                    },
                }
            );
        });
    });

    describe('sendChangePassword', () => {
        it('enqueues the changePassword job with no data, medium priority', async () => {
            await queue.sendChangePassword('user-id');

            expect(notificationQueue.add).toHaveBeenCalledWith(
                EnumNotificationProcess.changePassword,
                { userId: 'user-id', proceedBy: 'user-id', data: null },
                {
                    priority: EnumQueuePriority.medium,
                    deduplication: {
                        id: 'changePassword-user-id',
                        ttl: 60_000,
                    },
                }
            );
        });
    });

    describe('sendVerifiedEmail', () => {
        it('enqueues the verifiedEmail job, medium priority', async () => {
            const verified = { reference: 'ref-1' };

            await queue.sendVerifiedEmail('user-id', verified);

            expect(notificationQueue.add).toHaveBeenCalledWith(
                EnumNotificationProcess.verifiedEmail,
                { userId: 'user-id', data: verified, proceedBy: 'user-id' },
                {
                    priority: EnumQueuePriority.medium,
                    deduplication: {
                        id: 'verifiedEmail-user-id',
                        ttl: 60_000,
                    },
                }
            );
        });
    });

    describe('sendVerificationEmail', () => {
        it('encrypts the link and enqueues the verificationEmail job, medium priority', async () => {
            const payload: INotificationVerificationEmailPayload = {
                link: 'https://verify.example.com',
                expiredAt: '2024-02-01T00:00:00.000Z',
                expiredInMinutes: 30,
                reference: 'ref-1',
            };

            await queue.sendVerificationEmail('user-id', payload);

            expect(helperEncryptionService.aes256Encrypt).toHaveBeenCalledWith(
                payload.link,
                'secret-key',
                'notification.payload',
                'user-id'
            );
            expect(notificationQueue.add).toHaveBeenCalledWith(
                EnumNotificationProcess.verificationEmail,
                {
                    userId: 'user-id',
                    proceedBy: 'user-id',
                    data: {
                        encryptedLink: 'cipher(https://verify.example.com)',
                        expiredAt: payload.expiredAt,
                        expiredInMinutes: payload.expiredInMinutes,
                        reference: payload.reference,
                    },
                },
                {
                    priority: EnumQueuePriority.medium,
                    deduplication: {
                        id: 'verificationEmail-user-id',
                        ttl: 60_000,
                    },
                }
            );
        });
    });

    describe('sendForgotPassword', () => {
        it('encrypts the link and enqueues the forgotPassword job, medium priority', async () => {
            const payload: INotificationForgotPasswordPayload = {
                link: 'https://reset.example.com',
                expiredAt: '2024-02-01T00:00:00.000Z',
                expiredInMinutes: 15,
                reference: 'ref-1',
                resendInMinutes: 5,
            };

            await queue.sendForgotPassword('user-id', payload);

            expect(helperEncryptionService.aes256Encrypt).toHaveBeenCalledWith(
                payload.link,
                'secret-key',
                'notification.payload',
                'user-id'
            );
            expect(notificationQueue.add).toHaveBeenCalledWith(
                EnumNotificationProcess.forgotPassword,
                {
                    userId: 'user-id',
                    proceedBy: 'user-id',
                    data: {
                        encryptedLink: 'cipher(https://reset.example.com)',
                        expiredAt: payload.expiredAt,
                        expiredInMinutes: payload.expiredInMinutes,
                        reference: payload.reference,
                        resendInMinutes: payload.resendInMinutes,
                    },
                },
                {
                    priority: EnumQueuePriority.medium,
                    deduplication: {
                        id: 'forgotPassword-user-id',
                        ttl: 60_000,
                    },
                }
            );
        });
    });

    describe('sendResetPassword', () => {
        it('enqueues the resetPassword job with no data, medium priority', async () => {
            await queue.sendResetPassword('user-id');

            expect(notificationQueue.add).toHaveBeenCalledWith(
                EnumNotificationProcess.resetPassword,
                { userId: 'user-id', proceedBy: 'user-id', data: null },
                {
                    priority: EnumQueuePriority.medium,
                    deduplication: {
                        id: 'resetPassword-user-id',
                        ttl: 60_000,
                    },
                }
            );
        });
    });

    describe('sendResetTwoFactorByAdmin', () => {
        it('enqueues the resetTwoFactorByAdmin job, high priority', async () => {
            await queue.sendResetTwoFactorByAdmin('user-id', 'admin-id');

            expect(notificationQueue.add).toHaveBeenCalledWith(
                EnumNotificationProcess.resetTwoFactorByAdmin,
                { userId: 'user-id', proceedBy: 'admin-id', data: null },
                {
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
        it('enqueues the newDeviceLogin job, high priority', async () => {
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
            const newDevice: INotificationNewDeviceLoginPayload = {
                loginFrom: EnumUserLoginFrom.website,
                loginWith: EnumUserLoginWith.credential,
                loginAt: '2024-01-01T00:00:00.000Z',
                requestLog,
            };

            await queue.sendNewDeviceLogin('user-id', newDevice);

            expect(notificationQueue.add).toHaveBeenCalledWith(
                EnumNotificationProcess.newDeviceLogin,
                { userId: 'user-id', data: newDevice, proceedBy: 'user-id' },
                {
                    priority: EnumQueuePriority.high,
                    deduplication: {
                        id: 'newDeviceLogin-user-id',
                        ttl: 60_000,
                    },
                }
            );
        });
    });

    describe('sendPublishTermPolicy', () => {
        it('enqueues the publishTermPolicy job under a job id built from the term policy id, medium priority, without deduplication', async () => {
            const payload = {
                termPolicyId: 'term-policy-id',
                type: EnumTermPolicyType.privacy,
                version: 3,
            };

            await queue.sendPublishTermPolicy(payload, 'admin-id');

            expect(notificationQueue.add).toHaveBeenCalledWith(
                EnumNotificationProcess.publishTermPolicy,
                { proceedBy: 'admin-id', data: payload },
                {
                    priority: EnumQueuePriority.medium,
                    jobId: 'publishTermPolicy-term-policy-id',
                }
            );
        });
    });

    describe('sendVerifiedMobileNumber', () => {
        it('enqueues the verifiedMobileNumber job, medium priority', async () => {
            const verifiedMobile = {
                reference: 'ref-1',
                resendInMinutes: 5,
                mobileNumber: '+15551234567',
            };

            await queue.sendVerifiedMobileNumber('user-id', verifiedMobile);

            expect(notificationQueue.add).toHaveBeenCalledWith(
                EnumNotificationProcess.verifiedMobileNumber,
                {
                    userId: 'user-id',
                    data: verifiedMobile,
                    proceedBy: 'user-id',
                },
                {
                    priority: EnumQueuePriority.medium,
                    deduplication: {
                        id: 'verifiedMobileNumber-user-id',
                        ttl: 60_000,
                    },
                }
            );
        });
    });

    describe('sendUserAcceptTermPolicy', () => {
        it('enqueues the userAcceptTermPolicy job deduplicated by user and term policy, low priority', async () => {
            const payload: INotificationAcceptTermPolicyPayload = {
                type: EnumTermPolicyType.privacy,
                version: 3,
                termPolicyId: 'term-policy-id',
            };

            await queue.sendUserAcceptTermPolicy('user-id', payload);

            expect(notificationQueue.add).toHaveBeenCalledWith(
                EnumNotificationProcess.userAcceptTermPolicy,
                { userId: 'user-id', data: payload, proceedBy: 'user-id' },
                {
                    priority: EnumQueuePriority.low,
                    deduplication: {
                        id: 'userAcceptTermPolicy-user-id-term-policy-id',
                        ttl: 60_000,
                    },
                }
            );
        });
    });

    describe('sendWorkspaceInvite', () => {
        it('encrypts the invite link and enqueues the workspaceInvite job deduplicated by reference, medium priority', async () => {
            const payload: INotificationWorkspaceInvitePayload = {
                workspaceId: 'workspace-id',
                workspaceName: 'Acme',
                inviterName: 'Omar',
                workspaceMemberRole: EnumWorkspaceMemberRole.member,
                inviteAcceptLink: 'https://invite.example.com',
                reference: 'ref-1',
                expiredAt: '2024-02-01T00:00:00.000Z',
            };

            await queue.sendWorkspaceInvite('user-id', payload, 'admin-id');

            expect(helperEncryptionService.aes256Encrypt).toHaveBeenCalledWith(
                payload.inviteAcceptLink,
                'secret-key',
                'notification.payload',
                'user-id'
            );
            expect(notificationQueue.add).toHaveBeenCalledWith(
                EnumNotificationProcess.workspaceInvite,
                {
                    userId: 'user-id',
                    proceedBy: 'admin-id',
                    data: {
                        workspaceId: payload.workspaceId,
                        workspaceName: payload.workspaceName,
                        inviterName: payload.inviterName,
                        workspaceMemberRole: payload.workspaceMemberRole,
                        reference: payload.reference,
                        expiredAt: payload.expiredAt,
                        encryptedInviteAcceptLink:
                            'cipher(https://invite.example.com)',
                    },
                },
                {
                    priority: EnumQueuePriority.medium,
                    deduplication: {
                        id: 'workspaceInvite-ref-1',
                        ttl: 60_000,
                    },
                }
            );
        });
    });

    describe('sendWorkspaceJoinRequest', () => {
        it('encrypts the review link and enqueues the workspaceJoinRequest job deduplicated by workspace and user, medium priority', async () => {
            const payload: INotificationWorkspaceJoinRequestPayload = {
                workspaceId: 'workspace-id',
                workspaceName: 'Acme',
                requesterName: 'Omar',
                joinRequestReviewLink: 'https://review.example.com',
            };

            await queue.sendWorkspaceJoinRequest(
                'user-id',
                payload,
                'requester-id'
            );

            expect(helperEncryptionService.aes256Encrypt).toHaveBeenCalledWith(
                payload.joinRequestReviewLink,
                'secret-key',
                'notification.payload',
                'user-id'
            );
            expect(notificationQueue.add).toHaveBeenCalledWith(
                EnumNotificationProcess.workspaceJoinRequest,
                {
                    userId: 'user-id',
                    proceedBy: 'requester-id',
                    data: {
                        workspaceId: payload.workspaceId,
                        workspaceName: payload.workspaceName,
                        requesterName: payload.requesterName,
                        encryptedJoinRequestReviewLink:
                            'cipher(https://review.example.com)',
                    },
                },
                {
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
            const payload: INotificationWorkspaceJoinAcceptedPayload = {
                workspaceId: 'workspace-id',
                workspaceName: 'Acme',
            };

            await queue.sendWorkspaceJoinAccepted(
                'user-id',
                payload,
                'reviewer-id'
            );

            expect(notificationQueue.add).toHaveBeenCalledWith(
                EnumNotificationProcess.workspaceJoinAccepted,
                {
                    userId: 'user-id',
                    data: payload,
                    proceedBy: 'reviewer-id',
                },
                {
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
            const payload: INotificationWorkspaceJoinRejectedPayload = {
                workspaceId: 'workspace-id',
                workspaceName: 'Acme',
                rejectReasonCode:
                    EnumWorkspaceJoinRejectReason.memberLimitReached,
            };

            await queue.sendWorkspaceJoinRejected(
                'user-id',
                payload,
                'reviewer-id'
            );

            expect(notificationQueue.add).toHaveBeenCalledWith(
                EnumNotificationProcess.workspaceJoinRejected,
                {
                    userId: 'user-id',
                    data: payload,
                    proceedBy: 'reviewer-id',
                },
                {
                    priority: EnumQueuePriority.medium,
                    deduplication: {
                        id: 'workspaceJoinRejected-workspace-id-user-id',
                        ttl: 60_000,
                    },
                }
            );
        });
    });

    describe('encryptValue', () => {
        it('delegates to HelperEncryptionService.aes256Encrypt with the module purpose and secret', () => {
            const result = queue['encryptValue']('plain-text', 'context-id');

            expect(result).toBe('cipher(plain-text)');
            expect(helperEncryptionService.aes256Encrypt).toHaveBeenCalledWith(
                'plain-text',
                'secret-key',
                'notification.payload',
                'context-id'
            );
        });
    });
});
