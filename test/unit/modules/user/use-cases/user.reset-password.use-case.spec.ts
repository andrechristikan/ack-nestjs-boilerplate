import { AuthTwoFactorAttemptMaxException } from '@modules/auth/exceptions/auth.two-factor-attempt-max.exception';
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
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import type { IActivityLogStaged } from '@modules/activity-log/interfaces/activity-log.interface';
import { EnumAuthTwoFactorMethod } from '@modules/auth/enums/auth.enum';
import { EnumAuthStatusCodeError } from '@modules/auth/enums/auth.status-code.enum';
import { AuthTwoFactorMethodRequiredException } from '@modules/auth/exceptions/auth.two-factor-method-required.exception';
import type { IAuthPassword } from '@modules/auth/interfaces/auth.interface';
import { AuthPasswordUtil } from '@modules/auth/utils/auth.password.util';
import { FeatureFlagService } from '@modules/feature-flag/services/feature-flag.service';
import {
    EnumFeatureFlagKey,
    EnumFeatureFlagMetadataKey,
} from '@modules/feature-flag/enums/feature-flag.enum';
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
import { UserTwoFactorService } from '@modules/user/services/user.two-factor.service';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { UserTokenInvalidException } from '@modules/user/exceptions/user.token-invalid.exception';
import { UserUtil } from '@modules/user/utils/user.util';
import type { UserForgotPasswordResetRequestDto } from '@modules/user/dtos/request/user.forgot-password-reset.request.dto';
import type {
    IUser,
    IUserForgotPassword,
    IUserTwoFactorAttempt,
    IUserTwoFactorVerifyResult,
} from '@modules/user/interfaces/user.interface';
import { TestRecipient } from '@test/unit/helpers/test.unit.notification-push.helper';
import { UserResetPasswordUseCase } from '@modules/user/use-cases/user.reset-password.use-case';

describe('UserResetPasswordUseCase', () => {
    const userService: MockProxy<UserService> = mock<UserService>();
    const userPasswordService: MockProxy<UserPasswordService> =
        mock<UserPasswordService>();
    const userTwoFactorService: MockProxy<UserTwoFactorService> =
        mock<UserTwoFactorService>();
    const passwordHistoryService: MockProxy<PasswordHistoryService> =
        mock<PasswordHistoryService>();
    const sessionService: MockProxy<SessionService> = mock<SessionService>();
    const notificationService: MockProxy<NotificationService> =
        mock<NotificationService>();
    const authPasswordUtil: MockProxy<AuthPasswordUtil> =
        mock<AuthPasswordUtil>();
    const featureFlagService: MockProxy<FeatureFlagService> =
        mock<FeatureFlagService>();
    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();
    const sessionQueue: MockProxy<SessionQueue> = mock<SessionQueue>();
    const notificationQueue: MockProxy<NotificationQueue> =
        mock<NotificationQueue>();
    const userUtil: MockProxy<UserUtil> = mock<UserUtil>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();

    let useCase: UserResetPasswordUseCase;

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
    const resetRow = {
        id: 'forgot-linden',
        userId: 'user-linden',
        user,
    } as IUserForgotPassword;
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
                UserResetPasswordUseCase,
                { provide: UserService, useValue: userService },
                { provide: UserPasswordService, useValue: userPasswordService },
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
                { provide: FeatureFlagService, useValue: featureFlagService },
                { provide: ActivityLogService, useValue: activityLogService },
                { provide: SessionQueue, useValue: sessionQueue },
                { provide: NotificationQueue, useValue: notificationQueue },
                { provide: UserUtil, useValue: userUtil },
                { provide: DatabaseService, useValue: databaseService },
                { provide: DatabaseUtil, useValue: databaseUtil },
            ],
        }).compile();
        useCase = module.get(UserResetPasswordUseCase);
    });

    describe('execute', () => {
        const dto: UserForgotPasswordResetRequestDto = {
            newPassword: 'new-password',
            token: 'raw-token',
        };

        const resetTwoFactorRow = {
            ...resetRow,
            user: twoFactorUser,
        } as IUserForgotPassword;

        beforeEach(() => {
            userPasswordService.getOneActiveReset.mockResolvedValue(resetRow);
            authPasswordUtil.createPassword.mockResolvedValue(password);
            userService.updatePasswordInTx.mockResolvedValue(updatedRow);
            passwordHistoryService.createInTx.mockResolvedValue(
                passwordHistory
            );
            sessionService.revokeActiveByUserInTx.mockResolvedValue(revoked);
        });

        it('gates the flag, checks the history, hashes, writes on one transaction, purges after commit, notifies, and stages', async () => {
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
            userPasswordService.markResetUsedInTx.mockImplementation(
                async () => {
                    calls.push('markResetUsed');
                }
            );
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

            await expect(useCase.execute(dto)).resolves.toEqual({});

            expect(
                featureFlagService.validateFeatureFlagMetadata
            ).toHaveBeenCalledWith(
                EnumFeatureFlagKey.changePassword,
                EnumFeatureFlagMetadataKey.forgotAllowed
            );
            expect(userPasswordService.getOneActiveReset).toHaveBeenCalledWith(
                'raw-token'
            );
            expect(passwordHistoryService.assertNew).toHaveBeenCalledWith(
                'user-linden',
                'new-password'
            );
            expect(passwordHistoryService.assertNew).toHaveBeenCalledBefore(
                authPasswordUtil.createPassword
            );
            expect(userTwoFactorService.verify).not.toHaveBeenCalled();
            expect(authPasswordUtil.createPassword).toHaveBeenCalledWith(
                'new-password'
            );
            expect(activityLogService.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userResetPassword,
                userId: 'user-linden',
                createdBy: 'user-linden',
            });
            expect(notificationService.getRecipient).toHaveBeenCalledWith(
                user,
                EnumNotificationKind.resetPassword
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
                EnumPasswordHistoryType.forgot,
                password.passwordPeriodExpired,
                password.passwordCreated,
                'user-linden'
            );
            expect(userPasswordService.markResetUsedInTx).toHaveBeenCalledWith(
                tx,
                'forgot-linden',
                password.passwordCreated
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
                'markResetUsed',
                'markUnusedResetsUsed',
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
            expect(activityLogService.stagePrepared).toHaveBeenCalledWith([
                activityLog,
            ]);
        });

        it('verifies two-factor of the reset user, records it on the transaction, and stages the verify row when two-factor is enabled', async () => {
            userUtil.requiresTwoFactorVerification.mockReturnValue(true);
            userPasswordService.getOneActiveReset.mockResolvedValue(
                resetTwoFactorRow
            );

            await useCase.execute({
                ...dto,
                code: '123456',
                method: EnumAuthTwoFactorMethod.code,
            });

            expect(userTwoFactorService.countAttempt).toHaveBeenCalledWith(
                twoFactorUser
            );
            expect(
                userTwoFactorService.getProvidedMethod
            ).toHaveBeenCalledBefore(userTwoFactorService.countAttempt);
            expect(activityLogService.stagePrepared).toHaveBeenNthCalledWith(
                1,
                []
            );
            expect(activityLogService.stagePrepared).toHaveBeenCalledBefore(
                userTwoFactorService.assertAttemptCounted
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

        it('stages the lockout rows and answers the attempt limit when the two-factor budget is spent', async () => {
            const limit = new AuthTwoFactorAttemptMaxException();
            userUtil.requiresTwoFactorVerification.mockReturnValue(true);
            userPasswordService.getOneActiveReset.mockResolvedValue(
                resetTwoFactorRow
            );
            userTwoFactorService.countAttempt.mockResolvedValue({
                isAttemptCounted: false,
                lockoutStages: [
                    {
                        action: EnumActivityLogAction.userReachMaxTwoFactorAttempt,
                        userId: 'user-linden',
                        createdBy: 'user-linden',
                    },
                ],
            });
            userTwoFactorService.assertAttemptCounted.mockImplementation(() => {
                throw limit;
            });

            await expect(
                useCase.execute({
                    ...dto,
                    code: '123456',
                    method: EnumAuthTwoFactorMethod.code,
                })
            ).rejects.toBe(limit);

            expect(activityLogService.stagePrepared).toHaveBeenCalledWith([
                activityLog,
            ]);
            expect(userTwoFactorService.verify).not.toHaveBeenCalled();
        });

        it('skips two-factor verification while setup is required', async () => {
            userPasswordService.getOneActiveReset.mockResolvedValue({
                ...resetRow,
                user: twoFactorSetupUser,
            });

            await expect(useCase.execute(dto)).resolves.toEqual({});

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

        it('throws the method-required exception without counting an attempt', async () => {
            userUtil.requiresTwoFactorVerification.mockReturnValue(true);
            userTwoFactorService.getProvidedMethod.mockImplementation(() => {
                throw new AuthTwoFactorMethodRequiredException();
            });
            userPasswordService.getOneActiveReset.mockResolvedValue(
                resetTwoFactorRow
            );

            await expect(
                useCase.execute({ ...dto, code: '123456' })
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

        it('writes nothing when the history check rejects', async () => {
            const failure = new Error('must new');
            passwordHistoryService.assertNew.mockRejectedValue(failure);

            await expect(useCase.execute(dto)).rejects.toBe(failure);
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
            expect(userTwoFactorService.verify).not.toHaveBeenCalled();
        });

        it('writes nothing when the recipient read rejects', async () => {
            notificationService.getRecipient.mockRejectedValue(
                new Error('read')
            );

            await expect(useCase.execute(dto)).rejects.toThrow('read');
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
            expect(sessionQueue.purgeLogins).not.toHaveBeenCalled();
        });

        it('rethrows a typed exception the transaction raises', async () => {
            const failure = new UserTokenInvalidException();
            databaseService.withTransaction.mockRejectedValue(failure);

            await expect(useCase.execute(dto)).rejects.toBe(failure);
            expect(sessionQueue.purgeLogins).not.toHaveBeenCalled();
            expect(activityLogService.stagePrepared).not.toHaveBeenCalled();
        });

        it('maps a write conflict to UserTokenInvalidException', async () => {
            const conflict = new Error('write conflict');
            databaseService.withTransaction.mockRejectedValue(conflict);
            databaseUtil.toException.mockReturnValue(
                new DatabaseWriteConflictException()
            );

            await expect(useCase.execute(dto)).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.tokenInvalid,
                messagePath: 'user.error.verificationTokenInvalid',
            });
            expect(databaseUtil.toException).toHaveBeenCalledWith(conflict);
            expect(sessionQueue.purgeLogins).not.toHaveBeenCalled();
            expect(notificationQueue.sendResetPassword).not.toHaveBeenCalled();
            expect(activityLogService.stagePrepared).not.toHaveBeenCalled();
        });

        it('wraps an unknown transaction failure in AppUnknownException', async () => {
            const cause = new Error('database exploded');
            databaseService.withTransaction.mockRejectedValue(cause);
            databaseUtil.toException.mockReturnValue(null);

            await expect(useCase.execute(dto)).rejects.toMatchObject({
                rawError: cause,
            });
            expect(sessionQueue.purgeLogins).not.toHaveBeenCalled();
        });
    });
});
