import { Test } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import { DatabaseUtil } from '@common/database/utils/database.util';
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
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import { NotificationEmailQueue } from '@modules/notification/queues/notification.email.queue';
import { NotificationRepository } from '@modules/notification/repositories/notification.repository';
import { UserDomain } from '@modules/user/domains/user.domain';

describe('NotificationAccountDomain', () => {
    const notificationRepository = mock<NotificationRepository>();
    const userDomain = mock<UserDomain>();
    const helperStringService = mock<HelperStringService>();
    const databaseUtil = mock<DatabaseUtil>();
    const notificationEmailQueue = mock<NotificationEmailQueue>();
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

    beforeEach(async () => {
        vi.resetAllMocks();
        const module = await Test.createTestingModule({
            providers: [
                NotificationAccountDomain,
                {
                    provide: NotificationRepository,
                    useValue: notificationRepository,
                },
                { provide: UserDomain, useValue: userDomain },
                {
                    provide: HelperStringService,
                    useValue: helperStringService,
                },
                { provide: DatabaseUtil, useValue: databaseUtil },
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
                data
            );

            expect(result).toEqual({
                message:
                    'User not found, skipping welcome by admin notification',
            });
            expect(notificationRepository.create).not.toHaveBeenCalled();
            expect(
                notificationEmailQueue.sendWelcomeByAdmin
            ).not.toHaveBeenCalled();
        });

        it('writes the notification and enqueues the email for an active user', async () => {
            userDomain.getOneActive.mockResolvedValue(user);
            databaseUtil.createId.mockReturnValue('notification-id');
            notificationRepository.create.mockResolvedValue(notification);
            notificationEmailQueue.sendWelcomeByAdmin.mockResolvedValue(
                undefined
            );

            const result = await domain.processWelcomeByAdmin(
                'user-id',
                'admin-id',
                data
            );

            expect(notificationRepository.create).toHaveBeenCalledWith(
                EnumNotificationKind.welcomeByAdmin,
                {
                    id: 'notification-id',
                    userId: user.id,
                    metadata: { username: user.username },
                    createdBy: 'admin-id',
                }
            );
            expect(
                notificationEmailQueue.sendWelcomeByAdmin
            ).toHaveBeenCalledWith(
                {
                    userId: user.id,
                    email: user.email,
                    username: user.username,
                    notificationId: 'notification-id',
                },
                data
            );
            expect(result).toMatchObject({
                message: 'Welcome by admin notification processed',
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

        it('skips when the user is not active', async () => {
            userDomain.getOneActive.mockResolvedValue(null);

            const result = await domain.processWelcome('user-id', data);

            expect(result).toEqual({
                message: 'User not found, skipping welcome notification',
            });
            expect(notificationRepository.createMany).not.toHaveBeenCalled();
        });

        it('writes both notifications and enqueues both emails for an active user', async () => {
            userDomain.getOneActive.mockResolvedValue(user);
            databaseUtil.createId
                .mockReturnValueOnce('welcome-id')
                .mockReturnValueOnce('verification-id');
            notificationRepository.createMany.mockResolvedValue([notification]);
            notificationEmailQueue.sendWelcome.mockResolvedValue(undefined);
            notificationEmailQueue.sendVerificationEmail.mockResolvedValue(
                undefined
            );

            const result = await domain.processWelcome('user-id', data);

            expect(notificationRepository.createMany).toHaveBeenCalledWith([
                {
                    kind: EnumNotificationKind.welcome,
                    payload: {
                        id: 'welcome-id',
                        userId: user.id,
                        metadata: { username: user.username },
                        createdBy: user.id,
                    },
                },
                {
                    kind: EnumNotificationKind.verificationEmail,
                    payload: {
                        id: 'verification-id',
                        userId: user.id,
                        metadata: { username: user.username },
                        createdBy: user.id,
                    },
                },
            ]);
            expect(notificationEmailQueue.sendWelcome).toHaveBeenCalledWith({
                userId: user.id,
                email: user.email,
                username: user.username,
                notificationId: 'welcome-id',
            });
            expect(
                notificationEmailQueue.sendVerificationEmail
            ).toHaveBeenCalledWith(
                {
                    userId: user.id,
                    email: user.email,
                    username: user.username,
                    notificationId: 'verification-id',
                },
                data
            );
            expect(result).toMatchObject({
                message: 'Welcome notification processed',
            });
        });
    });

    describe('processWelcomeSocial', () => {
        it('skips when the user is not active', async () => {
            userDomain.getOneActive.mockResolvedValue(null);

            const result = await domain.processWelcomeSocial('user-id');

            expect(result).toEqual({
                message: 'User not found, skipping welcome social notification',
            });
            expect(notificationRepository.create).not.toHaveBeenCalled();
        });

        it('writes the notification and enqueues the email for an active user', async () => {
            userDomain.getOneActive.mockResolvedValue(user);
            databaseUtil.createId.mockReturnValue('notification-id');
            notificationRepository.create.mockResolvedValue(notification);
            notificationEmailQueue.sendWelcomeSocial.mockResolvedValue(
                undefined
            );

            const result = await domain.processWelcomeSocial('user-id');

            expect(notificationRepository.create).toHaveBeenCalledWith(
                EnumNotificationKind.welcomeSocial,
                {
                    id: 'notification-id',
                    userId: user.id,
                    metadata: { username: user.username },
                    createdBy: user.id,
                }
            );
            expect(
                notificationEmailQueue.sendWelcomeSocial
            ).toHaveBeenCalledWith({
                userId: user.id,
                email: user.email,
                username: user.username,
                notificationId: 'notification-id',
            });
            expect(result).toMatchObject({
                message: 'Welcome social notification processed',
            });
        });
    });

    describe('processVerifiedEmail', () => {
        const data = { reference: 'ref-1' };

        it('skips when the user is not active', async () => {
            userDomain.getOneActive.mockResolvedValue(null);

            const result = await domain.processVerifiedEmail('user-id', data);

            expect(result).toEqual({
                message: 'User not found, skipping verified email notification',
            });
            expect(notificationRepository.create).not.toHaveBeenCalled();
        });

        it('writes the notification and enqueues the email for an active user', async () => {
            userDomain.getOneActive.mockResolvedValue(user);
            databaseUtil.createId.mockReturnValue('notification-id');
            notificationRepository.create.mockResolvedValue(notification);
            notificationEmailQueue.sendVerifiedEmail.mockResolvedValue(
                undefined
            );

            const result = await domain.processVerifiedEmail('user-id', data);

            expect(notificationRepository.create).toHaveBeenCalledWith(
                EnumNotificationKind.verifiedEmail,
                {
                    id: 'notification-id',
                    userId: user.id,
                    metadata: { username: user.username },
                    createdBy: user.id,
                }
            );
            expect(
                notificationEmailQueue.sendVerifiedEmail
            ).toHaveBeenCalledWith(
                {
                    userId: user.id,
                    email: user.email,
                    username: user.username,
                    notificationId: 'notification-id',
                },
                data
            );
            expect(result).toMatchObject({
                message: 'Verified email notification processed',
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
                data
            );

            expect(result).toEqual({
                message:
                    'User not found, skipping verification email notification',
            });
            expect(notificationRepository.create).not.toHaveBeenCalled();
        });

        it('writes the notification and enqueues the email for an active user', async () => {
            userDomain.getOneActive.mockResolvedValue(user);
            databaseUtil.createId.mockReturnValue('notification-id');
            notificationRepository.create.mockResolvedValue(notification);
            notificationEmailQueue.sendVerificationEmail.mockResolvedValue(
                undefined
            );

            const result = await domain.processVerificationEmail(
                'user-id',
                data
            );

            expect(notificationRepository.create).toHaveBeenCalledWith(
                EnumNotificationKind.verificationEmail,
                {
                    id: 'notification-id',
                    userId: user.id,
                    metadata: { username: user.username },
                    createdBy: user.id,
                }
            );
            expect(
                notificationEmailQueue.sendVerificationEmail
            ).toHaveBeenCalledWith(
                {
                    userId: user.id,
                    email: user.email,
                    username: user.username,
                    notificationId: 'notification-id',
                },
                data
            );
            expect(result).toMatchObject({
                message: 'Verification email notification processed',
            });
        });
    });

    describe('processVerifiedMobileNumber', () => {
        const data = {
            reference: 'ref-1',
            resendInMinutes: 5,
            mobileNumber: '+15551234567',
        };

        it('skips when the user is not active', async () => {
            userDomain.getOneActive.mockResolvedValue(null);

            const result = await domain.processVerifiedMobileNumber(
                'user-id',
                data
            );

            expect(result).toEqual({
                message:
                    'User not found, skipping verified mobile number notification',
            });
            expect(notificationRepository.create).not.toHaveBeenCalled();
            expect(helperStringService.censor).not.toHaveBeenCalled();
        });

        it('censors the mobile number, writes the notification, and enqueues the email', async () => {
            userDomain.getOneActive.mockResolvedValue(user);
            databaseUtil.createId.mockReturnValue('notification-id');
            helperStringService.censor.mockReturnValue('+1555****567');
            notificationRepository.create.mockResolvedValue(notification);
            notificationEmailQueue.sendVerifiedMobileNumber.mockResolvedValue(
                undefined
            );

            const result = await domain.processVerifiedMobileNumber(
                'user-id',
                data
            );

            expect(helperStringService.censor).toHaveBeenCalledWith(
                data.mobileNumber
            );
            expect(notificationRepository.create).toHaveBeenCalledWith(
                EnumNotificationKind.verifiedMobileNumber,
                {
                    id: 'notification-id',
                    userId: user.id,
                    metadata: {
                        username: user.username,
                        mobileNumber: '+1555****567',
                    },
                    createdBy: user.id,
                }
            );
            expect(
                notificationEmailQueue.sendVerifiedMobileNumber
            ).toHaveBeenCalledWith(
                {
                    userId: user.id,
                    email: user.email,
                    username: user.username,
                    notificationId: 'notification-id',
                },
                data
            );
            expect(result).toMatchObject({
                message: 'Mobile number verified notification processed',
            });
        });
    });
});
