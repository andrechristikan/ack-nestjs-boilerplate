import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock, mockDeep } from 'vitest-mock-extended';
import type { DeepMockProxy, MockProxy } from 'vitest-mock-extended';
import { ConfigService } from '@nestjs/config';
import { Duration } from 'luxon';

import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { DatabaseService } from '@common/database/services/database.service';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import type { IActivityLogStagedEvent } from '@modules/activity-log/interfaces/activity-log.interface';
import {
    EnumActivityLogAction,
    EnumPasswordHistoryType,
    EnumRoleType,
    EnumUserGender,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
    type ForgotPassword,
    type PasswordHistory,
} from '@generated/prisma-client';
import { EnumAuthTwoFactorMethod } from '@modules/auth/enums/auth.enum';
import type {
    IAuthPassword,
    IAuthTwoFactorVerifyResult,
} from '@modules/auth/interfaces/auth.interface';
import { AuthPasswordUtil } from '@modules/auth/utils/auth.password.util';
import { FeatureFlagDomain } from '@modules/feature-flag/domains/feature-flag.domain';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { PasswordHistoryDomain } from '@modules/password-history/domains/password-history.domain';
import { UserBlockedInvalidException } from '@modules/user/exceptions/user.blocked-invalid.exception';
import { UserForgotPasswordRequestLimitExceededException } from '@modules/user/exceptions/user.forgot-password-request-limit-exceeded.exception';
import { UserNotFoundException } from '@modules/user/exceptions/user.not-found.exception';
import { UserNotSelfException } from '@modules/user/exceptions/user.not-self.exception';
import { UserPasswordMustNewException } from '@modules/user/exceptions/user.password-must-new.exception';
import { UserPasswordAttemptMaxException } from '@modules/user/exceptions/user.password-attempt-max.exception';
import { UserPasswordNotMatchException } from '@modules/user/exceptions/user.password-not-match.exception';
import type { IUser } from '@modules/user/interfaces/user.interface';
import { UserPasswordRepository } from '@modules/user/repositories/user.password.repository';
import { UserRepository } from '@modules/user/repositories/user.repository';
import { UserLoginDomain } from '@modules/user/domains/user.login.domain';
import { UserPasswordDomain } from '@modules/user/domains/user.password.domain';
import { UserUtil } from '@modules/user/utils/user.util';
import { UserDomain } from '@modules/user/domains/user.domain';
import { SessionDomain } from '@modules/session/domains/session.domain';
import { DeviceDomain } from '@modules/device/domains/device.domain';

describe('UserPasswordDomain', () => {
    const userPasswordRepository: MockProxy<UserPasswordRepository> =
        mock<UserPasswordRepository>();
    const userRepository: MockProxy<UserRepository> = mock<UserRepository>();
    const passwordHistoryDomain: MockProxy<PasswordHistoryDomain> =
        mock<PasswordHistoryDomain>();
    const userUtil: MockProxy<UserUtil> = mock<UserUtil>();
    const helperHashService: MockProxy<HelperHashService> =
        mock<HelperHashService>();
    const userLoginDomain: MockProxy<UserLoginDomain> = mock<UserLoginDomain>();
    const userDomain: MockProxy<UserDomain> = mock<UserDomain>();
    const sessionDomain: MockProxy<SessionDomain> = mock<SessionDomain>();
    const activityLogDomain: MockProxy<ActivityLogDomain> =
        mock<ActivityLogDomain>();
    const databaseService: DeepMockProxy<DatabaseService> =
        mockDeep<DatabaseService>();
    const authPasswordUtil: MockProxy<AuthPasswordUtil> =
        mock<AuthPasswordUtil>();
    const notificationQueue: MockProxy<NotificationQueue> =
        mock<NotificationQueue>();
    const featureFlagDomain: MockProxy<FeatureFlagDomain> =
        mock<FeatureFlagDomain>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>();
    const helperStringService: MockProxy<HelperStringService> =
        mock<HelperStringService>();
    const deviceDomain: MockProxy<DeviceDomain> = mock<DeviceDomain>();
    const transactionClient: MockProxy<IDatabaseTransactionClient> =
        mock<IDatabaseTransactionClient>();

    const now = new Date('2026-01-01T00:00:00.000Z');
    const expiredAt = new Date('2026-01-02T00:00:00.000Z');
    const periodExpiredAt = new Date('2026-04-01T00:00:00.000Z');
    const password = {
        passwordHash: 'new-password-hash',
        passwordExpired: expiredAt,
        passwordCreated: now,
        passwordPeriodExpired: periodExpiredAt,
    } satisfies IAuthPassword;
    const twoFactorVerified = {
        isValid: true,
        method: EnumAuthTwoFactorMethod.code,
    } satisfies IAuthTwoFactorVerifyResult;
    const user = {
        id: 'user-id',
        name: 'User',
        username: 'user',
        isVerified: true,
        verifiedAt: now,
        email: 'user@example.com',
        roleId: 'role-id',
        password: 'old-hash',
        passwordExpired: null,
        passwordCreated: now,
        passwordAttempt: 0,
        signUpAt: now,
        signUpFrom: EnumUserSignUpFrom.website,
        signUpWith: EnumUserSignUpWith.credential,
        status: EnumUserStatus.active,
        gender: EnumUserGender.male,
        countryId: 'country-id',
        lastLoginAt: null,
        lastIPAddress: null,
        lastLoginFrom: null,
        lastLoginWith: null,
        lastWorkspaceId: null,
        lastWorkspaceChangedAt: null,
        createdAt: now,
        createdBy: null,
        updatedAt: now,
        updatedBy: null,
        deletedAt: null,
        deletedBy: null,
        termsOfServiceAccepted: true,
        privacyAccepted: true,
        cookiesAccepted: false,
        marketingAccepted: false,
        role: {
            id: 'role-id',
            name: 'User',
            description: null,
            type: EnumRoleType.user,
            createdAt: now,
            createdBy: null,
            updatedAt: now,
            updatedBy: null,
            policies: [],
        },
        twoFactor: {
            id: 'two-factor-id',
            userId: 'user-id',
            secret: 'secret',
            pendingSecret: null,
            enabled: true,
            requiredSetup: false,
            confirmedAt: now,
            lastUsedAt: null,
            attempt: 0,
            createdAt: now,
            createdBy: null,
            updatedAt: now,
            updatedBy: null,
            backupCodes: [],
        },
    } satisfies IUser;
    const forgotPassword = {
        id: 'forgot-password-id',
        userId: user.id,
        to: user.email,
        token: 'hashed-token',
        expiredAt,
        resetAt: null,
        isUsed: false,
        reference: 'FP-RANDOM',
        createdAt: now,
        createdBy: user.id,
    } satisfies ForgotPassword;
    const oldPasswordHistory = {
        id: 'password-history-id',
        userId: user.id,
        password: 'old-password-hash',
        type: EnumPasswordHistoryType.profile,
        expiredAt: periodExpiredAt,
        createdAt: now,
        createdBy: user.id,
    } satisfies PasswordHistory;

    let service: UserPasswordDomain;

    beforeEach(async () => {
        vi.resetAllMocks();
        databaseService.withTransaction.mockImplementation(async callback =>
            callback(transactionClient)
        );
        vi.mocked(configService.get).mockImplementation((key: string) => {
            const values = {
                'home.url': 'https://app.example.com',
                'forgotPassword.reference.prefix': 'FP',
                'forgotPassword.reference.length': 6,
                'forgotPassword.expiredInMs': 3_600_000,
                'forgotPassword.tokenLength': 32,
                'forgotPassword.resendInMs': 600_000,
                'forgotPassword.linkPattern':
                    '{homeUrl}/reset-password?token={token}',
            };

            return values[key as keyof typeof values];
        });
        helperStringService.random.mockReturnValue('RANDOM');
        helperStringService.fillPattern.mockReturnValue(
            'https://app.example.com/reset-password?token=RANDOM'
        );
        helperHashService.sha256Hash.mockReturnValue('hashed-token');
        helperDateService.create.mockReturnValue(now);
        helperDateService.forward.mockReturnValue(expiredAt);
        helperDateService.formatToIso.mockReturnValue(
            '2026-01-02T00:00:00.000Z'
        );
        helperDateService.formatToRFC2822.mockReturnValue(
            'Fri, 02 Jan 2026 00:00:00 GMT'
        );
        helperDateService.diff.mockReturnValue(
            Duration.fromObject({ minutes: 9 })
        );
        userRepository.findOneById.mockResolvedValue(user);
        userRepository.findOneActiveByEmail.mockResolvedValue(user);
        userDomain.updatePasswordInTx.mockResolvedValue(user);
        userPasswordRepository.findOneLatestByForgotPassword.mockResolvedValue(
            null
        );
        userPasswordRepository.findOneActiveByForgotPasswordToken.mockResolvedValue(
            {
                ...forgotPassword,
                user,
            }
        );
        passwordHistoryDomain.getActiveByUser.mockResolvedValue([]);
        authPasswordUtil.createPasswordRandom.mockReturnValue(
            'temporary-password'
        );
        authPasswordUtil.createPassword.mockReturnValue(password);
        authPasswordUtil.checkPasswordAttempt.mockReturnValue(false);
        authPasswordUtil.validatePassword.mockReturnValue(true);
        authPasswordUtil.checkPasswordPeriod.mockReturnValue(null);
        authPasswordUtil.getPasswordPeriodInDays.mockReturnValue(90);
        userLoginDomain.handleTwoFactorValidation.mockResolvedValue(
            twoFactorVerified
        );
        userUtil.mapActivityLogActorMetadata.mockReturnValue({
            targetUserId: user.id,
        });
        userUtil.mapActivityLogTargetMetadata.mockReturnValue({
            actorUserId: 'admin-id',
        });

        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                UserPasswordDomain,
                {
                    provide: UserPasswordRepository,
                    useValue: userPasswordRepository,
                },
                { provide: UserRepository, useValue: userRepository },
                {
                    provide: PasswordHistoryDomain,
                    useValue: passwordHistoryDomain,
                },
                { provide: UserUtil, useValue: userUtil },
                { provide: HelperHashService, useValue: helperHashService },
                { provide: UserLoginDomain, useValue: userLoginDomain },
                { provide: UserDomain, useValue: userDomain },
                { provide: SessionDomain, useValue: sessionDomain },
                { provide: DeviceDomain, useValue: deviceDomain },
                { provide: ActivityLogDomain, useValue: activityLogDomain },
                { provide: DatabaseService, useValue: databaseService },
                { provide: AuthPasswordUtil, useValue: authPasswordUtil },
                { provide: NotificationQueue, useValue: notificationQueue },
                { provide: FeatureFlagDomain, useValue: featureFlagDomain },
                { provide: HelperDateService, useValue: helperDateService },
                { provide: ConfigService, useValue: configService },
                { provide: HelperStringService, useValue: helperStringService },
            ],
        }).compile();
        service = moduleRef.get(UserPasswordDomain);
    });

    describe('forgotPasswordCreate', () => {
        it('creates a token, hashed token, link, reference, and expiry metadata', () => {
            const result = service.forgotPasswordCreate();

            expect(result).toMatchObject({
                reference: 'FP-RANDOM',
                token: 'RANDOM',
                hashedToken: 'hashed-token',
                expiredAt,
                expiredInMinutes: 60,
                resendInMinutes: 10,
                link: 'https://app.example.com/reset-password?token=RANDOM',
            });
        });

        it('creates each forgot-password primitive from configured lengths and duration', () => {
            expect(service.forgotPasswordCreateReference()).toBe('FP-RANDOM');
            expect(service.forgotPasswordCreateToken()).toBe('RANDOM');
            expect(service.forgotPasswordSetExpiredDate()).toBe(expiredAt);
            expect(helperStringService.random).toHaveBeenCalledWith(6);
            expect(helperStringService.random).toHaveBeenCalledWith(32);
            expect(helperDateService.forward).toHaveBeenCalledWith(
                now,
                Duration.fromObject({ minutes: 60 })
            );
        });
    });

    it('delegates password-attempt reset to the user domain', async () => {
        userDomain.resetPasswordAttempt.mockResolvedValue(user);

        await expect(service.resetPasswordAttempt(user.id)).resolves.toBe(user);
    });

    describe('reachMaxPasswordAttempt', () => {
        it('deactivates the user, revokes access, and finalizes audit state', async () => {
            const revokeEvents = [mock<IActivityLogStagedEvent>()];
            sessionDomain.prepareRevokeAllSelf.mockReturnValue(revokeEvents);

            await service.reachMaxPasswordAttempt(user.id);

            expect(
                userDomain.deactivateForMaxPasswordAttemptInTx
            ).toHaveBeenCalledWith(transactionClient, user.id);
            expect(sessionDomain.revokeActiveByUserInTx).toHaveBeenCalledWith(
                transactionClient,
                user.id,
                user.id,
                now
            );
            expect(deviceDomain.revokeAllByUserInTx).toHaveBeenCalledWith(
                transactionClient,
                user.id,
                user.id,
                now
            );
            expect(sessionDomain.finalizeRevokeAll).toHaveBeenCalledWith(
                user.id,
                revokeEvents
            );
        });

        it('preserves a domain failure while deactivating the user', async () => {
            userDomain.deactivateForMaxPasswordAttemptInTx.mockRejectedValue(
                new UserNotFoundException()
            );

            await expect(
                service.reachMaxPasswordAttempt(user.id)
            ).rejects.toBeInstanceOf(UserNotFoundException);
        });

        it('wraps an unexpected failure while deactivating the user', async () => {
            userDomain.deactivateForMaxPasswordAttemptInTx.mockRejectedValue(
                new Error('database down')
            );

            await expect(
                service.reachMaxPasswordAttempt(user.id)
            ).rejects.toBeInstanceOf(AppUnknownException);
        });
    });

    describe('updatePasswordByAdmin', () => {
        it('sets a temporary password, revokes sessions, notifies the user, and stages activity events', async () => {
            await service.updatePasswordByAdmin(user.id, 'admin-id');

            expect(authPasswordUtil.createPasswordRandom).toHaveBeenCalledTimes(
                1
            );
            expect(authPasswordUtil.createPassword).toHaveBeenCalledWith(
                'temporary-password',
                { temporary: true }
            );
            expect(sessionDomain.purgeLoginsByUser).toHaveBeenCalledWith(
                user.id
            );
            expect(userDomain.updatePasswordInTx).toHaveBeenCalledWith(
                expect.any(Object),
                user.id,
                password,
                'admin-id'
            );
            expect(
                notificationQueue.sendTemporaryPasswordByAdmin
            ).toHaveBeenCalledWith(
                user.id,
                {
                    password: 'temporary-password',
                    passwordCreatedAt: '2026-01-02T00:00:00.000Z',
                    passwordExpiredAt: '2026-01-02T00:00:00.000Z',
                },
                'admin-id'
            );
            expect(activityLogDomain.prepare).toHaveBeenNthCalledWith(1, {
                action: EnumActivityLogAction.adminUserUpdatePassword,
                metadata: { targetUserId: user.id },
            });
            expect(activityLogDomain.prepare).toHaveBeenNthCalledWith(2, {
                action: EnumActivityLogAction.userUpdatePasswordByAdmin,
                userId: user.id,
                createdBy: 'admin-id',
                metadata: { actorUserId: 'admin-id' },
            });
        });

        it('throws UserNotSelfException when an admin updates their own password', async () => {
            await expect(
                service.updatePasswordByAdmin(user.id, user.id)
            ).rejects.toBeInstanceOf(UserNotSelfException);
            expect(userRepository.findOneById).not.toHaveBeenCalled();
        });

        it('throws UserBlockedInvalidException when the target user is blocked', async () => {
            userRepository.findOneById.mockResolvedValue({
                ...user,
                status: EnumUserStatus.blocked,
            });

            await expect(
                service.updatePasswordByAdmin(user.id, 'admin-id')
            ).rejects.toBeInstanceOf(UserBlockedInvalidException);
            expect(authPasswordUtil.createPassword).not.toHaveBeenCalled();
        });

        it('throws UserNotFoundException when the target user is missing', async () => {
            userRepository.findOneById.mockResolvedValue(null);

            await expect(
                service.updatePasswordByAdmin(user.id, 'admin-id')
            ).rejects.toBeInstanceOf(UserNotFoundException);
        });

        it('preserves a domain failure during the administrator update', async () => {
            userDomain.updatePasswordInTx.mockRejectedValue(
                new UserNotFoundException()
            );

            await expect(
                service.updatePasswordByAdmin(user.id, 'admin-id')
            ).rejects.toBeInstanceOf(UserNotFoundException);
        });

        it('wraps an unexpected administrator update failure', async () => {
            userDomain.updatePasswordInTx.mockRejectedValue(
                new Error('database down')
            );

            await expect(
                service.updatePasswordByAdmin(user.id, 'admin-id')
            ).rejects.toBeInstanceOf(AppUnknownException);
        });
    });

    describe('changePassword', () => {
        it('rejects a credential user at the password-attempt limit', async () => {
            authPasswordUtil.checkPasswordAttempt.mockReturnValue(true);

            await expect(
                service.changePassword(user, {
                    oldPassword: 'old-password',
                    newPassword: 'new-password',
                })
            ).rejects.toBeInstanceOf(UserPasswordAttemptMaxException);
        });

        it('rejects an incorrect old password and records the failed attempt', async () => {
            authPasswordUtil.validatePassword.mockReturnValue(false);

            await expect(
                service.changePassword(user, {
                    oldPassword: 'wrong-password',
                    newPassword: 'new-password',
                })
            ).rejects.toBeInstanceOf(UserPasswordNotMatchException);
            expect(userDomain.increasePasswordAttempt).toHaveBeenCalledWith(
                user.id
            );
            expect(sessionDomain.purgeLoginsByUser).not.toHaveBeenCalled();
        });

        it('rejects a reused password before changing persistence', async () => {
            authPasswordUtil.checkPasswordPeriod.mockReturnValue(
                oldPasswordHistory
            );

            await expect(
                service.changePassword(user, {
                    oldPassword: 'old-password',
                    newPassword: 'reused-password',
                })
            ).rejects.toBeInstanceOf(UserPasswordMustNewException);
        });

        it('validates 2FA, revokes sessions, updates the password, marks the factor isUsedById, and notifies the user', async () => {
            await service.changePassword(user, {
                oldPassword: 'old-password',
                newPassword: 'new-password',
                method: EnumAuthTwoFactorMethod.code,
                code: '123456',
            });

            expect(userDomain.resetPasswordAttempt).toHaveBeenCalledWith(
                user.id
            );
            expect(
                userLoginDomain.handleTwoFactorValidation
            ).toHaveBeenCalledWith(user, {
                method: EnumAuthTwoFactorMethod.code,
                code: '123456',
                backupCode: undefined,
            });
            expect(sessionDomain.purgeLoginsByUser).toHaveBeenCalledWith(
                user.id
            );
            expect(userDomain.updatePasswordInTx).toHaveBeenCalledWith(
                expect.any(Object),
                user.id,
                password,
                user.id
            );
            expect(
                userLoginDomain.recordTwoFactorVerificationInTx
            ).toHaveBeenCalledWith(expect.any(Object), user, twoFactorVerified);
            expect(notificationQueue.sendChangePassword).toHaveBeenCalledWith(
                user.id
            );
        });

        it('changes a social-only account password without old-password or two-factor checks', async () => {
            const socialUser = { ...user, password: null, twoFactor: null };

            await service.changePassword(socialUser, {
                oldPassword: '',
                newPassword: 'new-password',
            });

            expect(authPasswordUtil.validatePassword).not.toHaveBeenCalled();
            expect(
                userLoginDomain.handleTwoFactorValidation
            ).not.toHaveBeenCalled();
            expect(
                userLoginDomain.recordTwoFactorVerificationInTx
            ).not.toHaveBeenCalled();
        });

        it('preserves a domain failure while changing the password', async () => {
            userDomain.updatePasswordInTx.mockRejectedValue(
                new UserNotFoundException()
            );

            await expect(
                service.changePassword(user, {
                    oldPassword: 'old-password',
                    newPassword: 'new-password',
                })
            ).rejects.toBeInstanceOf(UserNotFoundException);
        });

        it('wraps an unexpected password change failure', async () => {
            userDomain.updatePasswordInTx.mockRejectedValue(
                new Error('database down')
            );

            await expect(
                service.changePassword(user, {
                    oldPassword: 'old-password',
                    newPassword: 'new-password',
                })
            ).rejects.toBeInstanceOf(AppUnknownException);
        });
    });

    describe('forgotPassword', () => {
        it('creates a reset request and sends the reset notification when resend is allowed', async () => {
            await service.forgotPassword(user.email);

            expect(
                featureFlagDomain.validateFeatureFlagMetadata
            ).toHaveBeenCalledWith('changePassword', 'forgotAllowed');
            expect(
                userPasswordRepository.createReplacingUnused
            ).toHaveBeenCalledWith(
                user.id,
                user.email,
                expect.objectContaining({
                    reference: 'FP-RANDOM',
                    hashedToken: 'hashed-token',
                })
            );
            expect(notificationQueue.sendForgotPassword).toHaveBeenCalledWith(
                user.id,
                {
                    expiredAt: '2026-01-02T00:00:00.000Z',
                    link: 'https://app.example.com/reset-password?token=RANDOM',
                    reference: 'FP-RANDOM',
                    expiredInMinutes: 60,
                    resendInMinutes: 10,
                }
            );
        });

        it('throws UserForgotPasswordRequestLimitExceededException inside the resend window', async () => {
            userPasswordRepository.findOneLatestByForgotPassword.mockResolvedValue(
                forgotPassword
            );
            helperDateService.forward.mockReturnValue(
                new Date('2026-01-01T00:10:00.000Z')
            );

            await expect(
                service.forgotPassword(user.email)
            ).rejects.toBeInstanceOf(
                UserForgotPasswordRequestLimitExceededException
            );
            expect(
                userPasswordRepository.createReplacingUnused
            ).not.toHaveBeenCalled();
        });

        it('throws UserNotFoundException for an unknown active email', async () => {
            userRepository.findOneActiveByEmail.mockResolvedValue(null);

            await expect(
                service.forgotPassword(user.email)
            ).rejects.toBeInstanceOf(UserNotFoundException);
        });

        it('allows resend exactly at the configured boundary', async () => {
            userPasswordRepository.findOneLatestByForgotPassword.mockResolvedValue(
                forgotPassword
            );
            helperDateService.forward.mockReturnValue(now);

            await expect(
                service.forgotPassword(user.email)
            ).resolves.toBeUndefined();
        });

        it('preserves a domain failure while persisting the request', async () => {
            userPasswordRepository.createReplacingUnused.mockRejectedValue(
                new UserNotFoundException()
            );

            await expect(
                service.forgotPassword(user.email)
            ).rejects.toBeInstanceOf(UserNotFoundException);
        });

        it('wraps an unexpected request persistence failure', async () => {
            userPasswordRepository.createReplacingUnused.mockRejectedValue(
                new Error('database down')
            );

            await expect(
                service.forgotPassword(user.email)
            ).rejects.toBeInstanceOf(AppUnknownException);
        });
    });

    describe('resetPassword', () => {
        it('throws UserNotFoundException when the reset token is unknown', async () => {
            userPasswordRepository.findOneActiveByForgotPasswordToken.mockResolvedValue(
                null
            );

            await expect(
                service.resetPassword({
                    token: 'reset-token',
                    newPassword: 'new-password',
                })
            ).rejects.toBeInstanceOf(UserNotFoundException);
            expect(userDomain.updatePasswordInTx).not.toHaveBeenCalled();
        });

        it('validates 2FA, consumes the reset token, revokes sessions, and notifies the user', async () => {
            await service.resetPassword({
                token: 'reset-token',
                newPassword: 'new-password',
                method: EnumAuthTwoFactorMethod.code,
                code: '123456',
            });

            expect(helperHashService.sha256Hash).toHaveBeenCalledWith(
                'reset-token'
            );
            expect(
                userLoginDomain.handleTwoFactorValidation
            ).toHaveBeenCalledWith(user, {
                method: EnumAuthTwoFactorMethod.code,
                code: '123456',
                backupCode: undefined,
            });
            expect(sessionDomain.purgeLoginsByUser).toHaveBeenCalledWith(
                user.id
            );
            expect(userDomain.updatePasswordInTx).toHaveBeenCalledWith(
                expect.any(Object),
                user.id,
                password,
                user.id
            );
            expect(
                userLoginDomain.recordTwoFactorVerificationInTx
            ).toHaveBeenCalledWith(expect.any(Object), user, twoFactorVerified);
            expect(notificationQueue.sendResetPassword).toHaveBeenCalledWith(
                user.id
            );
        });

        it('rejects a recently used reset password', async () => {
            authPasswordUtil.checkPasswordPeriod.mockReturnValue(
                oldPasswordHistory
            );

            await expect(
                service.resetPassword({
                    token: 'reset-token',
                    newPassword: 'reused-password',
                })
            ).rejects.toBeInstanceOf(UserPasswordMustNewException);
        });

        it('resets an account without enabled two-factor without recording verification', async () => {
            userPasswordRepository.findOneActiveByForgotPasswordToken.mockResolvedValue(
                {
                    ...forgotPassword,
                    user: { ...user, twoFactor: null },
                }
            );

            await service.resetPassword({
                token: 'reset-token',
                newPassword: 'new-password',
            });

            expect(
                userLoginDomain.handleTwoFactorValidation
            ).not.toHaveBeenCalled();
            expect(
                userLoginDomain.recordTwoFactorVerificationInTx
            ).not.toHaveBeenCalled();
        });

        it('preserves a domain failure while resetting the password', async () => {
            userDomain.updatePasswordInTx.mockRejectedValue(
                new UserNotFoundException()
            );

            await expect(
                service.resetPassword({
                    token: 'reset-token',
                    newPassword: 'new-password',
                })
            ).rejects.toBeInstanceOf(UserNotFoundException);
        });

        it('wraps an unexpected reset failure', async () => {
            userDomain.updatePasswordInTx.mockRejectedValue(
                new Error('database down')
            );

            await expect(
                service.resetPassword({
                    token: 'reset-token',
                    newPassword: 'new-password',
                })
            ).rejects.toBeInstanceOf(AppUnknownException);
        });
    });
});
