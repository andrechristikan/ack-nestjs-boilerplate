import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumActivityLogAction,
    EnumPasswordHistoryType,
    EnumRoleType,
    EnumUserLoginFrom,
    EnumUserLoginWith,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
} from '@generated/prisma-client/client';
import type {
    ForgotPassword,
    PasswordHistory,
    TwoFactor,
} from '@generated/prisma-client/client';
import { EnumAppStatusCodeError } from '@app/enums/app.status-code.enum';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import type { IActivityLogStagedEvent } from '@modules/activity-log/interfaces/activity-log.interface';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import { EnumAuthTwoFactorMethod } from '@modules/auth/enums/auth.enum';
import type { IAuthTwoFactorVerifyResult } from '@modules/auth/interfaces/auth.interface';
import { AuthPasswordUtil } from '@modules/auth/utils/auth.password.util';
import { DeviceDomain } from '@modules/device/domains/device.domain';
import { FeatureFlagDomain } from '@modules/feature-flag/domains/feature-flag.domain';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { PasswordHistoryDomain } from '@modules/password-history/domains/password-history.domain';
import { SessionDomain } from '@modules/session/domains/session.domain';
import { UserNotFoundException } from '@modules/user/exceptions/user.not-found.exception';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import type { IUser } from '@modules/user/interfaces/user.interface';
import { UserPasswordRepository } from '@modules/user/repositories/user.password.repository';
import { UserRepository } from '@modules/user/repositories/user.repository';
import { UserLoginDomain } from '@modules/user/domains/user.login.domain';
import { UserDomain } from '@modules/user/domains/user.domain';
import { UserPasswordDomain } from '@modules/user/domains/user.password.domain';
import { UserUtil } from '@modules/user/utils/user.util';
import { Duration } from 'luxon';

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
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const authPasswordUtil: MockProxy<AuthPasswordUtil> =
        mock<AuthPasswordUtil>();
    const notificationQueue: MockProxy<NotificationQueue> =
        mock<NotificationQueue>();
    const featureFlagDomain: MockProxy<FeatureFlagDomain> =
        mock<FeatureFlagDomain>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const helperStringService: MockProxy<HelperStringService> =
        mock<HelperStringService>();
    const deviceDomain: MockProxy<DeviceDomain> = mock<DeviceDomain>();
    const configGet = vi.fn<(key: string) => string | number | undefined>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });

    let domain: UserPasswordDomain;

    const tx = {} as IDatabaseTransactionClient;
    const now = new Date('2026-03-01T00:00:00.000Z');
    const event: IActivityLogStagedEvent = {
        action: EnumActivityLogAction.userChangePassword,
        metadata: {},
        onError: false,
        userId: null,
        createdBy: null,
        workspaceId: null,
    };

    const configValues: Record<string, string | number> = {
        'home.url': 'https://example.com',
        'forgotPassword.reference.prefix': 'FGT',
        'forgotPassword.reference.length': 8,
        'forgotPassword.expiredInMs': 15 * 60 * 1000,
        'forgotPassword.tokenLength': 32,
        'forgotPassword.resendInMs': 5 * 60 * 1000,
        'forgotPassword.linkPattern': '{homeUrl}/reset?token={token}',
    };

    const baseTwoFactor: TwoFactor = {
        id: 'two-factor-hollow',
        userId: 'user-hollow',
        secret: 'encrypted-secret',
        pendingSecret: null,
        backupCodes: ['hash-one'],
        enabled: false,
        requiredSetup: false,
        confirmedAt: null,
        lastUsedAt: null,
        attempt: 0,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
    };

    const baseUser: IUser = {
        id: 'user-hollow',
        name: 'Hollow Pike',
        username: 'hollowPike',
        isVerified: true,
        verifiedAt: new Date('2026-01-01T00:00:00.000Z'),
        email: 'hollow@example.com',
        roleId: 'role-hollow',
        password: 'hashed-password',
        passwordExpired: new Date('2026-06-01T00:00:00.000Z'),
        passwordCreated: new Date('2026-01-01T00:00:00.000Z'),
        passwordAttempt: 0,
        signUpAt: new Date('2026-01-01T00:00:00.000Z'),
        signUpFrom: EnumUserSignUpFrom.website,
        signUpWith: EnumUserSignUpWith.credential,
        status: EnumUserStatus.active,
        gender: null,
        countryId: 'country-hollow',
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
            cookies: false,
        },
        photo: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
        deletedAt: null,
        deletedBy: null,
        role: {
            id: 'role-hollow',
            name: 'user',
            description: null,
            type: EnumRoleType.user,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            createdBy: null,
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedBy: null,
            policies: [],
        },
        twoFactor: baseTwoFactor,
    };

    const password = {
        passwordHash: 'hashed',
        passwordExpired: new Date('2026-06-01T00:00:00.000Z'),
        passwordCreated: new Date('2026-01-01T00:00:00.000Z'),
        passwordPeriodExpired: new Date('2026-04-01T00:00:00.000Z'),
    };

    beforeEach(async () => {
        vi.resetAllMocks();

        configGet.mockImplementation(key => configValues[key]);
        activityLogDomain.prepare.mockReturnValue(event);
        databaseService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );
        helperDateService.create.mockReturnValue(now);
        helperDateService.forward.mockImplementation(
            (date, duration: Duration) =>
                new Date(date.getTime() + duration.as('milliseconds'))
        );

        const module: TestingModule = await Test.createTestingModule({
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
                { provide: ActivityLogDomain, useValue: activityLogDomain },
                { provide: DatabaseService, useValue: databaseService },
                { provide: AuthPasswordUtil, useValue: authPasswordUtil },
                { provide: NotificationQueue, useValue: notificationQueue },
                { provide: FeatureFlagDomain, useValue: featureFlagDomain },
                { provide: HelperDateService, useValue: helperDateService },
                { provide: ConfigService, useValue: configService },
                {
                    provide: HelperStringService,
                    useValue: helperStringService,
                },
                { provide: DeviceDomain, useValue: deviceDomain },
            ],
        }).compile();
        domain = module.get(UserPasswordDomain);
    });

    describe('forgotPasswordCreateReference', () => {
        it('builds a prefixed random reference', () => {
            helperStringService.random.mockReturnValue('random-ref');

            expect(domain.forgotPasswordCreateReference()).toBe(
                'FGT-random-ref'
            );
        });
    });

    describe('forgotPasswordCreateToken', () => {
        it('builds a random token of the configured length', () => {
            helperStringService.random.mockReturnValue('random-token');

            expect(domain.forgotPasswordCreateToken()).toBe('random-token');
            expect(helperStringService.random).toHaveBeenCalledWith(32);
        });
    });

    describe('forgotPasswordSetExpiredDate', () => {
        it('forwards now by the configured expiry', () => {
            expect(domain.forgotPasswordSetExpiredDate()).toEqual(
                new Date(now.getTime() + 15 * 60 * 1000)
            );
        });
    });

    describe('forgotPasswordCreate', () => {
        it('builds the full forgot-password payload', () => {
            helperStringService.random.mockReturnValue('random-token');
            helperHashService.sha256Hash.mockReturnValue('hashed-token');
            helperStringService.fillPattern.mockReturnValue(
                'https://example.com/reset?token=random-token'
            );

            const result = domain.forgotPasswordCreate();

            expect(result).toEqual({
                reference: 'FGT-random-token',
                expiredAt: new Date(now.getTime() + 15 * 60 * 1000),
                token: 'random-token',
                hashedToken: 'hashed-token',
                expiredInMinutes: 15,
                resendInMinutes: 5,
                link: 'https://example.com/reset?token=random-token',
            });
        });
    });

    describe('resetPasswordAttempt', () => {
        it('delegates to the user domain', async () => {
            const user = baseUser;
            userDomain.resetPasswordAttempt.mockResolvedValue(user);

            await expect(domain.resetPasswordAttempt(user.id)).resolves.toBe(
                user
            );
            expect(userDomain.resetPasswordAttempt).toHaveBeenCalledWith(
                user.id
            );
        });
    });

    describe('reachMaxPasswordAttempt', () => {
        it('deactivates the account and revokes sessions and devices', async () => {
            sessionDomain.prepareRevokeAllSelf.mockReturnValue([event]);

            await domain.reachMaxPasswordAttempt('user-hollow');

            expect(
                userDomain.deactivateForMaxPasswordAttemptInTx
            ).toHaveBeenCalledWith(tx, 'user-hollow');
            expect(sessionDomain.revokeActiveByUserInTx).toHaveBeenCalledWith(
                tx,
                'user-hollow',
                'user-hollow',
                now
            );
            expect(deviceDomain.revokeAllByUserInTx).toHaveBeenCalledWith(
                tx,
                'user-hollow',
                'user-hollow',
                now
            );
            expect(sessionDomain.finalizeRevokeAll).toHaveBeenCalledWith(
                'user-hollow',
                [event]
            );
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                event,
            ]);
        });

        it('rethrows an AppBaseException raised inside the transaction', async () => {
            sessionDomain.prepareRevokeAllSelf.mockReturnValue([event]);
            const error = new UserNotFoundException();
            databaseService.withTransaction.mockRejectedValueOnce(error);

            const call = domain.reachMaxPasswordAttempt('user-hollow');

            await expect(call).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.notFound,
                statusCodeKey:
                    EnumUserStatusCodeError[EnumUserStatusCodeError.notFound],
                messagePath: 'user.error.notFound',
            });
            await expect(call).rejects.toBe(error);
        });

        it('wraps an unknown error raised inside the transaction', async () => {
            sessionDomain.prepareRevokeAllSelf.mockReturnValue([event]);
            const error = new Error('boom');
            databaseService.withTransaction.mockRejectedValueOnce(error);

            const call = domain.reachMaxPasswordAttempt('user-hollow');

            await expect(call).rejects.toMatchObject({
                module: 'app',
                statusCode: EnumAppStatusCodeError.unknown,
                statusCodeKey:
                    EnumAppStatusCodeError[EnumAppStatusCodeError.unknown],
                messagePath: 'http.serverError.internalServerError',
                rawError: error,
            });
        });
    });

    describe('updatePasswordByAdmin', () => {
        it('sets a temporary password, revokes sessions, stages both events in order, and notifies the user', async () => {
            const user = baseUser;
            userRepository.findOneById.mockResolvedValue(user);
            authPasswordUtil.createPasswordRandom.mockReturnValue(
                'random-password'
            );
            authPasswordUtil.createPassword.mockReturnValue(password);
            userDomain.updatePasswordInTx.mockResolvedValue(user);
            helperDateService.formatToIso.mockImplementation(date =>
                date.toISOString()
            );
            const actorMetadata = { userId: 'user-hollow' };
            const targetMetadata = { actorUserId: 'admin-hollow' };
            userUtil.mapActivityLogActorMetadata.mockReturnValue(actorMetadata);
            userUtil.mapActivityLogTargetMetadata.mockReturnValue(
                targetMetadata
            );
            const actorEvent: IActivityLogStagedEvent = {
                action: EnumActivityLogAction.adminUserUpdatePassword,
                metadata: {},
                onError: false,
                userId: null,
                createdBy: null,
                workspaceId: null,
            };
            const targetEvent: IActivityLogStagedEvent = {
                action: EnumActivityLogAction.userUpdatePasswordByAdmin,
                metadata: {},
                onError: false,
                userId: null,
                createdBy: null,
                workspaceId: null,
            };
            activityLogDomain.prepare
                .mockReturnValueOnce(actorEvent)
                .mockReturnValueOnce(targetEvent);
            const callOrder: string[] = [];
            sessionDomain.purgeLoginsByUser.mockImplementation(async () => {
                callOrder.push('purgeLoginsByUser');
            });
            activityLogDomain.stagePrepared.mockImplementation(() => {
                callOrder.push('stagePrepared');
            });
            notificationQueue.sendTemporaryPasswordByAdmin.mockImplementation(
                async () => {
                    callOrder.push('sendTemporaryPasswordByAdmin');
                }
            );

            await domain.updatePasswordByAdmin('user-hollow', 'admin-hollow');

            expect(userDomain.updatePasswordInTx).toHaveBeenCalledWith(
                tx,
                'user-hollow',
                password,
                'admin-hollow'
            );
            expect(passwordHistoryDomain.createInTx).toHaveBeenCalledWith(
                tx,
                'user-hollow',
                password.passwordHash,
                EnumPasswordHistoryType.admin,
                password.passwordPeriodExpired,
                password.passwordCreated,
                'admin-hollow'
            );
            expect(sessionDomain.purgeLoginsByUser).toHaveBeenCalledWith(
                'user-hollow'
            );
            expect(activityLogDomain.prepare).toHaveBeenNthCalledWith(1, {
                action: EnumActivityLogAction.adminUserUpdatePassword,
                metadata: actorMetadata,
            });
            expect(activityLogDomain.prepare).toHaveBeenNthCalledWith(2, {
                action: EnumActivityLogAction.userUpdatePasswordByAdmin,
                userId: 'user-hollow',
                createdBy: 'admin-hollow',
                metadata: targetMetadata,
            });
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                actorEvent,
                targetEvent,
            ]);
            expect(
                notificationQueue.sendTemporaryPasswordByAdmin
            ).toHaveBeenCalledWith(
                user.id,
                {
                    password: 'random-password',
                    passwordCreatedAt: password.passwordCreated.toISOString(),
                    passwordExpiredAt: password.passwordExpired.toISOString(),
                },
                'admin-hollow'
            );
            expect(callOrder).toEqual([
                'purgeLoginsByUser',
                'stagePrepared',
                'sendTemporaryPasswordByAdmin',
            ]);
        });

        it('throws UserNotSelfException when the admin targets themselves', async () => {
            const call = domain.updatePasswordByAdmin(
                'admin-hollow',
                'admin-hollow'
            );

            await expect(call).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.notSelf,
                statusCodeKey:
                    EnumUserStatusCodeError[EnumUserStatusCodeError.notSelf],
                messagePath: 'user.error.notSelf',
            });
        });

        it('throws UserNotFoundException when the target user does not exist', async () => {
            userRepository.findOneById.mockResolvedValue(null);

            const call = domain.updatePasswordByAdmin(
                'user-hollow',
                'admin-hollow'
            );

            await expect(call).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.notFound,
                statusCodeKey:
                    EnumUserStatusCodeError[EnumUserStatusCodeError.notFound],
                messagePath: 'user.error.notFound',
            });
        });

        it('throws UserBlockedInvalidException when the target user is blocked', async () => {
            userRepository.findOneById.mockResolvedValue({
                ...baseUser,
                status: EnumUserStatus.blocked,
            });

            const call = domain.updatePasswordByAdmin(
                'user-hollow',
                'admin-hollow'
            );

            await expect(call).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.blockedInvalid,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.blockedInvalid
                    ],
                messagePath: 'user.error.blockedInvalid',
            });
        });

        it('rethrows an AppBaseException raised inside the transaction', async () => {
            userRepository.findOneById.mockResolvedValue(baseUser);
            authPasswordUtil.createPasswordRandom.mockReturnValue(
                'random-password'
            );
            authPasswordUtil.createPassword.mockReturnValue(password);
            const error = new UserNotFoundException();
            databaseService.withTransaction.mockRejectedValueOnce(error);

            const call = domain.updatePasswordByAdmin(
                'user-hollow',
                'admin-hollow'
            );

            await expect(call).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.notFound,
                statusCodeKey:
                    EnumUserStatusCodeError[EnumUserStatusCodeError.notFound],
                messagePath: 'user.error.notFound',
            });
            await expect(call).rejects.toBe(error);
        });

        it('wraps an unknown error raised inside the transaction', async () => {
            userRepository.findOneById.mockResolvedValue(baseUser);
            authPasswordUtil.createPasswordRandom.mockReturnValue(
                'random-password'
            );
            authPasswordUtil.createPassword.mockReturnValue(password);
            const error = new Error('boom');
            databaseService.withTransaction.mockRejectedValueOnce(error);

            const call = domain.updatePasswordByAdmin(
                'user-hollow',
                'admin-hollow'
            );

            await expect(call).rejects.toMatchObject({
                module: 'app',
                statusCode: EnumAppStatusCodeError.unknown,
                statusCodeKey:
                    EnumAppStatusCodeError[EnumAppStatusCodeError.unknown],
                messagePath: 'http.serverError.internalServerError',
                rawError: error,
            });
        });
    });

    describe('changePassword', () => {
        const verifiedResult: IAuthTwoFactorVerifyResult = {
            isValid: true,
            method: EnumAuthTwoFactorMethod.code,
            newBackupCodes: null,
        };
        const history: PasswordHistory = {
            id: 'history-hollow',
            userId: 'user-hollow',
            password: 'hashed-old',
            type: EnumPasswordHistoryType.profile,
            expiredAt: new Date('2026-04-01T00:00:00.000Z'),
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            createdBy: null,
        };

        it('changes the password, commits, purges, and stages the event in order when no two-factor is enabled', async () => {
            const user = {
                ...baseUser,
                twoFactor: { ...baseTwoFactor, enabled: false },
            };
            authPasswordUtil.checkPasswordAttempt.mockReturnValue(false);
            authPasswordUtil.validatePassword.mockReturnValue(true);
            passwordHistoryDomain.getActiveByUser.mockResolvedValue([]);
            authPasswordUtil.checkPasswordPeriod.mockReturnValue(null);
            authPasswordUtil.createPassword.mockReturnValue(password);
            const callOrder: string[] = [];
            sessionDomain.revokeActiveByUserInTx.mockImplementation(
                async () => {
                    callOrder.push('revokeActiveByUserInTx');
                    return [];
                }
            );
            sessionDomain.purgeLoginsByUser.mockImplementation(async () => {
                callOrder.push('purgeLoginsByUser');
            });
            activityLogDomain.stagePrepared.mockImplementation(() => {
                callOrder.push('stagePrepared');
            });
            notificationQueue.sendChangePassword.mockImplementation(
                async () => {
                    callOrder.push('sendChangePassword');
                }
            );

            await domain.changePassword(user, {
                newPassword: 'new-password',
                oldPassword: 'old-password',
                method: null,
                code: null,
                backupCode: null,
            });

            expect(userDomain.resetPasswordAttempt).toHaveBeenCalledWith(
                user.id
            );
            expect(userDomain.updatePasswordInTx).toHaveBeenCalledWith(
                tx,
                user.id,
                password,
                user.id
            );
            expect(passwordHistoryDomain.createInTx).toHaveBeenCalledWith(
                tx,
                user.id,
                password.passwordHash,
                EnumPasswordHistoryType.profile,
                password.passwordPeriodExpired,
                password.passwordCreated,
                user.id
            );
            expect(
                userLoginDomain.recordTwoFactorVerificationInTx
            ).not.toHaveBeenCalled();
            expect(sessionDomain.purgeLoginsByUser).toHaveBeenCalledWith(
                user.id
            );
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userChangePassword,
            });
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                event,
            ]);
            expect(notificationQueue.sendChangePassword).toHaveBeenCalledWith(
                user.id
            );
            expect(callOrder).toEqual([
                'revokeActiveByUserInTx',
                'purgeLoginsByUser',
                'stagePrepared',
                'sendChangePassword',
            ]);
        });

        it('verifies two-factor, records it in the same transaction, and stages both events when enabled', async () => {
            const user = {
                ...baseUser,
                twoFactor: { ...baseTwoFactor, enabled: true },
            };
            authPasswordUtil.checkPasswordAttempt.mockReturnValue(false);
            authPasswordUtil.validatePassword.mockReturnValue(true);
            passwordHistoryDomain.getActiveByUser.mockResolvedValue([]);
            authPasswordUtil.checkPasswordPeriod.mockReturnValue(null);
            authPasswordUtil.createPassword.mockReturnValue(password);
            userLoginDomain.handleTwoFactorValidation.mockResolvedValue(
                verifiedResult
            );
            const changePasswordEvent: IActivityLogStagedEvent = {
                action: EnumActivityLogAction.userChangePassword,
                metadata: {},
                onError: false,
                userId: null,
                createdBy: null,
                workspaceId: null,
            };
            const verifyTwoFactorEvent: IActivityLogStagedEvent = {
                action: EnumActivityLogAction.userVerifyTwoFactor,
                metadata: {},
                onError: false,
                userId: null,
                createdBy: null,
                workspaceId: null,
            };
            activityLogDomain.prepare
                .mockReturnValueOnce(changePasswordEvent)
                .mockReturnValueOnce(verifyTwoFactorEvent);

            await domain.changePassword(user, {
                newPassword: 'new-password',
                oldPassword: 'old-password',
                code: '123456',
                method: EnumAuthTwoFactorMethod.code,
                backupCode: null,
            });

            expect(
                userLoginDomain.recordTwoFactorVerificationInTx
            ).toHaveBeenCalledWith(tx, user, verifiedResult);
            expect(activityLogDomain.prepare).toHaveBeenNthCalledWith(2, {
                action: EnumActivityLogAction.userVerifyTwoFactor,
                userId: user.id,
                createdBy: user.id,
            });
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                changePasswordEvent,
                verifyTwoFactorEvent,
            ]);
        });

        it('skips the old-password checks when the account has no password set', async () => {
            const user = {
                ...baseUser,
                password: null,
                twoFactor: { ...baseTwoFactor, enabled: false },
            };
            authPasswordUtil.createPassword.mockReturnValue(password);

            await domain.changePassword(user, {
                newPassword: 'new-password',
                oldPassword: 'old-password',
                method: null,
                code: null,
                backupCode: null,
            });

            expect(
                authPasswordUtil.checkPasswordAttempt
            ).not.toHaveBeenCalled();
            expect(userDomain.updatePasswordInTx).toHaveBeenCalledWith(
                tx,
                user.id,
                password,
                user.id
            );
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                event,
            ]);
        });

        it('throws UserPasswordAttemptMaxException at the attempt limit', async () => {
            const user = baseUser;
            authPasswordUtil.checkPasswordAttempt.mockReturnValue(true);

            const call = domain.changePassword(user, {
                newPassword: 'new-password',
                oldPassword: 'old-password',
                method: null,
                code: null,
                backupCode: null,
            });

            await expect(call).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.passwordAttemptMax,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.passwordAttemptMax
                    ],
                messagePath: 'user.error.passwordAttemptMax',
            });
        });

        it('increases the attempt and throws UserPasswordNotMatchException on a wrong old password', async () => {
            const user = baseUser;
            authPasswordUtil.checkPasswordAttempt.mockReturnValue(false);
            authPasswordUtil.validatePassword.mockReturnValue(false);

            const call = domain.changePassword(user, {
                newPassword: 'new-password',
                oldPassword: 'wrong-password',
                method: null,
                code: null,
                backupCode: null,
            });

            await expect(call).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.passwordNotMatch,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.passwordNotMatch
                    ],
                messagePath: 'user.error.passwordNotMatch',
            });
            expect(userDomain.increasePasswordAttempt).toHaveBeenCalledWith(
                user.id
            );
        });

        it('throws UserPasswordMustNewException when the password was used recently', async () => {
            const user = baseUser;
            authPasswordUtil.checkPasswordAttempt.mockReturnValue(false);
            authPasswordUtil.validatePassword.mockReturnValue(true);
            passwordHistoryDomain.getActiveByUser.mockResolvedValue([history]);
            authPasswordUtil.checkPasswordPeriod.mockReturnValue(history);
            authPasswordUtil.getPasswordPeriodInDays.mockReturnValue(90);

            const call = domain.changePassword(user, {
                newPassword: 'new-password',
                oldPassword: 'old-password',
                method: null,
                code: null,
                backupCode: null,
            });

            await expect(call).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.passwordMustNew,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.passwordMustNew
                    ],
                messagePath: 'user.error.passwordMustNew',
                messageProperties: { period: 90 },
            });
        });

        it('rethrows an AppBaseException raised inside the transaction', async () => {
            const user = {
                ...baseUser,
                twoFactor: { ...baseTwoFactor, enabled: false },
            };
            authPasswordUtil.checkPasswordAttempt.mockReturnValue(false);
            authPasswordUtil.validatePassword.mockReturnValue(true);
            passwordHistoryDomain.getActiveByUser.mockResolvedValue([]);
            authPasswordUtil.checkPasswordPeriod.mockReturnValue(null);
            authPasswordUtil.createPassword.mockReturnValue(password);
            const error = new UserNotFoundException();
            databaseService.withTransaction.mockRejectedValueOnce(error);

            const call = domain.changePassword(user, {
                newPassword: 'new-password',
                oldPassword: 'old-password',
                method: null,
                code: null,
                backupCode: null,
            });

            await expect(call).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.notFound,
                statusCodeKey:
                    EnumUserStatusCodeError[EnumUserStatusCodeError.notFound],
                messagePath: 'user.error.notFound',
            });
            await expect(call).rejects.toBe(error);
        });

        it('wraps an unknown error raised inside the transaction', async () => {
            const user = {
                ...baseUser,
                twoFactor: { ...baseTwoFactor, enabled: false },
            };
            authPasswordUtil.checkPasswordAttempt.mockReturnValue(false);
            authPasswordUtil.validatePassword.mockReturnValue(true);
            passwordHistoryDomain.getActiveByUser.mockResolvedValue([]);
            authPasswordUtil.checkPasswordPeriod.mockReturnValue(null);
            authPasswordUtil.createPassword.mockReturnValue(password);
            const error = new Error('boom');
            databaseService.withTransaction.mockRejectedValueOnce(error);

            const call = domain.changePassword(user, {
                newPassword: 'new-password',
                oldPassword: 'old-password',
                method: null,
                code: null,
                backupCode: null,
            });

            await expect(call).rejects.toMatchObject({
                module: 'app',
                statusCode: EnumAppStatusCodeError.unknown,
                statusCodeKey:
                    EnumAppStatusCodeError[EnumAppStatusCodeError.unknown],
                messagePath: 'http.serverError.internalServerError',
                rawError: error,
            });
        });
    });

    describe('forgotPassword', () => {
        const forgotPassword: ForgotPassword = {
            id: 'forgot-hollow',
            userId: 'user-hollow',
            to: 'hollow@example.com',
            token: 'hashed-token',
            expiredAt: new Date('2026-03-05T00:00:00.000Z'),
            resetAt: null,
            isUsed: false,
            reference: 'FGT-hollow',
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            createdBy: null,
        };

        it('creates the reset request, stages the event in order, when there is no previous one', async () => {
            userRepository.findOneActiveByEmail.mockResolvedValue(baseUser);
            userPasswordRepository.findOneLatestByForgotPassword.mockResolvedValue(
                null
            );
            helperStringService.random.mockReturnValue('random-token');
            helperHashService.sha256Hash.mockReturnValue('hashed-token');
            helperStringService.fillPattern.mockReturnValue(
                'https://example.com/reset?token=random-token'
            );

            const stagedEvent: IActivityLogStagedEvent = {
                action: EnumActivityLogAction.userForgotPassword,
                metadata: {},
                onError: false,
                userId: null,
                createdBy: null,
                workspaceId: null,
            };
            activityLogDomain.prepare.mockReturnValue(stagedEvent);
            const callOrder: string[] = [];
            userPasswordRepository.createReplacingUnused.mockImplementation(
                async () => {
                    callOrder.push('createReplacingUnused');
                    return forgotPassword;
                }
            );
            activityLogDomain.stagePrepared.mockImplementation(() => {
                callOrder.push('stagePrepared');
            });
            notificationQueue.sendForgotPassword.mockImplementation(
                async () => {
                    callOrder.push('sendForgotPassword');
                }
            );

            await domain.forgotPassword('hollow@example.com');

            expect(
                userPasswordRepository.createReplacingUnused
            ).toHaveBeenCalledWith(
                'user-hollow',
                'hollow@example.com',
                expect.objectContaining({ reference: 'FGT-random-token' })
            );
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userForgotPassword,
                userId: 'user-hollow',
                createdBy: 'user-hollow',
            });
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                stagedEvent,
            ]);
            expect(notificationQueue.sendForgotPassword).toHaveBeenCalled();
            expect(callOrder).toEqual([
                'createReplacingUnused',
                'stagePrepared',
                'sendForgotPassword',
            ]);
        });

        it('sends again when the previous request is past its resend window', async () => {
            userRepository.findOneActiveByEmail.mockResolvedValue(baseUser);
            userPasswordRepository.findOneLatestByForgotPassword.mockResolvedValue(
                {
                    ...forgotPassword,
                    createdAt: new Date(now.getTime() - 60 * 60 * 1000),
                }
            );
            helperStringService.random.mockReturnValue('random-token');
            helperHashService.sha256Hash.mockReturnValue('hashed-token');
            helperStringService.fillPattern.mockReturnValue(
                'https://example.com/reset?token=random-token'
            );

            await domain.forgotPassword('hollow@example.com');

            expect(
                userPasswordRepository.createReplacingUnused
            ).toHaveBeenCalled();
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                event,
            ]);
        });

        it('throws UserNotFoundException when the user is missing', async () => {
            userRepository.findOneActiveByEmail.mockResolvedValue(null);

            const call = domain.forgotPassword('missing@example.com');

            await expect(call).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.notFound,
                statusCodeKey:
                    EnumUserStatusCodeError[EnumUserStatusCodeError.notFound],
                messagePath: 'user.error.notFound',
            });
        });

        it('throws UserForgotPasswordRequestLimitExceededException when resent too soon', async () => {
            userRepository.findOneActiveByEmail.mockResolvedValue(baseUser);
            userPasswordRepository.findOneLatestByForgotPassword.mockResolvedValue(
                {
                    ...forgotPassword,
                    createdAt: new Date(now.getTime() - 50_000),
                }
            );
            helperDateService.diff.mockImplementation((from, to) =>
                Duration.fromMillis(from.getTime() - to.getTime())
            );

            const call = domain.forgotPassword('hollow@example.com');

            await expect(call).rejects.toMatchObject({
                module: 'user',
                statusCode:
                    EnumUserStatusCodeError.forgotPasswordRequestLimitExceeded,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError
                            .forgotPasswordRequestLimitExceeded
                    ],
                messagePath: 'user.error.forgotPasswordRequestLimitExceeded',
                messageProperties: { minutes: 5 },
            });
        });

        it('rethrows an AppBaseException raised while creating the request', async () => {
            userRepository.findOneActiveByEmail.mockResolvedValue(baseUser);
            userPasswordRepository.findOneLatestByForgotPassword.mockResolvedValue(
                null
            );
            helperStringService.random.mockReturnValue('random-token');
            helperHashService.sha256Hash.mockReturnValue('hashed-token');
            helperStringService.fillPattern.mockReturnValue(
                'https://example.com/reset?token=random-token'
            );

            const error = new UserNotFoundException();
            userPasswordRepository.createReplacingUnused.mockRejectedValue(
                error
            );

            const call = domain.forgotPassword('hollow@example.com');

            await expect(call).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.notFound,
                statusCodeKey:
                    EnumUserStatusCodeError[EnumUserStatusCodeError.notFound],
                messagePath: 'user.error.notFound',
            });
            await expect(call).rejects.toBe(error);
        });

        it('wraps an unknown error raised while creating the request', async () => {
            userRepository.findOneActiveByEmail.mockResolvedValue(baseUser);
            userPasswordRepository.findOneLatestByForgotPassword.mockResolvedValue(
                null
            );
            helperStringService.random.mockReturnValue('random-token');
            helperHashService.sha256Hash.mockReturnValue('hashed-token');
            helperStringService.fillPattern.mockReturnValue(
                'https://example.com/reset?token=random-token'
            );

            const error = new Error('boom');
            userPasswordRepository.createReplacingUnused.mockRejectedValue(
                error
            );

            const call = domain.forgotPassword('hollow@example.com');

            await expect(call).rejects.toMatchObject({
                module: 'app',
                statusCode: EnumAppStatusCodeError.unknown,
                statusCodeKey:
                    EnumAppStatusCodeError[EnumAppStatusCodeError.unknown],
                messagePath: 'http.serverError.internalServerError',
                rawError: error,
            });
        });
    });

    describe('resetPassword', () => {
        const resetRecord = {
            id: 'forgot-hollow',
            userId: 'user-hollow',
            to: 'hollow@example.com',
            token: 'hashed-token',
            expiredAt: new Date('2026-03-05T00:00:00.000Z'),
            resetAt: null,
            isUsed: false,
            reference: 'FGT-hollow',
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            createdBy: null,
            user: {
                ...baseUser,
                twoFactor: { ...baseTwoFactor, enabled: false },
            },
        };
        const verifiedResult: IAuthTwoFactorVerifyResult = {
            isValid: true,
            method: EnumAuthTwoFactorMethod.code,
            newBackupCodes: null,
        };

        it('resets the password, commits, purges, and stages the event in order when two-factor is disabled', async () => {
            helperHashService.sha256Hash.mockReturnValue('hashed-token');
            userPasswordRepository.findOneActiveByForgotPasswordToken.mockResolvedValue(
                resetRecord
            );
            passwordHistoryDomain.getActiveByUser.mockResolvedValue([]);
            authPasswordUtil.checkPasswordPeriod.mockReturnValue(null);
            authPasswordUtil.createPassword.mockReturnValue(password);
            const stagedEvent: IActivityLogStagedEvent = {
                action: EnumActivityLogAction.userResetPassword,
                metadata: {},
                onError: false,
                userId: null,
                createdBy: null,
                workspaceId: null,
            };
            activityLogDomain.prepare.mockReturnValue(stagedEvent);
            const callOrder: string[] = [];
            userPasswordRepository.markUsedInTx.mockImplementation(async () => {
                callOrder.push('markUsedInTx');
                return resetRecord;
            });
            sessionDomain.purgeLoginsByUser.mockImplementation(async () => {
                callOrder.push('purgeLoginsByUser');
            });
            activityLogDomain.stagePrepared.mockImplementation(() => {
                callOrder.push('stagePrepared');
            });
            notificationQueue.sendResetPassword.mockImplementation(async () => {
                callOrder.push('sendResetPassword');
            });

            await domain.resetPassword({
                newPassword: 'new-password',
                token: 'raw-token',
                method: null,
                code: null,
                backupCode: null,
            });

            expect(userDomain.updatePasswordInTx).toHaveBeenCalledWith(
                tx,
                resetRecord.userId,
                password,
                resetRecord.userId
            );
            expect(userPasswordRepository.markUsedInTx).toHaveBeenCalledWith(
                tx,
                resetRecord.id,
                password.passwordCreated
            );
            expect(sessionDomain.purgeLoginsByUser).toHaveBeenCalledWith(
                resetRecord.userId
            );
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userResetPassword,
                userId: resetRecord.userId,
                createdBy: resetRecord.userId,
            });
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                stagedEvent,
            ]);
            expect(notificationQueue.sendResetPassword).toHaveBeenCalledWith(
                resetRecord.userId
            );
            expect(callOrder).toEqual([
                'markUsedInTx',
                'purgeLoginsByUser',
                'stagePrepared',
                'sendResetPassword',
            ]);
        });

        it('verifies two-factor, records it in the same transaction, and stages both events when enabled', async () => {
            helperHashService.sha256Hash.mockReturnValue('hashed-token');
            userPasswordRepository.findOneActiveByForgotPasswordToken.mockResolvedValue(
                {
                    ...resetRecord,
                    user: {
                        ...baseUser,
                        twoFactor: { ...baseTwoFactor, enabled: true },
                    },
                }
            );
            passwordHistoryDomain.getActiveByUser.mockResolvedValue([]);
            authPasswordUtil.checkPasswordPeriod.mockReturnValue(null);
            authPasswordUtil.createPassword.mockReturnValue(password);
            userLoginDomain.handleTwoFactorValidation.mockResolvedValue(
                verifiedResult
            );
            const resetPasswordEvent: IActivityLogStagedEvent = {
                action: EnumActivityLogAction.userResetPassword,
                metadata: {},
                onError: false,
                userId: null,
                createdBy: null,
                workspaceId: null,
            };
            const verifyTwoFactorEvent: IActivityLogStagedEvent = {
                action: EnumActivityLogAction.userVerifyTwoFactor,
                metadata: {},
                onError: false,
                userId: null,
                createdBy: null,
                workspaceId: null,
            };
            activityLogDomain.prepare
                .mockReturnValueOnce(resetPasswordEvent)
                .mockReturnValueOnce(verifyTwoFactorEvent);

            await domain.resetPassword({
                newPassword: 'new-password',
                token: 'raw-token',
                code: '123456',
                method: EnumAuthTwoFactorMethod.code,
                backupCode: null,
            });

            expect(
                userLoginDomain.recordTwoFactorVerificationInTx
            ).toHaveBeenCalledWith(
                tx,
                expect.objectContaining({ id: resetRecord.userId }),
                verifiedResult
            );
            expect(activityLogDomain.prepare).toHaveBeenNthCalledWith(2, {
                action: EnumActivityLogAction.userVerifyTwoFactor,
                userId: resetRecord.userId,
                createdBy: resetRecord.userId,
            });
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                resetPasswordEvent,
                verifyTwoFactorEvent,
            ]);
        });

        it('throws UserNotFoundException when the token is unknown', async () => {
            helperHashService.sha256Hash.mockReturnValue('hashed-token');
            userPasswordRepository.findOneActiveByForgotPasswordToken.mockResolvedValue(
                null
            );

            const call = domain.resetPassword({
                newPassword: 'new-password',
                token: 'raw-token',
                method: null,
                code: null,
                backupCode: null,
            });

            await expect(call).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.notFound,
                statusCodeKey:
                    EnumUserStatusCodeError[EnumUserStatusCodeError.notFound],
                messagePath: 'user.error.notFound',
            });
        });

        it('throws UserPasswordMustNewException when the password was used recently', async () => {
            helperHashService.sha256Hash.mockReturnValue('hashed-token');
            userPasswordRepository.findOneActiveByForgotPasswordToken.mockResolvedValue(
                resetRecord
            );
            passwordHistoryDomain.getActiveByUser.mockResolvedValue([]);
            const history: PasswordHistory = {
                id: 'history-hollow',
                userId: 'user-hollow',
                password: 'hashed-old',
                type: EnumPasswordHistoryType.forgot,
                expiredAt: new Date('2026-04-01T00:00:00.000Z'),
                createdAt: new Date('2026-01-01T00:00:00.000Z'),
                createdBy: null,
            };
            authPasswordUtil.checkPasswordPeriod.mockReturnValue(history);
            authPasswordUtil.getPasswordPeriodInDays.mockReturnValue(90);

            const call = domain.resetPassword({
                newPassword: 'new-password',
                token: 'raw-token',
                method: null,
                code: null,
                backupCode: null,
            });

            await expect(call).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.passwordMustNew,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.passwordMustNew
                    ],
                messagePath: 'user.error.passwordMustNew',
                messageProperties: { period: 90 },
            });
        });

        it('rethrows an AppBaseException raised inside the transaction', async () => {
            helperHashService.sha256Hash.mockReturnValue('hashed-token');
            userPasswordRepository.findOneActiveByForgotPasswordToken.mockResolvedValue(
                resetRecord
            );
            passwordHistoryDomain.getActiveByUser.mockResolvedValue([]);
            authPasswordUtil.checkPasswordPeriod.mockReturnValue(null);
            authPasswordUtil.createPassword.mockReturnValue(password);
            const error = new UserNotFoundException();
            databaseService.withTransaction.mockRejectedValueOnce(error);

            const call = domain.resetPassword({
                newPassword: 'new-password',
                token: 'raw-token',
                method: null,
                code: null,
                backupCode: null,
            });

            await expect(call).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.notFound,
                statusCodeKey:
                    EnumUserStatusCodeError[EnumUserStatusCodeError.notFound],
                messagePath: 'user.error.notFound',
            });
            await expect(call).rejects.toBe(error);
        });

        it('wraps an unknown error raised inside the transaction', async () => {
            helperHashService.sha256Hash.mockReturnValue('hashed-token');
            userPasswordRepository.findOneActiveByForgotPasswordToken.mockResolvedValue(
                resetRecord
            );
            passwordHistoryDomain.getActiveByUser.mockResolvedValue([]);
            authPasswordUtil.checkPasswordPeriod.mockReturnValue(null);
            authPasswordUtil.createPassword.mockReturnValue(password);
            const error = new Error('boom');
            databaseService.withTransaction.mockRejectedValueOnce(error);

            const call = domain.resetPassword({
                newPassword: 'new-password',
                token: 'raw-token',
                method: null,
                code: null,
                backupCode: null,
            });

            await expect(call).rejects.toMatchObject({
                module: 'app',
                statusCode: EnumAppStatusCodeError.unknown,
                statusCodeKey:
                    EnumAppStatusCodeError[EnumAppStatusCodeError.unknown],
                messagePath: 'http.serverError.internalServerError',
                rawError: error,
            });
        });
    });

    describe('assertForgotPasswordAllowed', () => {
        it('delegates to the feature-flag domain', async () => {
            await domain['assertForgotPasswordAllowed']();

            expect(
                featureFlagDomain.validateFeatureFlagMetadata
            ).toHaveBeenCalledWith('changePassword', 'forgotAllowed');
        });
    });
});
