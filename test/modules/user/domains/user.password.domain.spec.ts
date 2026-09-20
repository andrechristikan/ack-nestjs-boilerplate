import { createMock } from '@golevelup/ts-vitest';
import { Test, type TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Duration } from 'luxon';

import { HelperDateService } from '@common/helper/services/helper.date.service';
import { DatabaseService } from '@common/database/services/database.service';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
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
import { UserPasswordNotMatchException } from '@modules/user/exceptions/user.password-not-match.exception';
import type { IUser } from '@modules/user/interfaces/user.interface';
import { UserPasswordRepository } from '@modules/user/repositories/user.password.repository';
import { UserRepository } from '@modules/user/repositories/user.repository';
import { UserTwoFactorRepository } from '@modules/user/repositories/user.two-factor.repository';
import { UserLoginDomain } from '@modules/user/domains/user.login.domain';
import { UserPasswordDomain } from '@modules/user/domains/user.password.domain';
import { UserUtil } from '@modules/user/utils/user.util';
import { UserDomain } from '@modules/user/domains/user.domain';
import { SessionDomain } from '@modules/session/domains/session.domain';
import { DeviceDomain } from '@modules/device/domains/device.domain';
import {
    createDatabaseServiceMock,
    mockDatabaseServiceTransaction,
} from '@test/support/database.mock';

describe('UserPasswordDomain', () => {
    const userPasswordRepository =
        createMock<UserPasswordRepository>() as unknown as Record<
            string,
            ReturnType<typeof vi.fn>
        >;
    const userRepository = createMock<UserRepository>();
    const userDomain = createMock<UserDomain>();
    const sessionDomain = createMock<SessionDomain>();
    const deviceDomain = createMock<DeviceDomain>();
    const activityLogDomain = createMock<ActivityLogDomain>();
    const userTwoFactorRepository = createMock<UserTwoFactorRepository>();
    const passwordHistoryService = createMock<PasswordHistoryDomain>();
    const userUtil = createMock<UserUtil>();
    const helperHashService = createMock<HelperHashService>();
    const userLoginService = createMock<UserLoginDomain>();
    const authPasswordService = createMock<AuthPasswordUtil>();
    const notificationQueue = createMock<NotificationQueue>();
    const featureFlagService = createMock<FeatureFlagDomain>();
    const helperDateService = createMock<HelperDateService>();
    const configGet = vi.fn((_key: string): unknown => undefined);
    const configService = {
        get<T>(key: string): T | undefined {
            return configGet(key) as T | undefined;
        },
    } satisfies Pick<ConfigService, 'get'>;
    const helperStringService = {
        random: vi.fn<HelperStringService['random']>(),
        fillPattern: vi.fn<HelperStringService['fillPattern']>(),
    } satisfies Pick<HelperStringService, 'random' | 'fillPattern'>;
    const databaseService = createDatabaseServiceMock();

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
        mockDatabaseServiceTransaction(databaseService);
        configGet.mockImplementation((key: string) => {
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
        userPasswordRepository.updatePasswordByAdmin.mockResolvedValue(user);
        userPasswordRepository.changePassword.mockResolvedValue(user);
        userPasswordRepository.resetPassword.mockResolvedValue(user);
        passwordHistoryService.getActiveByUser.mockResolvedValue([]);
        authPasswordService.createPasswordRandom.mockReturnValue(
            'temporary-password'
        );
        authPasswordService.createPassword.mockReturnValue(password);
        authPasswordService.checkPasswordAttempt.mockReturnValue(false);
        authPasswordService.validatePassword.mockReturnValue(true);
        authPasswordService.checkPasswordPeriod.mockReturnValue(null);
        authPasswordService.getPasswordPeriodInDays.mockReturnValue(90);
        userLoginService.handleTwoFactorValidation.mockResolvedValue(
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
                    provide: UserTwoFactorRepository,
                    useValue: userTwoFactorRepository,
                },
                {
                    provide: PasswordHistoryDomain,
                    useValue: passwordHistoryService,
                },
                { provide: UserUtil, useValue: userUtil },
                { provide: HelperHashService, useValue: helperHashService },
                { provide: UserLoginDomain, useValue: userLoginService },
                { provide: UserDomain, useValue: userDomain },
                { provide: SessionDomain, useValue: sessionDomain },
                { provide: DeviceDomain, useValue: deviceDomain },
                { provide: ActivityLogDomain, useValue: activityLogDomain },
                { provide: DatabaseService, useValue: databaseService },
                { provide: AuthPasswordUtil, useValue: authPasswordService },
                { provide: NotificationQueue, useValue: notificationQueue },
                { provide: FeatureFlagDomain, useValue: featureFlagService },
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
    });

    describe('updatePasswordByAdmin', () => {
        it('sets a temporary password, revokes sessions, notifies the user, and stages activity events', async () => {
            await service.updatePasswordByAdmin(user.id, 'admin-id');

            expect(
                authPasswordService.createPasswordRandom
            ).toHaveBeenCalledTimes(1);
            expect(authPasswordService.createPassword).toHaveBeenCalledWith(
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
            expect(authPasswordService.createPassword).not.toHaveBeenCalled();
        });
    });

    describe('changePassword', () => {
        it('rejects an incorrect old password and records the failed attempt', async () => {
            authPasswordService.validatePassword.mockReturnValue(false);

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
            authPasswordService.checkPasswordPeriod.mockReturnValue(
                oldPasswordHistory
            );

            await expect(
                service.changePassword(user, {
                    oldPassword: 'old-password',
                    newPassword: 'reused-password',
                })
            ).rejects.toBeInstanceOf(UserPasswordMustNewException);
            expect(
                userPasswordRepository.changePassword
            ).not.toHaveBeenCalled();
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
                userLoginService.handleTwoFactorValidation
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
                userLoginService.recordTwoFactorVerificationInTx
            ).toHaveBeenCalledWith(expect.any(Object), user, twoFactorVerified);
            expect(notificationQueue.sendChangePassword).toHaveBeenCalledWith(
                user.id
            );
        });
    });

    describe('forgotPassword', () => {
        it('creates a reset request and sends the reset notification when resend is allowed', async () => {
            await service.forgotPassword(user.email);

            expect(
                featureFlagService.validateFeatureFlagMetadata
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
                userLoginService.handleTwoFactorValidation
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
                userLoginService.recordTwoFactorVerificationInTx
            ).toHaveBeenCalledWith(expect.any(Object), user, twoFactorVerified);
            expect(notificationQueue.sendResetPassword).toHaveBeenCalledWith(
                user.id
            );
        });
    });
});
