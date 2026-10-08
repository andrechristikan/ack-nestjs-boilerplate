import { Test } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { RequestContextService } from '@common/request/services/request.context.service';
import type { IRequestLog } from '@common/request/interfaces/request.interface';
import type { Notification, User } from '@generated/prisma-client/client';
import {
    EnumDeviceNotificationProvider,
    EnumDevicePlatform,
    EnumNotificationPriority,
    EnumNotificationType,
    EnumUserGender,
    EnumUserLoginFrom,
    EnumUserLoginWith,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
} from '@generated/prisma-client/client';
import { DeviceDomain } from '@modules/device/domains/device.domain';
import type { IDeviceOwnershipWithDevice } from '@modules/device/interfaces/device.interface';
import { NotificationSecurityDomain } from '@modules/notification/domains/notification.security.domain';
import {
    EnumNotificationKind,
    EnumNotificationStep,
} from '@modules/notification/enums/notification.enum';
import type { INotificationNewDeviceLoginPayload } from '@modules/notification/interfaces/notification.interface';
import { NotificationEmailQueue } from '@modules/notification/queues/notification.email.queue';
import { NotificationPushQueue } from '@modules/notification/queues/notification.push.queue';
import { NotificationRepository } from '@modules/notification/repositories/notification.repository';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import { UserDomain } from '@modules/user/domains/user.domain';

describe('NotificationSecurityDomain', () => {
    const notificationRepository: MockProxy<NotificationRepository> =
        mock<NotificationRepository>();
    const userDomain: MockProxy<UserDomain> = mock<UserDomain>();
    const deviceDomain: MockProxy<DeviceDomain> = mock<DeviceDomain>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const requestContextService: MockProxy<RequestContextService> =
        mock<RequestContextService>();
    const notificationEmailQueue: MockProxy<NotificationEmailQueue> =
        mock<NotificationEmailQueue>();
    const notificationPushQueue: MockProxy<NotificationPushQueue> =
        mock<NotificationPushQueue>();
    let domain: NotificationSecurityDomain;

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

    const deviceOwnership: IDeviceOwnershipWithDevice = {
        id: 'ownership-id',
        deviceId: 'device-id',
        userId: 'user-id',
        revokedAt: null,
        isRevoked: false,
        revokedById: null,
        lastActiveAt: new Date('2024-01-01T00:00:00.000Z'),
        biometricEnabled: false,
        biometricToken: null,
        biometricType: null,
        biometricEnabledAt: null,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedBy: null,
        device: {
            id: 'device-id',
            fingerprint: 'fingerprint-1',
            name: 'iPhone',
            platform: EnumDevicePlatform.ios,
            lastActiveAt: new Date('2024-01-01T00:00:00.000Z'),
            notificationToken: 'push-token',
            notificationProvider: EnumDeviceNotificationProvider.fcm,
            createdAt: new Date('2024-01-01T00:00:00.000Z'),
            createdBy: null,
            updatedAt: new Date('2024-01-01T00:00:00.000Z'),
            updatedBy: null,
        },
    };

    const notification: Notification = {
        id: 'notification-id',
        userId: 'user-id',
        type: EnumNotificationType.securityAlert,
        priority: EnumNotificationPriority.high,
        title: 'Security alert',
        body: 'A new device signed in',
        metadata: null,
        isRead: false,
        readAt: null,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        createdBy: null,
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
    const pushPayload = {
        userId: 'user-id',
        notificationId: 'n-1',
        notificationTokens: ['push-token'],
        username: user.username,
    };
    const allSteps = [
        EnumNotificationStep.createNotification,
        EnumNotificationStep.sendEmail,
        EnumNotificationStep.sendPush,
    ];

    beforeEach(async () => {
        vi.resetAllMocks();
        notificationRepository.createMany.mockResolvedValue([notification]);
        deviceDomain.getOwnershipsWithNotificationToken.mockResolvedValue([]);
        helperDateService.createFromIso.mockImplementation(
            (iso: string) => new Date(iso)
        );
        const module = await Test.createTestingModule({
            providers: [
                NotificationSecurityDomain,
                NotificationUtil,
                {
                    provide: NotificationRepository,
                    useValue: notificationRepository,
                },
                { provide: UserDomain, useValue: userDomain },
                { provide: DeviceDomain, useValue: deviceDomain },
                { provide: HelperDateService, useValue: helperDateService },
                {
                    provide: RequestContextService,
                    useValue: requestContextService,
                },
                {
                    provide: NotificationEmailQueue,
                    useValue: notificationEmailQueue,
                },
                {
                    provide: NotificationPushQueue,
                    useValue: notificationPushQueue,
                },
            ],
        }).compile();
        domain = module.get(NotificationSecurityDomain);
    });

    describe('processTemporaryPasswordByAdmin', () => {
        const data = {
            encryptedPassword: 'cipher',
            passwordExpiredAt: '2024-02-01T00:00:00.000Z',
            passwordCreatedAt: '2024-01-01T00:00:00.000Z',
        };

        it('skips when the user is not active', async () => {
            userDomain.getOneActive.mockResolvedValue(null);

            const result = await domain.processTemporaryPasswordByAdmin(
                'user-id',
                'admin-id',
                data,
                'n-1',
                []
            );

            expect(result).toEqual({
                message:
                    'User not found, skipping temporary password by admin notification',
                completedSteps: [],
                failedSteps: [],
            });
            expect(notificationRepository.createMany).not.toHaveBeenCalled();
        });

        it('creates the row, then enqueues email and push, and reports every step completed', async () => {
            userDomain.getOneActive.mockResolvedValue(user);
            deviceDomain.getOwnershipsWithNotificationToken.mockResolvedValue([
                deviceOwnership,
            ]);

            const result = await domain.processTemporaryPasswordByAdmin(
                'user-id',
                'admin-id',
                data,
                'n-1',
                []
            );

            expect(notificationRepository.createMany).toHaveBeenCalledWith([
                {
                    kind: EnumNotificationKind.temporaryPasswordByAdmin,
                    payload: {
                        id: 'n-1',
                        userId: user.id,
                        metadata: {
                            username: user.username,
                            passwordExpiredAt: new Date(data.passwordExpiredAt),
                        },
                        createdBy: 'admin-id',
                    },
                },
            ]);
            expect(
                notificationEmailQueue.sendTemporaryPasswordByAdmin
            ).toHaveBeenCalledWith(emailPayload, data);
            expect(
                notificationPushQueue.sendTemporaryPasswordByAdmin
            ).toHaveBeenCalledWith(pushPayload, {
                passwordCreatedAt: data.passwordCreatedAt,
                passwordExpiredAt: data.passwordExpiredAt,
            });
            expect(result).toEqual({
                message: 'Temporary password by admin notification processed',
                completedSteps: allSteps,
                failedSteps: [],
            });
        });

        it('does not enqueue a push when there is no device with a token', async () => {
            userDomain.getOneActive.mockResolvedValue(user);

            const result = await domain.processTemporaryPasswordByAdmin(
                'user-id',
                'admin-id',
                data,
                'n-1',
                []
            );

            expect(
                notificationPushQueue.sendTemporaryPasswordByAdmin
            ).not.toHaveBeenCalled();
            expect(result.completedSteps).toEqual([
                EnumNotificationStep.createNotification,
                EnumNotificationStep.sendEmail,
            ]);
        });

        it('skips the completed steps on a retry', async () => {
            userDomain.getOneActive.mockResolvedValue(user);
            deviceDomain.getOwnershipsWithNotificationToken.mockResolvedValue([
                deviceOwnership,
            ]);

            const result = await domain.processTemporaryPasswordByAdmin(
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
                notificationEmailQueue.sendTemporaryPasswordByAdmin
            ).not.toHaveBeenCalled();
            expect(
                notificationPushQueue.sendTemporaryPasswordByAdmin
            ).toHaveBeenCalledTimes(1);
            expect(result.completedSteps).toEqual(allSteps);
        });

        it('continues when the rows already exist and the progress is empty', async () => {
            userDomain.getOneActive.mockResolvedValue(user);
            notificationRepository.createMany.mockResolvedValue([notification]);

            const result = await domain.processTemporaryPasswordByAdmin(
                'user-id',
                'admin-id',
                data,
                'n-1',
                []
            );

            expect(result.failedSteps).toEqual([]);
            expect(
                notificationEmailQueue.sendTemporaryPasswordByAdmin
            ).toHaveBeenCalledTimes(1);
        });

        it('names a rejected side effect and still runs the others', async () => {
            userDomain.getOneActive.mockResolvedValue(user);
            deviceDomain.getOwnershipsWithNotificationToken.mockResolvedValue([
                deviceOwnership,
            ]);
            notificationEmailQueue.sendTemporaryPasswordByAdmin.mockRejectedValue(
                new Error('redis')
            );

            const result = await domain.processTemporaryPasswordByAdmin(
                'user-id',
                'admin-id',
                data,
                'n-1',
                []
            );

            expect(
                notificationPushQueue.sendTemporaryPasswordByAdmin
            ).toHaveBeenCalledTimes(1);
            expect(result.failedSteps).toEqual([
                { step: EnumNotificationStep.sendEmail, error: 'redis' },
            ]);
            expect(result.completedSteps).toEqual([
                EnumNotificationStep.createNotification,
                EnumNotificationStep.sendPush,
            ]);
        });

        it('stops at the create gate when the rows cannot be written', async () => {
            userDomain.getOneActive.mockResolvedValue(user);
            deviceDomain.getOwnershipsWithNotificationToken.mockResolvedValue([
                deviceOwnership,
            ]);
            notificationRepository.createMany.mockRejectedValue(
                new Error('mongo')
            );

            const result = await domain.processTemporaryPasswordByAdmin(
                'user-id',
                'admin-id',
                data,
                'n-1',
                []
            );

            expect(
                notificationEmailQueue.sendTemporaryPasswordByAdmin
            ).not.toHaveBeenCalled();
            expect(
                notificationPushQueue.sendTemporaryPasswordByAdmin
            ).not.toHaveBeenCalled();
            expect(result).toEqual({
                message: 'Temporary password by admin notification failed',
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

    describe('processChangePassword', () => {
        it('skips when the user is not active', async () => {
            userDomain.getOneActive.mockResolvedValue(null);

            const result = await domain.processChangePassword(
                'user-id',
                'n-1',
                []
            );

            expect(result).toEqual({
                message:
                    'User not found, skipping change password notification',
                completedSteps: [],
                failedSteps: [],
            });
            expect(notificationRepository.createMany).not.toHaveBeenCalled();
        });

        it('creates the row, enqueues the email, and reports every step completed', async () => {
            userDomain.getOneActive.mockResolvedValue(user);

            const result = await domain.processChangePassword(
                'user-id',
                'n-1',
                []
            );

            expect(notificationRepository.createMany).toHaveBeenCalledWith([
                {
                    kind: EnumNotificationKind.changePassword,
                    payload: {
                        id: 'n-1',
                        userId: user.id,
                        metadata: { username: user.username },
                        createdBy: user.id,
                    },
                },
            ]);
            expect(
                notificationEmailQueue.sendChangePassword
            ).toHaveBeenCalledWith(emailPayload);
            expect(result).toEqual({
                message: 'Change password notification processed',
                completedSteps: [
                    EnumNotificationStep.createNotification,
                    EnumNotificationStep.sendEmail,
                ],
                failedSteps: [],
            });
        });

        it('skips the completed steps on a retry', async () => {
            userDomain.getOneActive.mockResolvedValue(user);

            const result = await domain.processChangePassword(
                'user-id',
                'n-1',
                [
                    EnumNotificationStep.createNotification,
                    EnumNotificationStep.sendEmail,
                ]
            );

            expect(notificationRepository.createMany).not.toHaveBeenCalled();
            expect(
                notificationEmailQueue.sendChangePassword
            ).not.toHaveBeenCalled();
            expect(result.completedSteps).toEqual([
                EnumNotificationStep.createNotification,
                EnumNotificationStep.sendEmail,
            ]);
        });

        it('continues when the rows already exist and the progress is empty', async () => {
            userDomain.getOneActive.mockResolvedValue(user);
            notificationRepository.createMany.mockResolvedValue([notification]);

            const result = await domain.processChangePassword(
                'user-id',
                'n-1',
                []
            );

            expect(result.failedSteps).toEqual([]);
        });

        it('names a rejected side effect', async () => {
            userDomain.getOneActive.mockResolvedValue(user);
            notificationEmailQueue.sendChangePassword.mockRejectedValue(
                new Error('redis')
            );

            const result = await domain.processChangePassword(
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

            const result = await domain.processChangePassword(
                'user-id',
                'n-1',
                []
            );

            expect(
                notificationEmailQueue.sendChangePassword
            ).not.toHaveBeenCalled();
            expect(result.failedSteps).toEqual([
                {
                    step: EnumNotificationStep.createNotification,
                    error: 'mongo',
                },
            ]);
        });
    });

    describe('processForgotPassword', () => {
        const data = {
            expiredAt: '2024-02-01T00:00:00.000Z',
            encryptedLink: 'cipher-link',
            reference: 'ref-1',
            expiredInMinutes: 15,
            resendInMinutes: 5,
        };

        it('skips when the user is not active', async () => {
            userDomain.getOneActive.mockResolvedValue(null);

            const result = await domain.processForgotPassword(
                'user-id',
                data,
                'n-1',
                []
            );

            expect(result).toEqual({
                message:
                    'User not found, skipping forgot password notification',
                completedSteps: [],
                failedSteps: [],
            });
            expect(notificationRepository.createMany).not.toHaveBeenCalled();
        });

        it('creates the row, then enqueues email and push, and reports every step completed', async () => {
            userDomain.getOneActive.mockResolvedValue(user);
            deviceDomain.getOwnershipsWithNotificationToken.mockResolvedValue([
                deviceOwnership,
            ]);

            const result = await domain.processForgotPassword(
                'user-id',
                data,
                'n-1',
                []
            );

            expect(notificationRepository.createMany).toHaveBeenCalledWith([
                {
                    kind: EnumNotificationKind.forgotPassword,
                    payload: {
                        id: 'n-1',
                        userId: user.id,
                        metadata: { username: user.username },
                        createdBy: user.id,
                    },
                },
            ]);
            expect(
                notificationEmailQueue.sendForgotPassword
            ).toHaveBeenCalledWith(emailPayload, data);
            expect(
                notificationPushQueue.sendForgotPassword
            ).toHaveBeenCalledWith(pushPayload);
            expect(result).toEqual({
                message: 'Forgot password notification processed',
                completedSteps: allSteps,
                failedSteps: [],
            });
        });

        it('does not enqueue a push when there is no device with a token', async () => {
            userDomain.getOneActive.mockResolvedValue(user);

            const result = await domain.processForgotPassword(
                'user-id',
                data,
                'n-1',
                []
            );

            expect(
                notificationPushQueue.sendForgotPassword
            ).not.toHaveBeenCalled();
            expect(result.completedSteps).toEqual([
                EnumNotificationStep.createNotification,
                EnumNotificationStep.sendEmail,
            ]);
        });

        it('skips the completed steps on a retry', async () => {
            userDomain.getOneActive.mockResolvedValue(user);
            deviceDomain.getOwnershipsWithNotificationToken.mockResolvedValue([
                deviceOwnership,
            ]);

            const result = await domain.processForgotPassword(
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
                notificationEmailQueue.sendForgotPassword
            ).not.toHaveBeenCalled();
            expect(
                notificationPushQueue.sendForgotPassword
            ).toHaveBeenCalledTimes(1);
            expect(result.completedSteps).toEqual(allSteps);
        });

        it('continues when the rows already exist and the progress is empty', async () => {
            userDomain.getOneActive.mockResolvedValue(user);
            notificationRepository.createMany.mockResolvedValue([notification]);

            const result = await domain.processForgotPassword(
                'user-id',
                data,
                'n-1',
                []
            );

            expect(result.failedSteps).toEqual([]);
        });

        it('names a rejected side effect and still runs the others', async () => {
            userDomain.getOneActive.mockResolvedValue(user);
            deviceDomain.getOwnershipsWithNotificationToken.mockResolvedValue([
                deviceOwnership,
            ]);
            notificationPushQueue.sendForgotPassword.mockRejectedValue(
                new Error('redis')
            );

            const result = await domain.processForgotPassword(
                'user-id',
                data,
                'n-1',
                []
            );

            expect(
                notificationEmailQueue.sendForgotPassword
            ).toHaveBeenCalledTimes(1);
            expect(result.failedSteps).toEqual([
                { step: EnumNotificationStep.sendPush, error: 'redis' },
            ]);
            expect(result.completedSteps).toEqual([
                EnumNotificationStep.createNotification,
                EnumNotificationStep.sendEmail,
            ]);
        });

        it('stops at the create gate when the rows cannot be written', async () => {
            userDomain.getOneActive.mockResolvedValue(user);
            deviceDomain.getOwnershipsWithNotificationToken.mockResolvedValue([
                deviceOwnership,
            ]);
            notificationRepository.createMany.mockRejectedValue(
                new Error('mongo')
            );

            const result = await domain.processForgotPassword(
                'user-id',
                data,
                'n-1',
                []
            );

            expect(
                notificationEmailQueue.sendForgotPassword
            ).not.toHaveBeenCalled();
            expect(
                notificationPushQueue.sendForgotPassword
            ).not.toHaveBeenCalled();
            expect(result.failedSteps).toEqual([
                {
                    step: EnumNotificationStep.createNotification,
                    error: 'mongo',
                },
            ]);
        });
    });

    describe('processResetPassword', () => {
        it('skips when the user is not active', async () => {
            userDomain.getOneActive.mockResolvedValue(null);

            const result = await domain.processResetPassword(
                'user-id',
                'n-1',
                []
            );

            expect(result).toEqual({
                message: 'User not found, skipping reset password notification',
                completedSteps: [],
                failedSteps: [],
            });
            expect(notificationRepository.createMany).not.toHaveBeenCalled();
        });

        it('creates the row, then enqueues email and push, and reports every step completed', async () => {
            userDomain.getOneActive.mockResolvedValue(user);
            deviceDomain.getOwnershipsWithNotificationToken.mockResolvedValue([
                deviceOwnership,
            ]);

            const result = await domain.processResetPassword(
                'user-id',
                'n-1',
                []
            );

            expect(notificationRepository.createMany).toHaveBeenCalledWith([
                {
                    kind: EnumNotificationKind.resetPassword,
                    payload: {
                        id: 'n-1',
                        userId: user.id,
                        metadata: { username: user.username },
                        createdBy: user.id,
                    },
                },
            ]);
            expect(
                notificationEmailQueue.sendResetPassword
            ).toHaveBeenCalledWith(emailPayload);
            expect(
                notificationPushQueue.sendResetPassword
            ).toHaveBeenCalledWith(pushPayload);
            expect(result).toEqual({
                message: 'Reset password notification processed',
                completedSteps: allSteps,
                failedSteps: [],
            });
        });

        it('does not enqueue a push when there is no device with a token', async () => {
            userDomain.getOneActive.mockResolvedValue(user);

            const result = await domain.processResetPassword(
                'user-id',
                'n-1',
                []
            );

            expect(
                notificationPushQueue.sendResetPassword
            ).not.toHaveBeenCalled();
            expect(result.completedSteps).toEqual([
                EnumNotificationStep.createNotification,
                EnumNotificationStep.sendEmail,
            ]);
        });

        it('skips the completed steps on a retry', async () => {
            userDomain.getOneActive.mockResolvedValue(user);
            deviceDomain.getOwnershipsWithNotificationToken.mockResolvedValue([
                deviceOwnership,
            ]);

            const result = await domain.processResetPassword('user-id', 'n-1', [
                EnumNotificationStep.createNotification,
                EnumNotificationStep.sendEmail,
            ]);

            expect(notificationRepository.createMany).not.toHaveBeenCalled();
            expect(
                notificationEmailQueue.sendResetPassword
            ).not.toHaveBeenCalled();
            expect(
                notificationPushQueue.sendResetPassword
            ).toHaveBeenCalledTimes(1);
            expect(result.completedSteps).toEqual(allSteps);
        });

        it('continues when the rows already exist and the progress is empty', async () => {
            userDomain.getOneActive.mockResolvedValue(user);
            notificationRepository.createMany.mockResolvedValue([notification]);

            const result = await domain.processResetPassword(
                'user-id',
                'n-1',
                []
            );

            expect(result.failedSteps).toEqual([]);
        });

        it('names a rejected side effect and still runs the others', async () => {
            userDomain.getOneActive.mockResolvedValue(user);
            deviceDomain.getOwnershipsWithNotificationToken.mockResolvedValue([
                deviceOwnership,
            ]);
            notificationEmailQueue.sendResetPassword.mockRejectedValue(
                new Error('redis')
            );

            const result = await domain.processResetPassword(
                'user-id',
                'n-1',
                []
            );

            expect(
                notificationPushQueue.sendResetPassword
            ).toHaveBeenCalledTimes(1);
            expect(result.failedSteps).toEqual([
                { step: EnumNotificationStep.sendEmail, error: 'redis' },
            ]);
            expect(result.completedSteps).toEqual([
                EnumNotificationStep.createNotification,
                EnumNotificationStep.sendPush,
            ]);
        });

        it('stops at the create gate when the rows cannot be written', async () => {
            userDomain.getOneActive.mockResolvedValue(user);
            deviceDomain.getOwnershipsWithNotificationToken.mockResolvedValue([
                deviceOwnership,
            ]);
            notificationRepository.createMany.mockRejectedValue(
                new Error('mongo')
            );

            const result = await domain.processResetPassword(
                'user-id',
                'n-1',
                []
            );

            expect(
                notificationEmailQueue.sendResetPassword
            ).not.toHaveBeenCalled();
            expect(
                notificationPushQueue.sendResetPassword
            ).not.toHaveBeenCalled();
            expect(result.failedSteps).toEqual([
                {
                    step: EnumNotificationStep.createNotification,
                    error: 'mongo',
                },
            ]);
        });
    });

    describe('processResetTwoFactorByAdmin', () => {
        it('skips when the user is not active', async () => {
            userDomain.getOneActive.mockResolvedValue(null);

            const result = await domain.processResetTwoFactorByAdmin(
                'user-id',
                'admin-id',
                'n-1',
                []
            );

            expect(result).toEqual({
                message:
                    'User not found, skipping reset two factor by admin notification',
                completedSteps: [],
                failedSteps: [],
            });
            expect(notificationRepository.createMany).not.toHaveBeenCalled();
        });

        it('creates the row, then enqueues email and push, and reports every step completed', async () => {
            userDomain.getOneActive.mockResolvedValue(user);
            deviceDomain.getOwnershipsWithNotificationToken.mockResolvedValue([
                deviceOwnership,
            ]);

            const result = await domain.processResetTwoFactorByAdmin(
                'user-id',
                'admin-id',
                'n-1',
                []
            );

            expect(notificationRepository.createMany).toHaveBeenCalledWith([
                {
                    kind: EnumNotificationKind.resetTwoFactorByAdmin,
                    payload: {
                        id: 'n-1',
                        userId: user.id,
                        metadata: { username: user.username },
                        createdBy: 'admin-id',
                    },
                },
            ]);
            expect(
                notificationEmailQueue.sendResetTwoFactorByAdmin
            ).toHaveBeenCalledWith(emailPayload);
            expect(
                notificationPushQueue.sendResetTwoFactorByAdmin
            ).toHaveBeenCalledWith(pushPayload);
            expect(result).toEqual({
                message: 'Reset two factor by admin notification processed',
                completedSteps: allSteps,
                failedSteps: [],
            });
        });

        it('does not enqueue a push when there is no device with a token', async () => {
            userDomain.getOneActive.mockResolvedValue(user);

            const result = await domain.processResetTwoFactorByAdmin(
                'user-id',
                'admin-id',
                'n-1',
                []
            );

            expect(
                notificationPushQueue.sendResetTwoFactorByAdmin
            ).not.toHaveBeenCalled();
            expect(result.completedSteps).toEqual([
                EnumNotificationStep.createNotification,
                EnumNotificationStep.sendEmail,
            ]);
        });

        it('skips the completed steps on a retry', async () => {
            userDomain.getOneActive.mockResolvedValue(user);
            deviceDomain.getOwnershipsWithNotificationToken.mockResolvedValue([
                deviceOwnership,
            ]);

            const result = await domain.processResetTwoFactorByAdmin(
                'user-id',
                'admin-id',
                'n-1',
                [
                    EnumNotificationStep.createNotification,
                    EnumNotificationStep.sendEmail,
                ]
            );

            expect(notificationRepository.createMany).not.toHaveBeenCalled();
            expect(
                notificationEmailQueue.sendResetTwoFactorByAdmin
            ).not.toHaveBeenCalled();
            expect(
                notificationPushQueue.sendResetTwoFactorByAdmin
            ).toHaveBeenCalledTimes(1);
            expect(result.completedSteps).toEqual(allSteps);
        });

        it('continues when the rows already exist and the progress is empty', async () => {
            userDomain.getOneActive.mockResolvedValue(user);
            notificationRepository.createMany.mockResolvedValue([notification]);

            const result = await domain.processResetTwoFactorByAdmin(
                'user-id',
                'admin-id',
                'n-1',
                []
            );

            expect(result.failedSteps).toEqual([]);
        });

        it('names a rejected side effect and still runs the others', async () => {
            userDomain.getOneActive.mockResolvedValue(user);
            deviceDomain.getOwnershipsWithNotificationToken.mockResolvedValue([
                deviceOwnership,
            ]);
            notificationEmailQueue.sendResetTwoFactorByAdmin.mockRejectedValue(
                new Error('redis')
            );

            const result = await domain.processResetTwoFactorByAdmin(
                'user-id',
                'admin-id',
                'n-1',
                []
            );

            expect(
                notificationPushQueue.sendResetTwoFactorByAdmin
            ).toHaveBeenCalledTimes(1);
            expect(result.failedSteps).toEqual([
                { step: EnumNotificationStep.sendEmail, error: 'redis' },
            ]);
            expect(result.completedSteps).toEqual([
                EnumNotificationStep.createNotification,
                EnumNotificationStep.sendPush,
            ]);
        });

        it('stops at the create gate when the rows cannot be written', async () => {
            userDomain.getOneActive.mockResolvedValue(user);
            deviceDomain.getOwnershipsWithNotificationToken.mockResolvedValue([
                deviceOwnership,
            ]);
            notificationRepository.createMany.mockRejectedValue(
                new Error('mongo')
            );

            const result = await domain.processResetTwoFactorByAdmin(
                'user-id',
                'admin-id',
                'n-1',
                []
            );

            expect(
                notificationEmailQueue.sendResetTwoFactorByAdmin
            ).not.toHaveBeenCalled();
            expect(
                notificationPushQueue.sendResetTwoFactorByAdmin
            ).not.toHaveBeenCalled();
            expect(result.failedSteps).toEqual([
                {
                    step: EnumNotificationStep.createNotification,
                    error: 'mongo',
                },
            ]);
        });
    });

    describe('processNewDeviceLogin', () => {
        const requestLog: IRequestLog = {
            userAgent: {
                ua: 'Mozilla/5.0',
                browser: null,
                cpu: null,
                device: null,
                engine: null,
                os: null,
            },
            ipAddress: '203.0.113.5',
            geoLocation: {
                latitude: 1,
                longitude: 2,
                country: 'US',
                region: 'CA',
                city: 'San Francisco',
            },
        };
        const data: INotificationNewDeviceLoginPayload = {
            loginFrom: EnumUserLoginFrom.website,
            loginWith: EnumUserLoginWith.credential,
            loginAt: '2024-01-01T00:00:00.000Z',
            requestLog,
        };

        beforeEach(() => {
            requestContextService.resolveDevice.mockReturnValue(
                'Chrome on macOS'
            );
            requestContextService.resolveCity.mockReturnValue('San Francisco');
        });

        it('skips when the user is not active', async () => {
            userDomain.getOneActive.mockResolvedValue(null);

            const result = await domain.processNewDeviceLogin(
                'user-id',
                data,
                'n-1',
                []
            );

            expect(result).toEqual({
                message:
                    'User not found, skipping new device login notification',
                completedSteps: [],
                failedSteps: [],
            });
            expect(notificationRepository.createMany).not.toHaveBeenCalled();
        });

        it('resolves device and city, creates the row, then enqueues email and push', async () => {
            userDomain.getOneActive.mockResolvedValue(user);
            deviceDomain.getOwnershipsWithNotificationToken.mockResolvedValue([
                deviceOwnership,
            ]);

            const result = await domain.processNewDeviceLogin(
                'user-id',
                data,
                'n-1',
                []
            );

            expect(requestContextService.resolveDevice).toHaveBeenCalledWith(
                requestLog.userAgent
            );
            expect(requestContextService.resolveCity).toHaveBeenCalledWith(
                requestLog.geoLocation
            );
            expect(notificationRepository.createMany).toHaveBeenCalledWith([
                {
                    kind: EnumNotificationKind.newDeviceLogin,
                    payload: {
                        id: 'n-1',
                        userId: user.id,
                        metadata: {
                            username: user.username,
                            loginFrom: data.loginFrom,
                            loginWith: data.loginWith,
                            device: 'Chrome on macOS',
                            city: 'San Francisco',
                            loginAt: new Date(data.loginAt),
                        },
                        createdBy: user.id,
                    },
                },
            ]);
            expect(
                notificationEmailQueue.sendNewDeviceLogin
            ).toHaveBeenCalledWith(emailPayload, data);
            expect(
                notificationPushQueue.sendNewDeviceLogin
            ).toHaveBeenCalledWith(pushPayload, data);
            expect(result).toEqual({
                message: 'New device login notification processed',
                completedSteps: allSteps,
                failedSteps: [],
            });
        });

        it('does not enqueue a push when there is no device with a token', async () => {
            userDomain.getOneActive.mockResolvedValue(user);

            const result = await domain.processNewDeviceLogin(
                'user-id',
                data,
                'n-1',
                []
            );

            expect(
                notificationPushQueue.sendNewDeviceLogin
            ).not.toHaveBeenCalled();
            expect(result.completedSteps).toEqual([
                EnumNotificationStep.createNotification,
                EnumNotificationStep.sendEmail,
            ]);
        });

        it('skips the completed steps on a retry', async () => {
            userDomain.getOneActive.mockResolvedValue(user);
            deviceDomain.getOwnershipsWithNotificationToken.mockResolvedValue([
                deviceOwnership,
            ]);

            const result = await domain.processNewDeviceLogin(
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
                notificationEmailQueue.sendNewDeviceLogin
            ).not.toHaveBeenCalled();
            expect(
                notificationPushQueue.sendNewDeviceLogin
            ).toHaveBeenCalledTimes(1);
            expect(result.completedSteps).toEqual(allSteps);
        });

        it('continues when the rows already exist and the progress is empty', async () => {
            userDomain.getOneActive.mockResolvedValue(user);
            notificationRepository.createMany.mockResolvedValue([notification]);

            const result = await domain.processNewDeviceLogin(
                'user-id',
                data,
                'n-1',
                []
            );

            expect(result.failedSteps).toEqual([]);
        });

        it('names a rejected side effect and still runs the others', async () => {
            userDomain.getOneActive.mockResolvedValue(user);
            deviceDomain.getOwnershipsWithNotificationToken.mockResolvedValue([
                deviceOwnership,
            ]);
            notificationEmailQueue.sendNewDeviceLogin.mockRejectedValue(
                new Error('redis')
            );

            const result = await domain.processNewDeviceLogin(
                'user-id',
                data,
                'n-1',
                []
            );

            expect(
                notificationPushQueue.sendNewDeviceLogin
            ).toHaveBeenCalledTimes(1);
            expect(result.failedSteps).toEqual([
                { step: EnumNotificationStep.sendEmail, error: 'redis' },
            ]);
            expect(result.completedSteps).toEqual([
                EnumNotificationStep.createNotification,
                EnumNotificationStep.sendPush,
            ]);
        });

        it('stops at the create gate when the rows cannot be written', async () => {
            userDomain.getOneActive.mockResolvedValue(user);
            deviceDomain.getOwnershipsWithNotificationToken.mockResolvedValue([
                deviceOwnership,
            ]);
            notificationRepository.createMany.mockRejectedValue(
                new Error('mongo')
            );

            const result = await domain.processNewDeviceLogin(
                'user-id',
                data,
                'n-1',
                []
            );

            expect(
                notificationEmailQueue.sendNewDeviceLogin
            ).not.toHaveBeenCalled();
            expect(
                notificationPushQueue.sendNewDeviceLogin
            ).not.toHaveBeenCalled();
            expect(result.failedSteps).toEqual([
                {
                    step: EnumNotificationStep.createNotification,
                    error: 'mongo',
                },
            ]);
        });
    });
});
