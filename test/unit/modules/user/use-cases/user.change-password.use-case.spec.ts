import { buildDeferred } from '@test/unit/helpers/test.unit.deferred.helper';
import type { IActivityLogCreateManyEffect } from '@modules/activity-log/interfaces/activity-log.interface';
import {
    TestUnitReauthenticationMfaFailure,
    TestUnitReauthenticationMfaOff,
    TestUnitReauthenticationPasswordLimit,
    TestUnitReauthenticationPasswordPassed,
} from '@test/unit/helpers/test.unit.user.helper';
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
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
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
import { UserPasswordService } from '@modules/user/services/user.password.service';
import { buildMfaFactorState } from '@test/unit/helpers/test.unit.mfa.helper';
import { MfaService } from '@modules/mfa/services/mfa.service';
import { UserAuthService } from '@modules/user/services/user.auth.service';
import { PasswordHistoryMustNewException } from '@modules/password-history/exceptions/password-history.must-new.exception';
import { UserNotFoundException } from '@modules/user/exceptions/user.not-found.exception';
import { UserPasswordNotMatchException } from '@modules/user/exceptions/user.password-not-match.exception';
import type { UserChangePasswordRequestDto } from '@modules/user/dtos/request/user.change-password.request.dto';
import { UserChangePasswordUseCase } from '@modules/user/use-cases/user.change-password.use-case';
import {
    buildRequestContext,
    buildApiKeyContext,
    buildAuthJwtAccessContext,
    buildUser,
    buildUserContext,
} from '@test/unit/helpers/test.unit.request.helper';

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
    const userPasswordService: MockProxy<UserPasswordService> =
        mock<UserPasswordService>();
    const userAuthService: MockProxy<UserAuthService> = mock<UserAuthService>();
    const mfaService: MockProxy<MfaService> = mock<MfaService>();
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

    let useCase: UserChangePasswordUseCase;

    const user = buildUser('user-linden', 'linden@example.com');
    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    const authContext = buildAuthJwtAccessContext(user.id);
    const factorState = buildMfaFactorState('user-linden');
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
    const revoked: ISessionRef[] = [{ id: 'session-one', userId: 'user-1' }];
    const tx = {} as IDatabaseTransactionClient;
    const passwordHistory = { id: 'history-linden' } as PasswordHistory;
    const updatedRow = {
        id: 'user-linden',
        updatedAt: new Date('2026-03-01T00:00:00.000Z'),
    } as User;

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
                { provide: UserPasswordService, useValue: userPasswordService },
                { provide: UserAuthService, useValue: userAuthService },
                { provide: MfaService, useValue: mfaService },
                {
                    provide: PasswordHistoryService,
                    useValue: passwordHistoryService,
                },
                { provide: SessionService, useValue: sessionService },
                { provide: NotificationQueue, useValue: notificationQueue },
                { provide: AuthPasswordService, useValue: authPasswordService },
                AuthPasswordUtil,
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
            ],
        }).compile();
        useCase = module.get(UserChangePasswordUseCase);
    });

    describe('execute', () => {
        const dto: UserChangePasswordRequestDto = {
            newPassword: 'new-password',
            password: 'old-password',
        };

        beforeEach(() => {
            userAuthService.checkReauthenticationPassword.mockResolvedValue(
                TestUnitReauthenticationPasswordPassed
            );
            mfaService.checkReauthentication.mockResolvedValue(
                TestUnitReauthenticationMfaOff
            );
            mfaService.getFactorState.mockResolvedValue(factorState);
            userAuthService.getReauthenticationVerificationId.mockResolvedValue(
                null
            );
            authPasswordService.create.mockResolvedValue(password);
            userPasswordService.replaceInTx.mockResolvedValue(updatedRow);
            passwordHistoryService.createInTx.mockResolvedValue(
                passwordHistory
            );
            sessionService.revokeActiveByUserExceptInTx.mockResolvedValue(
                revoked
            );
        });

        it('commits the failed count in a transaction of its own, then throws, and leaves the work undone', async () => {
            const refusal = new Error('refused');
            userAuthService.checkReauthenticationPassword.mockResolvedValue({
                isPasswordChecked: true,
                limit: TestUnitReauthenticationPasswordLimit,
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
                TestUnitReauthenticationPasswordLimit
            );
            expect(
                userAuthService.countFailedReauthenticationInTx
            ).toHaveBeenCalledBefore(
                userAuthService.throwFailedReauthentication
            );
            expect(
                userAuthService.throwFailedReauthentication
            ).toHaveBeenCalledWith(true);
            expect(
                userAuthService.completeReauthenticationInTx
            ).not.toHaveBeenCalled();
            expect(mfaService.checkReauthentication).not.toHaveBeenCalled();
        });

        it('commits the failed MFA count in a transaction of its own, then throws, and leaves the work undone', async () => {
            const refusal = new Error('refused');
            mfaService.checkReauthentication.mockResolvedValue({
                isEnabled: true,
                check: null,
                failure: TestUnitReauthenticationMfaFailure,
                passkeyChallengeToken: null,
            });
            mfaService.countFailedAttemptInTx.mockResolvedValue(true);
            mfaService.throwFailedAttempt.mockImplementation(() => {
                throw refusal;
            });

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
            expect(mfaService.countFailedAttemptInTx).toHaveBeenCalledWith(
                tx,
                requestContext,
                apiKeyContext,
                authContext.userId,
                TestUnitReauthenticationMfaFailure
            );
            expect(mfaService.countFailedAttemptInTx).toHaveBeenCalledBefore(
                mfaService.throwFailedAttempt
            );
            expect(mfaService.throwFailedAttempt).toHaveBeenCalledWith(
                TestUnitReauthenticationMfaFailure,
                true
            );
            expect(
                userAuthService.getReauthenticationVerificationId
            ).not.toHaveBeenCalled();
            expect(
                userAuthService.completeReauthenticationInTx
            ).not.toHaveBeenCalled();
            expect(
                mfaService.completeReauthenticationInTx
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

            expect(
                userAuthService.checkReauthenticationPassword
            ).toHaveBeenCalledWith(user, {
                action: EnumUserReauthenticationAction.changePassword,
                password: 'old-password',
                method: EnumMfaMethod.totp,
                code: '654321',
                backupCode: null,
                passkeyChallengeToken: 'challenge-quartz',
                passkeyResponse,
                otp: '123456',
            });
            expect(passwordHistoryService.assertNew).toHaveBeenCalledWith(
                'user-linden',
                'new-password'
            );
            expect(authPasswordService.assertAllowed).toHaveBeenCalledWith(
                'new-password',
                ['ACK Boilerplate', 'linden', 'jane', 'Jane Doe']
            );
            expect(
                userAuthService.checkReauthenticationPassword
            ).toHaveBeenCalledBefore(authPasswordService.assertAllowed);
            expect(passwordHistoryService.assertNew).toHaveBeenCalledBefore(
                authPasswordService.create
            );
            expect(authPasswordService.assertAllowed).toHaveBeenCalledBefore(
                authPasswordService.create
            );
            expect(authPasswordService.create).toHaveBeenCalledWith(
                'new-password'
            );
            expect(authPasswordService.create).toHaveBeenCalledBefore(
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
            userPasswordService.replaceInTx.mockImplementation(async () => {
                calls.push('updatePassword');

                return updatedRow;
            });
            passwordHistoryService.createInTx.mockImplementation(async () => {
                calls.push('createHistory');

                return passwordHistory;
            });
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
            ).toHaveBeenCalledWith(tx, authContext, true, null, true);
            expect(mfaService.getFactorState).toHaveBeenCalledTimes(1);
            expect(mfaService.getFactorState).toHaveBeenCalledWith(
                'user-linden'
            );
            expect(mfaService.checkReauthentication).toHaveBeenCalledWith(
                'user-linden',
                expect.objectContaining({
                    action: EnumUserReauthenticationAction.changePassword,
                }),
                true,
                factorState
            );
            expect(mfaService.getFactorState).toHaveBeenCalledBefore(
                mfaService.checkReauthentication
            );
            expect(
                mfaService.completeReauthenticationInTx
            ).toHaveBeenCalledWith(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                TestUnitReauthenticationMfaOff
            );
            expect(userPasswordService.replaceInTx).toHaveBeenCalledWith(
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
                'revokeSessions',
                'addEffects',
                'commit',
            ]);
        });

        it('starts the history and the session revoke while the password update is pending, after the completion resolved', async () => {
            const update = buildDeferred<User>();
            userPasswordService.replaceInTx.mockReturnValue(update.promise);

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
            ).toHaveBeenCalledBefore(userPasswordService.replaceInTx);
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
            userAuthService.checkReauthenticationPassword.mockResolvedValue({
                isPasswordChecked: false,
                limit: null,
            });

            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                { newPassword: 'new-password' }
            );

            expect(passwordHistoryService.assertNew).not.toHaveBeenCalled();
            expect(
                userAuthService.checkReauthenticationPassword
            ).toHaveBeenCalledWith(user, {
                action: EnumUserReauthenticationAction.changePassword,
                password: null,
                method: null,
                code: null,
                backupCode: null,
                passkeyChallengeToken: null,
                passkeyResponse: null,
                otp: null,
            });
            expect(userPasswordService.replaceInTx).toHaveBeenCalled();
        });

        it('writes nothing and checks nothing further when the re-authentication fails', async () => {
            const failure = new UserPasswordNotMatchException();
            userAuthService.checkReauthenticationPassword.mockRejectedValue(
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

            expect(passwordHistoryService.assertNew).not.toHaveBeenCalled();
            expect(authPasswordService.assertAllowed).not.toHaveBeenCalled();
            expect(authPasswordService.create).not.toHaveBeenCalled();
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('writes nothing when the MFA budget is spent', async () => {
            const limit = new MfaAttemptMaxException();
            mfaService.checkReauthentication.mockRejectedValue(limit);

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

            expect(authPasswordService.create).not.toHaveBeenCalled();
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

            expect(userPasswordService.replaceInTx).not.toHaveBeenCalled();
            expect(outboxService.addManyInTx).not.toHaveBeenCalled();
        });

        it('passes the UserNotFoundException the password write rejected through untouched', async () => {
            const rejected = new UserNotFoundException();
            databaseService.withTransaction.mockRejectedValue(rejected);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    dto
                )
            ).rejects.toBe(rejected);
        });
    });
});
