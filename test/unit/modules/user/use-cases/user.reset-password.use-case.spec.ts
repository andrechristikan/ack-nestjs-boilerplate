import type { IActivityLogCreateManyEffect } from '@modules/activity-log/interfaces/activity-log.interface';
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
    EnumUserLoginFrom,
    EnumUserLoginWith,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
    EnumRoleScope,
} from '@generated/prisma-client/client';
import type { PasswordHistory, User } from '@generated/prisma-client/client';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
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
    buildRequestContext,
    buildApiKeyContext,
} from '@test/unit/helpers/test.unit.request.helper';

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
    const authPasswordService: MockProxy<AuthPasswordService> =
        mock<AuthPasswordService>();
    const authPasswordUtil: MockProxy<AuthPasswordUtil> =
        mock<AuthPasswordUtil>();
    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();
    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();
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
            scope: EnumRoleScope.platform,
            key: 'user',
            name: 'user',
            policyRevision: 0,
        },
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
                input.action === EnumActivityLogAction.userVerifyMfa
                    ? verifyEntry
                    : resetEntry
        );
        outboxService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );
        notificationService.getSnapshot.mockResolvedValue(snapshot);
        notificationService.notify.mockReturnValue(notifyEffect);
        mfaService.isEnabled.mockResolvedValue(false);
        authPasswordUtil.createContextWords.mockReturnValue([
            'ACK Boilerplate',
            'linden',
        ]);

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
                { provide: AuthPasswordService, useValue: authPasswordService },
                { provide: AuthPasswordUtil, useValue: authPasswordUtil },
                {
                    provide: ConfigService,
                    useValue: buildConfigService({
                        'app.name': 'ACK Boilerplate',
                    }),
                },
                { provide: ActivityLogService, useValue: activityLogService },
                { provide: OutboxService, useValue: outboxService },
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

        beforeEach(() => {
            userPasswordService.getOneActiveReset.mockResolvedValue(resetRow);
            authPasswordUtil.createPassword.mockResolvedValue(password);
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

            expect(authPasswordUtil.createContextWords).toHaveBeenCalledWith(
                'ACK Boilerplate',
                'linden@example.com',
                'lindenFrost',
                'Linden Frost'
            );
            expect(authPasswordService.assertAllowed).toHaveBeenCalledWith(
                'new-password',
                ['ACK Boilerplate', 'linden']
            );
            expect(authPasswordUtil.createPassword).not.toHaveBeenCalled();
            expect(outboxService.withTransaction).not.toHaveBeenCalled();
        });

        it('checks the history, hashes, and writes the reset, its entry, and the notification on one transaction', async () => {
            const calls: string[] = [];
            outboxService.withTransaction.mockImplementation(async fn => {
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
                authPasswordUtil.createPassword
            );
            expect(mfaService.isEnabled).toHaveBeenCalledWith('user-linden');
            expect(mfaService.check).not.toHaveBeenCalled();
            expect(authPasswordUtil.createPassword).toHaveBeenCalledWith(
                'new-password'
            );
            expect(activityLogService.recordEffect).toHaveBeenCalledTimes(1);
            expect(activityLogService.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                null,
                null,
                {
                    action: EnumActivityLogAction.userResetPassword,
                    userId: 'user-linden',
                    createdBy: 'user-linden',
                }
            );
            expect(notificationService.getSnapshot).toHaveBeenCalledWith(user);
            expect(notificationService.notify).toHaveBeenCalledWith(
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
                'begin',
                'snapshot',
                'updatePassword',
                'createHistory',
                'markResetUsed',
                'markUnusedResetsUsed',
                'revokeSessions',
                'addEffects',
                'commit',
            ]);
        });

        it('starts the snapshot read while the first statement is pending and reads it before the revoke', async () => {
            let snapshotStarted = false;
            let startedWhenFirstSettles = false;
            notificationService.getSnapshot.mockImplementation(async () => {
                snapshotStarted = true;

                return snapshot;
            });
            outboxService.withTransaction.mockImplementation(
                async fn => fn(tx) as never
            );
            userService.updatePasswordInTx.mockImplementation(async () => {
                await Promise.resolve();
                startedWhenFirstSettles = snapshotStarted;

                return updatedRow;
            });

            await useCase.execute(requestContext, apiKeyContext, dto);

            expect(startedWhenFirstSettles).toBe(true);
            expect(notificationService.getSnapshot).toHaveBeenCalledBefore(
                sessionService.revokeActiveByUserInTx
            );
        });

        it('checks the MFA proof of the reset user, completes it on the transaction, and adds the verify entry', async () => {
            mfaService.isEnabled.mockResolvedValue(true);
            mfaService.check.mockResolvedValue(mfaChecked);

            await useCase.execute(requestContext, apiKeyContext, {
                ...dto,
                code: '123456',
                method: EnumMfaMethod.totp,
            });

            expect(mfaService.check).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
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
            expect(activityLogService.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                null,
                null,
                {
                    action: EnumActivityLogAction.userVerifyMfa,
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
                mfaService.check.mockResolvedValue(passkeyChecked);
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
                    requestContext,
                    apiKeyContext,
                    'user-linden',
                    {
                        method: EnumMfaMethod.passkey,
                        code: null,
                        backupCode: null,
                        passkeyResponse,
                    },
                    'webauthn-challenge'
                );
                expect(mfaChallengeService.consumeInTx).toHaveBeenCalledWith(
                    tx,
                    'challenge-token',
                    EnumMfaChallengePurpose.resetPassword,
                    'user-linden'
                );
                expect(mfaService.completeInTx).toHaveBeenCalledWith(
                    tx,
                    'user-linden',
                    passkeyChecked
                );
                expect(mfaChallengeService.consumeInTx).toHaveBeenCalledBefore(
                    mfaService.completeInTx
                );
                expect(mfaService.completeInTx).toHaveBeenCalledBefore(
                    userService.updatePasswordInTx
                );
            });

            it('throws MfaChallengeInvalidException and checks nothing when the challenge service rejects the token', async () => {
                mfaChallengeService.getWebAuthnChallengeForUser.mockRejectedValue(
                    new MfaChallengeInvalidException()
                );

                await expect(
                    useCase.execute(requestContext, apiKeyContext, passkeyDto)
                ).rejects.toBeInstanceOf(MfaChallengeInvalidException);

                expect(
                    mfaChallengeService.getWebAuthnChallengeForUser
                ).toHaveBeenCalledWith(
                    'challenge-token',
                    EnumMfaChallengePurpose.resetPassword,
                    'user-linden'
                );
                expect(mfaService.check).not.toHaveBeenCalled();
                expect(outboxService.withTransaction).not.toHaveBeenCalled();
            });

            it('rethrows the failure the check counts and writes and claims nothing on a wrong passkey', async () => {
                const mismatch = new MfaInvalidException();
                mfaService.check.mockRejectedValue(mismatch);

                await expect(
                    useCase.execute(requestContext, apiKeyContext, passkeyDto)
                ).rejects.toBe(mismatch);

                expect(outboxService.withTransaction).not.toHaveBeenCalled();
                expect(mfaChallengeService.consumeInTx).not.toHaveBeenCalled();
            });

            it('sends no WebAuthn challenge to the check and claims nothing when the token is missing', async () => {
                const { passkeyChallengeToken: _token, ...withoutToken } =
                    passkeyDto;
                mfaService.check.mockRejectedValue(new MfaInvalidException());

                await expect(
                    useCase.execute(requestContext, apiKeyContext, withoutToken)
                ).rejects.toBeInstanceOf(MfaInvalidException);

                expect(
                    mfaChallengeService.getWebAuthnChallengeForUser
                ).not.toHaveBeenCalled();
                expect(mfaService.check).toHaveBeenCalledWith(
                    requestContext,
                    apiKeyContext,
                    'user-linden',
                    expect.objectContaining({ method: EnumMfaMethod.passkey }),
                    null
                );
            });

            it('reads and claims no challenge for a TOTP proof', async () => {
                mfaService.check.mockResolvedValue(mfaChecked);

                await useCase.execute(requestContext, apiKeyContext, {
                    ...passkeyDto,
                    method: EnumMfaMethod.totp,
                    code: '123456',
                });

                expect(
                    mfaChallengeService.getWebAuthnChallengeForUser
                ).not.toHaveBeenCalled();
                expect(mfaChallengeService.consumeInTx).not.toHaveBeenCalled();
                expect(mfaService.check).toHaveBeenCalledWith(
                    requestContext,
                    apiKeyContext,
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
                expect(mfaChallengeService.consumeInTx).not.toHaveBeenCalled();
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

            expect(outboxService.withTransaction).not.toHaveBeenCalled();
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
                statusCodeKey:
                    EnumMfaStatusCodeError[
                        EnumMfaStatusCodeError.methodRequired
                    ],
                messagePath: 'mfa.error.methodRequired',
            });

            expect(outboxService.withTransaction).not.toHaveBeenCalled();
        });

        it('checks and writes nothing when the reset lookup rejects', async () => {
            const failure = new Error('flag');
            userPasswordService.getOneActiveReset.mockRejectedValue(failure);

            await expect(
                useCase.execute(requestContext, apiKeyContext, dto)
            ).rejects.toBe(failure);
            expect(passwordHistoryService.assertNew).not.toHaveBeenCalled();
            expect(outboxService.withTransaction).not.toHaveBeenCalled();
        });

        it('writes nothing when the history check rejects', async () => {
            const failure = new Error('must new');
            passwordHistoryService.assertNew.mockRejectedValue(failure);

            await expect(
                useCase.execute(requestContext, apiKeyContext, dto)
            ).rejects.toBe(failure);
            expect(outboxService.withTransaction).not.toHaveBeenCalled();
        });

        it('revokes nothing and adds no effect when the snapshot read rejects', async () => {
            const cause = new Error('read');
            notificationService.getSnapshot.mockRejectedValue(cause);

            await expect(
                useCase.execute(requestContext, apiKeyContext, dto)
            ).rejects.toMatchObject({
                rawError: cause,
            });
            expect(
                sessionService.revokeActiveByUserInTx
            ).not.toHaveBeenCalled();
            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });

        it('rethrows a typed exception the transaction raises', async () => {
            const failure = new UserTokenInvalidException();
            outboxService.withTransaction.mockRejectedValue(failure);

            await expect(
                useCase.execute(requestContext, apiKeyContext, dto)
            ).rejects.toBe(failure);
        });

        it('maps a write conflict to UserTokenInvalidException', async () => {
            const conflict = new Error('write conflict');
            outboxService.withTransaction.mockRejectedValue(conflict);
            databaseUtil.toException.mockReturnValue(
                new DatabaseWriteConflictException()
            );

            await expect(
                useCase.execute(requestContext, apiKeyContext, dto)
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.tokenInvalid,
                messagePath: 'user.error.verificationTokenInvalid',
            });
            expect(databaseUtil.toException).toHaveBeenCalledWith(conflict);
        });

        it('wraps an unknown transaction failure in AppUnknownException', async () => {
            const cause = new Error('database exploded');
            outboxService.withTransaction.mockRejectedValue(cause);
            databaseUtil.toException.mockReturnValue(null);

            await expect(
                useCase.execute(requestContext, apiKeyContext, dto)
            ).rejects.toMatchObject({
                rawError: cause,
            });
        });
    });
});
