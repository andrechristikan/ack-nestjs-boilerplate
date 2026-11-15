import type { IActivityLogCreateManyEffect } from '@modules/activity-log/interfaces/activity-log.interface';
import type { INotificationNotifyEffect } from '@modules/notification/interfaces/notification.interface';
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
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import { DatabaseUtil } from '@common/database/utils/database.util';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import {
    EnumActivityLogProcess,
    EnumActivityLogQueue,
} from '@modules/activity-log/enums/activity-log.enum';
import { EnumAuthTwoFactorMethod } from '@modules/auth/enums/auth.enum';
import { EnumAuthStatusCodeError } from '@modules/auth/enums/auth.status-code.enum';
import { AuthTwoFactorAttemptMaxException } from '@modules/auth/exceptions/auth.two-factor-attempt-max.exception';
import { AuthTwoFactorMethodRequiredException } from '@modules/auth/exceptions/auth.two-factor-method-required.exception';
import type { IAuthPassword } from '@modules/auth/interfaces/auth.interface';
import { AuthPasswordUtil } from '@modules/auth/utils/auth.password.util';
import { NotificationService } from '@modules/notification/services/notification.service';
import {
    EnumNotificationKind,
    EnumNotificationProcess,
    EnumNotificationQueue,
} from '@modules/notification/enums/notification.enum';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import { PasswordHistoryService } from '@modules/password-history/services/password-history.service';
import { SessionService } from '@modules/session/services/session.service';
import type { ISessionRef } from '@modules/session/interfaces/session.interface';
import { UserService } from '@modules/user/services/user.service';
import { UserPasswordService } from '@modules/user/services/user.password.service';
import { UserAuthService } from '@modules/user/services/user.auth.service';
import { UserTwoFactorService } from '@modules/user/services/user.two-factor.service';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { UserPasswordAttemptMaxException } from '@modules/user/exceptions/user.password-attempt-max.exception';
import { UserPasswordExpiredException } from '@modules/user/exceptions/user.password-expired.exception';
import { UserPasswordNotMatchException } from '@modules/user/exceptions/user.password-not-match.exception';
import type { UserChangePasswordRequestDto } from '@modules/user/dtos/request/user.change-password.request.dto';
import type {
    IUser,
    IUserCredential,
    IUserTwoFactorCheck,
    IUserTwoFactorVerifyResult,
} from '@modules/user/interfaces/user.interface';
import { UserChangePasswordUseCase } from '@modules/user/use-cases/user.change-password.use-case';
import {
    buildRequestContext,
    buildApiKeyContext,
    buildAuthJwtAccessContext,
    buildUserContext,
} from '@test/unit/helpers/test.unit.request.helper';

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
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();

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
        passwordLockedUntil: null,
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
    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    const authContext = buildAuthJwtAccessContext(user.id);
    const userContext = buildUserContext(user);
    const password: IAuthPassword = {
        passwordHash: 'hashed',
        passwordExpired: new Date('2026-06-01T00:00:00.000Z'),
        passwordCreated: new Date('2026-01-01T00:00:00.000Z'),
        passwordPeriodExpired: new Date('2026-04-01T00:00:00.000Z'),
    };
    const changeEntry: IActivityLogCreateManyEffect = {
        queue: EnumActivityLogQueue.activityLog,
        name: EnumActivityLogProcess.createMany,
        data: { rows: [] },
        priority: EnumQueuePriority.low,
        idempotencyKey: 'change',
    };
    const verifyEntry: IActivityLogCreateManyEffect = {
        ...changeEntry,
        idempotencyKey: 'verify',
    };
    const notifyEffect: INotificationNotifyEffect = {
        queue: EnumNotificationQueue.notification,
        name: EnumNotificationProcess.notify,
        data: {
            kind: EnumNotificationKind.changePassword,
            context: { userId: 'user-linden', proceedBy: 'user-linden' },
            recipient: null,
            notificationId: null,
        },
        priority: EnumQueuePriority.medium,
        idempotencyKey: null,
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
        lockedUntil: null,
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
    const twoFactorChecked: IUserTwoFactorCheck = {
        verified: twoFactorVerified,
        totpStep: 58123456,
    };
    const updatedRow = {
        id: 'user-linden',
        updatedAt: new Date('2026-03-01T00:00:00.000Z'),
    } as User;

    beforeEach(async () => {
        vi.resetAllMocks();
        activityLogService.recordEffect.mockImplementation(
            (
                _requestContext,
                _apiKeyContext,
                _authContext,
                _workspaceContext,
                input
            ) =>
                input.action === EnumActivityLogAction.userVerifyTwoFactor
                    ? verifyEntry
                    : changeEntry
        );
        outboxService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );
        notificationService.notify.mockReturnValue(notifyEffect);
        userTwoFactorService.checkIfRequired.mockResolvedValue(null);

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
                { provide: OutboxService, useValue: outboxService },
                { provide: DatabaseUtil, useValue: databaseUtil },
            ],
        }).compile();
        useCase = module.get(UserChangePasswordUseCase);
    });

    describe('execute', () => {
        const dto: UserChangePasswordRequestDto = {
            newPassword: 'new-password',
            oldPassword: 'old-password',
        };

        const credential: IUserCredential = {
            user,
            hashedPassword: 'hashed-password',
        };

        beforeEach(() => {
            authPasswordUtil.createPassword.mockResolvedValue(password);
            userService.updatePasswordInTx.mockResolvedValue(updatedRow);
            passwordHistoryService.createInTx.mockResolvedValue(
                passwordHistory
            );
            sessionService.revokeActiveByUserExceptInTx.mockResolvedValue(
                revoked
            );
            userPasswordService.getCredential.mockReturnValue(credential);
        });

        it('verifies the old password and history, hashes, and writes the change, its entry, and the notification on one transaction', async () => {
            const calls: string[] = [];
            outboxService.withTransaction.mockImplementation(async fn => {
                calls.push('begin');
                const value = await fn(tx);
                calls.push('commit');

                return value as never;
            });
            userPasswordService.resetPasswordAttemptInTx.mockImplementation(
                async () => {
                    calls.push('resetPasswordAttempt');
                }
            );
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
            sessionService.revokeActiveByUserExceptInTx.mockImplementation(
                async () => {
                    calls.push('revokeSessions');

                    return revoked;
                }
            );
            outboxService.addManyInTx.mockImplementation(async () => {
                calls.push('addEffects');

                return ['outbox-id'];
            });

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    dto
                )
            ).resolves.toEqual({});

            expect(userPasswordService.getCredential).toHaveBeenCalledWith(
                user
            );
            expect(userAuthService.assertPasswordAttempt).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                credential,
                'old-password'
            );
            expect(passwordHistoryService.assertNew).toHaveBeenCalledWith(
                'user-linden',
                'new-password'
            );
            expect(
                userAuthService.assertPasswordAttempt
            ).toHaveBeenCalledBefore(passwordHistoryService.assertNew);
            expect(passwordHistoryService.assertNew).toHaveBeenCalledBefore(
                authPasswordUtil.createPassword
            );
            expect(userTwoFactorService.checkIfRequired).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                user,
                { code: null, backupCode: null, method: null }
            );
            expect(authPasswordUtil.createPassword).toHaveBeenCalledWith(
                'new-password'
            );
            expect(activityLogService.recordEffect).toHaveBeenCalledTimes(1);
            expect(activityLogService.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                null,
                { action: EnumActivityLogAction.userChangePassword }
            );
            expect(notificationService.notify).toHaveBeenCalledWith(
                EnumNotificationKind.changePassword,
                { userId: 'user-linden', proceedBy: 'user-linden' }
            );
            expect(outboxService.addManyInTx).toHaveBeenCalledWith(tx, [
                changeEntry,
                notifyEffect,
            ]);
            expect(
                userPasswordService.resetPasswordAttemptInTx
            ).toHaveBeenCalledWith(tx, 'user-linden');
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
            expect(
                sessionService.revokeActiveByUserExceptInTx
            ).toHaveBeenCalledWith(
                tx,
                'user-linden',
                'session-1',
                'user-linden',
                password.passwordCreated
            );
            expect(
                sessionService.revokeActiveByUserInTx
            ).not.toHaveBeenCalled();
            expect(
                userTwoFactorService.recordVerificationInTx
            ).not.toHaveBeenCalled();
            expect(calls).toEqual([
                'begin',
                'resetPasswordAttempt',
                'updatePassword',
                'createHistory',
                'markUnusedResetsUsed',
                'revokeSessions',
                'addEffects',
                'commit',
            ]);
        });

        it('reads the actor id from the context actorUserId', async () => {
            await useCase.execute(
                requestContext,
                apiKeyContext,
                { ...authContext, userId: 'actor-other' },
                userContext,
                dto
            );

            expect(passwordHistoryService.assertNew).toHaveBeenCalledWith(
                'actor-other',
                'new-password'
            );
            expect(userService.updatePasswordInTx).toHaveBeenCalledWith(
                tx,
                'actor-other',
                password,
                'actor-other'
            );
            expect(
                userPasswordService.markUnusedResetsUsedInTx
            ).toHaveBeenCalledWith(tx, 'actor-other');
            expect(
                sessionService.revokeActiveByUserExceptInTx
            ).toHaveBeenCalledWith(
                tx,
                'actor-other',
                'session-1',
                'actor-other',
                password.passwordCreated
            );
            expect(notificationService.notify).toHaveBeenCalledWith(
                EnumNotificationKind.changePassword,
                { userId: 'actor-other', proceedBy: 'actor-other' }
            );
        });

        it('skips the password check for a passwordless account', async () => {
            const passwordless: IUser = { ...user, password: null };
            userPasswordService.getCredential.mockReturnValue(null);

            const passwordlessRequestContext = buildRequestContext();
            const passwordlessApiKeyContext = buildApiKeyContext();
            const passwordlessAuthContext = buildAuthJwtAccessContext(
                passwordless.id
            );
            const passwordlessUserContext = buildUserContext(passwordless);

            await useCase.execute(
                passwordlessRequestContext,
                passwordlessApiKeyContext,
                passwordlessAuthContext,
                passwordlessUserContext,
                {
                    newPassword: 'new-password',
                }
            );

            expect(userPasswordService.getCredential).toHaveBeenCalledWith(
                passwordless
            );
            expect(
                userAuthService.assertPasswordAttempt
            ).not.toHaveBeenCalled();
            expect(
                userPasswordService.resetPasswordAttemptInTx
            ).not.toHaveBeenCalled();
            expect(passwordHistoryService.assertNew).not.toHaveBeenCalled();
            expect(outboxService.withTransaction).toHaveBeenCalledTimes(1);
        });

        it('throws UserPasswordNotMatchException when the password is absent', async () => {
            userAuthService.assertPasswordAttempt.mockRejectedValue(
                new UserPasswordNotMatchException()
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    {
                        newPassword: 'new-password',
                    }
                )
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.passwordNotMatch,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.passwordNotMatch
                    ],
                messagePath: 'user.error.passwordNotMatch',
            });

            expect(userAuthService.assertPasswordAttempt).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                credential,
                null
            );
            expect(passwordHistoryService.assertNew).not.toHaveBeenCalled();
            expect(outboxService.withTransaction).not.toHaveBeenCalled();
        });

        it('rejects an expired password after a match', async () => {
            const failure = new UserPasswordExpiredException();
            userAuthService.assertPasswordAttempt.mockRejectedValue(failure);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    dto
                )
            ).rejects.toBe(failure);

            expect(passwordHistoryService.assertNew).not.toHaveBeenCalled();
            expect(outboxService.withTransaction).not.toHaveBeenCalled();
        });

        it('verifies two-factor before hashing, records the verification on the transaction, and adds the verify entry when two-factor was verified', async () => {
            userTwoFactorService.checkIfRequired.mockResolvedValue(
                twoFactorChecked
            );

            const twoFactorRequestContext = buildRequestContext();
            const twoFactorApiKeyContext = buildApiKeyContext();
            const twoFactorAuthContext = buildAuthJwtAccessContext(
                twoFactorUser.id
            );
            const twoFactorUserContext = buildUserContext(twoFactorUser);

            await useCase.execute(
                twoFactorRequestContext,
                twoFactorApiKeyContext,
                twoFactorAuthContext,
                twoFactorUserContext,
                {
                    ...dto,
                    code: '123456',
                    method: EnumAuthTwoFactorMethod.code,
                }
            );

            expect(userTwoFactorService.checkIfRequired).toHaveBeenCalledWith(
                twoFactorRequestContext,
                twoFactorApiKeyContext,
                twoFactorUser,
                {
                    method: EnumAuthTwoFactorMethod.code,
                    code: '123456',
                    backupCode: null,
                }
            );
            expect(userTwoFactorService.checkIfRequired).toHaveBeenCalledBefore(
                authPasswordUtil.createPassword
            );
            expect(userTwoFactorService.verifyInTx).toHaveBeenCalledWith(
                tx,
                'user-linden',
                twoFactorChecked
            );
            expect(
                userTwoFactorService.recordVerificationInTx
            ).toHaveBeenCalledWith(tx, twoFactorUser, twoFactorVerified);
            expect(activityLogService.recordEffect).toHaveBeenCalledWith(
                twoFactorRequestContext,
                twoFactorApiKeyContext,
                twoFactorAuthContext,
                null,
                {
                    action: EnumActivityLogAction.userVerifyTwoFactor,
                    userId: 'user-linden',
                    createdBy: 'user-linden',
                }
            );
            expect(outboxService.addManyInTx).toHaveBeenCalledWith(tx, [
                changeEntry,
                verifyEntry,
                notifyEffect,
            ]);
        });

        it('records no two-factor verification while the service verified nothing', async () => {
            const setupRequestContext = buildRequestContext();
            const setupApiKeyContext = buildApiKeyContext();
            const setupAuthContext = buildAuthJwtAccessContext(
                twoFactorSetupUser.id
            );
            const setupUserContext = buildUserContext(twoFactorSetupUser);

            await expect(
                useCase.execute(
                    setupRequestContext,
                    setupApiKeyContext,
                    setupAuthContext,
                    setupUserContext,
                    dto
                )
            ).resolves.toEqual({});

            expect(userTwoFactorService.checkIfRequired).toHaveBeenCalledWith(
                setupRequestContext,
                setupApiKeyContext,
                twoFactorSetupUser,
                { code: null, backupCode: null, method: null }
            );
            expect(userTwoFactorService.verifyInTx).not.toHaveBeenCalled();
            expect(
                userTwoFactorService.recordVerificationInTx
            ).not.toHaveBeenCalled();
            expect(activityLogService.recordEffect).not.toHaveBeenCalledWith(
                expect.objectContaining({
                    action: EnumActivityLogAction.userVerifyTwoFactor,
                }),
                requestContext,
                apiKeyContext,
                authContext,
                null
            );
            expect(userService.updatePasswordInTx).toHaveBeenCalledWith(
                tx,
                'user-linden',
                password,
                'user-linden'
            );
        });

        it('writes nothing when the two-factor check rejects', async () => {
            const failure = new Error('invalid');
            userTwoFactorService.checkIfRequired.mockRejectedValue(failure);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    {
                        ...dto,
                        code: '000000',
                        method: EnumAuthTwoFactorMethod.code,
                    }
                )
            ).rejects.toBe(failure);
            expect(outboxService.withTransaction).not.toHaveBeenCalled();
        });

        it('throws the method-required exception and writes nothing', async () => {
            userTwoFactorService.checkIfRequired.mockRejectedValue(
                new AuthTwoFactorMethodRequiredException()
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    {
                        ...dto,
                        code: '123456',
                    }
                )
            ).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.twoFactorMethodRequired,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.twoFactorMethodRequired
                    ],
                messagePath: 'auth.error.twoFactorMethodRequired',
            });

            expect(outboxService.withTransaction).not.toHaveBeenCalled();
        });

        it('throws AuthTwoFactorAttemptMaxException and writes nothing when the two-factor budget is spent', async () => {
            userTwoFactorService.checkIfRequired.mockRejectedValue(
                new AuthTwoFactorAttemptMaxException()
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    {
                        ...dto,
                        code: '123456',
                        method: EnumAuthTwoFactorMethod.code,
                    }
                )
            ).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.twoFactorAttemptMax,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.twoFactorAttemptMax
                    ],
                messagePath: 'auth.error.twoFactorAttemptMax',
            });

            expect(outboxService.withTransaction).not.toHaveBeenCalled();
            expect(userService.updatePasswordInTx).not.toHaveBeenCalled();
        });

        it('writes nothing when the old password check rejects', async () => {
            const failure = new UserPasswordNotMatchException();
            userAuthService.assertPasswordAttempt.mockRejectedValue(failure);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    dto
                )
            ).rejects.toBe(failure);
            expect(passwordHistoryService.assertNew).not.toHaveBeenCalled();
            expect(outboxService.withTransaction).not.toHaveBeenCalled();
        });

        it('throws UserPasswordNotMatchException on a wrong password under the max and resets nothing', async () => {
            userAuthService.assertPasswordAttempt.mockRejectedValue(
                new UserPasswordNotMatchException()
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    dto
                )
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
                userPasswordService.resetPasswordAttemptInTx
            ).not.toHaveBeenCalled();
            expect(outboxService.withTransaction).not.toHaveBeenCalled();
        });

        it('throws UserPasswordAttemptMaxException at the max attempt and writes nothing', async () => {
            userAuthService.assertPasswordAttempt.mockRejectedValue(
                new UserPasswordAttemptMaxException()
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    dto
                )
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.passwordAttemptMax,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.passwordAttemptMax
                    ],
                messagePath: 'user.error.passwordAttemptMax',
            });

            expect(outboxService.withTransaction).not.toHaveBeenCalled();
            expect(userAuthService.assertPasswordAttempt).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                credential,
                'old-password'
            );
            expect(passwordHistoryService.assertNew).not.toHaveBeenCalled();
            expect(userService.updatePasswordInTx).not.toHaveBeenCalled();
        });

        it('resets no counter outside the transaction when the main step fails after a correct password', async () => {
            outboxService.withTransaction.mockRejectedValue(
                new Error('database exploded')
            );
            databaseUtil.toException.mockReturnValue(null);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    dto
                )
            ).rejects.toThrow(AppUnknownException);

            expect(
                userPasswordService.resetPasswordAttemptInTx
            ).not.toHaveBeenCalled();
        });

        it('adds no effect when the transaction fails', async () => {
            const cause = new Error('database exploded');
            outboxService.withTransaction.mockRejectedValue(cause);
            databaseUtil.toException.mockReturnValue(null);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    dto
                )
            ).rejects.toThrow(AppUnknownException);
            expect(outboxService.addManyInTx).not.toHaveBeenCalled();
        });

        it('throws AuthTwoFactorInvalidException when a verified two-factor loses a write conflict', async () => {
            const cause = new Error('write conflict');
            userTwoFactorService.checkIfRequired.mockResolvedValue(
                twoFactorChecked
            );
            outboxService.withTransaction.mockRejectedValue(cause);
            databaseUtil.toException.mockReturnValue(
                new DatabaseWriteConflictException()
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    {
                        ...dto,
                        backupCode: 'backup',
                        method: EnumAuthTwoFactorMethod.backupCodes,
                    }
                )
            ).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.twoFactorInvalid,
            });
            expect(databaseUtil.toException).toHaveBeenCalledWith(cause);
        });

        it('throws AppUnknownException on a write conflict without two-factor', async () => {
            const cause = new Error('write conflict');
            outboxService.withTransaction.mockRejectedValue(cause);
            databaseUtil.toException.mockReturnValue(
                new DatabaseWriteConflictException()
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    dto
                )
            ).rejects.toThrow(AppUnknownException);
        });

        it('rethrows a typed exception from the transaction as is', async () => {
            const failure = new UserPasswordNotMatchException();
            outboxService.withTransaction.mockRejectedValue(failure);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    dto
                )
            ).rejects.toBe(failure);
            expect(databaseUtil.toException).not.toHaveBeenCalled();
        });
    });
});
