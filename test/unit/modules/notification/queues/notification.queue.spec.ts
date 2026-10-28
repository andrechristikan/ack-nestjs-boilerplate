import { getQueueToken } from '@nestjs/bullmq';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import type { Queue } from 'bullmq';
import { SentryService } from '@common/sentry/services/sentry.service';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { HelperEncryptionService } from '@common/helper/services/helper.encryption.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
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
import {
    expectRecipientEncrypted,
    TestEncryptedRecipient,
    TestRecipient,
} from '@test/unit/helpers/test.unit.notification-push.helper';
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
import { MessageService } from '@common/message/services/message.service';

describe('NotificationQueue', () => {
    const messageService: MockProxy<MessageService> = mock<MessageService>();
    const notificationQueue: MockProxy<Queue> = mock<Queue>();
    const sentryService: MockProxy<SentryService> = mock<SentryService>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>();
    const helperEncryptionService: MockProxy<HelperEncryptionService> =
        mock<HelperEncryptionService>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();
    const recipient = TestRecipient;
    let queue: NotificationQueue;

    beforeEach(async () => {
        vi.resetAllMocks();
        messageService.setMessage.mockImplementation((path: string) => path);
        vi.mocked(configService.get).mockImplementation((key: string) => {
            const values: Record<string, unknown> = {
                'app.encryptionSecretKey': 'secret-key',
                'notification.jobId.userPattern': '{process}-{userId}',
                'notification.jobId.referencePattern': '{process}-{reference}',
                'notification.jobId.eventPattern': '{process}-{eventId}',
                'notification.jobId.joinRequestPattern':
                    '{process}-{joinRequestId}-{userId}',
                'notification.jobId.termPolicyPublishPattern':
                    '{process}-{termPolicyId}',
                'notification.jobId.termPolicyResendPattern':
                    '{process}-{termPolicyId}-{resendNonce}',
                'notification.jobId.userTermPolicyPattern':
                    '{process}-{userId}-{termPolicyId}',
            };

            return values[key];
        });
        databaseUtil.createId.mockReturnValue('n-1');
        helperEncryptionService.aes256Encrypt.mockImplementation(
            (plaintext: string) => `cipher(${plaintext})`
        );
        const module = await Test.createTestingModule({
            providers: [
                { provide: MessageService, useValue: messageService },
                NotificationQueue,
                {
                    provide: getQueueToken(EnumQueue.notification),
                    useValue: notificationQueue,
                },
                { provide: SentryService, useValue: sentryService },
                { provide: ConfigService, useValue: configService },
                HelperStringService,
                {
                    provide: HelperEncryptionService,
                    useValue: helperEncryptionService,
                },
                { provide: DatabaseUtil, useValue: databaseUtil },
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

            await queue.sendWelcomeByAdmin(recipient, payload, 'admin-id');

            expect(helperEncryptionService.aes256Encrypt).toHaveBeenCalledWith(
                payload.password,
                'secret-key',
                'notification.payload',
                'user-id'
            );
            expectRecipientEncrypted(helperEncryptionService, recipient);
            expect(notificationQueue.add).toHaveBeenCalledWith(
                EnumNotificationProcess.welcomeByAdmin,
                {
                    userId: 'user-id',
                    notificationId: 'n-1',
                    completedSteps: [],
                    recipient: TestEncryptedRecipient,
                    proceedBy: 'admin-id',
                    data: {
                        encryptedPassword: 'cipher(plain-password)',
                        passwordCreatedAt: payload.passwordCreatedAt,
                        passwordExpiredAt: payload.passwordExpiredAt,
                    },
                },
                {
                    priority: EnumQueuePriority.medium,
                    jobId: 'welcomeByAdmin-user-id',
                }
            );
        });

        it('resolves and reports the failure when the add rejects', async () => {
            const error = new Error('redis down');
            notificationQueue.add.mockRejectedValue(error);

            await expect(
                queue.sendWelcomeByAdmin(
                    recipient,
                    {
                        password: 'plain-password',
                        passwordCreatedAt: '2024-01-01T00:00:00.000Z',
                        passwordExpiredAt: '2024-02-01T00:00:00.000Z',
                    },
                    'admin-id'
                )
            ).resolves.toBeUndefined();

            expect(sentryService.captureException).toHaveBeenCalledWith(
                expect.objectContaining({
                    rawError: error,
                    message: 'notification.queue.error.enqueueWelcomeByAdmin',
                })
            );
        });
    });

    describe('sendWelcomeByAdminBulk', () => {
        it('encrypts each password and adds one welcomeByAdmin job per user in one addBulk, each under a user job id', async () => {
            const secondRecipient = { ...recipient, userId: 'user-2' };
            const payload: INotificationWelcomeByAdminPayload = {
                password: 'plain-password',
                passwordCreatedAt: '2024-01-01T00:00:00.000Z',
                passwordExpiredAt: '2024-02-01T00:00:00.000Z',
            };
            databaseUtil.createId
                .mockReturnValueOnce('n-1')
                .mockReturnValueOnce('n-2');

            await queue.sendWelcomeByAdminBulk(
                [
                    { recipient, data: payload },
                    { recipient: secondRecipient, data: payload },
                ],
                'admin-id'
            );

            expect(helperEncryptionService.aes256Encrypt).toHaveBeenCalledWith(
                payload.password,
                'secret-key',
                'notification.payload',
                'user-2'
            );
            expect(notificationQueue.addBulk).toHaveBeenCalledTimes(1);
            expect(notificationQueue.add).not.toHaveBeenCalled();
            expect(notificationQueue.addBulk).toHaveBeenCalledWith([
                {
                    name: EnumNotificationProcess.welcomeByAdmin,
                    data: {
                        userId: 'user-id',
                        notificationId: 'n-1',
                        completedSteps: [],
                        recipient: TestEncryptedRecipient,
                        proceedBy: 'admin-id',
                        data: {
                            encryptedPassword: 'cipher(plain-password)',
                            passwordCreatedAt: payload.passwordCreatedAt,
                            passwordExpiredAt: payload.passwordExpiredAt,
                        },
                    },
                    opts: {
                        priority: EnumQueuePriority.medium,
                        jobId: 'welcomeByAdmin-user-id',
                    },
                },
                {
                    name: EnumNotificationProcess.welcomeByAdmin,
                    data: {
                        userId: 'user-2',
                        notificationId: 'n-2',
                        completedSteps: [],
                        recipient: TestEncryptedRecipient,
                        proceedBy: 'admin-id',
                        data: {
                            encryptedPassword: 'cipher(plain-password)',
                            passwordCreatedAt: payload.passwordCreatedAt,
                            passwordExpiredAt: payload.passwordExpiredAt,
                        },
                    },
                    opts: {
                        priority: EnumQueuePriority.medium,
                        jobId: 'welcomeByAdmin-user-2',
                    },
                },
            ]);
        });

        it('resolves and reports the failure when the addBulk rejects', async () => {
            const error = new Error('redis down');
            notificationQueue.addBulk.mockRejectedValue(error);

            await expect(
                queue.sendWelcomeByAdminBulk(
                    [
                        {
                            recipient,
                            data: {
                                password: 'plain-password',
                                passwordCreatedAt: '2024-01-01T00:00:00.000Z',
                                passwordExpiredAt: '2024-02-01T00:00:00.000Z',
                            },
                        },
                    ],
                    'admin-id'
                )
            ).resolves.toBeUndefined();

            expect(sentryService.captureException).toHaveBeenCalledWith(
                expect.objectContaining({
                    rawError: error,
                    message:
                        'notification.queue.error.enqueueWelcomeByAdminBulk',
                })
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

            databaseUtil.createId
                .mockReturnValueOnce('n-1')
                .mockReturnValueOnce('n-2');

            await queue.sendWelcome(recipient, payload);

            expect(helperEncryptionService.aes256Encrypt).toHaveBeenCalledWith(
                payload.link,
                'secret-key',
                'notification.payload',
                'user-id'
            );
            expectRecipientEncrypted(helperEncryptionService, recipient);
            expect(notificationQueue.add).toHaveBeenCalledWith(
                EnumNotificationProcess.welcome,
                {
                    userId: 'user-id',
                    notificationId: 'n-1',
                    completedSteps: [],
                    recipient: TestEncryptedRecipient,
                    proceedBy: 'user-id',
                    data: {
                        encryptedLink: 'cipher(https://verify.example.com)',
                        expiredAt: payload.expiredAt,
                        expiredInMinutes: payload.expiredInMinutes,
                        reference: payload.reference,
                        verificationNotificationId: 'n-2',
                    },
                },
                {
                    priority: EnumQueuePriority.medium,
                    jobId: 'welcome-user-id',
                }
            );
        });
    });

    describe('sendWelcomeSocial', () => {
        it('enqueues the welcomeSocial job with no data, medium priority', async () => {
            await queue.sendWelcomeSocial(recipient);

            expectRecipientEncrypted(helperEncryptionService, recipient);
            expect(notificationQueue.add).toHaveBeenCalledWith(
                EnumNotificationProcess.welcomeSocial,
                {
                    userId: 'user-id',
                    notificationId: 'n-1',
                    completedSteps: [],
                    recipient: TestEncryptedRecipient,
                    proceedBy: 'user-id',
                    data: null,
                },
                {
                    priority: EnumQueuePriority.medium,
                    jobId: 'welcomeSocial-user-id',
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
                recipient,
                payload,
                'admin-id',
                'history-1'
            );

            expect(helperEncryptionService.aes256Encrypt).toHaveBeenCalledWith(
                payload.password,
                'secret-key',
                'notification.payload',
                'user-id'
            );
            expectRecipientEncrypted(helperEncryptionService, recipient);
            expect(notificationQueue.add).toHaveBeenCalledWith(
                EnumNotificationProcess.temporaryPasswordByAdmin,
                {
                    userId: 'user-id',
                    notificationId: 'n-1',
                    completedSteps: [],
                    recipient: TestEncryptedRecipient,
                    proceedBy: 'admin-id',
                    data: {
                        encryptedPassword: 'cipher(plain-password)',
                        passwordCreatedAt: payload.passwordCreatedAt,
                        passwordExpiredAt: payload.passwordExpiredAt,
                    },
                },
                {
                    priority: EnumQueuePriority.high,
                    jobId: 'temporaryPasswordByAdmin-history-1',
                }
            );
        });
    });

    describe('sendChangePassword', () => {
        it('enqueues the changePassword job with no data, medium priority', async () => {
            await queue.sendChangePassword(recipient, 'history-1');

            expectRecipientEncrypted(helperEncryptionService, recipient);
            expect(notificationQueue.add).toHaveBeenCalledWith(
                EnumNotificationProcess.changePassword,
                {
                    userId: 'user-id',
                    notificationId: 'n-1',
                    completedSteps: [],
                    recipient: TestEncryptedRecipient,
                    proceedBy: 'user-id',
                    data: null,
                },
                {
                    priority: EnumQueuePriority.medium,
                    jobId: 'changePassword-history-1',
                }
            );
        });
    });

    describe('sendChangePassword job ids', () => {
        it('gives two calls with different password history ids different job ids', async () => {
            await queue.sendChangePassword(recipient, 'history-1');
            await queue.sendChangePassword(recipient, 'history-2');

            expect(notificationQueue.add).toHaveBeenNthCalledWith(
                1,
                EnumNotificationProcess.changePassword,
                expect.anything(),
                expect.objectContaining({ jobId: 'changePassword-history-1' })
            );
            expect(notificationQueue.add).toHaveBeenNthCalledWith(
                2,
                EnumNotificationProcess.changePassword,
                expect.anything(),
                expect.objectContaining({ jobId: 'changePassword-history-2' })
            );
        });
    });

    describe('sendVerifiedEmail', () => {
        it('enqueues the verifiedEmail job, medium priority', async () => {
            const verified = { reference: 'ref-1' };

            await queue.sendVerifiedEmail(recipient, verified);

            expectRecipientEncrypted(helperEncryptionService, recipient);
            expect(notificationQueue.add).toHaveBeenCalledWith(
                EnumNotificationProcess.verifiedEmail,
                {
                    userId: 'user-id',
                    notificationId: 'n-1',
                    completedSteps: [],
                    recipient: TestEncryptedRecipient,
                    data: verified,
                    proceedBy: 'user-id',
                },
                {
                    priority: EnumQueuePriority.medium,
                    jobId: 'verifiedEmail-ref-1',
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

            await queue.sendVerificationEmail(recipient, payload);

            expect(helperEncryptionService.aes256Encrypt).toHaveBeenCalledWith(
                payload.link,
                'secret-key',
                'notification.payload',
                'user-id'
            );
            expectRecipientEncrypted(helperEncryptionService, recipient);
            expect(notificationQueue.add).toHaveBeenCalledWith(
                EnumNotificationProcess.verificationEmail,
                {
                    userId: 'user-id',
                    notificationId: 'n-1',
                    completedSteps: [],
                    recipient: TestEncryptedRecipient,
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
                    jobId: 'verificationEmail-ref-1',
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

            await queue.sendForgotPassword(recipient, payload);

            expect(helperEncryptionService.aes256Encrypt).toHaveBeenCalledWith(
                payload.link,
                'secret-key',
                'notification.payload',
                'user-id'
            );
            expectRecipientEncrypted(helperEncryptionService, recipient);
            expect(notificationQueue.add).toHaveBeenCalledWith(
                EnumNotificationProcess.forgotPassword,
                {
                    userId: 'user-id',
                    notificationId: 'n-1',
                    completedSteps: [],
                    recipient: TestEncryptedRecipient,
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
                    jobId: 'forgotPassword-ref-1',
                }
            );
        });
    });

    describe('sendResetPassword', () => {
        it('enqueues the resetPassword job with no data, medium priority', async () => {
            await queue.sendResetPassword(recipient, 'reset-1');

            expectRecipientEncrypted(helperEncryptionService, recipient);
            expect(notificationQueue.add).toHaveBeenCalledWith(
                EnumNotificationProcess.resetPassword,
                {
                    userId: 'user-id',
                    notificationId: 'n-1',
                    completedSteps: [],
                    recipient: TestEncryptedRecipient,
                    proceedBy: 'user-id',
                    data: null,
                },
                {
                    priority: EnumQueuePriority.medium,
                    jobId: 'resetPassword-reset-1',
                }
            );
        });
    });

    describe('sendResetTwoFactorByAdmin', () => {
        it('enqueues the resetTwoFactorByAdmin job, high priority', async () => {
            await queue.sendResetTwoFactorByAdmin(recipient, 'admin-id');

            expectRecipientEncrypted(helperEncryptionService, recipient);
            expect(notificationQueue.add).toHaveBeenCalledWith(
                EnumNotificationProcess.resetTwoFactorByAdmin,
                {
                    userId: 'user-id',
                    notificationId: 'n-1',
                    completedSteps: [],
                    recipient: TestEncryptedRecipient,
                    proceedBy: 'admin-id',
                    data: null,
                },
                {
                    priority: EnumQueuePriority.high,
                    jobId: 'resetTwoFactorByAdmin-n-1',
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

            await queue.sendNewDeviceLogin(recipient, newDevice, 'session-1');

            expectRecipientEncrypted(helperEncryptionService, recipient);
            expect(notificationQueue.add).toHaveBeenCalledWith(
                EnumNotificationProcess.newDeviceLogin,
                {
                    userId: 'user-id',
                    notificationId: 'n-1',
                    completedSteps: [],
                    recipient: TestEncryptedRecipient,
                    data: newDevice,
                    proceedBy: 'user-id',
                },
                {
                    priority: EnumQueuePriority.high,
                    jobId: 'newDeviceLogin-session-1',
                }
            );
        });
    });

    describe('sendPublishTermPolicy', () => {
        it('adds the publish job with the fixed job id', async () => {
            const payload = {
                termPolicyId: 'term-policy-id',
                type: EnumTermPolicyType.privacy,
                version: 3,
                recipientCutoffAt: '2024-01-01T00:00:00.000Z',
                resendNonce: null,
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
            expect(notificationQueue.getJob).not.toHaveBeenCalled();
        });
    });

    describe('sendResendPublishTermPolicy', () => {
        const proceedBy = 'admin-id';
        const basePayload = {
            termPolicyId: 'term-policy-id',
            type: EnumTermPolicyType.privacy,
            version: 3,
            recipientCutoffAt: '2024-01-01T00:00:00.000Z',
        };

        it('adds the resend job with a nonce job id and the nonce in the payload', async () => {
            databaseUtil.createId.mockReturnValue('nonce-1');

            await queue.sendResendPublishTermPolicy(basePayload, proceedBy);

            expect(notificationQueue.add).toHaveBeenCalledWith(
                EnumNotificationProcess.resendPublishTermPolicy,
                { proceedBy, data: { ...basePayload, resendNonce: 'nonce-1' } },
                {
                    priority: EnumQueuePriority.medium,
                    jobId: `resendPublishTermPolicy-${basePayload.termPolicyId}-nonce-1`,
                }
            );
        });

        it('draws a new nonce per call', async () => {
            databaseUtil.createId
                .mockReturnValueOnce('nonce-1')
                .mockReturnValueOnce('nonce-2');

            await queue.sendResendPublishTermPolicy(basePayload, proceedBy);
            await queue.sendResendPublishTermPolicy(basePayload, proceedBy);

            expect(notificationQueue.add).toHaveBeenNthCalledWith(
                2,
                EnumNotificationProcess.resendPublishTermPolicy,
                expect.anything(),
                expect.objectContaining({
                    jobId: `resendPublishTermPolicy-${basePayload.termPolicyId}-nonce-2`,
                })
            );
        });

        it('rejects and reports nothing when the add rejects', async () => {
            const error = new Error('redis down');
            notificationQueue.add.mockRejectedValue(error);

            await expect(
                queue.sendResendPublishTermPolicy(basePayload, proceedBy)
            ).rejects.toBe(error);

            expect(sentryService.captureException).not.toHaveBeenCalled();
        });
    });

    describe('sendVerifiedMobileNumber', () => {
        it('enqueues the verifiedMobileNumber job, medium priority', async () => {
            const verifiedMobile = {
                reference: 'ref-1',
                resendInMinutes: 5,
                mobileNumber: '+15551234567',
            };

            await queue.sendVerifiedMobileNumber(recipient, verifiedMobile);

            expectRecipientEncrypted(helperEncryptionService, recipient);
            expect(notificationQueue.add).toHaveBeenCalledWith(
                EnumNotificationProcess.verifiedMobileNumber,
                {
                    userId: 'user-id',
                    notificationId: 'n-1',
                    completedSteps: [],
                    recipient: TestEncryptedRecipient,
                    data: verifiedMobile,
                    proceedBy: 'user-id',
                },
                {
                    priority: EnumQueuePriority.medium,
                    jobId: 'verifiedMobileNumber-ref-1',
                }
            );
        });
    });

    describe('sendUserAcceptTermPolicy', () => {
        it('enqueues the userAcceptTermPolicy job under a fixed job id, low priority', async () => {
            const payload: INotificationAcceptTermPolicyPayload = {
                type: EnumTermPolicyType.privacy,
                version: 3,
                termPolicyId: 'term-policy-id',
            };

            await queue.sendUserAcceptTermPolicy(recipient, payload);

            expectRecipientEncrypted(helperEncryptionService, recipient);
            expect(notificationQueue.add).toHaveBeenCalledWith(
                EnumNotificationProcess.userAcceptTermPolicy,
                {
                    userId: 'user-id',
                    notificationId: 'n-1',
                    completedSteps: [],
                    recipient: TestEncryptedRecipient,
                    data: payload,
                    proceedBy: 'user-id',
                },
                {
                    priority: EnumQueuePriority.low,
                    jobId: 'userAcceptTermPolicy-user-id-term-policy-id',
                }
            );
        });
    });

    describe('sendWorkspaceInvite', () => {
        it('encrypts the invite link and enqueues the workspaceInvite job under a fixed job id, medium priority', async () => {
            const payload: INotificationWorkspaceInvitePayload = {
                workspaceId: 'workspace-id',
                workspaceName: 'Acme',
                inviterName: 'Omar',
                workspaceMemberRole: EnumWorkspaceMemberRole.member,
                inviteAcceptLink: 'https://invite.example.com',
                reference: 'ref-1',
                expiredAt: '2024-02-01T00:00:00.000Z',
            };

            await queue.sendWorkspaceInvite(recipient, payload, 'admin-id');

            expect(helperEncryptionService.aes256Encrypt).toHaveBeenCalledWith(
                payload.inviteAcceptLink,
                'secret-key',
                'notification.payload',
                'user-id'
            );
            expectRecipientEncrypted(helperEncryptionService, recipient);
            expect(notificationQueue.add).toHaveBeenCalledWith(
                EnumNotificationProcess.workspaceInvite,
                {
                    userId: 'user-id',
                    notificationId: 'n-1',
                    completedSteps: [],
                    recipient: TestEncryptedRecipient,
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
                    jobId: 'workspaceInvite-ref-1',
                }
            );
        });
    });

    describe('sendWorkspaceJoinRequestBulk', () => {
        it('encrypts the review link per reviewer and adds one job per reviewer in one addBulk, medium priority', async () => {
            const secondRecipient = { ...recipient, userId: 'user-2' };
            const payload: INotificationWorkspaceJoinRequestPayload = {
                workspaceId: 'workspace-id',
                workspaceName: 'Acme',
                requesterName: 'Omar',
                joinRequestId: 'join-request-id',
                joinRequestReviewLink: 'https://review.example.com',
            };
            databaseUtil.createId
                .mockReturnValueOnce('n-1')
                .mockReturnValueOnce('n-2');

            await queue.sendWorkspaceJoinRequestBulk(
                [recipient, secondRecipient],
                payload,
                'requester-id'
            );

            expect(helperEncryptionService.aes256Encrypt).toHaveBeenCalledWith(
                payload.joinRequestReviewLink,
                'secret-key',
                'notification.payload',
                'user-id'
            );
            expect(helperEncryptionService.aes256Encrypt).toHaveBeenCalledWith(
                payload.joinRequestReviewLink,
                'secret-key',
                'notification.payload',
                'user-2'
            );
            expect(notificationQueue.addBulk).toHaveBeenCalledTimes(1);
            expect(notificationQueue.add).not.toHaveBeenCalled();
            expect(notificationQueue.addBulk).toHaveBeenCalledWith([
                {
                    name: EnumNotificationProcess.workspaceJoinRequest,
                    data: {
                        userId: 'user-id',
                        notificationId: 'n-1',
                        completedSteps: [],
                        recipient: TestEncryptedRecipient,
                        proceedBy: 'requester-id',
                        data: {
                            workspaceId: payload.workspaceId,
                            workspaceName: payload.workspaceName,
                            requesterName: payload.requesterName,
                            joinRequestId: payload.joinRequestId,
                            encryptedJoinRequestReviewLink:
                                'cipher(https://review.example.com)',
                        },
                    },
                    opts: {
                        priority: EnumQueuePriority.medium,
                        jobId: 'workspaceJoinRequest-join-request-id-user-id',
                    },
                },
                {
                    name: EnumNotificationProcess.workspaceJoinRequest,
                    data: {
                        userId: 'user-2',
                        notificationId: 'n-2',
                        completedSteps: [],
                        recipient: TestEncryptedRecipient,
                        proceedBy: 'requester-id',
                        data: {
                            workspaceId: payload.workspaceId,
                            workspaceName: payload.workspaceName,
                            requesterName: payload.requesterName,
                            joinRequestId: payload.joinRequestId,
                            encryptedJoinRequestReviewLink:
                                'cipher(https://review.example.com)',
                        },
                    },
                    opts: {
                        priority: EnumQueuePriority.medium,
                        jobId: 'workspaceJoinRequest-join-request-id-user-2',
                    },
                },
            ]);
        });

        it('resolves and reports the failure when the addBulk rejects', async () => {
            const error = new Error('redis down');
            notificationQueue.addBulk.mockRejectedValue(error);

            await expect(
                queue.sendWorkspaceJoinRequestBulk(
                    [recipient],
                    {
                        workspaceId: 'workspace-id',
                        workspaceName: 'Acme',
                        requesterName: 'Omar',
                        joinRequestId: 'join-request-id',
                        joinRequestReviewLink: 'https://review.example.com',
                    },
                    'requester-id'
                )
            ).resolves.toBeUndefined();

            expect(sentryService.captureException).toHaveBeenCalledWith(
                expect.objectContaining({
                    rawError: error,
                    message:
                        'notification.queue.error.enqueueWorkspaceJoinRequestBulk',
                })
            );
        });
    });

    describe('sendWorkspaceJoinAccepted', () => {
        it('enqueues the workspaceJoinAccepted job under a fixed job id, medium priority', async () => {
            const payload: INotificationWorkspaceJoinAcceptedPayload = {
                workspaceId: 'workspace-id',
                workspaceName: 'Acme',
            };

            await queue.sendWorkspaceJoinAccepted(
                recipient,
                payload,
                'reviewer-id',
                'join-request-id'
            );

            expectRecipientEncrypted(helperEncryptionService, recipient);
            expect(notificationQueue.add).toHaveBeenCalledWith(
                EnumNotificationProcess.workspaceJoinAccepted,
                {
                    userId: 'user-id',
                    notificationId: 'n-1',
                    completedSteps: [],
                    recipient: TestEncryptedRecipient,
                    data: payload,
                    proceedBy: 'reviewer-id',
                },
                {
                    priority: EnumQueuePriority.medium,
                    jobId: 'workspaceJoinAccepted-join-request-id-user-id',
                }
            );
        });
    });

    describe('sendWorkspaceJoinRejected', () => {
        it('enqueues the workspaceJoinRejected job under a fixed job id, medium priority', async () => {
            const payload: INotificationWorkspaceJoinRejectedPayload = {
                workspaceId: 'workspace-id',
                workspaceName: 'Acme',
                rejectReasonCode:
                    EnumWorkspaceJoinRejectReason.memberLimitReached,
            };

            await queue.sendWorkspaceJoinRejected(
                recipient,
                payload,
                'reviewer-id',
                'join-request-id'
            );

            expectRecipientEncrypted(helperEncryptionService, recipient);
            expect(notificationQueue.add).toHaveBeenCalledWith(
                EnumNotificationProcess.workspaceJoinRejected,
                {
                    userId: 'user-id',
                    notificationId: 'n-1',
                    completedSteps: [],
                    recipient: TestEncryptedRecipient,
                    data: payload,
                    proceedBy: 'reviewer-id',
                },
                {
                    priority: EnumQueuePriority.medium,
                    jobId: 'workspaceJoinRejected-join-request-id-user-id',
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

    describe('encryptRecipient', () => {
        it('encrypts the email and every token with the user id as context and keeps username and channels', () => {
            const result = queue['encryptRecipient'](recipient);

            expect(result).toEqual(TestEncryptedRecipient);
            expectRecipientEncrypted(helperEncryptionService, recipient);
        });
    });
});
