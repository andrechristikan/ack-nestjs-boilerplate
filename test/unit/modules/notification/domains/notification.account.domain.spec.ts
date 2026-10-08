import { Test } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import type { Notification, User } from '@generated/prisma-client/client';
import {
    EnumNotificationPriority,
    EnumNotificationType,
    EnumUserGender,
    EnumUserLoginFrom,
    EnumUserLoginWith,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
} from '@generated/prisma-client/client';
import { NotificationAccountDomain } from '@modules/notification/domains/notification.account.domain';
import {
    EnumNotificationKind,
    EnumNotificationStep,
} from '@modules/notification/enums/notification.enum';
import { NotificationEmailQueue } from '@modules/notification/queues/notification.email.queue';
import { NotificationRepository } from '@modules/notification/repositories/notification.repository';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import { UserDomain } from '@modules/user/domains/user.domain';

describe('NotificationAccountDomain', () => {
    const notificationRepository: MockProxy<NotificationRepository> =
        mock<NotificationRepository>();
    const userDomain: MockProxy<UserDomain> = mock<UserDomain>();
    const helperStringService: MockProxy<HelperStringService> =
        mock<HelperStringService>();
    const notificationEmailQueue: MockProxy<NotificationEmailQueue> =
        mock<NotificationEmailQueue>();
    let domain: NotificationAccountDomain;

    const user: User = {
        id: 'user-id',
        name: 'Nadia Bloom',
        username: 'nadia',
        isVerified: true,
        verifiedAt: new Date('2024-01-01T00:00:00.000Z'),
        email: 'nadia@example.com',
        roleId: 'role-id',
        password: 'hashed',
        passwordExpired: null,
        passwordCreated: null,
        passwordAttempt: 0,
        signUpAt: new Date('2024-01-01T00:00:00.000Z'),
        signUpFrom: EnumUserSignUpFrom.website,
        signUpWith: EnumUserSignUpWith.credential,
        status: EnumUserStatus.active,
        gender: EnumUserGender.female,
        countryId: 'country-id',
        lastLoginAt: null,
        lastIPAddress: null,
        lastLoginFrom: EnumUserLoginFrom.website,
        lastLoginWith: EnumUserLoginWith.credential,
        lastWorkspaceId: null,
        lastWorkspaceChangedAt: null,
        termPolicy: {
            termsOfService: true,
            privacy: true,
            marketing: false,
            cookies: true,
        },
        photo: null,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedBy: null,
        deletedAt: null,
        deletedBy: null,
    };

    const notification: Notification = {
        id: 'notification-id',
        userId: 'user-id',
        type: EnumNotificationType.transactional,
        priority: EnumNotificationPriority.normal,
        title: 'Welcome',
        body: 'Welcome to the platform',
        metadata: null,
        isRead: false,
        readAt: null,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        createdBy: 'admin-id',
        updatedAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedBy: null,
    };

    const emailPayload = {
        userId: user.id,
        email: user.email,
        username: user.username,
        notificationId: 'n-1',
        cc: [],
        bcc: [],
    };

    beforeEach(async () => {
        vi.resetAllMocks();
        notificationRepository.createMany.mockResolvedValue([notification]);
        const module = await Test.createTestingModule({
            providers: [
                NotificationAccountDomain,
                NotificationUtil,
                {
                    provide: NotificationRepository,
                    useValue: notificationRepository,
                },
                { provide: UserDomain, useValue: userDomain },
                {
                    provide: HelperStringService,
                    useValue: helperStringService,
                },
                {
                    provide: NotificationEmailQueue,
                    useValue: notificationEmailQueue,
                },
            ],
        }).compile();
        domain = module.get(NotificationAccountDomain);
    });

    describe('processWelcomeByAdmin', () => {
        const data = {
            encryptedPassword: 'cipher',
            passwordExpiredAt: '2024-02-01T00:00:00.000Z',
            passwordCreatedAt: '2024-01-01T00:00:00.000Z',
        };

        it('skips when the user is not active', async () => {
            userDomain.getOneActive.mockResolvedValue(null);

            const result = await domain.processWelcomeByAdmin(
                'user-id',
                'admin-id',
                data,
                'n-1',
                []
            );

            expect(result).toEqual({
                message:
                    'User not found, skipping welcome by admin notification',
                completedSteps: [],
                failedSteps: [],
            });
            expect(notificationRepository.createMany).not.toHaveBeenCalled();
            expect(
                notificationEmailQueue.sendWelcomeByAdmin
            ).not.toHaveBeenCalled();
        });

        it('creates the row, then enqueues the email, and reports every step completed', async () => {
            userDomain.getOneActive.mockResolvedValue(user);

            const result = await domain.processWelcomeByAdmin(
                'user-id',
                'admin-id',
                data,
                'n-1',
                []
            );

            expect(notificationRepository.createMany).toHaveBeenCalledWith([
                {
                    kind: EnumNotificationKind.welcomeByAdmin,
                    payload: {
                        id: 'n-1',
                        userId: user.id,
                        metadata: { username: user.username },
                        createdBy: 'admin-id',
                    },
                },
            ]);
            expect(
                notificationEmailQueue.sendWelcomeByAdmin
            ).toHaveBeenCalledWith(emailPayload, data);
            expect(result).toEqual({
                message: 'Welcome by admin notification processed',
                completedSteps: [
                    EnumNotificationStep.createNotification,
                    EnumNotificationStep.sendEmail,
                ],
                failedSteps: [],
            });
        });

        it('skips the create on a retry and enqueues the email', async () => {
            userDomain.getOneActive.mockResolvedValue(user);

            const result = await domain.processWelcomeByAdmin(
                'user-id',
                'admin-id',
                data,
                'n-1',
                [EnumNotificationStep.createNotification]
            );

            expect(notificationRepository.createMany).not.toHaveBeenCalled();
            expect(
                notificationEmailQueue.sendWelcomeByAdmin
            ).toHaveBeenCalledTimes(1);
            expect(result.completedSteps).toEqual([
                EnumNotificationStep.createNotification,
                EnumNotificationStep.sendEmail,
            ]);
        });

        it('skips every completed step on a retry', async () => {
            userDomain.getOneActive.mockResolvedValue(user);

            const result = await domain.processWelcomeByAdmin(
                'user-id',
                'admin-id',
                data,
                'n-1',
                [
                    EnumNotificationStep.createNotification,
                    EnumNotificationStep.sendEmail,
                ]
            );

            expect(notificationRepository.createMany).not.toHaveBeenCalled();
            expect(
                notificationEmailQueue.sendWelcomeByAdmin
            ).not.toHaveBeenCalled();
            expect(result).toEqual({
                message: 'Welcome by admin notification processed',
                completedSteps: [
                    EnumNotificationStep.createNotification,
                    EnumNotificationStep.sendEmail,
                ],
                failedSteps: [],
            });
        });

        it('continues when the rows already exist and the progress is empty', async () => {
            userDomain.getOneActive.mockResolvedValue(user);
            notificationRepository.createMany.mockResolvedValue([notification]);

            const result = await domain.processWelcomeByAdmin(
                'user-id',
                'admin-id',
                data,
                'n-1',
                []
            );

            expect(result.failedSteps).toEqual([]);
            expect(
                notificationEmailQueue.sendWelcomeByAdmin
            ).toHaveBeenCalledTimes(1);
        });

        it('names a rejected side effect', async () => {
            userDomain.getOneActive.mockResolvedValue(user);
            notificationEmailQueue.sendWelcomeByAdmin.mockRejectedValue(
                new Error('redis')
            );

            const result = await domain.processWelcomeByAdmin(
                'user-id',
                'admin-id',
                data,
                'n-1',
                []
            );

            expect(result.failedSteps).toEqual([
                { step: EnumNotificationStep.sendEmail, error: 'redis' },
            ]);
            expect(result.completedSteps).toEqual([
                EnumNotificationStep.createNotification,
            ]);
        });

        it('stops at the create gate when the rows cannot be written', async () => {
            userDomain.getOneActive.mockResolvedValue(user);
            notificationRepository.createMany.mockRejectedValue(
                new Error('mongo')
            );

            const result = await domain.processWelcomeByAdmin(
                'user-id',
                'admin-id',
                data,
                'n-1',
                []
            );

            expect(
                notificationEmailQueue.sendWelcomeByAdmin
            ).not.toHaveBeenCalled();
            expect(result).toEqual({
                message: 'Welcome by admin notification failed',
                completedSteps: [],
                failedSteps: [
                    {
                        step: EnumNotificationStep.createNotification,
                        error: 'mongo',
                    },
                ],
            });
        });
    });

    describe('processWelcome', () => {
        const data = {
            expiredAt: '2024-02-01T00:00:00.000Z',
            expiredInMinutes: 30,
            encryptedLink: 'cipher-link',
            reference: 'ref-1',
        };
        const verificationEmailPayload = {
            ...emailPayload,
            notificationId: 'n-2',
        };
        const allSteps = [
            EnumNotificationStep.createNotification,
            EnumNotificationStep.sendWelcomeEmail,
            EnumNotificationStep.sendVerificationEmail,
        ];

        it('skips when the user is not active', async () => {
            userDomain.getOneActive.mockResolvedValue(null);

            const result = await domain.processWelcome(
                'user-id',
                data,
                'n-1',
                'n-2',
                []
            );

            expect(result).toEqual({
                message: 'User not found, skipping welcome notification',
                completedSteps: [],
                failedSteps: [],
            });
            expect(notificationRepository.createMany).not.toHaveBeenCalled();
        });

        it('creates both rows in one call, then enqueues both emails, and reports every step completed', async () => {
            userDomain.getOneActive.mockResolvedValue(user);

            const result = await domain.processWelcome(
                'user-id',
                data,
                'n-1',
                'n-2',
                []
            );

            expect(notificationRepository.createMany).toHaveBeenCalledTimes(1);
            expect(notificationRepository.createMany).toHaveBeenCalledWith([
                {
                    kind: EnumNotificationKind.welcome,
                    payload: {
                        id: 'n-1',
                        userId: user.id,
                        metadata: { username: user.username },
                        createdBy: user.id,
                    },
                },
                {
                    kind: EnumNotificationKind.verificationEmail,
                    payload: {
                        id: 'n-2',
                        userId: user.id,
                        metadata: { username: user.username },
                        createdBy: user.id,
                    },
                },
            ]);
            expect(notificationEmailQueue.sendWelcome).toHaveBeenCalledWith(
                emailPayload
            );
            expect(
                notificationEmailQueue.sendVerificationEmail
            ).toHaveBeenCalledWith(verificationEmailPayload, data);
            expect(result).toEqual({
                message: 'Welcome notification processed',
                completedSteps: allSteps,
                failedSteps: [],
            });
        });

        it('skips the completed steps on a retry', async () => {
            userDomain.getOneActive.mockResolvedValue(user);

            const result = await domain.processWelcome(
                'user-id',
                data,
                'n-1',
                'n-2',
                [
                    EnumNotificationStep.createNotification,
                    EnumNotificationStep.sendWelcomeEmail,
                ]
            );

            expect(notificationRepository.createMany).not.toHaveBeenCalled();
            expect(notificationEmailQueue.sendWelcome).not.toHaveBeenCalled();
            expect(
                notificationEmailQueue.sendVerificationEmail
            ).toHaveBeenCalledTimes(1);
            expect(result.completedSteps).toEqual(allSteps);
        });

        it('skips the verification email when its step is already recorded', async () => {
            userDomain.getOneActive.mockResolvedValue(user);

            const result = await domain.processWelcome(
                'user-id',
                data,
                'n-1',
                'n-2',
                allSteps
            );

            expect(notificationRepository.createMany).not.toHaveBeenCalled();
            expect(notificationEmailQueue.sendWelcome).not.toHaveBeenCalled();
            expect(
                notificationEmailQueue.sendVerificationEmail
            ).not.toHaveBeenCalled();
            expect(result.failedSteps).toEqual([]);
            expect(result.completedSteps).toEqual(allSteps);
        });

        it('continues when the rows already exist and the progress is empty', async () => {
            userDomain.getOneActive.mockResolvedValue(user);
            notificationRepository.createMany.mockResolvedValue([
                notification,
                notification,
            ]);

            const result = await domain.processWelcome(
                'user-id',
                data,
                'n-1',
                'n-2',
                []
            );

            expect(result.failedSteps).toEqual([]);
            expect(result.completedSteps).toEqual(allSteps);
        });

        it('names a rejected side effect and still runs the other', async () => {
            userDomain.getOneActive.mockResolvedValue(user);
            notificationEmailQueue.sendWelcome.mockRejectedValue(
                new Error('redis')
            );

            const result = await domain.processWelcome(
                'user-id',
                data,
                'n-1',
                'n-2',
                []
            );

            expect(
                notificationEmailQueue.sendVerificationEmail
            ).toHaveBeenCalledTimes(1);
            expect(result.failedSteps).toEqual([
                { step: EnumNotificationStep.sendWelcomeEmail, error: 'redis' },
            ]);
            expect(result.completedSteps).toEqual([
                EnumNotificationStep.createNotification,
                EnumNotificationStep.sendVerificationEmail,
            ]);
        });

        it('stops at the create gate when the rows cannot be written', async () => {
            userDomain.getOneActive.mockResolvedValue(user);
            notificationRepository.createMany.mockRejectedValue(
                new Error('mongo')
            );

            const result = await domain.processWelcome(
                'user-id',
                data,
                'n-1',
                'n-2',
                []
            );

            expect(notificationEmailQueue.sendWelcome).not.toHaveBeenCalled();
            expect(
                notificationEmailQueue.sendVerificationEmail
            ).not.toHaveBeenCalled();
            expect(result).toEqual({
                message: 'Welcome notification failed',
                completedSteps: [],
                failedSteps: [
                    {
                        step: EnumNotificationStep.createNotification,
                        error: 'mongo',
                    },
                ],
            });
        });
    });

    describe('processWelcomeSocial', () => {
        it('skips when the user is not active', async () => {
            userDomain.getOneActive.mockResolvedValue(null);

            const result = await domain.processWelcomeSocial(
                'user-id',
                'n-1',
                []
            );

            expect(result).toEqual({
                message: 'User not found, skipping welcome social notification',
                completedSteps: [],
                failedSteps: [],
            });
            expect(notificationRepository.createMany).not.toHaveBeenCalled();
            expect(
                notificationEmailQueue.sendWelcomeSocial
            ).not.toHaveBeenCalled();
        });

        it('creates the row, then enqueues the email, and reports every step completed', async () => {
            userDomain.getOneActive.mockResolvedValue(user);

            const result = await domain.processWelcomeSocial(
                'user-id',
                'n-1',
                []
            );

            expect(notificationRepository.createMany).toHaveBeenCalledWith([
                {
                    kind: EnumNotificationKind.welcomeSocial,
                    payload: {
                        id: 'n-1',
                        userId: user.id,
                        metadata: { username: user.username },
                        createdBy: user.id,
                    },
                },
            ]);
            expect(
                notificationEmailQueue.sendWelcomeSocial
            ).toHaveBeenCalledWith(emailPayload);
            expect(result).toEqual({
                message: 'Welcome social notification processed',
                completedSteps: [
                    EnumNotificationStep.createNotification,
                    EnumNotificationStep.sendEmail,
                ],
                failedSteps: [],
            });
        });

        it('skips the create on a retry and enqueues the email', async () => {
            userDomain.getOneActive.mockResolvedValue(user);

            const result = await domain.processWelcomeSocial('user-id', 'n-1', [
                EnumNotificationStep.createNotification,
            ]);

            expect(notificationRepository.createMany).not.toHaveBeenCalled();
            expect(
                notificationEmailQueue.sendWelcomeSocial
            ).toHaveBeenCalledTimes(1);
            expect(result.completedSteps).toEqual([
                EnumNotificationStep.createNotification,
                EnumNotificationStep.sendEmail,
            ]);
        });

        it('skips every completed step on a retry', async () => {
            userDomain.getOneActive.mockResolvedValue(user);

            const result = await domain.processWelcomeSocial('user-id', 'n-1', [
                EnumNotificationStep.createNotification,
                EnumNotificationStep.sendEmail,
            ]);

            expect(notificationRepository.createMany).not.toHaveBeenCalled();
            expect(
                notificationEmailQueue.sendWelcomeSocial
            ).not.toHaveBeenCalled();
            expect(result).toEqual({
                message: 'Welcome social notification processed',
                completedSteps: [
                    EnumNotificationStep.createNotification,
                    EnumNotificationStep.sendEmail,
                ],
                failedSteps: [],
            });
        });

        it('continues when the rows already exist and the progress is empty', async () => {
            userDomain.getOneActive.mockResolvedValue(user);
            notificationRepository.createMany.mockResolvedValue([notification]);

            const result = await domain.processWelcomeSocial(
                'user-id',
                'n-1',
                []
            );

            expect(result.failedSteps).toEqual([]);
            expect(
                notificationEmailQueue.sendWelcomeSocial
            ).toHaveBeenCalledTimes(1);
        });

        it('names a rejected side effect', async () => {
            userDomain.getOneActive.mockResolvedValue(user);
            notificationEmailQueue.sendWelcomeSocial.mockRejectedValue(
                new Error('redis')
            );

            const result = await domain.processWelcomeSocial(
                'user-id',
                'n-1',
                []
            );

            expect(result.failedSteps).toEqual([
                { step: EnumNotificationStep.sendEmail, error: 'redis' },
            ]);
            expect(result.completedSteps).toEqual([
                EnumNotificationStep.createNotification,
            ]);
        });

        it('stops at the create gate when the rows cannot be written', async () => {
            userDomain.getOneActive.mockResolvedValue(user);
            notificationRepository.createMany.mockRejectedValue(
                new Error('mongo')
            );

            const result = await domain.processWelcomeSocial(
                'user-id',
                'n-1',
                []
            );

            expect(
                notificationEmailQueue.sendWelcomeSocial
            ).not.toHaveBeenCalled();
            expect(result).toEqual({
                message: 'Welcome social notification failed',
                completedSteps: [],
                failedSteps: [
                    {
                        step: EnumNotificationStep.createNotification,
                        error: 'mongo',
                    },
                ],
            });
        });
    });

    describe('processVerifiedEmail', () => {
        const data = { reference: 'ref-1' };

        it('skips when the user is not active', async () => {
            userDomain.getOneActive.mockResolvedValue(null);

            const result = await domain.processVerifiedEmail(
                'user-id',
                data,
                'n-1',
                []
            );

            expect(result).toEqual({
                message: 'User not found, skipping verified email notification',
                completedSteps: [],
                failedSteps: [],
            });
            expect(notificationRepository.createMany).not.toHaveBeenCalled();
            expect(
                notificationEmailQueue.sendVerifiedEmail
            ).not.toHaveBeenCalled();
        });

        it('creates the row, then enqueues the email, and reports every step completed', async () => {
            userDomain.getOneActive.mockResolvedValue(user);

            const result = await domain.processVerifiedEmail(
                'user-id',
                data,
                'n-1',
                []
            );

            expect(notificationRepository.createMany).toHaveBeenCalledWith([
                {
                    kind: EnumNotificationKind.verifiedEmail,
                    payload: {
                        id: 'n-1',
                        userId: user.id,
                        metadata: { username: user.username },
                        createdBy: user.id,
                    },
                },
            ]);
            expect(
                notificationEmailQueue.sendVerifiedEmail
            ).toHaveBeenCalledWith(emailPayload, data);
            expect(result).toEqual({
                message: 'Verified email notification processed',
                completedSteps: [
                    EnumNotificationStep.createNotification,
                    EnumNotificationStep.sendEmail,
                ],
                failedSteps: [],
            });
        });

        it('skips the create on a retry and enqueues the email', async () => {
            userDomain.getOneActive.mockResolvedValue(user);

            const result = await domain.processVerifiedEmail(
                'user-id',
                data,
                'n-1',
                [EnumNotificationStep.createNotification]
            );

            expect(notificationRepository.createMany).not.toHaveBeenCalled();
            expect(
                notificationEmailQueue.sendVerifiedEmail
            ).toHaveBeenCalledTimes(1);
            expect(result.completedSteps).toEqual([
                EnumNotificationStep.createNotification,
                EnumNotificationStep.sendEmail,
            ]);
        });

        it('skips every completed step on a retry', async () => {
            userDomain.getOneActive.mockResolvedValue(user);

            const result = await domain.processVerifiedEmail(
                'user-id',
                data,
                'n-1',
                [
                    EnumNotificationStep.createNotification,
                    EnumNotificationStep.sendEmail,
                ]
            );

            expect(notificationRepository.createMany).not.toHaveBeenCalled();
            expect(
                notificationEmailQueue.sendVerifiedEmail
            ).not.toHaveBeenCalled();
            expect(result).toEqual({
                message: 'Verified email notification processed',
                completedSteps: [
                    EnumNotificationStep.createNotification,
                    EnumNotificationStep.sendEmail,
                ],
                failedSteps: [],
            });
        });

        it('continues when the rows already exist and the progress is empty', async () => {
            userDomain.getOneActive.mockResolvedValue(user);
            notificationRepository.createMany.mockResolvedValue([notification]);

            const result = await domain.processVerifiedEmail(
                'user-id',
                data,
                'n-1',
                []
            );

            expect(result.failedSteps).toEqual([]);
            expect(
                notificationEmailQueue.sendVerifiedEmail
            ).toHaveBeenCalledTimes(1);
        });

        it('names a rejected side effect', async () => {
            userDomain.getOneActive.mockResolvedValue(user);
            notificationEmailQueue.sendVerifiedEmail.mockRejectedValue(
                new Error('redis')
            );

            const result = await domain.processVerifiedEmail(
                'user-id',
                data,
                'n-1',
                []
            );

            expect(result.failedSteps).toEqual([
                { step: EnumNotificationStep.sendEmail, error: 'redis' },
            ]);
            expect(result.completedSteps).toEqual([
                EnumNotificationStep.createNotification,
            ]);
        });

        it('stops at the create gate when the rows cannot be written', async () => {
            userDomain.getOneActive.mockResolvedValue(user);
            notificationRepository.createMany.mockRejectedValue(
                new Error('mongo')
            );

            const result = await domain.processVerifiedEmail(
                'user-id',
                data,
                'n-1',
                []
            );

            expect(
                notificationEmailQueue.sendVerifiedEmail
            ).not.toHaveBeenCalled();
            expect(result).toEqual({
                message: 'Verified email notification failed',
                completedSteps: [],
                failedSteps: [
                    {
                        step: EnumNotificationStep.createNotification,
                        error: 'mongo',
                    },
                ],
            });
        });
    });

    describe('processVerificationEmail', () => {
        const data = {
            expiredAt: '2024-02-01T00:00:00.000Z',
            expiredInMinutes: 30,
            encryptedLink: 'cipher-link',
            reference: 'ref-1',
        };

        it('skips when the user is not active', async () => {
            userDomain.getOneActive.mockResolvedValue(null);

            const result = await domain.processVerificationEmail(
                'user-id',
                data,
                'n-1',
                []
            );

            expect(result).toEqual({
                message:
                    'User not found, skipping verification email notification',
                completedSteps: [],
                failedSteps: [],
            });
            expect(notificationRepository.createMany).not.toHaveBeenCalled();
            expect(
                notificationEmailQueue.sendVerificationEmail
            ).not.toHaveBeenCalled();
        });

        it('creates the row, then enqueues the email, and reports every step completed', async () => {
            userDomain.getOneActive.mockResolvedValue(user);

            const result = await domain.processVerificationEmail(
                'user-id',
                data,
                'n-1',
                []
            );

            expect(notificationRepository.createMany).toHaveBeenCalledWith([
                {
                    kind: EnumNotificationKind.verificationEmail,
                    payload: {
                        id: 'n-1',
                        userId: user.id,
                        metadata: { username: user.username },
                        createdBy: user.id,
                    },
                },
            ]);
            expect(
                notificationEmailQueue.sendVerificationEmail
            ).toHaveBeenCalledWith(emailPayload, data);
            expect(result).toEqual({
                message: 'Verification email notification processed',
                completedSteps: [
                    EnumNotificationStep.createNotification,
                    EnumNotificationStep.sendVerificationEmail,
                ],
                failedSteps: [],
            });
        });

        it('skips the create on a retry and enqueues the email', async () => {
            userDomain.getOneActive.mockResolvedValue(user);

            const result = await domain.processVerificationEmail(
                'user-id',
                data,
                'n-1',
                [EnumNotificationStep.createNotification]
            );

            expect(notificationRepository.createMany).not.toHaveBeenCalled();
            expect(
                notificationEmailQueue.sendVerificationEmail
            ).toHaveBeenCalledTimes(1);
            expect(result.completedSteps).toEqual([
                EnumNotificationStep.createNotification,
                EnumNotificationStep.sendVerificationEmail,
            ]);
        });

        it('skips every completed step on a retry', async () => {
            userDomain.getOneActive.mockResolvedValue(user);

            const result = await domain.processVerificationEmail(
                'user-id',
                data,
                'n-1',
                [
                    EnumNotificationStep.createNotification,
                    EnumNotificationStep.sendVerificationEmail,
                ]
            );

            expect(notificationRepository.createMany).not.toHaveBeenCalled();
            expect(
                notificationEmailQueue.sendVerificationEmail
            ).not.toHaveBeenCalled();
            expect(result).toEqual({
                message: 'Verification email notification processed',
                completedSteps: [
                    EnumNotificationStep.createNotification,
                    EnumNotificationStep.sendVerificationEmail,
                ],
                failedSteps: [],
            });
        });

        it('continues when the rows already exist and the progress is empty', async () => {
            userDomain.getOneActive.mockResolvedValue(user);
            notificationRepository.createMany.mockResolvedValue([notification]);

            const result = await domain.processVerificationEmail(
                'user-id',
                data,
                'n-1',
                []
            );

            expect(result.failedSteps).toEqual([]);
            expect(
                notificationEmailQueue.sendVerificationEmail
            ).toHaveBeenCalledTimes(1);
        });

        it('names a rejected side effect', async () => {
            userDomain.getOneActive.mockResolvedValue(user);
            notificationEmailQueue.sendVerificationEmail.mockRejectedValue(
                new Error('redis')
            );

            const result = await domain.processVerificationEmail(
                'user-id',
                data,
                'n-1',
                []
            );

            expect(result.failedSteps).toEqual([
                {
                    step: EnumNotificationStep.sendVerificationEmail,
                    error: 'redis',
                },
            ]);
            expect(result.completedSteps).toEqual([
                EnumNotificationStep.createNotification,
            ]);
        });

        it('stops at the create gate when the rows cannot be written', async () => {
            userDomain.getOneActive.mockResolvedValue(user);
            notificationRepository.createMany.mockRejectedValue(
                new Error('mongo')
            );

            const result = await domain.processVerificationEmail(
                'user-id',
                data,
                'n-1',
                []
            );

            expect(
                notificationEmailQueue.sendVerificationEmail
            ).not.toHaveBeenCalled();
            expect(result).toEqual({
                message: 'Verification email notification failed',
                completedSteps: [],
                failedSteps: [
                    {
                        step: EnumNotificationStep.createNotification,
                        error: 'mongo',
                    },
                ],
            });
        });
    });

    describe('processVerifiedMobileNumber', () => {
        const data = {
            reference: 'ref-1',
            resendInMinutes: 5,
            mobileNumber: '+15551234567',
        };

        beforeEach(() => {
            helperStringService.censor.mockReturnValue('+1555****567');
        });

        it('skips when the user is not active', async () => {
            userDomain.getOneActive.mockResolvedValue(null);

            const result = await domain.processVerifiedMobileNumber(
                'user-id',
                data,
                'n-1',
                []
            );

            expect(result).toEqual({
                message:
                    'User not found, skipping verified mobile number notification',
                completedSteps: [],
                failedSteps: [],
            });
            expect(notificationRepository.createMany).not.toHaveBeenCalled();
            expect(
                notificationEmailQueue.sendVerifiedMobileNumber
            ).not.toHaveBeenCalled();
        });

        it('creates the row, then enqueues the email, and reports every step completed', async () => {
            userDomain.getOneActive.mockResolvedValue(user);

            const result = await domain.processVerifiedMobileNumber(
                'user-id',
                data,
                'n-1',
                []
            );

            expect(notificationRepository.createMany).toHaveBeenCalledWith([
                {
                    kind: EnumNotificationKind.verifiedMobileNumber,
                    payload: {
                        id: 'n-1',
                        userId: user.id,
                        metadata: {
                            username: user.username,
                            mobileNumber: '+1555****567',
                        },
                        createdBy: user.id,
                    },
                },
            ]);
            expect(
                notificationEmailQueue.sendVerifiedMobileNumber
            ).toHaveBeenCalledWith(emailPayload, data);
            expect(result).toEqual({
                message: 'Mobile number verified notification processed',
                completedSteps: [
                    EnumNotificationStep.createNotification,
                    EnumNotificationStep.sendEmail,
                ],
                failedSteps: [],
            });
        });

        it('skips the create on a retry and enqueues the email', async () => {
            userDomain.getOneActive.mockResolvedValue(user);

            const result = await domain.processVerifiedMobileNumber(
                'user-id',
                data,
                'n-1',
                [EnumNotificationStep.createNotification]
            );

            expect(notificationRepository.createMany).not.toHaveBeenCalled();
            expect(
                notificationEmailQueue.sendVerifiedMobileNumber
            ).toHaveBeenCalledTimes(1);
            expect(result.completedSteps).toEqual([
                EnumNotificationStep.createNotification,
                EnumNotificationStep.sendEmail,
            ]);
        });

        it('skips every completed step on a retry', async () => {
            userDomain.getOneActive.mockResolvedValue(user);

            const result = await domain.processVerifiedMobileNumber(
                'user-id',
                data,
                'n-1',
                [
                    EnumNotificationStep.createNotification,
                    EnumNotificationStep.sendEmail,
                ]
            );

            expect(notificationRepository.createMany).not.toHaveBeenCalled();
            expect(
                notificationEmailQueue.sendVerifiedMobileNumber
            ).not.toHaveBeenCalled();
            expect(result).toEqual({
                message: 'Mobile number verified notification processed',
                completedSteps: [
                    EnumNotificationStep.createNotification,
                    EnumNotificationStep.sendEmail,
                ],
                failedSteps: [],
            });
        });

        it('continues when the rows already exist and the progress is empty', async () => {
            userDomain.getOneActive.mockResolvedValue(user);
            notificationRepository.createMany.mockResolvedValue([notification]);

            const result = await domain.processVerifiedMobileNumber(
                'user-id',
                data,
                'n-1',
                []
            );

            expect(result.failedSteps).toEqual([]);
            expect(
                notificationEmailQueue.sendVerifiedMobileNumber
            ).toHaveBeenCalledTimes(1);
        });

        it('names a rejected side effect', async () => {
            userDomain.getOneActive.mockResolvedValue(user);
            notificationEmailQueue.sendVerifiedMobileNumber.mockRejectedValue(
                new Error('redis')
            );

            const result = await domain.processVerifiedMobileNumber(
                'user-id',
                data,
                'n-1',
                []
            );

            expect(result.failedSteps).toEqual([
                { step: EnumNotificationStep.sendEmail, error: 'redis' },
            ]);
            expect(result.completedSteps).toEqual([
                EnumNotificationStep.createNotification,
            ]);
        });

        it('stops at the create gate when the rows cannot be written', async () => {
            userDomain.getOneActive.mockResolvedValue(user);
            notificationRepository.createMany.mockRejectedValue(
                new Error('mongo')
            );

            const result = await domain.processVerifiedMobileNumber(
                'user-id',
                data,
                'n-1',
                []
            );

            expect(
                notificationEmailQueue.sendVerifiedMobileNumber
            ).not.toHaveBeenCalled();
            expect(result).toEqual({
                message: 'Mobile number verified notification failed',
                completedSteps: [],
                failedSteps: [
                    {
                        step: EnumNotificationStep.createNotification,
                        error: 'mongo',
                    },
                ],
            });
        });
    });
});
