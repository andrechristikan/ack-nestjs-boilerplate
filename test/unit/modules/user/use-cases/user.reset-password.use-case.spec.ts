import { buildDeferred } from '@test/unit/helpers/test.unit.deferred.helper';
import type { IActivityLogCreateManyEffect } from '@modules/activity-log/interfaces/activity-log.interface';
import type { IMfaAttemptFailure } from '@modules/mfa/interfaces/mfa.interface';
import type { INotificationNotifyEffect } from '@modules/notification/interfaces/notification.interface';
import { MfaAttemptMaxException } from '@modules/mfa/exceptions/mfa.attempt-max.exception';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumActivityLogAction,
    EnumMfaChallengePurpose,
    EnumPasswordHistoryType,
} from '@generated/prisma-client/client';
import type { PasswordHistory, User } from '@generated/prisma-client/client';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import type { MockInstance } from 'vitest';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { TestUnitUserConfigValues } from '@test/unit/helpers/test.unit.user.helper';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import { DatabaseService } from '@common/database/services/database.service';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
import {
    EnumActivityLogProcess,
    EnumActivityLogQueue,
} from '@modules/activity-log/enums/activity-log.enum';
import { EnumMfaMethod } from '@modules/mfa/enums/mfa.enum';
import { MfaMethodRequiredException } from '@modules/mfa/exceptions/mfa.method-required.exception';
import { EnumMfaStatusCodeError } from '@modules/mfa/enums/mfa.status-code.enum';
import type { IMfaCheck } from '@modules/mfa/interfaces/mfa.interface';
import type { IAuthPassword } from '@modules/auth/interfaces/auth.interface';
import { AuthPasswordCommonException } from '@modules/auth/exceptions/auth.password-common.exception';
import { AuthPasswordService } from '@modules/auth/services/auth.password.service';
import { AuthPasswordUtil } from '@modules/auth/utils/auth.password.util';
import { NotificationService } from '@modules/notification/services/notification.service';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import {
    EnumNotificationKind,
    EnumNotificationProcess,
    EnumNotificationQueue,
} from '@modules/notification/enums/notification.enum';
import type { INotificationSnapshot } from '@modules/notification/interfaces/notification.interface';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import { PasswordHistoryService } from '@modules/password-history/services/password-history.service';
import { SessionService } from '@modules/session/services/session.service';
import type { ISessionRef } from '@modules/session/interfaces/session.interface';
import { UserService } from '@modules/user/services/user.service';
import { UserPasswordService } from '@modules/user/services/user.password.service';
import { MfaService } from '@modules/mfa/services/mfa.service';
import { MfaChallengeService } from '@modules/mfa/services/mfa.challenge.service';
import { MfaChallengeInvalidException } from '@modules/mfa/exceptions/mfa.challenge-invalid.exception';
import { MfaInvalidException } from '@modules/mfa/exceptions/mfa.invalid.exception';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { UserTokenInvalidException } from '@modules/user/exceptions/user.token-invalid.exception';
import type { UserForgotPasswordResetRequestDto } from '@modules/user/dtos/request/user.forgot-password-reset.request.dto';
import type {
    IUser,
    IUserForgotPassword,
} from '@modules/user/interfaces/user.interface';
import { UserResetPasswordUseCase } from '@modules/user/use-cases/user.reset-password.use-case';
import {
    buildApiKeyContext,
    buildRequestContext,
    buildUser,
} from '@test/unit/helpers/test.unit.request.helper';
import { buildPrismaKnownRequestError } from '@test/unit/helpers/test.unit.database.helper';

describe('UserResetPasswordUseCase', () => {
    const userService: MockProxy<UserService> = mock<UserService>();
    const userPasswordService: MockProxy<UserPasswordService> =
        mock<UserPasswordService>();
    const mfaService: MockProxy<MfaService> = mock<MfaService>();
    const mfaChallengeService: MockProxy<MfaChallengeService> =
        mock<MfaChallengeService>();
    const passwordHistoryService: MockProxy<PasswordHistoryService> =
        mock<PasswordHistoryService>();
    const sessionService: MockProxy<SessionService> = mock<SessionService>();
    const notificationService: MockProxy<NotificationService> =
        mock<NotificationService>();
    const notificationQueue: MockProxy<NotificationQueue> =
        mock<NotificationQueue>();
    const authPasswordService: MockProxy<AuthPasswordService> =
        mock<AuthPasswordService>();
    const activityLogQueue: MockProxy<ActivityLogQueue> =
        mock<ActivityLogQueue>();
    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();

    let helperHashService: HelperHashService;
    let argon2Hash: MockInstance<HelperHashService['argon2Hash']>;
    let useCase: UserResetPasswordUseCase;

    const user: IUser = {
        ...buildUser('user-linden', 'linden@example.com'),
        name: 'Linden Frost',
        username: 'lindenFrost',
    };
    const password: IAuthPassword = {
        passwordHash: 'hashed',
        passwordExpired: null,
        passwordCreated: new Date('2026-01-01T00:00:00.000Z'),
        passwordPeriodExpired: new Date('2026-04-01T00:00:00.000Z'),
    };
    const resetEntry: IActivityLogCreateManyEffect = {
        queue: EnumActivityLogQueue.activityLog,
        name: EnumActivityLogProcess.createMany,
        data: { rows: [] },
        priority: EnumQueuePriority.low,
        idempotencyKey: 'reset',
    };
    const verifyEntry: IActivityLogCreateManyEffect = {
        ...resetEntry,
        idempotencyKey: 'verify',
    };
    const snapshot: INotificationSnapshot = {
        username: 'lindenFrost',
        encryptedEmail: 'cipher(linden@example.com)',
        encryptedTokens: ['cipher(token-one)'],
    };
    const notifyEffect: INotificationNotifyEffect = {
        queue: EnumNotificationQueue.notification,
        name: EnumNotificationProcess.notify,
        data: {
            kind: EnumNotificationKind.resetPassword,
            context: {
                userId: 'user-linden',
                proceedBy: 'user-linden',
                snapshot,
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
    const mfaChecked: IMfaCheck = {
        method: EnumMfaMethod.totp,
        totpStep: 58123456,
        backupCodeHash: null,
        passkey: null,
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

    beforeAll(() => {
        vi.useFakeTimers();
    });

    afterAll(() => {
        vi.useRealTimers();
    });

    beforeEach(async () => {
        activityLogQueue.recordEffect.mockImplementation(
            (
                _requestContext,
                _apiKeyContext,
                _authContext,
                _workspaceContext,
                input
            ) =>
                input.action === EnumActivityLogAction.userMfaVerified
                    ? verifyEntry
                    : resetEntry
        );
        databaseService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );
        notificationService.getSnapshot.mockResolvedValue(snapshot);
        notificationQueue.notify.mockReturnValue(notifyEffect);
        mfaService.isEnabled.mockResolvedValue(false);
        vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserResetPasswordUseCase,
                { provide: UserService, useValue: userService },
                { provide: UserPasswordService, useValue: userPasswordService },
                {
                    provide: MfaService,
                    useValue: mfaService,
                },
                { provide: MfaChallengeService, useValue: mfaChallengeService },
                {
                    provide: PasswordHistoryService,
                    useValue: passwordHistoryService,
                },
                { provide: SessionService, useValue: sessionService },
                {
                    provide: NotificationService,
                    useValue: notificationService,
                },
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
        useCase = module.get(UserResetPasswordUseCase);
    });

    describe('execute', () => {
        const dto: UserForgotPasswordResetRequestDto = {
            newPassword: 'new-password',
            token: 'raw-token',
        };

        beforeEach(() => {
            userPasswordService.getOneActiveReset.mockResolvedValue(resetRow);
            argon2Hash = vi
                .spyOn(helperHashService, 'argon2Hash')
                .mockResolvedValue('hashed');
            userService.updatePasswordInTx.mockResolvedValue(updatedRow);
            passwordHistoryService.createInTx.mockResolvedValue(
                passwordHistory
            );
            sessionService.revokeActiveByUserInTx.mockResolvedValue(revoked);
        });

        it('refuses a disallowed new password with the application name, the email local part, the username, and the name before it hashes', async () => {
            const refused = new AuthPasswordCommonException();
            authPasswordService.assertAllowed.mockRejectedValue(refused);

            await expect(
                useCase.execute(requestContext, apiKeyContext, dto)
            ).rejects.toBe(refused);

            expect(authPasswordService.assertAllowed).toHaveBeenCalledWith(
                'new-password',
                ['ACK Boilerplate', 'linden', 'lindenFrost', 'Linden Frost']
            );
            expect(argon2Hash).not.toHaveBeenCalled();
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('checks the history, hashes, and writes the reset, its entry, and the notification on one transaction', async () => {
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
            notificationService.getSnapshot.mockImplementation(async () => {
                calls.push('snapshot');

                return snapshot;
            });
            outboxService.addManyInTx.mockImplementation(async () => {
                calls.push('addEffects');

                return ['outbox-id'];
            });
            sessionService.revokeActiveByUserInTx.mockImplementation(
                async () => {
                    calls.push('revokeSessions');

                    return revoked;
                }
            );

            await expect(
                useCase.execute(requestContext, apiKeyContext, dto)
            ).resolves.toEqual({});

            expect(userPasswordService.getOneActiveReset).toHaveBeenCalledWith(
                'raw-token'
            );
            expect(passwordHistoryService.assertNew).toHaveBeenCalledWith(
                'user-linden',
                'new-password'
            );
            expect(passwordHistoryService.assertNew).toHaveBeenCalledBefore(
                argon2Hash
            );
            expect(mfaService.isEnabled).toHaveBeenCalledWith('user-linden');
            expect(mfaService.check).not.toHaveBeenCalled();
            expect(argon2Hash).toHaveBeenCalledWith('new-password');
            expect(activityLogQueue.recordEffect).toHaveBeenCalledTimes(1);
            expect(activityLogQueue.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                null,
                null,
                {
                    action: EnumActivityLogAction.userPasswordReset,
                    userId: 'user-linden',
                    createdBy: 'user-linden',
                }
            );
            expect(notificationService.getSnapshot).toHaveBeenCalledWith(user);
            expect(notificationQueue.notify).toHaveBeenCalledWith(
                EnumNotificationKind.resetPassword,
                {
                    userId: 'user-linden',
                    proceedBy: 'user-linden',
                    snapshot,
                }
            );
            expect(outboxService.addManyInTx).toHaveBeenCalledWith(tx, [
                resetEntry,
                notifyEffect,
            ]);
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
                password.passwordCreated,
                'user-linden'
            );
            expect(
                userPasswordService.markUnusedResetsUsedInTx
            ).toHaveBeenCalledWith(tx, 'user-linden', 'user-linden');
            expect(sessionService.revokeActiveByUserInTx).toHaveBeenCalledWith(
                tx,
                'user-linden',
                'user-linden',
                password.passwordCreated
            );
            expect(mfaService.completeInTx).not.toHaveBeenCalled();
            expect(calls).toEqual([
                'snapshot',
                'begin',
                'markResetUsed',
                'updatePassword',
                'createHistory',
                'markUnusedResetsUsed',
                'revokeSessions',
                'addEffects',
                'commit',
            ]);
        });

        it('marks the reset used alone, then starts the history, the unused-reset mark, and the session revoke while the password update is pending', async () => {
            const marked = buildDeferred<void>();
            const update = buildDeferred<User>();
            userPasswordService.markResetUsedInTx.mockReturnValue(
                marked.promise
            );
            userService.updatePasswordInTx.mockReturnValue(update.promise);

            const running = useCase.execute(requestContext, apiKeyContext, dto);
            await vi.advanceTimersByTimeAsync(0);

            expect(userService.updatePasswordInTx).not.toHaveBeenCalled();
            expect(passwordHistoryService.createInTx).not.toHaveBeenCalled();
            expect(
                userPasswordService.markUnusedResetsUsedInTx
            ).not.toHaveBeenCalled();
            expect(
                sessionService.revokeActiveByUserInTx
            ).not.toHaveBeenCalled();

            marked.resolve();
            await vi.advanceTimersByTimeAsync(0);

            expect(passwordHistoryService.createInTx).toHaveBeenCalledWith(
                tx,
                'user-linden',
                'hashed',
                EnumPasswordHistoryType.forgot,
                password.passwordPeriodExpired,
                password.passwordCreated,
                'user-linden'
            );
            expect(
                userPasswordService.markUnusedResetsUsedInTx
            ).toHaveBeenCalledWith(tx, 'user-linden', 'user-linden');
            expect(sessionService.revokeActiveByUserInTx).toHaveBeenCalledWith(
                tx,
                'user-linden',
                'user-linden',
                password.passwordCreated
            );
            expect(outboxService.addManyInTx).not.toHaveBeenCalled();

            update.resolve(updatedRow);
            await running;

            expect(outboxService.addManyInTx).toHaveBeenCalledWith(tx, [
                resetEntry,
                notifyEffect,
            ]);
        });

        it('reads the snapshot before it opens the transaction', async () => {
            await useCase.execute(requestContext, apiKeyContext, dto);

            expect(notificationService.getSnapshot).toHaveBeenCalledBefore(
                databaseService.withTransaction
            );
        });

        it('checks the MFA proof of the reset user, completes it on the transaction, and adds the verify entry', async () => {
            mfaService.isEnabled.mockResolvedValue(true);
            mfaService.check.mockResolvedValue({
                check: mfaChecked,
                failure: null,
            });

            await useCase.execute(requestContext, apiKeyContext, {
                ...dto,
                code: '123456',
                method: EnumMfaMethod.totp,
            });

            expect(mfaService.check).toHaveBeenCalledWith(
                'user-linden',
                {
                    method: EnumMfaMethod.totp,
                    code: '123456',
                    backupCode: null,
                    passkeyResponse: null,
                },
                null
            );
            expect(mfaService.completeInTx).toHaveBeenCalledWith(
                tx,
                'user-linden',
                mfaChecked
            );
            expect(mfaService.completeInTx).toHaveBeenCalledBefore(
                userService.updatePasswordInTx
            );
            expect(activityLogQueue.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                null,
                null,
                {
                    action: EnumActivityLogAction.userMfaVerified,
                    userId: 'user-linden',
                    createdBy: 'user-linden',
                }
            );
            expect(outboxService.addManyInTx).toHaveBeenCalledWith(tx, [
                resetEntry,
                verifyEntry,
                notifyEffect,
            ]);
        });

        describe('with a passkey', () => {
            const passkeyResponse = {
                id: 'credential-linden',
                rawId: 'credential-linden',
                response: {
                    clientDataJSON: 'client-data',
                    authenticatorData: 'authenticator-data',
                    signature: 'signature',
                },
                clientExtensionResults: {},
                type: 'public-key' as const,
            };
            const passkeyDto: UserForgotPasswordResetRequestDto = {
                ...dto,
                method: EnumMfaMethod.passkey,
                passkeyChallengeToken: 'challenge-token',
                passkeyResponse,
            };
            const passkeyChecked: IMfaCheck = {
                method: EnumMfaMethod.passkey,
                totpStep: null,
                backupCodeHash: null,
                passkey: { id: 'passkey-linden', counter: 3 },
            };

            beforeEach(() => {
                mfaService.isEnabled.mockResolvedValue(true);
                mfaChallengeService.getWebAuthnChallengeForUser.mockResolvedValue(
                    'webauthn-challenge'
                );
                mfaService.check.mockResolvedValue({
                    check: passkeyChecked,
                    failure: null,
                });
            });

            it('checks the assertion against the resetPassword challenge, claims it and completes the check on the transaction before the password write', async () => {
                await useCase.execute(
                    requestContext,
                    apiKeyContext,
                    passkeyDto
                );

                expect(
                    mfaChallengeService.getWebAuthnChallengeForUser
                ).toHaveBeenCalledWith(
                    'challenge-token',
                    EnumMfaChallengePurpose.resetPassword,
                    'user-linden'
                );
                expect(mfaService.check).toHaveBeenCalledWith(
                    'user-linden',
                    {
                        method: EnumMfaMethod.passkey,
                        code: null,
                        backupCode: null,
                        passkeyResponse,
                    },
                    'webauthn-challenge'
                );
                expect(mfaService.completeChallengeInTx).toHaveBeenCalledWith(
                    tx,
                    'user-linden',
                    'challenge-token',
                    EnumMfaChallengePurpose.resetPassword,
                    passkeyChecked
                );
                expect(mfaService.completeChallengeInTx).toHaveBeenCalledBefore(
                    userService.updatePasswordInTx
                );
                expect(mfaService.completeInTx).not.toHaveBeenCalled();
                expect(mfaChallengeService.consumeInTx).not.toHaveBeenCalled();
            });

            it('throws MfaChallengeInvalidException and checks nothing when the challenge service rejects the token', async () => {
                mfaChallengeService.getWebAuthnChallengeForUser.mockRejectedValue(
                    new MfaChallengeInvalidException()
                );

                await expect(
                    useCase.execute(requestContext, apiKeyContext, passkeyDto)
                ).rejects.toMatchObject({
                    module: 'mfa',
                    statusCode: EnumMfaStatusCodeError.challengeInvalid,
                });

                expect(
                    mfaChallengeService.getWebAuthnChallengeForUser
                ).toHaveBeenCalledWith(
                    'challenge-token',
                    EnumMfaChallengePurpose.resetPassword,
                    'user-linden'
                );
                expect(mfaService.check).not.toHaveBeenCalled();
                expect(databaseService.withTransaction).not.toHaveBeenCalled();
            });

            it('commits the failed count in a transaction of its own, then throws, and writes and claims nothing on a wrong passkey', async () => {
                const refusal = new MfaInvalidException();
                const failure: IMfaAttemptFailure = {
                    method: EnumMfaMethod.passkey,
                    maxAttempts: 5,
                    lockedUntil: new Date('2026-03-01T00:15:00.000Z'),
                };
                mfaService.check.mockResolvedValue({ check: null, failure });
                mfaService.countFailedAttemptInTx.mockResolvedValue(false);
                mfaService.throwFailedAttempt.mockImplementation(() => {
                    throw refusal;
                });

                await expect(
                    useCase.execute(requestContext, apiKeyContext, passkeyDto)
                ).rejects.toBe(refusal);

                expect(databaseService.withTransaction).toHaveBeenCalledTimes(
                    1
                );
                expect(mfaService.countFailedAttemptInTx).toHaveBeenCalledWith(
                    tx,
                    requestContext,
                    apiKeyContext,
                    'user-linden',
                    failure
                );
                expect(
                    mfaService.countFailedAttemptInTx
                ).toHaveBeenCalledBefore(mfaService.throwFailedAttempt);
                expect(mfaService.throwFailedAttempt).toHaveBeenCalledWith(
                    failure,
                    false
                );
                expect(mfaService.completeChallengeInTx).not.toHaveBeenCalled();
                expect(mfaService.completeInTx).not.toHaveBeenCalled();
                expect(userService.updatePasswordInTx).not.toHaveBeenCalled();
            });

            it('sends no WebAuthn challenge to the check and claims nothing when the token is missing', async () => {
                const { passkeyChallengeToken: _token, ...withoutToken } =
                    passkeyDto;
                mfaService.check.mockRejectedValue(new MfaInvalidException());

                await expect(
                    useCase.execute(requestContext, apiKeyContext, withoutToken)
                ).rejects.toMatchObject({
                    module: 'mfa',
                    statusCode: EnumMfaStatusCodeError.invalid,
                });

                expect(
                    mfaChallengeService.getWebAuthnChallengeForUser
                ).not.toHaveBeenCalled();
                expect(mfaService.check).toHaveBeenCalledWith(
                    'user-linden',
                    expect.objectContaining({ method: EnumMfaMethod.passkey }),
                    null
                );
            });

            it('reads and claims no challenge for a TOTP proof', async () => {
                mfaService.check.mockResolvedValue({
                    check: mfaChecked,
                    failure: null,
                });

                await useCase.execute(requestContext, apiKeyContext, {
                    ...passkeyDto,
                    method: EnumMfaMethod.totp,
                    code: '123456',
                });

                expect(
                    mfaChallengeService.getWebAuthnChallengeForUser
                ).not.toHaveBeenCalled();
                expect(mfaService.completeChallengeInTx).not.toHaveBeenCalled();
                expect(mfaService.completeInTx).toHaveBeenCalledWith(
                    tx,
                    'user-linden',
                    mfaChecked
                );
                expect(mfaService.check).toHaveBeenCalledWith(
                    'user-linden',
                    expect.objectContaining({ method: EnumMfaMethod.totp }),
                    null
                );
            });

            it('ignores the MFA fields when MFA is off', async () => {
                mfaService.isEnabled.mockResolvedValue(false);

                await useCase.execute(
                    requestContext,
                    apiKeyContext,
                    passkeyDto
                );

                expect(
                    mfaChallengeService.getWebAuthnChallengeForUser
                ).not.toHaveBeenCalled();
                expect(mfaService.check).not.toHaveBeenCalled();
                expect(mfaService.completeChallengeInTx).not.toHaveBeenCalled();
                expect(mfaService.completeInTx).not.toHaveBeenCalled();
            });
        });

        it('answers the attempt limit when the MFA budget is spent and writes nothing', async () => {
            const limit = new MfaAttemptMaxException();
            userPasswordService.getOneActiveReset.mockResolvedValue(resetRow);
            mfaService.isEnabled.mockResolvedValue(true);
            mfaService.check.mockRejectedValue(limit);

            await expect(
                useCase.execute(requestContext, apiKeyContext, {
                    ...dto,
                    code: '123456',
                    method: EnumMfaMethod.totp,
                })
            ).rejects.toBe(limit);

            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('throws the method-required exception and writes nothing', async () => {
            userPasswordService.getOneActiveReset.mockResolvedValue(resetRow);
            mfaService.isEnabled.mockResolvedValue(true);
            mfaService.check.mockRejectedValue(
                new MfaMethodRequiredException()
            );

            await expect(
                useCase.execute(requestContext, apiKeyContext, {
                    ...dto,
                    code: '123456',
                })
            ).rejects.toMatchObject({
                module: 'mfa',
                statusCode: EnumMfaStatusCodeError.methodRequired,
            });

            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('checks and writes nothing when the reset lookup rejects', async () => {
            const failure = new Error('flag');
            userPasswordService.getOneActiveReset.mockRejectedValue(failure);

            await expect(
                useCase.execute(requestContext, apiKeyContext, dto)
            ).rejects.toBe(failure);
            expect(passwordHistoryService.assertNew).not.toHaveBeenCalled();
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('calls the history and allowed-password checks while the MFA lookup is still pending', async () => {
            const mfaLookup = buildDeferred<boolean>();
            mfaService.isEnabled.mockReturnValue(mfaLookup.promise);

            const running = useCase.execute(requestContext, apiKeyContext, dto);
            await vi.advanceTimersByTimeAsync(0);

            expect(passwordHistoryService.assertNew).toHaveBeenCalledWith(
                'user-linden',
                'new-password'
            );
            expect(authPasswordService.assertAllowed).toHaveBeenCalledWith(
                'new-password',
                ['ACK Boilerplate', 'linden', 'lindenFrost', 'Linden Frost']
            );

            mfaLookup.resolve(false);
            await running;
        });

        it('writes nothing when the history check rejects', async () => {
            const failure = new Error('must new');
            passwordHistoryService.assertNew.mockRejectedValue(failure);

            await expect(
                useCase.execute(requestContext, apiKeyContext, dto)
            ).rejects.toBe(failure);
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('revokes nothing and adds no effect when the snapshot read rejects', async () => {
            const cause = new Error('read');
            notificationService.getSnapshot.mockRejectedValue(cause);

            await expect(
                useCase.execute(requestContext, apiKeyContext, dto)
            ).rejects.toBe(cause);
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
            expect(
                sessionService.revokeActiveByUserInTx
            ).not.toHaveBeenCalled();
            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });

        it('rethrows a typed exception the transaction raises', async () => {
            const failure = new UserTokenInvalidException();
            databaseService.withTransaction.mockRejectedValue(failure);

            await expect(
                useCase.execute(requestContext, apiKeyContext, dto)
            ).rejects.toBe(failure);
        });

        it('maps a write conflict to UserTokenInvalidException', async () => {
            const conflict = buildPrismaKnownRequestError('P2034');
            databaseService.withTransaction.mockRejectedValue(conflict);

            await expect(
                useCase.execute(requestContext, apiKeyContext, dto)
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.tokenInvalid,
            });
        });

        it('wraps an unknown transaction failure in AppUnknownException', async () => {
            const cause = new Error('database exploded');
            databaseService.withTransaction.mockRejectedValue(cause);

            await expect(
                useCase.execute(requestContext, apiKeyContext, dto)
            ).rejects.toMatchObject({
                rawError: cause,
            });
        });
    });
});
