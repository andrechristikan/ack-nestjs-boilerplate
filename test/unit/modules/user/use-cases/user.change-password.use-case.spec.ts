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
    PasswordHistory,
    TwoFactor,
    User,
} from '@generated/prisma-client/client';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import type { IActivityLogStaged } from '@modules/activity-log/interfaces/activity-log.interface';
import { EnumAuthTwoFactorMethod } from '@modules/auth/enums/auth.enum';
import { EnumAuthStatusCodeError } from '@modules/auth/enums/auth.status-code.enum';
import { AuthTwoFactorAttemptMaxException } from '@modules/auth/exceptions/auth.two-factor-attempt-max.exception';
import { AuthTwoFactorMethodRequiredException } from '@modules/auth/exceptions/auth.two-factor-method-required.exception';
import type { IAuthPassword } from '@modules/auth/interfaces/auth.interface';
import { AuthPasswordUtil } from '@modules/auth/utils/auth.password.util';
import { NotificationService } from '@modules/notification/services/notification.service';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import type { INotificationRecipient } from '@modules/notification/interfaces/notification.interface';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { PasswordHistoryService } from '@modules/password-history/services/password-history.service';
import { SessionService } from '@modules/session/services/session.service';
import { SessionQueue } from '@modules/session/queues/session.queue';
import type { ISessionRef } from '@modules/session/interfaces/session.interface';
import { UserService } from '@modules/user/services/user.service';
import { UserPasswordService } from '@modules/user/services/user.password.service';
import { UserAuthService } from '@modules/user/services/user.auth.service';
import { UserTwoFactorService } from '@modules/user/services/user.two-factor.service';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { UserPasswordAttemptMaxException } from '@modules/user/exceptions/user.password-attempt-max.exception';
import { UserPasswordExpiredException } from '@modules/user/exceptions/user.password-expired.exception';
import { UserPasswordNotMatchException } from '@modules/user/exceptions/user.password-not-match.exception';
import { UserUtil } from '@modules/user/utils/user.util';
import type { UserChangePasswordRequestDto } from '@modules/user/dtos/request/user.change-password.request.dto';
import type {
    IUser,
    IUserCredentialAttempt,
    IUserTwoFactorAttempt,
    IUserTwoFactorVerifyResult,
} from '@modules/user/interfaces/user.interface';
import { TestRecipient } from '@test/unit/helpers/test.unit.notification-push.helper';
import { UserChangePasswordUseCase } from '@modules/user/use-cases/user.change-password.use-case';

describe('UserChangePasswordUseCase', () => {
    const userService: MockProxy<UserService> = mock<UserService>();
    const userPasswordService: MockProxy<UserPasswordService> =
        mock<UserPasswordService>();
    const userAuthService: MockProxy<UserAuthService> = mock<UserAuthService>();
    const userTwoFactorService: MockProxy<UserTwoFactorService> =
        mock<UserTwoFactorService>();
    const passwordHistoryService: MockProxy<PasswordHistoryService> =
        mock<PasswordHistoryService>();
    const sessionService: MockProxy<SessionService> = mock<SessionService>();
    const notificationService: MockProxy<NotificationService> =
        mock<NotificationService>();
    const authPasswordUtil: MockProxy<AuthPasswordUtil> =
        mock<AuthPasswordUtil>();
    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();
    const sessionQueue: MockProxy<SessionQueue> = mock<SessionQueue>();
    const notificationQueue: MockProxy<NotificationQueue> =
        mock<NotificationQueue>();
    const userUtil: MockProxy<UserUtil> = mock<UserUtil>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();

    let useCase: UserChangePasswordUseCase;

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
            isImmutable: false,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            createdBy: null,
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedBy: null,
            policies: [],
        },
        twoFactor: null,
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
        lastUsedStep: null,
        attempt: 0,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
    };
    const twoFactorUser: IUser = { ...user, twoFactor: twoFactorRow };
    const twoFactorSetupUser: IUser = {
        ...user,
        twoFactor: { ...twoFactorRow, requiredSetup: true },
    };
    const passwordHistory = { id: 'history-linden' } as PasswordHistory;
    const twoFactorVerified: IUserTwoFactorVerifyResult = {
        method: EnumAuthTwoFactorMethod.code,
        newBackupCodes: null,
    };
    const updatedRow = {
        id: 'user-linden',
        updatedAt: new Date('2026-03-01T00:00:00.000Z'),
    } as User;
    const twoFactorAttempt: IUserTwoFactorAttempt = {
        isAttemptCounted: true,
        lockoutStages: [],
    };

    beforeEach(async () => {
        vi.resetAllMocks();
        activityLogService.prepare.mockReturnValue(activityLog);
        databaseService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );
        notificationService.getRecipient.mockResolvedValue(recipient);
        userTwoFactorService.countAttempt.mockResolvedValue(twoFactorAttempt);
        userTwoFactorService.getProvidedMethod.mockReturnValue(
            EnumAuthTwoFactorMethod.code
        );
        userTwoFactorService.verify.mockResolvedValue(twoFactorVerified);
        userUtil.requiresTwoFactorVerification.mockReturnValue(false);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserChangePasswordUseCase,
                { provide: UserService, useValue: userService },
                { provide: UserPasswordService, useValue: userPasswordService },
                { provide: UserAuthService, useValue: userAuthService },
                {
                    provide: UserTwoFactorService,
                    useValue: userTwoFactorService,
                },
                {
                    provide: PasswordHistoryService,
                    useValue: passwordHistoryService,
                },
                { provide: SessionService, useValue: sessionService },
                {
                    provide: NotificationService,
                    useValue: notificationService,
                },
                { provide: AuthPasswordUtil, useValue: authPasswordUtil },
                { provide: ActivityLogService, useValue: activityLogService },
                { provide: SessionQueue, useValue: sessionQueue },
                { provide: NotificationQueue, useValue: notificationQueue },
                { provide: UserUtil, useValue: userUtil },
                { provide: DatabaseService, useValue: databaseService },
            ],
        }).compile();
        useCase = module.get(UserChangePasswordUseCase);
    });

    describe('execute', () => {
        const dto: UserChangePasswordRequestDto = {
            newPassword: 'new-password',
            oldPassword: 'old-password',
        };

        const passwordAttempt: IUserCredentialAttempt = {
            user,
            hashedPassword: 'hashed-password',
            isAttemptCounted: true,
            lockoutStages: [],
        };

        beforeEach(() => {
            authPasswordUtil.createPassword.mockResolvedValue(password);
            userService.updatePasswordInTx.mockResolvedValue(updatedRow);
            passwordHistoryService.createInTx.mockResolvedValue(
                passwordHistory
            );
            sessionService.revokeActiveByUserInTx.mockResolvedValue(revoked);
            userPasswordService.countPasswordAttempt.mockResolvedValue(
                passwordAttempt
            );
        });

        it('prepares the change-password row before the attempt counter moves', async () => {
            userPasswordService.countPasswordAttempt.mockImplementation(
                async () => {
                    expect(activityLogService.prepare).toHaveBeenCalledWith({
                        action: EnumActivityLogAction.userChangePassword,
                    });
                    expect(
                        activityLogService.stagePrepared
                    ).not.toHaveBeenCalled();

                    return passwordAttempt;
                }
            );
            databaseService.withTransaction.mockImplementation(
                async fn => fn(tx) as never
            );

            await useCase.execute(user, dto);

            expect(
                userPasswordService.countPasswordAttempt
            ).toHaveBeenCalledTimes(1);
        });

        it('verifies the old password and history, hashes, writes on one transaction, purges after commit, notifies, and stages the row', async () => {
            const calls: string[] = [];
            databaseService.withTransaction.mockImplementation(async fn => {
                calls.push('begin');
                const value = await fn(tx);
                calls.push('commit');

                return value as never;
            });
            userService.updatePasswordInTx.mockImplementation(async () => {
                calls.push('updatePassword');

                return updatedRow;
            });
            passwordHistoryService.createInTx.mockImplementation(async () => {
                calls.push('createHistory');

                return passwordHistory;
            });
            userPasswordService.markUnusedResetsUsedInTx.mockImplementation(
                async () => {
                    calls.push('markUnusedResetsUsed');
                }
            );
            sessionService.revokeActiveByUserInTx.mockImplementation(
                async () => {
                    calls.push('revokeSessions');

                    return revoked;
                }
            );
            sessionQueue.purgeLogins.mockImplementation(async () => {
                calls.push('purge');
            });

            await expect(useCase.execute(user, dto)).resolves.toEqual({});

            expect(
                userPasswordService.countPasswordAttempt
            ).toHaveBeenCalledWith(user);
            expect(userAuthService.assertPasswordAttempt).toHaveBeenCalledWith(
                passwordAttempt,
                'old-password'
            );
            expect(passwordHistoryService.assertNew).toHaveBeenCalledWith(
                'user-linden',
                'new-password'
            );
            expect(
                userAuthService.assertPasswordAttempt
            ).toHaveBeenCalledBefore(passwordHistoryService.assertNew);
            expect(sessionQueue.purgeLogins).toHaveBeenCalledTimes(1);
            expect(userUtil.buildPasswordLockoutStages).not.toHaveBeenCalled();
            expect(passwordHistoryService.assertNew).toHaveBeenCalledBefore(
                authPasswordUtil.createPassword
            );
            expect(authPasswordUtil.createPassword).toHaveBeenCalledWith(
                'new-password'
            );
            expect(userTwoFactorService.verify).not.toHaveBeenCalled();
            expect(activityLogService.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userChangePassword,
            });
            expect(notificationService.getRecipient).toHaveBeenCalledWith(
                user,
                EnumNotificationKind.changePassword
            );
            expect(userService.updatePasswordInTx).toHaveBeenCalledWith(
                tx,
                'user-linden',
                password,
                'user-linden'
            );
            expect(passwordHistoryService.createInTx).toHaveBeenCalledWith(
                tx,
                'user-linden',
                'hashed',
                EnumPasswordHistoryType.profile,
                password.passwordPeriodExpired,
                password.passwordCreated,
                'user-linden'
            );
            expect(
                userPasswordService.markUnusedResetsUsedInTx
            ).toHaveBeenCalledWith(tx, 'user-linden');
            expect(sessionService.revokeActiveByUserInTx).toHaveBeenCalledWith(
                tx,
                'user-linden',
                'user-linden',
                password.passwordCreated
            );
            expect(
                userTwoFactorService.recordVerificationInTx
            ).not.toHaveBeenCalled();
            expect(calls).toEqual([
                'begin',
                'updatePassword',
                'createHistory',
                'markUnusedResetsUsed',
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
            expect(activityLogService.stagePrepared).toHaveBeenCalledWith([
                activityLog,
            ]);
        });

        it('skips the password check for a passwordless account', async () => {
            const passwordless: IUser = { ...user, password: null };
            userPasswordService.countPasswordAttempt.mockResolvedValue(null);

            await useCase.execute(passwordless, {
                newPassword: 'new-password',
            });

            expect(
                userPasswordService.countPasswordAttempt
            ).toHaveBeenCalledWith(passwordless);
            expect(
                userAuthService.assertPasswordAttempt
            ).not.toHaveBeenCalled();
            expect(passwordHistoryService.assertNew).not.toHaveBeenCalled();
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
        });

        it('counts an attempt and throws UserPasswordNotMatchException when the password is absent', async () => {
            userAuthService.assertPasswordAttempt.mockRejectedValue(
                new UserPasswordNotMatchException()
            );

            await expect(
                useCase.execute(user, { newPassword: 'new-password' })
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
                userPasswordService.countPasswordAttempt
            ).toHaveBeenCalledTimes(1);
            expect(userAuthService.assertPasswordAttempt).toHaveBeenCalledWith(
                passwordAttempt,
                null
            );
            expect(passwordHistoryService.assertNew).not.toHaveBeenCalled();
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('rejects an expired password after a match', async () => {
            const failure = new UserPasswordExpiredException();
            userAuthService.assertPasswordAttempt.mockRejectedValue(failure);

            await expect(useCase.execute(user, dto)).rejects.toBe(failure);

            expect(passwordHistoryService.assertNew).not.toHaveBeenCalled();
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('verifies two-factor, records the verification on the transaction, and stages the verify row when two-factor is enabled', async () => {
            userUtil.requiresTwoFactorVerification.mockReturnValue(true);
            await useCase.execute(twoFactorUser, {
                ...dto,
                code: '123456',
                method: EnumAuthTwoFactorMethod.code,
            });

            expect(userTwoFactorService.countAttempt).toHaveBeenCalledWith(
                twoFactorUser
            );
            expect(userTwoFactorService.countAttempt).toHaveBeenCalledBefore(
                userTwoFactorService.verify
            );
            expect(
                userTwoFactorService.getProvidedMethod
            ).toHaveBeenCalledBefore(userTwoFactorService.countAttempt);
            expect(activityLogService.stagePrepared).toHaveBeenNthCalledWith(
                2,
                []
            );
            expect(
                userTwoFactorService.assertAttemptCounted
            ).toHaveBeenCalledWith(true);
            expect(userUtil.buildTwoFactorLockoutStages).not.toHaveBeenCalled();
            expect(userTwoFactorService.verify).toHaveBeenCalledWith(
                twoFactorUser,
                {
                    method: EnumAuthTwoFactorMethod.code,
                    code: '123456',
                    backupCode: null,
                }
            );
            expect(
                userTwoFactorService.recordVerificationInTx
            ).toHaveBeenCalledWith(tx, twoFactorUser, twoFactorVerified);
            expect(userTwoFactorService.verify).toHaveBeenCalledBefore(
                authPasswordUtil.createPassword
            );
            expect(activityLogService.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userVerifyTwoFactor,
                userId: 'user-linden',
                createdBy: 'user-linden',
            });
            expect(activityLogService.stagePrepared).toHaveBeenCalledWith([
                activityLog,
                activityLog,
            ]);
        });

        it('skips two-factor verification while setup is required', async () => {
            await expect(
                useCase.execute(twoFactorSetupUser, dto)
            ).resolves.toEqual({});

            expect(userUtil.requiresTwoFactorVerification).toHaveBeenCalledWith(
                twoFactorSetupUser
            );
            expect(userTwoFactorService.countAttempt).not.toHaveBeenCalled();
            expect(userTwoFactorService.verify).not.toHaveBeenCalled();
            expect(activityLogService.prepare).not.toHaveBeenCalledWith(
                expect.objectContaining({
                    action: EnumActivityLogAction.userVerifyTwoFactor,
                })
            );
            expect(
                userTwoFactorService.recordVerificationInTx
            ).not.toHaveBeenCalled();
            expect(userService.updatePasswordInTx).toHaveBeenCalledWith(
                tx,
                'user-linden',
                password,
                'user-linden'
            );
        });

        it('writes nothing when the two-factor check rejects', async () => {
            userUtil.requiresTwoFactorVerification.mockReturnValue(true);
            const failure = new Error('invalid');
            userTwoFactorService.verify.mockRejectedValue(failure);

            await expect(
                useCase.execute(twoFactorUser, {
                    ...dto,
                    code: '000000',
                    method: EnumAuthTwoFactorMethod.code,
                })
            ).rejects.toBe(failure);
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
            expect(sessionQueue.purgeLogins).not.toHaveBeenCalled();
        });

        it('throws the method-required exception without counting an attempt', async () => {
            userUtil.requiresTwoFactorVerification.mockReturnValue(true);
            userTwoFactorService.getProvidedMethod.mockImplementation(() => {
                throw new AuthTwoFactorMethodRequiredException();
            });
            await expect(
                useCase.execute(twoFactorUser, {
                    ...dto,
                    code: '123456',
                })
            ).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.twoFactorMethodRequired,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.twoFactorMethodRequired
                    ],
                messagePath: 'auth.error.twoFactorMethodRequired',
            });

            expect(userTwoFactorService.getProvidedMethod).toHaveBeenCalledWith(
                null
            );
            expect(userTwoFactorService.countAttempt).not.toHaveBeenCalled();
            expect(userUtil.buildTwoFactorLockoutStages).not.toHaveBeenCalled();
            expect(userTwoFactorService.verify).not.toHaveBeenCalled();
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('stages both lockout rows after the spent count and throws AuthTwoFactorAttemptMaxException when the two-factor budget is spent', async () => {
            const calls: string[] = [];
            const spent: IUserTwoFactorAttempt = {
                isAttemptCounted: false,
                lockoutStages: [
                    {
                        action: EnumActivityLogAction.userRevokeAllSessions,
                        userId: 'user-linden',
                        createdBy: 'user-linden',
                    },
                    {
                        action: EnumActivityLogAction.userReachMaxTwoFactorAttempt,
                        userId: 'user-linden',
                        createdBy: 'user-linden',
                    },
                ],
            };
            userUtil.requiresTwoFactorVerification.mockReturnValue(true);
            userTwoFactorService.countAttempt.mockImplementation(async () => {
                calls.push('countAttempt');

                return spent;
            });
            userTwoFactorService.assertAttemptCounted.mockImplementation(() => {
                calls.push('assert');

                throw new AuthTwoFactorAttemptMaxException();
            });
            activityLogService.stagePrepared.mockImplementation(() => {
                calls.push('stage');
            });

            await expect(
                useCase.execute(twoFactorUser, {
                    ...dto,
                    code: '123456',
                    method: EnumAuthTwoFactorMethod.code,
                })
            ).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.twoFactorAttemptMax,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.twoFactorAttemptMax
                    ],
                messagePath: 'auth.error.twoFactorAttemptMax',
            });

            expect(activityLogService.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userRevokeAllSessions,
                userId: 'user-linden',
                createdBy: 'user-linden',
            });
            expect(activityLogService.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userReachMaxTwoFactorAttempt,
                userId: 'user-linden',
                createdBy: 'user-linden',
            });
            expect(userUtil.buildTwoFactorLockoutStages).not.toHaveBeenCalled();
            expect(activityLogService.stagePrepared).toHaveBeenNthCalledWith(
                2,
                [activityLog, activityLog]
            );
            expect(
                userTwoFactorService.assertAttemptCounted
            ).toHaveBeenCalledWith(false);
            expect(calls).toEqual(['stage', 'countAttempt', 'stage', 'assert']);
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
            expect(sessionQueue.purgeLogins).not.toHaveBeenCalled();
            expect(userTwoFactorService.verify).not.toHaveBeenCalled();
            expect(userService.updatePasswordInTx).not.toHaveBeenCalled();
        });

        it('writes nothing when the old password check rejects', async () => {
            const failure = new UserPasswordNotMatchException();
            userAuthService.assertPasswordAttempt.mockRejectedValue(failure);

            await expect(useCase.execute(user, dto)).rejects.toBe(failure);
            expect(passwordHistoryService.assertNew).not.toHaveBeenCalled();
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('throws UserPasswordNotMatchException on a wrong password under the max and keeps the attempt', async () => {
            userAuthService.assertPasswordAttempt.mockRejectedValue(
                new UserPasswordNotMatchException()
            );

            await expect(useCase.execute(user, dto)).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.passwordNotMatch,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.passwordNotMatch
                    ],
                messagePath: 'user.error.passwordNotMatch',
            });
            expect(
                userPasswordService.resetPasswordAttempt
            ).not.toHaveBeenCalled();
            expect(userUtil.buildPasswordLockoutStages).not.toHaveBeenCalled();
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
            expect(
                activityLogService.stagePrepared
            ).toHaveBeenCalledExactlyOnceWith([]);
            expect(activityLogService.stagePrepared).toHaveBeenCalledBefore(
                userAuthService.assertPasswordAttempt
            );
        });

        it('stages both lockout rows after the spent attempt is counted and throws UserPasswordAttemptMaxException at the max attempt', async () => {
            const calls: string[] = [];
            const spent: IUserCredentialAttempt = {
                ...passwordAttempt,
                isAttemptCounted: false,
                lockoutStages: [
                    {
                        action: EnumActivityLogAction.userRevokeAllSessions,
                        userId: 'user-linden',
                        createdBy: 'user-linden',
                    },
                    {
                        action: EnumActivityLogAction.userReachMaxPasswordAttempt,
                        userId: 'user-linden',
                        createdBy: 'user-linden',
                    },
                ],
            };
            userPasswordService.countPasswordAttempt.mockImplementation(
                async () => {
                    calls.push('countAttempt');

                    return spent;
                }
            );
            userAuthService.assertPasswordAttempt.mockImplementation(
                async () => {
                    calls.push('assert');

                    throw new UserPasswordAttemptMaxException();
                }
            );
            activityLogService.stagePrepared.mockImplementation(() => {
                calls.push('stage');
            });

            await expect(useCase.execute(user, dto)).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.passwordAttemptMax,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.passwordAttemptMax
                    ],
                messagePath: 'user.error.passwordAttemptMax',
            });

            expect(activityLogService.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userRevokeAllSessions,
                userId: 'user-linden',
                createdBy: 'user-linden',
            });
            expect(activityLogService.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userReachMaxPasswordAttempt,
                userId: 'user-linden',
                createdBy: 'user-linden',
            });
            expect(userUtil.buildPasswordLockoutStages).not.toHaveBeenCalled();
            expect(activityLogService.stagePrepared).toHaveBeenCalledWith([
                activityLog,
                activityLog,
            ]);
            expect(calls).toEqual(['countAttempt', 'stage', 'assert']);
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
            expect(sessionQueue.purgeLogins).not.toHaveBeenCalled();
            expect(userAuthService.assertPasswordAttempt).toHaveBeenCalledWith(
                spent,
                'old-password'
            );
            expect(passwordHistoryService.assertNew).not.toHaveBeenCalled();
            expect(userService.updatePasswordInTx).not.toHaveBeenCalled();
        });

        it('writes nothing when the recipient read rejects', async () => {
            notificationService.getRecipient.mockRejectedValue(
                new Error('read')
            );

            await expect(useCase.execute(user, dto)).rejects.toThrow('read');
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
            expect(sessionQueue.purgeLogins).not.toHaveBeenCalled();
        });

        it('purges, notifies, and stages nothing when the transaction fails', async () => {
            const cause = new Error('database exploded');
            databaseService.withTransaction.mockRejectedValue(cause);

            await expect(useCase.execute(user, dto)).rejects.toBe(cause);
            expect(sessionQueue.purgeLogins).not.toHaveBeenCalled();
            expect(notificationQueue.sendChangePassword).not.toHaveBeenCalled();
            expect(
                activityLogService.stagePrepared
            ).toHaveBeenCalledExactlyOnceWith([]);
        });
    });
});
