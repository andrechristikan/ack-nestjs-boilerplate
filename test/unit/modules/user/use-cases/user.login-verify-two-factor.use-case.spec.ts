import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumAppStatusCodeError } from '@app/enums/app.status-code.enum';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import {
    EnumActivityLogAction,
    EnumDevicePlatform,
    EnumRoleType,
    EnumUserLoginFrom,
    EnumUserLoginWith,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
} from '@generated/prisma-client/client';
import type { TwoFactor } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import {
    EnumActivityLogProcess,
    EnumActivityLogQueue,
} from '@modules/activity-log/enums/activity-log.enum';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import type { IOutboxEffect } from '@modules/outbox/interfaces/outbox.interface';
import { OutboxService } from '@modules/outbox/services/outbox.service';
import { AuthTwoFactorService } from '@modules/auth/services/auth.two-factor.service';
import { EnumAuthTwoFactorMethod } from '@modules/auth/enums/auth.enum';
import { EnumAuthStatusCodeError } from '@modules/auth/enums/auth.status-code.enum';
import { AuthTwoFactorAttemptMaxException } from '@modules/auth/exceptions/auth.two-factor-attempt-max.exception';
import { AuthTwoFactorInvalidException } from '@modules/auth/exceptions/auth.two-factor-invalid.exception';
import { AuthTwoFactorChallengeInvalidException } from '@modules/auth/exceptions/auth.two-factor-challenge-invalid.exception';
import type {
    IAuthToken,
    IAuthTwoFactorChallengeCache,
} from '@modules/auth/interfaces/auth.interface';
import type { IDeviceIdentity } from '@modules/device/interfaces/device.interface';
import { SessionService } from '@modules/session/services/session.service';
import { UserAuthService } from '@modules/user/services/user.auth.service';
import { UserTwoFactorService } from '@modules/user/services/user.two-factor.service';
import type {
    IUser,
    IUserTwoFactorEnabled,
    IUserTwoFactorVerifyResult,
} from '@modules/user/interfaces/user.interface';
import type { IUserLoginSession } from '@modules/user/interfaces/user.login.interface';
import { UserLoginSetupTwoFactorUseCase } from '@modules/user/use-cases/user.login-setup-two-factor.use-case';
import { UserLoginVerifyTwoFactorUseCase } from '@modules/user/use-cases/user.login-verify-two-factor.use-case';
import { buildRequestContextPublic } from '@test/unit/helpers/test.unit.request.helper';

describe('UserLoginVerifyTwoFactorUseCase', () => {
    const userTwoFactorService: MockProxy<UserTwoFactorService> =
        mock<UserTwoFactorService>();
    const userAuthService: MockProxy<UserAuthService> = mock<UserAuthService>();
    const sessionService: MockProxy<SessionService> = mock<SessionService>();
    const authTwoFactorService: MockProxy<AuthTwoFactorService> =
        mock<AuthTwoFactorService>();
    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();
    const tx = {} as IDatabaseTransactionClient;
    const context = buildRequestContextPublic();
    let useCase: UserLoginVerifyTwoFactorUseCase;
    let setupUseCase: UserLoginSetupTwoFactorUseCase;

    const now = new Date('2026-03-01T00:00:00.000Z');
    const loginAt = new Date('2026-03-01T00:05:00.000Z');
    const tokens: IAuthToken = {
        tokenType: 'Bearer',
        roleType: EnumRoleType.user,
        expiresIn: 3600,
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
    };
    const deviceIdentity: IDeviceIdentity = {
        fingerprint: 'device-bramble',
        name: null,
        platform: EnumDevicePlatform.web,
        notificationToken: null,
    };
    const entryEffect: IOutboxEffect = {
        queue: EnumActivityLogQueue.activityLog,
        name: EnumActivityLogProcess.createMany,
        data: { rows: [] },
        priority: EnumQueuePriority.low,
        idempotencyKey: null,
    };
    const twoFactor: TwoFactor = {
        id: 'two-factor-bramble',
        userId: 'user-bramble',
        secret: 'encrypted-secret',
        pendingSecret: null,
        backupCodes: ['hash-one'],
        enabled: false,
        requiredSetup: false,
        confirmedAt: null,
        lastUsedAt: null,
        lastUsedStep: null,
        attempt: 0,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
    };
    const baseUser: IUser = {
        id: 'user-bramble',
        name: 'Bramble Fox',
        username: 'bramble2fox',
        isVerified: true,
        verifiedAt: new Date('2026-01-01T00:00:00.000Z'),
        email: 'bramble@example.com',
        roleId: 'role-bramble',
        password: 'hashed-password',
        passwordExpired: new Date('2026-06-01T00:00:00.000Z'),
        passwordCreated: new Date('2026-01-01T00:00:00.000Z'),
        passwordAttempt: 0,
        signUpAt: new Date('2026-01-01T00:00:00.000Z'),
        signUpFrom: EnumUserSignUpFrom.website,
        signUpWith: EnumUserSignUpWith.credential,
        status: EnumUserStatus.active,
        gender: null,
        countryId: 'country-bramble',
        lastLoginAt: null,
        lastIPAddress: null,
        lastLoginFrom: null,
        lastLoginWith: null,
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
            id: 'role-bramble',
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
    const enabledTwoFactor = { ...twoFactor, enabled: true };
    const twoFactorUser: IUserTwoFactorEnabled = {
        ...baseUser,
        twoFactor: enabledTwoFactor,
    };
    const session: IUserLoginSession = {
        tokens,
        sessionId: 'session-bramble',
        jti: 'jti-bramble',
    };
    const challenge: IAuthTwoFactorChallengeCache = {
        userId: 'user-bramble',
        device: deviceIdentity,
        loginFrom: EnumUserLoginFrom.website,
        loginWith: EnumUserLoginWith.credential,
    };
    const verified: IUserTwoFactorVerifyResult = {
        method: EnumAuthTwoFactorMethod.code,
        newBackupCodes: null,
    };

    beforeEach(async () => {
        vi.resetAllMocks();

        helperDateService.create.mockReturnValue(now);
        activityLogService.recordEffect.mockReturnValue(entryEffect);
        outboxService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );
        userAuthService.createTokenAndSession.mockResolvedValue(session);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserLoginVerifyTwoFactorUseCase,
                UserLoginSetupTwoFactorUseCase,
                {
                    provide: UserTwoFactorService,
                    useValue: userTwoFactorService,
                },
                { provide: UserAuthService, useValue: userAuthService },
                { provide: SessionService, useValue: sessionService },
                {
                    provide: AuthTwoFactorService,
                    useValue: authTwoFactorService,
                },
                { provide: ActivityLogService, useValue: activityLogService },
                { provide: OutboxService, useValue: outboxService },
                { provide: HelperDateService, useValue: helperDateService },
                { provide: DatabaseUtil, useValue: databaseUtil },
            ],
        }).compile();
        useCase = module.get(UserLoginVerifyTwoFactorUseCase);
        setupUseCase = module.get(UserLoginSetupTwoFactorUseCase);
    });

    describe('execute', () => {
        const dto = {
            challengeToken: 'challenge-token',
            method: EnumAuthTwoFactorMethod.code,
            code: '123456',
        };

        beforeEach(() => {
            authTwoFactorService.getChallenge.mockResolvedValue(challenge);
            authTwoFactorService.consumeChallenge.mockResolvedValue(challenge);
            userTwoFactorService.getOneForLoginVerify.mockResolvedValue(
                twoFactorUser
            );
            userTwoFactorService.verify.mockResolvedValue(verified);
        });

        it('verifies the challenge user, claims the challenge, records the verification with its entry on one tx, and issues the session', async () => {
            const callOrder: string[] = [];
            userTwoFactorService.assertAttemptCounted.mockImplementation(
                async () => {
                    callOrder.push('assertAttemptCounted');
                }
            );
            userTwoFactorService.verify.mockImplementation(async () => {
                callOrder.push('verify');

                return verified;
            });
            authTwoFactorService.consumeChallenge.mockImplementation(
                async () => {
                    callOrder.push('consumeChallenge');

                    return challenge;
                }
            );
            userTwoFactorService.recordVerificationInTx.mockImplementation(
                async () => {
                    callOrder.push('recordVerificationInTx');
                }
            );
            outboxService.addInTx.mockImplementation(async () => {
                callOrder.push('addInTx');

                return 'outbox-id';
            });
            userAuthService.createTokenAndSession.mockImplementation(
                async () => {
                    callOrder.push('createTokenAndSession');

                    return session;
                }
            );

            await expect(useCase.execute(context, dto)).resolves.toEqual({
                data: tokens,
            });

            expect(authTwoFactorService.getChallenge).toHaveBeenCalledWith(
                'challenge-token'
            );
            expect(
                userTwoFactorService.getOneForLoginVerify
            ).toHaveBeenCalledWith('user-bramble');
            expect(
                userTwoFactorService.assertAttemptCounted
            ).toHaveBeenCalledWith(context.snapshot, twoFactorUser);
            expect(userTwoFactorService.verify).toHaveBeenCalledWith(
                twoFactorUser,
                {
                    code: '123456',
                    backupCode: null,
                    method: EnumAuthTwoFactorMethod.code,
                }
            );
            expect(
                userTwoFactorService.recordVerificationInTx
            ).toHaveBeenCalledWith(tx, twoFactorUser, verified);
            expect(activityLogService.recordEffect).toHaveBeenCalledWith(
                context.snapshot,
                {
                    action: EnumActivityLogAction.userVerifyTwoFactor,
                    userId: 'user-bramble',
                    createdBy: 'user-bramble',
                }
            );
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, entryEffect);
            expect(userAuthService.createTokenAndSession).toHaveBeenCalledWith(
                context.snapshot,
                twoFactorUser,
                deviceIdentity,
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential,
                now
            );
            expect(authTwoFactorService.consumeChallenge).toHaveBeenCalledWith(
                'challenge-token'
            );
            expect(callOrder).toEqual([
                'assertAttemptCounted',
                'verify',
                'consumeChallenge',
                'recordVerificationInTx',
                'addInTx',
                'createTokenAndSession',
            ]);
        });

        it('claims the challenge once and issues tokens after the setup step left it in place', async () => {
            userTwoFactorService.getOneForLoginSetup.mockResolvedValue({
                user: twoFactorUser,
                pendingSecret: 'pending-secret',
            });
            userTwoFactorService.enableTwoFactor.mockResolvedValue([
                'backup-one',
            ]);

            await setupUseCase.execute(context, {
                challengeToken: 'challenge-token',
                code: '123456',
            });

            expect(
                authTwoFactorService.consumeChallenge
            ).not.toHaveBeenCalled();

            await expect(useCase.execute(context, dto)).resolves.toEqual({
                data: tokens,
            });

            expect(authTwoFactorService.getChallenge).toHaveBeenCalledTimes(2);
            expect(authTwoFactorService.consumeChallenge).toHaveBeenCalledTimes(
                1
            );
        });

        it('forwards the backup code', async () => {
            await useCase.execute(context, {
                challengeToken: 'challenge-token',
                method: EnumAuthTwoFactorMethod.backupCodes,
                backupCode: 'backup-code',
            });

            expect(userTwoFactorService.verify).toHaveBeenCalledWith(
                twoFactorUser,
                {
                    code: null,
                    backupCode: 'backup-code',
                    method: EnumAuthTwoFactorMethod.backupCodes,
                }
            );
        });

        it('throws AuthTwoFactorChallengeInvalidException without reading the user when the challenge is missing', async () => {
            authTwoFactorService.getChallenge.mockRejectedValue(
                new AuthTwoFactorChallengeInvalidException()
            );

            await expect(useCase.execute(context, dto)).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.twoFactorChallengeInvalid,
            });
            expect(
                userTwoFactorService.getOneForLoginVerify
            ).not.toHaveBeenCalled();
        });

        it('answers the two-factor attempt limit of a spent count and verifies nothing', async () => {
            userTwoFactorService.assertAttemptCounted.mockRejectedValue(
                new AuthTwoFactorAttemptMaxException()
            );

            await expect(useCase.execute(context, dto)).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.twoFactorAttemptMax,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.twoFactorAttemptMax
                    ],
                messagePath: 'auth.error.twoFactorAttemptMax',
            });

            expect(
                userAuthService.createTokenAndSession
            ).not.toHaveBeenCalled();
            expect(userTwoFactorService.verify).not.toHaveBeenCalled();
            expect(
                authTwoFactorService.consumeChallenge
            ).not.toHaveBeenCalled();
        });

        it('issues nothing and adds no entry when the verification fails', async () => {
            const failure = new Error('invalid code');
            userTwoFactorService.verify.mockRejectedValue(failure);

            await expect(useCase.execute(context, dto)).rejects.toBe(failure);

            expect(
                userTwoFactorService.recordVerificationInTx
            ).not.toHaveBeenCalled();
            expect(
                userAuthService.createTokenAndSession
            ).not.toHaveBeenCalled();
            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });

        it('leaves the challenge claimable when the code is wrong', async () => {
            userTwoFactorService.verify.mockRejectedValue(
                new Error('invalid code')
            );

            await expect(useCase.execute(context, dto)).rejects.toThrow(
                'invalid code'
            );

            expect(
                authTwoFactorService.consumeChallenge
            ).not.toHaveBeenCalled();
        });

        it('creates no session when the challenge claim fails', async () => {
            const failure = new Error('redis down');
            authTwoFactorService.consumeChallenge.mockRejectedValue(failure);

            await expect(useCase.execute(context, dto)).rejects.toBe(failure);

            expect(
                userTwoFactorService.recordVerificationInTx
            ).not.toHaveBeenCalled();
            expect(
                userAuthService.createTokenAndSession
            ).not.toHaveBeenCalled();
        });

        it('rethrows an AppBaseException the verification record raises', async () => {
            const failure = new AuthTwoFactorInvalidException();
            userTwoFactorService.recordVerificationInTx.mockRejectedValue(
                failure
            );

            await expect(useCase.execute(context, dto)).rejects.toBe(failure);

            expect(outboxService.addInTx).not.toHaveBeenCalled();
            expect(
                userAuthService.createTokenAndSession
            ).not.toHaveBeenCalled();
        });

        it('throws AuthTwoFactorInvalidException on a write conflict, adds no entry, and issues nothing', async () => {
            const conflict = new Error('write conflict');
            userTwoFactorService.recordVerificationInTx.mockRejectedValue(
                conflict
            );
            databaseUtil.toException.mockReturnValue(
                new DatabaseWriteConflictException()
            );

            await expect(useCase.execute(context, dto)).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.twoFactorInvalid,
                messagePath: 'auth.error.twoFactorInvalid',
            });

            expect(databaseUtil.toException).toHaveBeenCalledWith(conflict);
            expect(outboxService.addInTx).not.toHaveBeenCalled();
            expect(
                userAuthService.createTokenAndSession
            ).not.toHaveBeenCalled();
        });

        it('wraps an unknown error from the verification record, adds no entry, and issues nothing', async () => {
            const failure = new Error('boom');
            userTwoFactorService.recordVerificationInTx.mockRejectedValue(
                failure
            );
            databaseUtil.toException.mockReturnValue(null);

            await expect(useCase.execute(context, dto)).rejects.toMatchObject({
                module: 'app',
                statusCode: EnumAppStatusCodeError.unknown,
                rawError: failure,
            });

            expect(outboxService.addInTx).not.toHaveBeenCalled();
            expect(
                userAuthService.createTokenAndSession
            ).not.toHaveBeenCalled();
        });

        it('rejects with the session start failure', async () => {
            const failure = new Error('tx failed');
            userAuthService.createTokenAndSession.mockRejectedValue(failure);

            await expect(useCase.execute(context, dto)).rejects.toBe(failure);
        });
    });

    describe('startSession', () => {
        const startArgs = [
            context.snapshot,
            twoFactorUser,
            deviceIdentity,
            EnumUserLoginFrom.website,
            EnumUserLoginWith.credential,
            loginAt,
        ] as const;

        it('starts the session through createTokenAndSession with the passed context', async () => {
            await useCase['startSession'](...startArgs);

            expect(userAuthService.createTokenAndSession).toHaveBeenCalledWith(
                context.snapshot,
                twoFactorUser,
                deviceIdentity,
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential,
                loginAt
            );
        });

        it('sets the login after the service call', async () => {
            await useCase['startSession'](...startArgs);

            expect(sessionService.setLoginOrRevoke).toHaveBeenCalledWith(
                'user-bramble',
                'session-bramble',
                'jti-bramble'
            );
            expect(sessionService.setLoginOrRevoke).toHaveBeenCalledAfter(
                userAuthService.createTokenAndSession
            );
        });

        it('returns the session tokens', async () => {
            await expect(useCase['startSession'](...startArgs)).resolves.toBe(
                tokens
            );
        });

        it('sets no login when createTokenAndSession rejects', async () => {
            const failure = new Error('tx failed');
            userAuthService.createTokenAndSession.mockRejectedValue(failure);

            await expect(useCase['startSession'](...startArgs)).rejects.toBe(
                failure
            );

            expect(sessionService.setLoginOrRevoke).not.toHaveBeenCalled();
        });
    });
});
