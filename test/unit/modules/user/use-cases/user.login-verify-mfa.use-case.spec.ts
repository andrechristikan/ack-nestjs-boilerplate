import { Test } from '@nestjs/testing';
import type { IMfaAttemptFailure } from '@modules/mfa/interfaces/mfa.interface';
import type { AuthenticationResponseJSON } from '@simplewebauthn/server';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumActivityLogAction,
    EnumDevicePlatform,
    EnumMfaChallengePurpose,
    EnumRoleType,
    EnumUserLoginFrom,
    EnumUserLoginWith,
} from '@generated/prisma-client/client';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { DatabaseService } from '@common/database/services/database.service';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import {
    EnumActivityLogProcess,
    EnumActivityLogQueue,
} from '@modules/activity-log/enums/activity-log.enum';
import type { IActivityLogCreateManyEffect } from '@modules/activity-log/interfaces/activity-log.interface';
import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
import type { IAuthToken } from '@modules/auth/interfaces/auth.interface';
import type {
    IDeviceIdentity,
    IDeviceLoginUpsert,
} from '@modules/device/interfaces/device.interface';
import { DeviceService } from '@modules/device/services/device.service';
import { buildMfaFactorState } from '@test/unit/helpers/test.unit.mfa.helper';
import { EnumMfaMethod } from '@modules/mfa/enums/mfa.enum';
import { EnumMfaStatusCodeError } from '@modules/mfa/enums/mfa.status-code.enum';
import { MfaAttemptMaxException } from '@modules/mfa/exceptions/mfa.attempt-max.exception';
import { MfaChallengeInvalidException } from '@modules/mfa/exceptions/mfa.challenge-invalid.exception';
import { MfaMethodRequiredException } from '@modules/mfa/exceptions/mfa.method-required.exception';
import { MfaNotEnabledException } from '@modules/mfa/exceptions/mfa.not-enabled.exception';
import type {
    IMfaChallengeLogin,
    IMfaCheck,
} from '@modules/mfa/interfaces/mfa.interface';
import { MfaChallengeService } from '@modules/mfa/services/mfa.challenge.service';
import { MfaService } from '@modules/mfa/services/mfa.service';
import { UserAuthService } from '@modules/user/services/user.auth.service';
import type { IUserAuthSession } from '@modules/user/interfaces/user.auth.interface';
import { UserLoginVerifyMfaUseCase } from '@modules/user/use-cases/user.login-verify-mfa.use-case';
import {
    buildApiKeyContext,
    buildRequestContext,
    buildUser,
} from '@test/unit/helpers/test.unit.request.helper';
import { ConfigService } from '@nestjs/config';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import { TestUnitKitConfigValues } from '@test/unit/helpers/test.unit.kit.helper';

describe('UserLoginVerifyMfaUseCase', () => {
    const mfaService: MockProxy<MfaService> = mock<MfaService>();
    const mfaChallengeService: MockProxy<MfaChallengeService> =
        mock<MfaChallengeService>();
    const userAuthService: MockProxy<UserAuthService> = mock<UserAuthService>();
    const activityLogQueue: MockProxy<ActivityLogQueue> =
        mock<ActivityLogQueue>();
    const deviceService: MockProxy<DeviceService> = mock<DeviceService>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();

    let useCase: UserLoginVerifyMfaUseCase;

    const tx = {} as IDatabaseTransactionClient;
    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    const now = new Date('2026-03-01T00:00:00.000Z');
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
    const entryEffect: IActivityLogCreateManyEffect = {
        queue: EnumActivityLogQueue.activityLog,
        name: EnumActivityLogProcess.createMany,
        data: { rows: [] },
        priority: EnumQueuePriority.low,
        idempotencyKey: null,
    };
    const upserted = {
        device: { id: 'device-one' },
        deviceOwnership: { id: 'ownership-one' },
        isNewDevice: false,
        otherOwnershipIds: ['ownership-two'],
    } as unknown as IDeviceLoginUpsert;
    const baseUser = {
        ...buildUser('user-bramble', 'bramble@example.com'),
        isVerified: true,
    };
    const session: IUserAuthSession = {
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

    beforeAll(() => {
        vi.useFakeTimers();
    });

    afterAll(() => {
        vi.useRealTimers();
    });

    beforeEach(async () => {
        vi.setSystemTime(now);
        activityLogQueue.recordEffect.mockReturnValue(entryEffect);
        databaseService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );
        deviceService.upsertForLoginInTx.mockResolvedValue(upserted);
        userAuthService.createTokenAndSessionInTx.mockResolvedValue(session);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserLoginVerifyMfaUseCase,
                { provide: MfaService, useValue: mfaService },
                { provide: MfaChallengeService, useValue: mfaChallengeService },
                { provide: UserAuthService, useValue: userAuthService },
                { provide: ActivityLogQueue, useValue: activityLogQueue },
                { provide: DeviceService, useValue: deviceService },
                { provide: DatabaseService, useValue: databaseService },
                { provide: OutboxService, useValue: outboxService },
                HelperDateService,
                {
                    provide: ConfigService,
                    useValue: buildConfigService(TestUnitKitConfigValues),
                },
            ],
        }).compile();
        useCase = module.get(UserLoginVerifyMfaUseCase);
    });

    describe('execute', () => {
        const factorState = buildMfaFactorState('user-bramble');
        const dto = {
            challengeToken: 'challenge-token',
            method: EnumMfaMethod.totp,
            code: '123456',
        };

        beforeEach(() => {
            mfaChallengeService.getLogin.mockResolvedValue(challenge);
            userAuthService.getOneForMfaLogin.mockResolvedValue(baseUser);
            mfaService.getFactorState.mockResolvedValue(factorState);
            mfaService.assertEnabled.mockResolvedValue();
            mfaService.check.mockResolvedValue({
                check: checked,
                failure: null,
            });
        });

        it('commits the failed count in a transaction of its own, then throws, and claims and writes nothing on a mismatch', async () => {
            const refusal = new Error('refused');
            const failure: IMfaAttemptFailure = {
                method: EnumMfaMethod.totp,
                maxAttempts: 5,
                lockedUntil: new Date('2026-03-01T00:15:00.000Z'),
            };
            mfaService.check.mockResolvedValue({ check: null, failure });
            mfaService.countFailedAttemptInTx.mockResolvedValue(false);
            mfaService.throwFailedAttempt.mockImplementation(() => {
                throw refusal;
            });

            await expect(
                useCase.execute(requestContext, apiKeyContext, dto)
            ).rejects.toBe(refusal);

            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
            expect(mfaService.countFailedAttemptInTx).toHaveBeenCalledWith(
                tx,
                requestContext,
                apiKeyContext,
                'user-bramble',
                failure
            );
            expect(mfaService.countFailedAttemptInTx).toHaveBeenCalledBefore(
                mfaService.throwFailedAttempt
            );
            expect(mfaService.throwFailedAttempt).toHaveBeenCalledWith(
                failure,
                false
            );
            expect(mfaService.completeChallengeInTx).not.toHaveBeenCalled();
            expect(
                userAuthService.createTokenAndSessionInTx
            ).not.toHaveBeenCalled();
        });

        it('reads the login challenge, checks the user and the code before the transaction, then claims, completes, records the entry, and issues the session on one tx', async () => {
            const callOrder: string[] = [];
            mfaService.check.mockImplementation(async () => {
                callOrder.push('check');

                return { check: checked, failure: null };
            });
            mfaService.completeChallengeInTx.mockImplementation(async () => {
                callOrder.push('completeChallengeInTx');
            });
            outboxService.addInTx.mockImplementation(async () => {
                callOrder.push('addInTx');

                return 'outbox-id';
            });
            deviceService.upsertForLoginInTx.mockImplementation(async () => {
                callOrder.push('upsertForLoginInTx');

                return upserted;
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
            expect(mfaService.getFactorState).toHaveBeenCalledTimes(1);
            expect(mfaService.getFactorState).toHaveBeenCalledWith(
                'user-bramble'
            );
            expect(mfaService.assertEnabled).toHaveBeenCalledWith(factorState);
            expect(mfaService.check).toHaveBeenCalledWith(
                'user-bramble',
                {
                    code: '123456',
                    backupCode: null,
                    method: EnumMfaMethod.totp,
                    passkeyResponse: null,
                },
                null,
                factorState
            );
            expect(mfaService.completeChallengeInTx).toHaveBeenCalledWith(
                tx,
                'user-bramble',
                'challenge-token',
                EnumMfaChallengePurpose.login,
                checked
            );
            expect(activityLogQueue.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                null,
                null,
                {
                    action: EnumActivityLogAction.userMfaVerified,
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
                upserted,
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential,
                now,
                false,
                false
            );
            expect(deviceService.upsertForLoginInTx).toHaveBeenCalledWith(
                tx,
                'user-bramble',
                deviceIdentity,
                now
            );
            expect(callOrder).toEqual([
                'check',
                'completeChallengeInTx',
                'addInTx',
                'upsertForLoginInTx',
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
                'user-bramble',
                {
                    code: null,
                    backupCode: 'ABCD1234EF',
                    method: EnumMfaMethod.backupCode,
                    passkeyResponse: null,
                },
                null,
                factorState
            );
        });

        it('checks a passkey response against the WebAuthn challenge of the login challenge, then creates the session and records userMfaVerified', async () => {
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
            mfaService.check.mockResolvedValue({
                check: passkeyChecked,
                failure: null,
            });

            await expect(
                useCase.execute(requestContext, apiKeyContext, {
                    challengeToken: 'challenge-token',
                    method: EnumMfaMethod.passkey,
                    passkeyResponse,
                })
            ).resolves.toEqual({ data: tokens });

            expect(mfaService.check).toHaveBeenCalledWith(
                'user-bramble',
                {
                    code: null,
                    backupCode: null,
                    method: EnumMfaMethod.passkey,
                    passkeyResponse,
                },
                'challenge-webauthn',
                factorState
            );
            expect(mfaService.completeChallengeInTx).toHaveBeenCalledWith(
                tx,
                'user-bramble',
                'challenge-token',
                EnumMfaChallengePurpose.login,
                passkeyChecked
            );
            expect(activityLogQueue.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                null,
                null,
                {
                    action: EnumActivityLogAction.userMfaVerified,
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

        it('throws MfaNotEnabledException and checks nothing when MFA is off', async () => {
            mfaService.assertEnabled.mockRejectedValue(
                new MfaNotEnabledException()
            );

            await expect(
                useCase.execute(requestContext, apiKeyContext, dto)
            ).rejects.toBeInstanceOf(MfaNotEnabledException);
            expect(mfaService.check).not.toHaveBeenCalled();
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
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
            expect(mfaService.countFailedAttemptInTx).not.toHaveBeenCalled();
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('issues nothing and opens no transaction when the check fails', async () => {
            mfaService.check.mockRejectedValue(new MfaAttemptMaxException());

            await expect(
                useCase.execute(requestContext, apiKeyContext, dto)
            ).rejects.toMatchObject({
                module: 'mfa',

                statusCode: EnumMfaStatusCodeError.attemptMax,
            });
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
            expect(
                userAuthService.createTokenAndSessionInTx
            ).not.toHaveBeenCalled();
        });

        it('creates no session when the challenge claim is lost', async () => {
            const failure = new MfaChallengeInvalidException();
            mfaService.completeChallengeInTx.mockRejectedValue(failure);

            await expect(
                useCase.execute(requestContext, apiKeyContext, dto)
            ).rejects.toBe(failure);
            expect(
                userAuthService.createTokenAndSessionInTx
            ).not.toHaveBeenCalled();
        });

        it('rethrows any other failure of the transaction untouched', async () => {
            const cause = new Error('boom');
            databaseService.withTransaction.mockRejectedValue(cause);

            await expect(
                useCase.execute(requestContext, apiKeyContext, dto)
            ).rejects.toBe(cause);
        });
    });
});
