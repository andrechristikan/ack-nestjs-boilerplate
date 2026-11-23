import { EnumRolePlatformKey } from '@modules/role/enums/role.enum';
import { Test } from '@nestjs/testing';
import type { AuthenticationResponseJSON } from '@simplewebauthn/server';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumActivityLogAction,
    EnumDevicePlatform,
    EnumMfaChallengePurpose,
    EnumUserLoginFrom,
    EnumUserLoginWith,
} from '@generated/prisma-client/client';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import {
    EnumActivityLogProcess,
    EnumActivityLogQueue,
} from '@modules/activity-log/enums/activity-log.enum';
import type { IActivityLogCreateManyEffect } from '@modules/activity-log/interfaces/activity-log.interface';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import type { IAuthToken } from '@modules/auth/interfaces/auth.interface';
import type { IDeviceIdentity } from '@modules/device/interfaces/device.interface';
import { EnumMfaMethod } from '@modules/mfa/enums/mfa.enum';
import { EnumMfaStatusCodeError } from '@modules/mfa/enums/mfa.status-code.enum';
import { MfaAttemptMaxException } from '@modules/mfa/exceptions/mfa.attempt-max.exception';
import { MfaChallengeInvalidException } from '@modules/mfa/exceptions/mfa.challenge-invalid.exception';
import { MfaMethodRequiredException } from '@modules/mfa/exceptions/mfa.method-required.exception';
import type {
    IMfaChallengeLogin,
    IMfaCheck,
} from '@modules/mfa/interfaces/mfa.interface';
import { MfaChallengeService } from '@modules/mfa/services/mfa.challenge.service';
import { MfaService } from '@modules/mfa/services/mfa.service';
import { UserAuthService } from '@modules/user/services/user.auth.service';
import type { IUserLoginSession } from '@modules/user/interfaces/user.login.interface';
import { UserLoginVerifyMfaUseCase } from '@modules/user/use-cases/user.login-verify-mfa.use-case';
import {
    buildApiKeyContext,
    buildRequestContext,
    buildUser,
} from '@test/unit/helpers/test.unit.request.helper';

describe('UserLoginVerifyMfaUseCase', () => {
    const mfaService: MockProxy<MfaService> = mock<MfaService>();
    const mfaChallengeService: MockProxy<MfaChallengeService> =
        mock<MfaChallengeService>();
    const userAuthService: MockProxy<UserAuthService> = mock<UserAuthService>();
    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();

    let useCase: UserLoginVerifyMfaUseCase;

    const tx = {} as IDatabaseTransactionClient;
    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    const now = new Date('2026-03-01T00:00:00.000Z');
    const tokens: IAuthToken = {
        tokenType: 'Bearer',
        roleKey: EnumRolePlatformKey.user,
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
    const entryEffect: IActivityLogCreateManyEffect = {
        queue: EnumActivityLogQueue.activityLog,
        name: EnumActivityLogProcess.createMany,
        data: { rows: [] },
        priority: EnumQueuePriority.low,
        idempotencyKey: null,
    };
    const baseUser = {
        ...buildUser('user-bramble', 'bramble@example.com'),
        isVerified: true,
    };
    const session: IUserLoginSession = {
        tokens,
        sessionId: 'session-bramble',
    };
    const challenge: IMfaChallengeLogin = {
        userId: 'user-bramble',
        webAuthnChallenge: null,
        device: deviceIdentity,
        loginFrom: EnumUserLoginFrom.website,
        loginWith: EnumUserLoginWith.credential,
    };
    const passkeyResponse = {
        id: 'credential-one',
        rawId: 'credential-one',
        response: {
            clientDataJSON: 'client-data',
            authenticatorData: 'authenticator-data',
            signature: 'signature',
        },
        clientExtensionResults: {},
        type: 'public-key',
    } satisfies AuthenticationResponseJSON;
    const checked: IMfaCheck = {
        method: EnumMfaMethod.totp,
        totpStep: 58123456,
        backupCodeHash: null,
        passkey: null,
    };

    beforeEach(async () => {
        vi.resetAllMocks();

        helperDateService.create.mockReturnValue(now);
        activityLogService.recordEffect.mockReturnValue(entryEffect);
        outboxService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );
        userAuthService.createTokenAndSessionInTx.mockResolvedValue(session);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserLoginVerifyMfaUseCase,
                { provide: MfaService, useValue: mfaService },
                { provide: MfaChallengeService, useValue: mfaChallengeService },
                { provide: UserAuthService, useValue: userAuthService },
                { provide: ActivityLogService, useValue: activityLogService },
                { provide: OutboxService, useValue: outboxService },
                { provide: HelperDateService, useValue: helperDateService },
                { provide: DatabaseUtil, useValue: databaseUtil },
            ],
        }).compile();
        useCase = module.get(UserLoginVerifyMfaUseCase);
    });

    describe('execute', () => {
        const dto = {
            challengeToken: 'challenge-token',
            method: EnumMfaMethod.totp,
            code: '123456',
        };

        beforeEach(() => {
            mfaChallengeService.getLogin.mockResolvedValue(challenge);
            userAuthService.getOneForMfaLogin.mockResolvedValue(baseUser);
            mfaService.check.mockResolvedValue(checked);
        });

        it('reads the login challenge, checks the user and the code before the transaction, then claims, completes, records the entry, and issues the session on one tx', async () => {
            const callOrder: string[] = [];
            mfaService.check.mockImplementation(async () => {
                callOrder.push('check');

                return checked;
            });
            mfaChallengeService.consumeInTx.mockImplementation(async () => {
                callOrder.push('consumeInTx');
            });
            mfaService.completeInTx.mockImplementation(async () => {
                callOrder.push('completeInTx');
            });
            outboxService.addInTx.mockImplementation(async () => {
                callOrder.push('addInTx');

                return 'outbox-id';
            });
            userAuthService.createTokenAndSessionInTx.mockImplementation(
                async () => {
                    callOrder.push('createTokenAndSessionInTx');

                    return session;
                }
            );

            await expect(
                useCase.execute(requestContext, apiKeyContext, dto)
            ).resolves.toEqual({ data: tokens });

            expect(mfaChallengeService.getLogin).toHaveBeenCalledWith(
                'challenge-token'
            );
            expect(userAuthService.getOneForMfaLogin).toHaveBeenCalledWith(
                'user-bramble'
            );
            expect(mfaService.check).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                'user-bramble',
                {
                    code: '123456',
                    backupCode: null,
                    method: EnumMfaMethod.totp,
                    passkeyResponse: null,
                },
                null
            );
            expect(mfaChallengeService.consumeInTx).toHaveBeenCalledWith(
                tx,
                'challenge-token',
                EnumMfaChallengePurpose.login,
                'user-bramble'
            );
            expect(mfaService.completeInTx).toHaveBeenCalledWith(
                tx,
                'user-bramble',
                checked
            );
            expect(activityLogService.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                null,
                null,
                {
                    action: EnumActivityLogAction.userVerifyMfa,
                    userId: 'user-bramble',
                    createdBy: 'user-bramble',
                }
            );
            expect(
                userAuthService.createTokenAndSessionInTx
            ).toHaveBeenCalledWith(
                tx,
                requestContext,
                apiKeyContext,
                baseUser,
                deviceIdentity,
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential,
                now
            );
            expect(callOrder).toEqual([
                'check',
                'consumeInTx',
                'completeInTx',
                'addInTx',
                'createTokenAndSessionInTx',
            ]);
        });

        it('passes a backup code on', async () => {
            await useCase.execute(requestContext, apiKeyContext, {
                challengeToken: 'challenge-token',
                method: EnumMfaMethod.backupCode,
                backupCode: 'ABCD1234EF',
            });

            expect(mfaService.check).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                'user-bramble',
                {
                    code: null,
                    backupCode: 'ABCD1234EF',
                    method: EnumMfaMethod.backupCode,
                    passkeyResponse: null,
                },
                null
            );
        });

        it('checks a passkey response against the WebAuthn challenge of the login challenge, then creates the session and records userVerifyMfa', async () => {
            const passkeyChecked: IMfaCheck = {
                method: EnumMfaMethod.passkey,
                totpStep: null,
                backupCodeHash: null,
                passkey: { id: 'passkey-one', counter: 8 },
            };
            mfaChallengeService.getLogin.mockResolvedValue({
                ...challenge,
                webAuthnChallenge: 'challenge-webauthn',
            });
            mfaService.check.mockResolvedValue(passkeyChecked);

            await expect(
                useCase.execute(requestContext, apiKeyContext, {
                    challengeToken: 'challenge-token',
                    method: EnumMfaMethod.passkey,
                    passkeyResponse,
                })
            ).resolves.toEqual({ data: tokens });

            expect(mfaService.check).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                'user-bramble',
                {
                    code: null,
                    backupCode: null,
                    method: EnumMfaMethod.passkey,
                    passkeyResponse,
                },
                'challenge-webauthn'
            );
            expect(mfaService.completeInTx).toHaveBeenCalledWith(
                tx,
                'user-bramble',
                passkeyChecked
            );
            expect(activityLogService.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                null,
                null,
                {
                    action: EnumActivityLogAction.userVerifyMfa,
                    userId: 'user-bramble',
                    createdBy: 'user-bramble',
                }
            );
            expect(
                userAuthService.createTokenAndSessionInTx
            ).toHaveBeenCalledTimes(1);
        });

        it('throws the challenge exception without reading the user when no live login challenge holds the token', async () => {
            mfaChallengeService.getLogin.mockRejectedValue(
                new MfaChallengeInvalidException()
            );

            await expect(
                useCase.execute(requestContext, apiKeyContext, dto)
            ).rejects.toMatchObject({
                module: 'mfa',
                statusCode: EnumMfaStatusCodeError.challengeInvalid,
            });
            expect(userAuthService.getOneForMfaLogin).not.toHaveBeenCalled();
        });

        it('throws MfaMethodRequiredException uncounted when the check finds no method', async () => {
            mfaService.check.mockRejectedValue(
                new MfaMethodRequiredException()
            );

            await expect(
                useCase.execute(requestContext, apiKeyContext, dto)
            ).rejects.toMatchObject({
                module: 'mfa',

                statusCode: EnumMfaStatusCodeError.methodRequired,
            });
            expect(mfaService.countFailedAttempt).not.toHaveBeenCalled();
            expect(outboxService.withTransaction).not.toHaveBeenCalled();
        });

        it('issues nothing and opens no transaction when the check fails', async () => {
            mfaService.check.mockRejectedValue(new MfaAttemptMaxException());

            await expect(
                useCase.execute(requestContext, apiKeyContext, dto)
            ).rejects.toMatchObject({
                module: 'mfa',

                statusCode: EnumMfaStatusCodeError.attemptMax,
            });
            expect(outboxService.withTransaction).not.toHaveBeenCalled();
            expect(
                userAuthService.createTokenAndSessionInTx
            ).not.toHaveBeenCalled();
        });

        it('creates no session when the challenge claim is lost', async () => {
            const failure = new MfaChallengeInvalidException();
            mfaChallengeService.consumeInTx.mockRejectedValue(failure);

            await expect(
                useCase.execute(requestContext, apiKeyContext, dto)
            ).rejects.toBe(failure);
            expect(mfaService.completeInTx).not.toHaveBeenCalled();
            expect(
                userAuthService.createTokenAndSessionInTx
            ).not.toHaveBeenCalled();
        });

        it('throws MfaChallengeInvalidException on a write conflict', async () => {
            const conflict = new Error('write conflict');
            outboxService.withTransaction.mockRejectedValue(conflict);
            databaseUtil.toException.mockReturnValue(
                new DatabaseWriteConflictException()
            );

            await expect(
                useCase.execute(requestContext, apiKeyContext, dto)
            ).rejects.toMatchObject({
                module: 'mfa',

                statusCode: EnumMfaStatusCodeError.challengeInvalid,
            });
            expect(databaseUtil.toException).toHaveBeenCalledWith(conflict);
        });

        it('wraps an unknown error of the transaction in AppUnknownException', async () => {
            const cause = new Error('boom');
            outboxService.withTransaction.mockRejectedValue(cause);
            databaseUtil.toException.mockReturnValue(null);

            await expect(
                useCase.execute(requestContext, apiKeyContext, dto)
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: cause,
            });
        });
    });
});
