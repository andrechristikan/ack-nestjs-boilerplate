import { buildDeferred } from '@test/unit/helpers/test.unit.deferred.helper';
import type { IActivityLogCreateManyEffect } from '@modules/activity-log/interfaces/activity-log.interface';
import { TestUnitReauthenticationPasswordFailure } from '@test/unit/helpers/test.unit.user.helper';
import type { INotificationNotifyEffect } from '@modules/notification/interfaces/notification.interface';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumActivityLogAction,
    EnumPasswordHistoryType,
    EnumUserReauthenticationAction,
} from '@generated/prisma-client/client';
import type { PasswordHistory, User } from '@generated/prisma-client/client';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { EnumAppStatusCodeError } from '@app/enums/app.status-code.enum';
import { DatabaseUtil } from '@common/database/utils/database.util';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import type { MockInstance } from 'vitest';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { TestUnitUserConfigValues } from '@test/unit/helpers/test.unit.user.helper';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import { DatabaseService } from '@common/database/services/database.service';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
import {
    EnumActivityLogProcess,
    EnumActivityLogQueue,
} from '@modules/activity-log/enums/activity-log.enum';
import { EnumMfaMethod } from '@modules/mfa/enums/mfa.enum';
import { MfaAttemptMaxException } from '@modules/mfa/exceptions/mfa.attempt-max.exception';
import { MfaInvalidException } from '@modules/mfa/exceptions/mfa.invalid.exception';
import type { IAuthPassword } from '@modules/auth/interfaces/auth.interface';
import { AuthPasswordCommonException } from '@modules/auth/exceptions/auth.password-common.exception';
import { AuthPasswordService } from '@modules/auth/services/auth.password.service';
import { AuthPasswordUtil } from '@modules/auth/utils/auth.password.util';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
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
import { PasswordHistoryMustNewException } from '@modules/password-history/exceptions/password-history.must-new.exception';
import { UserPasswordNotMatchException } from '@modules/user/exceptions/user.password-not-match.exception';
import type { UserChangePasswordRequestDto } from '@modules/user/dtos/request/user.change-password.request.dto';
import type { IUserReauthenticationCheck } from '@modules/user/interfaces/user.interface';
import { UserChangePasswordUseCase } from '@modules/user/use-cases/user.change-password.use-case';
import {
    buildRequestContext,
    buildApiKeyContext,
    buildAuthJwtAccessContext,
    buildUser,
    buildUserContext,
} from '@test/unit/helpers/test.unit.request.helper';
import { EnumMfaStatusCodeError } from '@modules/mfa/enums/mfa.status-code.enum';
import { buildPrismaKnownRequestError } from '@test/unit/helpers/test.unit.database.helper';

const passkeyResponse = {
    id: 'AbC_-123',
    rawId: 'AbC_-123',
    response: {
        clientDataJSON: 'clientDataQuartz',
        authenticatorData: 'authenticatorDataQuartz',
        signature: 'signatureQuartz',
    },
    clientExtensionResults: {},
    type: 'public-key',
} as const;

describe('UserChangePasswordUseCase', () => {
    const userService: MockProxy<UserService> = mock<UserService>();
    const userPasswordService: MockProxy<UserPasswordService> =
        mock<UserPasswordService>();
    const userAuthService: MockProxy<UserAuthService> = mock<UserAuthService>();
    const passwordHistoryService: MockProxy<PasswordHistoryService> =
        mock<PasswordHistoryService>();
    const sessionService: MockProxy<SessionService> = mock<SessionService>();
    const notificationQueue: MockProxy<NotificationQueue> =
        mock<NotificationQueue>();
    const authPasswordService: MockProxy<AuthPasswordService> =
        mock<AuthPasswordService>();
    const activityLogQueue: MockProxy<ActivityLogQueue> =
        mock<ActivityLogQueue>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();

    let helperHashService: HelperHashService;
    let argon2Hash: MockInstance<HelperHashService['argon2Hash']>;
    let useCase: UserChangePasswordUseCase;

    const user = buildUser('user-linden', 'linden@example.com');
    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    const authContext = buildAuthJwtAccessContext(user.id);
    const userContext = buildUserContext(user);
    const password: IAuthPassword = {
        passwordHash: 'hashed',
        passwordExpired: null,
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
    const notifyEffect: INotificationNotifyEffect = {
        queue: EnumNotificationQueue.notification,
        name: EnumNotificationProcess.notify,
        data: {
            kind: EnumNotificationKind.changePassword,
            context: {
                userId: 'user-linden',
                proceedBy: 'user-linden',
                snapshot: null,
                verificationId: null,
            },
            recipient: null,
            notificationId: null,
        },
        priority: EnumQueuePriority.medium,
        idempotencyKey: null,
    };
    const revoked: ISessionRef[] = [{ id: 'session-one' }];
    const tx = {} as IDatabaseTransactionClient;
    const passwordHistory = { id: 'history-linden' } as PasswordHistory;
    const updatedRow = {
        id: 'user-linden',
        updatedAt: new Date('2026-03-01T00:00:00.000Z'),
    } as User;
    const passwordOnly: IUserReauthenticationCheck = {
        isPasswordChecked: true,
        mfa: null,
        verificationId: null,
        passkeyChallengeToken: null,
    };
    const withMfa: IUserReauthenticationCheck = {
        isPasswordChecked: true,
        mfa: {
            method: EnumMfaMethod.totp,
            totpStep: 58123456,
            backupCodeHash: null,
            passkey: null,
        },
        verificationId: null,
        passkeyChallengeToken: null,
    };

    beforeAll(() => {
        vi.useFakeTimers();
    });

    afterAll(() => {
        vi.useRealTimers();
    });

    beforeEach(async () => {
        activityLogQueue.recordEffect.mockReturnValue(changeEntry);
        databaseService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );
        notificationQueue.notify.mockReturnValue(notifyEffect);
        vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserChangePasswordUseCase,
                { provide: UserService, useValue: userService },
                { provide: UserPasswordService, useValue: userPasswordService },
                { provide: UserAuthService, useValue: userAuthService },
                {
                    provide: PasswordHistoryService,
                    useValue: passwordHistoryService,
                },
                { provide: SessionService, useValue: sessionService },
                { provide: NotificationQueue, useValue: notificationQueue },
                { provide: AuthPasswordService, useValue: authPasswordService },
                AuthPasswordUtil,
                HelperHashService,
                HelperDateService,
                HelperStringService,
                {
                    provide: ConfigService,
                    useValue: buildConfigService({
                        ...TestUnitUserConfigValues,
                        'app.name': 'ACK Boilerplate',
                    }),
                },
                { provide: ActivityLogQueue, useValue: activityLogQueue },
                { provide: DatabaseService, useValue: databaseService },
                { provide: OutboxService, useValue: outboxService },
                DatabaseUtil,
            ],
        }).compile();
        helperHashService = module.get(HelperHashService);
        useCase = module.get(UserChangePasswordUseCase);
    });

    describe('execute', () => {
        const dto: UserChangePasswordRequestDto = {
            newPassword: 'new-password',
            password: 'old-password',
        };

        beforeEach(() => {
            userAuthService.checkReauthentication.mockResolvedValue({
                check: passwordOnly,
                failure: null,
            });
            argon2Hash = vi
                .spyOn(helperHashService, 'argon2Hash')
                .mockResolvedValue('hashed');
            userService.updatePasswordInTx.mockResolvedValue(updatedRow);
            passwordHistoryService.createInTx.mockResolvedValue(
                passwordHistory
            );
            sessionService.revokeActiveByUserExceptInTx.mockResolvedValue(
                revoked
            );
        });

        it('commits the failed count in a transaction of its own, then throws, and leaves the work undone', async () => {
            const refusal = new Error('refused');
            userAuthService.checkReauthentication.mockResolvedValue({
                check: null,
                failure: TestUnitReauthenticationPasswordFailure,
            });
            userAuthService.countFailedReauthenticationInTx.mockResolvedValue(
                true
            );
            userAuthService.throwFailedReauthentication.mockImplementation(
                () => {
                    throw refusal;
                }
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    dto
                )
            ).rejects.toBe(refusal);

            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
            expect(
                userAuthService.countFailedReauthenticationInTx
            ).toHaveBeenCalledWith(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                TestUnitReauthenticationPasswordFailure
            );
            expect(
                userAuthService.countFailedReauthenticationInTx
            ).toHaveBeenCalledBefore(
                userAuthService.throwFailedReauthentication
            );
            expect(
                userAuthService.throwFailedReauthentication
            ).toHaveBeenCalledWith(
                TestUnitReauthenticationPasswordFailure,
                true
            );
            expect(
                userAuthService.completeReauthenticationInTx
            ).not.toHaveBeenCalled();
        });

        it('asserts the re-authentication, then the history, the allowed password, and the hash before the transaction', async () => {
            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                {
                    ...dto,
                    method: EnumMfaMethod.totp,
                    code: '654321',
                    passkeyChallengeToken: 'challenge-quartz',
                    passkeyResponse,
                    otp: '123456',
                }
            );

            expect(userAuthService.checkReauthentication).toHaveBeenCalledWith(
                user,
                {
                    action: EnumUserReauthenticationAction.changePassword,
                    password: 'old-password',
                    method: EnumMfaMethod.totp,
                    code: '654321',
                    backupCode: null,
                    passkeyChallengeToken: 'challenge-quartz',
                    passkeyResponse,
                    otp: '123456',
                }
            );
            expect(passwordHistoryService.assertNew).toHaveBeenCalledWith(
                'user-linden',
                'new-password'
            );
            expect(authPasswordService.assertAllowed).toHaveBeenCalledWith(
                'new-password',
                ['ACK Boilerplate', 'linden', 'jane', 'Jane Doe']
            );
            expect(
                userAuthService.checkReauthentication
            ).toHaveBeenCalledBefore(authPasswordService.assertAllowed);
            expect(passwordHistoryService.assertNew).toHaveBeenCalledBefore(
                argon2Hash
            );
            expect(authPasswordService.assertAllowed).toHaveBeenCalledBefore(
                argon2Hash
            );
            expect(argon2Hash).toHaveBeenCalledWith('new-password');
            expect(argon2Hash).toHaveBeenCalledBefore(
                databaseService.withTransaction
            );
        });

        it('completes the re-authentication first, then writes the change, its entry, and the notification on one transaction', async () => {
            const calls: string[] = [];
            databaseService.withTransaction.mockImplementation(async fn => {
                calls.push('begin');
                const value = await fn(tx);
                calls.push('commit');

                return value as never;
            });
            userAuthService.completeReauthenticationInTx.mockImplementation(
                async () => {
                    calls.push('complete');
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

            expect(
                userAuthService.completeReauthenticationInTx
            ).toHaveBeenCalledWith(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                passwordOnly
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
            ).toHaveBeenCalledWith(tx, 'user-linden', 'user-linden');
            expect(
                sessionService.revokeActiveByUserExceptInTx
            ).toHaveBeenCalledWith(
                tx,
                'user-linden',
                'session-1',
                'user-linden',
                password.passwordCreated
            );
            expect(activityLogQueue.recordEffect).toHaveBeenCalledTimes(1);
            expect(activityLogQueue.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                null,
                { action: EnumActivityLogAction.userPasswordChanged }
            );
            expect(notificationQueue.notify).toHaveBeenCalledWith(
                EnumNotificationKind.changePassword,
                { userId: 'user-linden', proceedBy: 'user-linden' }
            );
            expect(outboxService.addManyInTx).toHaveBeenCalledWith(tx, [
                changeEntry,
                notifyEffect,
            ]);
            expect(calls).toEqual([
                'begin',
                'complete',
                'updatePassword',
                'createHistory',
                'markUnusedResetsUsed',
                'revokeSessions',
                'addEffects',
                'commit',
            ]);
        });

        it('starts the history, the reset mark, and the session revoke while the password update is pending, after the completion resolved', async () => {
            const update = buildDeferred<User>();
            userService.updatePasswordInTx.mockReturnValue(update.promise);

            const running = useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                dto
            );
            await vi.advanceTimersByTimeAsync(0);

            expect(
                userAuthService.completeReauthenticationInTx
            ).toHaveBeenCalledBefore(userService.updatePasswordInTx);
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
            ).toHaveBeenCalledWith(tx, 'user-linden', 'user-linden');
            expect(
                sessionService.revokeActiveByUserExceptInTx
            ).toHaveBeenCalledWith(
                tx,
                'user-linden',
                'session-1',
                'user-linden',
                password.passwordCreated
            );
            expect(outboxService.addManyInTx).not.toHaveBeenCalled();

            update.resolve(updatedRow);
            await running;

            expect(outboxService.addManyInTx).toHaveBeenCalledWith(tx, [
                changeEntry,
                notifyEffect,
            ]);
        });

        it('checks no history for an account with no password', async () => {
            userAuthService.checkReauthentication.mockResolvedValue({
                check: {
                    ...passwordOnly,
                    isPasswordChecked: false,
                },
                failure: null,
            });

            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                { newPassword: 'new-password' }
            );

            expect(passwordHistoryService.assertNew).not.toHaveBeenCalled();
            expect(userAuthService.checkReauthentication).toHaveBeenCalledWith(
                user,
                {
                    action: EnumUserReauthenticationAction.changePassword,
                    password: null,
                    method: null,
                    code: null,
                    backupCode: null,
                    passkeyChallengeToken: null,
                    passkeyResponse: null,
                    otp: null,
                }
            );
            expect(userService.updatePasswordInTx).toHaveBeenCalled();
        });

        it('writes nothing and checks nothing further when the re-authentication fails', async () => {
            const failure = new UserPasswordNotMatchException();
            userAuthService.checkReauthentication.mockRejectedValue(failure);

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
            expect(authPasswordService.assertAllowed).not.toHaveBeenCalled();
            expect(argon2Hash).not.toHaveBeenCalled();
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('writes nothing when the MFA budget is spent', async () => {
            const limit = new MfaAttemptMaxException();
            userAuthService.checkReauthentication.mockRejectedValue(limit);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    dto
                )
            ).rejects.toBe(limit);

            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('calls the allowed-password check while the history check is still pending', async () => {
            const history = buildDeferred<void>();
            passwordHistoryService.assertNew.mockReturnValue(history.promise);

            const running = useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                dto
            );
            await vi.advanceTimersByTimeAsync(0);

            expect(authPasswordService.assertAllowed).toHaveBeenCalled();

            history.resolve();
            await running;
        });

        it('refuses a disallowed new password before it hashes', async () => {
            const refused = new AuthPasswordCommonException();
            authPasswordService.assertAllowed.mockRejectedValue(refused);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    dto
                )
            ).rejects.toBe(refused);

            expect(argon2Hash).not.toHaveBeenCalled();
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('opens no transaction when the new password repeats an old one', async () => {
            const failure = new PasswordHistoryMustNewException(3);
            passwordHistoryService.assertNew.mockRejectedValue(failure);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    dto
                )
            ).rejects.toBe(failure);

            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('adds no effect and no write when the completion refuses the proof', async () => {
            const failure = new MfaInvalidException();
            userAuthService.completeReauthenticationInTx.mockRejectedValue(
                failure
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    dto
                )
            ).rejects.toBe(failure);

            expect(userService.updatePasswordInTx).not.toHaveBeenCalled();
            expect(outboxService.addManyInTx).not.toHaveBeenCalled();
        });

        it('answers MfaInvalidException when a verified MFA user loses a write conflict', async () => {
            const conflict = buildPrismaKnownRequestError('P2034');
            userAuthService.checkReauthentication.mockResolvedValue({
                check: withMfa,
                failure: null,
            });
            databaseService.withTransaction.mockRejectedValue(conflict);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    dto
                )
            ).rejects.toMatchObject({
                statusCode: EnumMfaStatusCodeError.invalid,

                module: 'mfa',
            });
        });

        it('wraps a write conflict in AppUnknownException when no MFA proof was checked', async () => {
            databaseService.withTransaction.mockRejectedValue(
                buildPrismaKnownRequestError('P2034')
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
                module: 'app',
                statusCode: EnumAppStatusCodeError.unknown,
            });
        });

        it('wraps an unknown transaction failure in AppUnknownException', async () => {
            const cause = new Error('boom');
            databaseService.withTransaction.mockRejectedValue(cause);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    dto
                )
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: cause,
            });
        });
    });
});
