import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
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
    NotificationUserSetting,
    PasswordHistory,
    TwoFactor,
    User,
} from '@generated/prisma-client/client';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import type { IActivityLogStaged } from '@modules/activity-log/interfaces/activity-log.interface';
import { EnumAuthTwoFactorMethod } from '@modules/auth/enums/auth.enum';
import type { IAuthPassword } from '@modules/auth/interfaces/auth.interface';
import { AuthPasswordUtil } from '@modules/auth/utils/auth.password.util';
import { DeviceDomain } from '@modules/device/domains/device.domain';
import { FeatureFlagDomain } from '@modules/feature-flag/domains/feature-flag.domain';
import { NotificationDomain } from '@modules/notification/domains/notification.domain';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import type { INotificationRecipient } from '@modules/notification/interfaces/notification.interface';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import { PasswordHistoryDomain } from '@modules/password-history/domains/password-history.domain';
import { RoleDomain } from '@modules/role/domains/role.domain';
import { SessionDomain } from '@modules/session/domains/session.domain';
import { SessionQueue } from '@modules/session/queues/session.queue';
import type { ISessionRef } from '@modules/session/interfaces/session.interface';
import { UserDomain } from '@modules/user/domains/user.domain';
import { UserPasswordDomain } from '@modules/user/domains/user.password.domain';
import { UserTwoFactorDomain } from '@modules/user/domains/user.two-factor.domain';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { UserPasswordAttemptMaxException } from '@modules/user/exceptions/user.password-attempt-max.exception';
import { UserPasswordNotMatchException } from '@modules/user/exceptions/user.password-not-match.exception';
import { UserTokenInvalidException } from '@modules/user/exceptions/user.token-invalid.exception';
import { UserPasswordHttpService } from '@modules/user/services/http/user.password.http.service';
import { UserUtil } from '@modules/user/utils/user.util';
import type { UserChangePasswordRequestDto } from '@modules/user/dtos/request/user.change-password.request.dto';
import type { UserForgotPasswordRequestDto } from '@modules/user/dtos/request/user.forgot-password.request.dto';
import type { UserForgotPasswordResetRequestDto } from '@modules/user/dtos/request/user.forgot-password-reset.request.dto';
import type {
    IUser,
    IUserForgotPassword,
    IUserForgotPasswordCreate,
    IUserTwoFactorEnabled,
    IUserTwoFactorVerifyResult,
} from '@modules/user/interfaces/user.interface';
import { TestRecipient } from '@test/unit/helpers/test.unit.notification-push.helper';

describe('UserPasswordHttpService', () => {
    const userDomain: MockProxy<UserDomain> = mock<UserDomain>();
    const userPasswordDomain: MockProxy<UserPasswordDomain> =
        mock<UserPasswordDomain>();
    const userTwoFactorDomain: MockProxy<UserTwoFactorDomain> =
        mock<UserTwoFactorDomain>();
    const passwordHistoryDomain: MockProxy<PasswordHistoryDomain> =
        mock<PasswordHistoryDomain>();
    const sessionDomain: MockProxy<SessionDomain> = mock<SessionDomain>();
    const deviceDomain: MockProxy<DeviceDomain> = mock<DeviceDomain>();
    const notificationDomain: MockProxy<NotificationDomain> =
        mock<NotificationDomain>();
    const authPasswordUtil: MockProxy<AuthPasswordUtil> =
        mock<AuthPasswordUtil>();
    const roleDomain: MockProxy<RoleDomain> = mock<RoleDomain>();
    const featureFlagDomain: MockProxy<FeatureFlagDomain> =
        mock<FeatureFlagDomain>();
    const activityLogDomain: MockProxy<ActivityLogDomain> =
        mock<ActivityLogDomain>();
    const sessionQueue: MockProxy<SessionQueue> = mock<SessionQueue>();
    const notificationQueue: MockProxy<NotificationQueue> =
        mock<NotificationQueue>();
    const notificationUtil: MockProxy<NotificationUtil> =
        mock<NotificationUtil>();
    const userUtil: MockProxy<UserUtil> = mock<UserUtil>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();

    let service: UserPasswordHttpService;

    const user: IUser = {
        id: 'user-linden',
        name: 'Linden Frost',
        username: 'lindenFrost',
        isVerified: true,
        verifiedAt: new Date('2026-01-01T00:00:00.000Z'),
        email: 'linden@example.com',
        roleId: 'role-linden',
        password: 'hashed-password',
        passwordExpired: new Date('2026-06-01T00:00:00.000Z'),
        passwordCreated: new Date('2026-01-01T00:00:00.000Z'),
        passwordAttempt: 0,
        signUpAt: new Date('2026-01-01T00:00:00.000Z'),
        signUpFrom: EnumUserSignUpFrom.website,
        signUpWith: EnumUserSignUpWith.credential,
        status: EnumUserStatus.active,
        gender: null,
        countryId: 'country-linden',
        lastLoginAt: null,
        lastIPAddress: null,
        lastLoginFrom: EnumUserLoginFrom.website,
        lastLoginWith: EnumUserLoginWith.credential,
        lastWorkspaceId: null,
        lastWorkspaceChangedAt: null,
        photo: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
        deletedAt: null,
        deletedBy: null,
        role: {
            id: 'role-linden',
            name: 'user',
            description: null,
            type: EnumRoleType.user,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            createdBy: null,
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedBy: null,
            policies: [],
        },
        twoFactor: null,
    };
    const admin: IUser = {
        ...user,
        id: 'admin-linden',
        role: { ...user.role, type: EnumRoleType.admin },
    };
    const password: IAuthPassword = {
        passwordHash: 'hashed',
        passwordExpired: new Date('2026-06-01T00:00:00.000Z'),
        passwordCreated: new Date('2026-01-01T00:00:00.000Z'),
        passwordPeriodExpired: new Date('2026-04-01T00:00:00.000Z'),
    };
    const activityLog: IActivityLogStaged = {
        action: EnumActivityLogAction.userChangePassword,
        metadata: {},
        userId: null,
        createdBy: null,
        workspaceId: null,
    };
    const recipient: INotificationRecipient = {
        ...TestRecipient,
        userId: user.id,
    };
    const revoked: ISessionRef[] = [{ id: 'session-one' }];
    const tx = {} as IDatabaseTransactionClient;
    const now = new Date('2026-03-05T00:00:00.000Z');
    const notificationTokens = ['token-linden'];
    const settings = [
        { channel: 'push' },
    ] as unknown as NotificationUserSetting[];
    const twoFactorRow: TwoFactor = {
        id: 'two-factor-linden',
        userId: 'user-linden',
        secret: 'encrypted-secret',
        pendingSecret: null,
        backupCodes: ['hash-one'],
        enabled: true,
        requiredSetup: false,
        confirmedAt: new Date('2026-01-05T00:00:00.000Z'),
        lastUsedAt: null,
        attempt: 0,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
    };
    const twoFactorUser: IUser = { ...user, twoFactor: twoFactorRow };
    const passwordHistory = { id: 'history-linden' } as PasswordHistory;
    const twoFactorVerified: IUserTwoFactorVerifyResult = {
        method: EnumAuthTwoFactorMethod.code,
        newBackupCodes: null,
    };
    const updatedRow = {
        id: 'user-linden',
        updatedAt: new Date('2026-03-01T00:00:00.000Z'),
    } as User;
    const forgot: IUserForgotPasswordCreate = {
        reference: 'FGT-linden',
        expiredAt: new Date('2026-03-05T00:00:00.000Z'),
        token: 'raw-token',
        hashedToken: 'hashed-token',
        expiredInMinutes: 15,
        resendInMinutes: 5,
        link: 'https://example.com/reset?token=raw-token',
    };
    const resetRow = {
        id: 'forgot-linden',
        userId: 'user-linden',
        user,
    } as IUserForgotPassword;

    beforeEach(async () => {
        vi.resetAllMocks();
        activityLogDomain.prepare.mockReturnValue(activityLog);
        helperDateService.create.mockReturnValue(now);
        helperDateService.formatToIso.mockReturnValue(
            '2026-03-01T00:00:00.000Z'
        );
        databaseService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );
        deviceDomain.getNotificationTokens.mockResolvedValue(
            notificationTokens
        );
        notificationDomain.getListUserSetting.mockResolvedValue(settings);
        notificationUtil.mapRecipient.mockReturnValue(recipient);
        userTwoFactorDomain.verify.mockResolvedValue(twoFactorVerified);
        userUtil.hasPassword.mockReturnValue(true);
        userUtil.isTwoFactorEnabled.mockImplementation(
            (candidate): candidate is IUserTwoFactorEnabled =>
                candidate.twoFactor?.enabled === true
        );

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserPasswordHttpService,
                { provide: UserDomain, useValue: userDomain },
                { provide: UserPasswordDomain, useValue: userPasswordDomain },
                {
                    provide: UserTwoFactorDomain,
                    useValue: userTwoFactorDomain,
                },
                {
                    provide: PasswordHistoryDomain,
                    useValue: passwordHistoryDomain,
                },
                { provide: SessionDomain, useValue: sessionDomain },
                { provide: DeviceDomain, useValue: deviceDomain },
                {
                    provide: NotificationDomain,
                    useValue: notificationDomain,
                },
                { provide: AuthPasswordUtil, useValue: authPasswordUtil },
                { provide: RoleDomain, useValue: roleDomain },
                { provide: FeatureFlagDomain, useValue: featureFlagDomain },
                { provide: ActivityLogDomain, useValue: activityLogDomain },
                { provide: SessionQueue, useValue: sessionQueue },
                { provide: NotificationQueue, useValue: notificationQueue },
                { provide: NotificationUtil, useValue: notificationUtil },
                { provide: UserUtil, useValue: userUtil },
                { provide: DatabaseService, useValue: databaseService },
                { provide: DatabaseUtil, useValue: databaseUtil },
                { provide: HelperDateService, useValue: helperDateService },
            ],
        }).compile();
        service = module.get(UserPasswordHttpService);
    });

    describe('updatePasswordByAdmin', () => {
        beforeEach(() => {
            userDomain.getOneWithRole.mockResolvedValue(user);
            userPasswordDomain.createTemporaryPassword.mockResolvedValue({
                password,
                passwordString: 'temp-password',
            });
            userUtil.mapActivityLogActorMetadata.mockReturnValue({
                targetUserId: 'user-linden',
            });
            userUtil.mapActivityLogTargetMetadata.mockReturnValue({
                actorUserId: 'admin-linden',
            });
        });

        it('gates the actor rank, writes the password, history, and revoke on one transaction, purges after commit, notifies, and stages both rows', async () => {
            const calls: string[] = [];
            databaseService.withTransaction.mockImplementation(async fn => {
                calls.push('begin');
                const value = await fn(tx);
                calls.push('commit');

                return value as never;
            });
            userDomain.updatePasswordInTx.mockImplementation(async () => {
                calls.push('updatePassword');

                return updatedRow;
            });
            passwordHistoryDomain.createInTx.mockImplementation(async () => {
                calls.push('createHistory');

                return passwordHistory;
            });
            sessionDomain.revokeActiveByUserInTx.mockImplementation(
                async () => {
                    calls.push('revokeSessions');

                    return revoked;
                }
            );
            sessionQueue.purgeLogins.mockImplementation(async () => {
                calls.push('purge');
            });

            await expect(
                service.updatePasswordByAdmin('user-linden', admin)
            ).resolves.toEqual({});

            expect(userDomain.assertNotSelf).toHaveBeenCalledWith(
                'user-linden',
                'admin-linden'
            );
            expect(userDomain.getOneWithRole).toHaveBeenCalledWith(
                'user-linden'
            );
            expect(roleDomain.assertActorOutranks).toHaveBeenCalledWith(
                EnumRoleType.admin,
                EnumRoleType.user
            );
            expect(notificationUtil.mapRecipient).toHaveBeenCalledWith(
                user,
                EnumNotificationKind.temporaryPasswordByAdmin,
                ['token-linden'],
                settings
            );
            expect(userDomain.updatePasswordInTx).toHaveBeenCalledWith(
                tx,
                'user-linden',
                password,
                'admin-linden'
            );
            expect(passwordHistoryDomain.createInTx).toHaveBeenCalledWith(
                tx,
                'user-linden',
                'hashed',
                EnumPasswordHistoryType.admin,
                password.passwordPeriodExpired,
                password.passwordCreated,
                'admin-linden'
            );
            expect(sessionDomain.revokeActiveByUserInTx).toHaveBeenCalledWith(
                tx,
                'user-linden',
                'admin-linden',
                password.passwordCreated
            );
            expect(calls).toEqual([
                'begin',
                'updatePassword',
                'createHistory',
                'revokeSessions',
                'commit',
                'purge',
            ]);
            expect(sessionQueue.purgeLogins).toHaveBeenCalledWith(
                'user-linden',
                revoked
            );
            expect(
                notificationQueue.sendTemporaryPasswordByAdmin
            ).toHaveBeenCalledWith(
                recipient,
                {
                    password: 'temp-password',
                    passwordCreatedAt: '2026-03-01T00:00:00.000Z',
                    passwordExpiredAt: '2026-03-01T00:00:00.000Z',
                },
                'admin-linden',
                'history-linden'
            );
            expect(activityLogDomain.prepare).toHaveBeenNthCalledWith(1, {
                action: EnumActivityLogAction.adminUserUpdatePassword,
                metadata: { targetUserId: 'user-linden' },
            });
            expect(activityLogDomain.prepare).toHaveBeenNthCalledWith(2, {
                action: EnumActivityLogAction.userUpdatePasswordByAdmin,
                userId: 'user-linden',
                createdBy: 'admin-linden',
                metadata: { actorUserId: 'admin-linden' },
            });
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                activityLog,
                activityLog,
            ]);
        });

        it('stops at the rank gate before the blocked gate', async () => {
            roleDomain.assertActorOutranks.mockImplementation(() => {
                throw new Error('rank');
            });

            await expect(
                service.updatePasswordByAdmin('user-linden', admin)
            ).rejects.toThrow('rank');
            expect(userDomain.assertUnblocked).not.toHaveBeenCalled();
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('writes nothing when the recipient read rejects', async () => {
            deviceDomain.getNotificationTokens.mockRejectedValue(
                new Error('read')
            );

            await expect(
                service.updatePasswordByAdmin('user-linden', admin)
            ).rejects.toThrow('read');
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
            expect(sessionQueue.purgeLogins).not.toHaveBeenCalled();
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
        });

        it('purges, notifies, and stages nothing when the transaction fails', async () => {
            const cause = new Error('database exploded');
            databaseService.withTransaction.mockRejectedValue(cause);

            await expect(
                service.updatePasswordByAdmin('user-linden', admin)
            ).rejects.toBe(cause);
            expect(sessionQueue.purgeLogins).not.toHaveBeenCalled();
            expect(
                notificationQueue.sendTemporaryPasswordByAdmin
            ).not.toHaveBeenCalled();
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
        });
    });

    describe('changePassword', () => {
        const dto: UserChangePasswordRequestDto = {
            newPassword: 'new-password',
            oldPassword: 'old-password',
        };

        beforeEach(() => {
            authPasswordUtil.createPassword.mockResolvedValue(password);
            userDomain.updatePasswordInTx.mockResolvedValue(updatedRow);
            passwordHistoryDomain.createInTx.mockResolvedValue(passwordHistory);
            sessionDomain.revokeActiveByUserInTx.mockResolvedValue(revoked);
            userPasswordDomain.incrementPasswordAttempt.mockResolvedValue(true);
        });

        it('verifies the old password and history, hashes, writes on one transaction, purges after commit, notifies, and stages the row', async () => {
            const calls: string[] = [];
            databaseService.withTransaction.mockImplementation(async fn => {
                calls.push('begin');
                const value = await fn(tx);
                calls.push('commit');

                return value as never;
            });
            userDomain.updatePasswordInTx.mockImplementation(async () => {
                calls.push('updatePassword');

                return updatedRow;
            });
            passwordHistoryDomain.createInTx.mockImplementation(async () => {
                calls.push('createHistory');

                return passwordHistory;
            });
            sessionDomain.revokeActiveByUserInTx.mockImplementation(
                async () => {
                    calls.push('revokeSessions');

                    return revoked;
                }
            );
            sessionQueue.purgeLogins.mockImplementation(async () => {
                calls.push('purge');
            });

            await expect(service.changePassword(user, dto)).resolves.toEqual(
                {}
            );

            expect(
                userPasswordDomain.incrementPasswordAttempt
            ).toHaveBeenCalledWith('user-linden');
            expect(
                userPasswordDomain.assertAttemptCounted
            ).toHaveBeenCalledWith(true);
            expect(
                userPasswordDomain.assertOldPasswordMatch
            ).toHaveBeenCalledWith(user, 'old-password');
            expect(
                userPasswordDomain.resetPasswordAttempt
            ).toHaveBeenCalledWith('user-linden');
            expect(passwordHistoryDomain.assertNew).toHaveBeenCalledWith(
                'user-linden',
                'new-password'
            );
            expect(
                userPasswordDomain.assertOldPasswordMatch
            ).toHaveBeenCalledBefore(passwordHistoryDomain.assertNew);
            expect(sessionQueue.purgeLogins).toHaveBeenCalledTimes(1);
            expect(
                userDomain.deactivateForMaxPasswordAttemptInTx
            ).not.toHaveBeenCalled();
            expect(passwordHistoryDomain.assertNew).toHaveBeenCalledBefore(
                authPasswordUtil.createPassword
            );
            expect(authPasswordUtil.createPassword).toHaveBeenCalledWith(
                'new-password'
            );
            expect(userTwoFactorDomain.verify).not.toHaveBeenCalled();
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userChangePassword,
            });
            expect(notificationUtil.mapRecipient).toHaveBeenCalledWith(
                user,
                EnumNotificationKind.changePassword,
                ['token-linden'],
                settings
            );
            expect(userDomain.updatePasswordInTx).toHaveBeenCalledWith(
                tx,
                'user-linden',
                password,
                'user-linden'
            );
            expect(passwordHistoryDomain.createInTx).toHaveBeenCalledWith(
                tx,
                'user-linden',
                'hashed',
                EnumPasswordHistoryType.profile,
                password.passwordPeriodExpired,
                password.passwordCreated,
                'user-linden'
            );
            expect(sessionDomain.revokeActiveByUserInTx).toHaveBeenCalledWith(
                tx,
                'user-linden',
                'user-linden',
                password.passwordCreated
            );
            expect(
                userTwoFactorDomain.recordVerificationInTx
            ).not.toHaveBeenCalled();
            expect(calls).toEqual([
                'begin',
                'updatePassword',
                'createHistory',
                'revokeSessions',
                'commit',
                'purge',
            ]);
            expect(sessionQueue.purgeLogins).toHaveBeenCalledWith(
                'user-linden',
                revoked
            );
            expect(notificationQueue.sendChangePassword).toHaveBeenCalledWith(
                recipient,
                'history-linden'
            );
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                activityLog,
            ]);
        });

        it('skips the old password and history checks for an account with no password', async () => {
            userUtil.hasPassword.mockReturnValue(false);

            await service.changePassword({ ...user, password: null }, dto);

            expect(
                userPasswordDomain.incrementPasswordAttempt
            ).not.toHaveBeenCalled();
            expect(
                userPasswordDomain.assertOldPasswordMatch
            ).not.toHaveBeenCalled();
            expect(
                userPasswordDomain.resetPasswordAttempt
            ).not.toHaveBeenCalled();
            expect(passwordHistoryDomain.assertNew).not.toHaveBeenCalled();
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
        });

        it('verifies two-factor, records the verification on the transaction, and stages the verify row when two-factor is enabled', async () => {
            await service.changePassword(twoFactorUser, {
                ...dto,
                code: '123456',
                method: EnumAuthTwoFactorMethod.code,
            });

            expect(userTwoFactorDomain.verify).toHaveBeenCalledWith(
                twoFactorUser,
                {
                    method: EnumAuthTwoFactorMethod.code,
                    code: '123456',
                    backupCode: null,
                }
            );
            expect(
                userTwoFactorDomain.recordVerificationInTx
            ).toHaveBeenCalledWith(tx, twoFactorUser, twoFactorVerified);
            expect(userTwoFactorDomain.verify).toHaveBeenCalledBefore(
                authPasswordUtil.createPassword
            );
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userVerifyTwoFactor,
                userId: 'user-linden',
                createdBy: 'user-linden',
            });
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                activityLog,
                activityLog,
            ]);
        });

        it('writes nothing when the two-factor check rejects', async () => {
            const failure = new Error('invalid');
            userTwoFactorDomain.verify.mockRejectedValue(failure);

            await expect(
                service.changePassword(twoFactorUser, {
                    ...dto,
                    code: '000000',
                    method: EnumAuthTwoFactorMethod.code,
                })
            ).rejects.toBe(failure);
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
            expect(sessionQueue.purgeLogins).not.toHaveBeenCalled();
        });

        it('writes nothing when the old password check rejects', async () => {
            const failure = new Error('mismatch');
            userPasswordDomain.assertOldPasswordMatch.mockRejectedValue(
                failure
            );

            await expect(service.changePassword(user, dto)).rejects.toBe(
                failure
            );
            expect(passwordHistoryDomain.assertNew).not.toHaveBeenCalled();
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('throws UserPasswordNotMatchException on a wrong password under the max and keeps the attempt', async () => {
            userPasswordDomain.assertOldPasswordMatch.mockRejectedValue(
                new UserPasswordNotMatchException()
            );

            await expect(
                service.changePassword(user, dto)
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.passwordNotMatch,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.passwordNotMatch
                    ],
                messagePath: 'user.error.passwordNotMatch',
            });
            expect(
                userPasswordDomain.resetPasswordAttempt
            ).not.toHaveBeenCalled();
            expect(
                userDomain.deactivateForMaxPasswordAttemptInTx
            ).not.toHaveBeenCalled();
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
        });

        it('deactivates the user, revokes sessions and devices in one transaction, stages both rows, purges after commit, and throws UserPasswordAttemptMaxException at the max attempt', async () => {
            const calls: string[] = [];
            userPasswordDomain.incrementPasswordAttempt.mockResolvedValue(
                false
            );
            userPasswordDomain.assertAttemptCounted.mockImplementation(() => {
                calls.push('assert');

                throw new UserPasswordAttemptMaxException();
            });
            databaseService.withTransaction.mockImplementation(async fn => {
                calls.push('begin');
                const value = await fn(tx);
                calls.push('commit');

                return value as never;
            });
            userDomain.deactivateForMaxPasswordAttemptInTx.mockImplementation(
                async () => {
                    calls.push('deactivate');
                }
            );
            sessionDomain.revokeActiveByUserInTx.mockImplementation(
                async () => {
                    calls.push('revokeSessions');

                    return revoked;
                }
            );
            deviceDomain.revokeAllByUserInTx.mockImplementation(async () => {
                calls.push('revokeDevices');
            });
            sessionQueue.purgeLogins.mockImplementation(async () => {
                calls.push('purge');
            });
            activityLogDomain.stagePrepared.mockImplementation(() => {
                calls.push('stage');
            });

            await expect(
                service.changePassword(user, dto)
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.passwordAttemptMax,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.passwordAttemptMax
                    ],
                messagePath: 'user.error.passwordAttemptMax',
            });

            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userRevokeAllSessions,
                userId: 'user-linden',
                createdBy: 'user-linden',
            });
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userReachMaxPasswordAttempt,
                userId: 'user-linden',
                createdBy: 'user-linden',
            });
            expect(
                userDomain.deactivateForMaxPasswordAttemptInTx
            ).toHaveBeenCalledWith(tx, 'user-linden');
            expect(sessionDomain.revokeActiveByUserInTx).toHaveBeenCalledWith(
                tx,
                'user-linden',
                'user-linden',
                now
            );
            expect(deviceDomain.revokeAllByUserInTx).toHaveBeenCalledWith(
                tx,
                'user-linden',
                'user-linden',
                now
            );
            expect(sessionQueue.purgeLogins).toHaveBeenCalledWith(
                'user-linden',
                revoked
            );
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                activityLog,
                activityLog,
            ]);
            expect(calls).toEqual([
                'begin',
                'deactivate',
                'revokeSessions',
                'revokeDevices',
                'commit',
                'purge',
                'stage',
                'assert',
            ]);
            expect(
                userPasswordDomain.assertOldPasswordMatch
            ).not.toHaveBeenCalled();
            expect(userDomain.updatePasswordInTx).not.toHaveBeenCalled();
        });

        it('throws UserPasswordAttemptMaxException when the lockout write conflicts', async () => {
            const conflict = new Error('write conflict');
            userPasswordDomain.incrementPasswordAttempt.mockResolvedValue(
                false
            );
            databaseService.withTransaction.mockRejectedValue(conflict);
            databaseUtil.toException.mockReturnValue(
                new DatabaseWriteConflictException()
            );

            await expect(
                service.changePassword(user, dto)
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.passwordAttemptMax,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.passwordAttemptMax
                    ],
                messagePath: 'user.error.passwordAttemptMax',
            });
            expect(databaseUtil.toException).toHaveBeenCalledWith(conflict);
            expect(sessionQueue.purgeLogins).not.toHaveBeenCalled();
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
        });

        it('writes nothing when the recipient read rejects', async () => {
            deviceDomain.getNotificationTokens.mockRejectedValue(
                new Error('read')
            );

            await expect(service.changePassword(user, dto)).rejects.toThrow(
                'read'
            );
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
            expect(sessionQueue.purgeLogins).not.toHaveBeenCalled();
        });

        it('purges, notifies, and stages nothing when the transaction fails', async () => {
            const cause = new Error('database exploded');
            databaseService.withTransaction.mockRejectedValue(cause);

            await expect(service.changePassword(user, dto)).rejects.toBe(cause);
            expect(sessionQueue.purgeLogins).not.toHaveBeenCalled();
            expect(notificationQueue.sendChangePassword).not.toHaveBeenCalled();
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
        });
    });

    describe('forgotPassword', () => {
        const dto: UserForgotPasswordRequestDto = {
            email: 'linden@example.com',
        };

        beforeEach(() => {
            userPasswordDomain.prepareForgotPassword.mockResolvedValue({
                user,
                forgot,
            });
        });

        it('gates the flag, creates the request, stages the row, then notifies', async () => {
            const calls: string[] = [];
            userPasswordDomain.createForgotPassword.mockImplementation(
                async () => {
                    calls.push('create');
                }
            );
            activityLogDomain.stagePrepared.mockImplementation(() => {
                calls.push('stage');
            });
            notificationQueue.sendForgotPassword.mockImplementation(
                async () => {
                    calls.push('notify');
                }
            );

            await expect(service.forgotPassword(dto)).resolves.toEqual({});

            expect(
                featureFlagDomain.validateFeatureFlagMetadata
            ).toHaveBeenCalledWith('changePassword', 'forgotAllowed');
            expect(
                featureFlagDomain.validateFeatureFlagMetadata
            ).toHaveBeenCalledBefore(userPasswordDomain.prepareForgotPassword);
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userForgotPassword,
                userId: 'user-linden',
                createdBy: 'user-linden',
            });
            expect(notificationUtil.mapRecipient).toHaveBeenCalledWith(
                user,
                EnumNotificationKind.forgotPassword,
                ['token-linden'],
                settings
            );
            expect(
                userPasswordDomain.createForgotPassword
            ).toHaveBeenCalledWith('user-linden', 'linden@example.com', forgot);
            expect(notificationQueue.sendForgotPassword).toHaveBeenCalledWith(
                recipient,
                {
                    expiredAt: '2026-03-01T00:00:00.000Z',
                    link: forgot.link,
                    reference: 'FGT-linden',
                    expiredInMinutes: 15,
                    resendInMinutes: 5,
                }
            );
            expect(calls).toEqual(['create', 'stage', 'notify']);
        });

        it('creates nothing when the recipient read rejects', async () => {
            notificationDomain.getListUserSetting.mockRejectedValue(
                new Error('read')
            );

            await expect(service.forgotPassword(dto)).rejects.toThrow('read');
            expect(
                userPasswordDomain.createForgotPassword
            ).not.toHaveBeenCalled();
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
        });

        it('reads nothing when the flag gate rejects', async () => {
            featureFlagDomain.validateFeatureFlagMetadata.mockRejectedValue(
                new Error('flag')
            );

            await expect(service.forgotPassword(dto)).rejects.toThrow('flag');
            expect(
                userPasswordDomain.prepareForgotPassword
            ).not.toHaveBeenCalled();
        });
    });

    describe('resetPassword', () => {
        const dto: UserForgotPasswordResetRequestDto = {
            newPassword: 'new-password',
            token: 'raw-token',
        };
        const resetTwoFactorRow = {
            ...resetRow,
            user: twoFactorUser,
        } as IUserForgotPassword;

        beforeEach(() => {
            userPasswordDomain.getOneActiveReset.mockResolvedValue(resetRow);
            authPasswordUtil.createPassword.mockResolvedValue(password);
            userDomain.updatePasswordInTx.mockResolvedValue(updatedRow);
            passwordHistoryDomain.createInTx.mockResolvedValue(passwordHistory);
            sessionDomain.revokeActiveByUserInTx.mockResolvedValue(revoked);
        });

        it('gates the flag, checks the history, hashes, writes on one transaction, purges after commit, notifies, and stages', async () => {
            const calls: string[] = [];
            databaseService.withTransaction.mockImplementation(async fn => {
                calls.push('begin');
                const value = await fn(tx);
                calls.push('commit');

                return value as never;
            });
            userDomain.updatePasswordInTx.mockImplementation(async () => {
                calls.push('updatePassword');

                return updatedRow;
            });
            passwordHistoryDomain.createInTx.mockImplementation(async () => {
                calls.push('createHistory');

                return passwordHistory;
            });
            userPasswordDomain.markResetUsedInTx.mockImplementation(
                async () => {
                    calls.push('markResetUsed');
                }
            );
            sessionDomain.revokeActiveByUserInTx.mockImplementation(
                async () => {
                    calls.push('revokeSessions');

                    return revoked;
                }
            );
            sessionQueue.purgeLogins.mockImplementation(async () => {
                calls.push('purge');
            });

            await expect(service.resetPassword(dto)).resolves.toEqual({});

            expect(
                featureFlagDomain.validateFeatureFlagMetadata
            ).toHaveBeenCalledWith('changePassword', 'forgotAllowed');
            expect(userPasswordDomain.getOneActiveReset).toHaveBeenCalledWith(
                'raw-token'
            );
            expect(passwordHistoryDomain.assertNew).toHaveBeenCalledWith(
                'user-linden',
                'new-password'
            );
            expect(passwordHistoryDomain.assertNew).toHaveBeenCalledBefore(
                authPasswordUtil.createPassword
            );
            expect(userTwoFactorDomain.verify).not.toHaveBeenCalled();
            expect(authPasswordUtil.createPassword).toHaveBeenCalledWith(
                'new-password'
            );
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userResetPassword,
                userId: 'user-linden',
                createdBy: 'user-linden',
            });
            expect(notificationUtil.mapRecipient).toHaveBeenCalledWith(
                user,
                EnumNotificationKind.resetPassword,
                ['token-linden'],
                settings
            );
            expect(userDomain.updatePasswordInTx).toHaveBeenCalledWith(
                tx,
                'user-linden',
                password,
                'user-linden'
            );
            expect(passwordHistoryDomain.createInTx).toHaveBeenCalledWith(
                tx,
                'user-linden',
                'hashed',
                EnumPasswordHistoryType.forgot,
                password.passwordPeriodExpired,
                password.passwordCreated,
                'user-linden'
            );
            expect(userPasswordDomain.markResetUsedInTx).toHaveBeenCalledWith(
                tx,
                'forgot-linden',
                password.passwordCreated
            );
            expect(sessionDomain.revokeActiveByUserInTx).toHaveBeenCalledWith(
                tx,
                'user-linden',
                'user-linden',
                password.passwordCreated
            );
            expect(
                userTwoFactorDomain.recordVerificationInTx
            ).not.toHaveBeenCalled();
            expect(calls).toEqual([
                'begin',
                'updatePassword',
                'createHistory',
                'markResetUsed',
                'revokeSessions',
                'commit',
                'purge',
            ]);
            expect(sessionQueue.purgeLogins).toHaveBeenCalledWith(
                'user-linden',
                revoked
            );
            expect(notificationQueue.sendResetPassword).toHaveBeenCalledWith(
                recipient,
                'forgot-linden'
            );
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                activityLog,
            ]);
        });

        it('verifies two-factor of the reset user, records it on the transaction, and stages the verify row when two-factor is enabled', async () => {
            userPasswordDomain.getOneActiveReset.mockResolvedValue(
                resetTwoFactorRow
            );

            await service.resetPassword({
                ...dto,
                code: '123456',
                method: EnumAuthTwoFactorMethod.code,
            });

            expect(userTwoFactorDomain.verify).toHaveBeenCalledWith(
                twoFactorUser,
                {
                    method: EnumAuthTwoFactorMethod.code,
                    code: '123456',
                    backupCode: null,
                }
            );
            expect(
                userTwoFactorDomain.recordVerificationInTx
            ).toHaveBeenCalledWith(tx, twoFactorUser, twoFactorVerified);
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userVerifyTwoFactor,
                userId: 'user-linden',
                createdBy: 'user-linden',
            });
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                activityLog,
                activityLog,
            ]);
        });

        it('writes nothing when the history check rejects', async () => {
            const failure = new Error('must new');
            passwordHistoryDomain.assertNew.mockRejectedValue(failure);

            await expect(service.resetPassword(dto)).rejects.toBe(failure);
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
            expect(userTwoFactorDomain.verify).not.toHaveBeenCalled();
        });

        it('writes nothing when the recipient read rejects', async () => {
            deviceDomain.getNotificationTokens.mockRejectedValue(
                new Error('read')
            );

            await expect(service.resetPassword(dto)).rejects.toThrow('read');
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
            expect(sessionQueue.purgeLogins).not.toHaveBeenCalled();
        });

        it('rethrows a typed exception the transaction raises', async () => {
            const failure = new UserTokenInvalidException();
            databaseService.withTransaction.mockRejectedValue(failure);

            await expect(service.resetPassword(dto)).rejects.toBe(failure);
            expect(sessionQueue.purgeLogins).not.toHaveBeenCalled();
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
        });

        it('maps a write conflict to UserTokenInvalidException', async () => {
            const conflict = new Error('write conflict');
            databaseService.withTransaction.mockRejectedValue(conflict);
            databaseUtil.toException.mockReturnValue(
                new DatabaseWriteConflictException()
            );

            await expect(service.resetPassword(dto)).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.tokenInvalid,
                messagePath: 'user.error.verificationTokenInvalid',
            });
            expect(databaseUtil.toException).toHaveBeenCalledWith(conflict);
            expect(sessionQueue.purgeLogins).not.toHaveBeenCalled();
            expect(notificationQueue.sendResetPassword).not.toHaveBeenCalled();
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
        });

        it('wraps an unknown transaction failure in AppUnknownException', async () => {
            const cause = new Error('database exploded');
            databaseService.withTransaction.mockRejectedValue(cause);
            databaseUtil.toException.mockReturnValue(null);

            await expect(service.resetPassword(dto)).rejects.toMatchObject({
                rawError: cause,
            });
            expect(sessionQueue.purgeLogins).not.toHaveBeenCalled();
        });
    });
});
