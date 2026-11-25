import { FeatureFlagDisabledException } from '@modules/feature-flag/exceptions/feature-flag.disabled.exception';
import {
    TestUnitReauthenticationMfaFailure,
    TestUnitReauthenticationMfaOff,
    TestUnitReauthenticationPasswordLimit,
    TestUnitReauthenticationPasswordPassed,
} from '@test/unit/helpers/test.unit.user.helper';
import { ConfigService } from '@nestjs/config';
import { buildDeferred } from '@test/unit/helpers/test.unit.deferred.helper';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import {
    TestUnitKitConfigValues,
    TestUnitKitProviders,
} from '@test/unit/helpers/test.unit.kit.helper';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumActivityLogAction,
    EnumMfaChallengePurpose,
    EnumMfaPasskeyDeviceType,
    EnumUserReauthenticationAction,
} from '@generated/prisma-client/client';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import type { IActivityLogCreateManyEffect } from '@modules/activity-log/interfaces/activity-log.interface';
import {
    EnumActivityLogProcess,
    EnumActivityLogQueue,
} from '@modules/activity-log/enums/activity-log.enum';
import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
import type { MfaPasskeyRegisterRequestDto } from '@modules/mfa/dtos/request/mfa.passkey-register.request.dto';
import { EnumMfaMethod } from '@modules/mfa/enums/mfa.enum';
import { MfaChallengeInvalidException } from '@modules/mfa/exceptions/mfa.challenge-invalid.exception';
import { MfaPasskeyAlreadyRegisteredException } from '@modules/mfa/exceptions/mfa.passkey-already-registered.exception';
import { MfaPasskeyInvalidException } from '@modules/mfa/exceptions/mfa.passkey-invalid.exception';
import { MfaPasskeyLimitException } from '@modules/mfa/exceptions/mfa.passkey-limit.exception';
import type { IMfaPasskeyRegistration } from '@modules/mfa/interfaces/mfa.interface';
import { MfaChallengeService } from '@modules/mfa/services/mfa.challenge.service';
import { MfaPasskeyService } from '@modules/mfa/services/mfa.passkey.service';
import { buildMfaFactorState } from '@test/unit/helpers/test.unit.mfa.helper';
import { MfaService } from '@modules/mfa/services/mfa.service';
import { MfaRegisterPasskeyUseCase } from '@modules/mfa/use-cases/mfa.register-passkey.use-case';
import { UserAuthService } from '@modules/user/services/user.auth.service';
import {
    buildApiKeyContext,
    buildAuthJwtAccessContext,
    buildRequestContext,
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

describe('MfaRegisterPasskeyUseCase', () => {
    const mfaService: MockProxy<MfaService> = mock<MfaService>();
    const mfaPasskeyService: MockProxy<MfaPasskeyService> =
        mock<MfaPasskeyService>();
    const mfaChallengeService: MockProxy<MfaChallengeService> =
        mock<MfaChallengeService>();
    const userAuthService: MockProxy<UserAuthService> = mock<UserAuthService>();
    const activityLogQueue: MockProxy<ActivityLogQueue> =
        mock<ActivityLogQueue>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();

    let useCase: MfaRegisterPasskeyUseCase;

    const user = buildUser('user-quartz', 'quartz@example.com');
    const tx = {} as IDatabaseTransactionClient;
    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    const authContext = buildAuthJwtAccessContext(user.id);
    const factorState = buildMfaFactorState('user-quartz');
    const userContext = buildUserContext(user);
    const entryEffect: IActivityLogCreateManyEffect = {
        queue: EnumActivityLogQueue.activityLog,
        name: EnumActivityLogProcess.createMany,
        data: { rows: [] },
        priority: EnumQueuePriority.low,
        idempotencyKey: null,
    };
    const passkey = {
        id: 'passkey-new',
        name: 'iPhone',
        deviceType: EnumMfaPasskeyDeviceType.multiDevice,
        backedUp: true,
        createdAt: new Date('2026-03-01T00:00:00.000Z'),
        lastUsedAt: null,
    };
    const registration: IMfaPasskeyRegistration = {
        credentialId: 'credential-new',
        publicKey: 'ZGVm-w',
        counter: 7,
        transports: ['internal'],
        deviceType: EnumMfaPasskeyDeviceType.multiDevice,
        backedUp: true,
    };
    const dto: MfaPasskeyRegisterRequestDto = {
        challengeToken: 'token-quartz',
        name: 'iPhone',
        registrationResponse: {
            id: 'credential-new',
            rawId: 'credential-new',
            response: {
                clientDataJSON: 'client-data',
                attestationObject: 'attestation',
            },
            clientExtensionResults: {},
            type: 'public-key',
        },
        password: 'Current-pass1',
    };

    beforeEach(async () => {
        databaseService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );
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
        mfaChallengeService.getWebAuthnChallengeForUser.mockResolvedValue(
            'challenge-stored'
        );
        mfaPasskeyService.assertRegistrable.mockResolvedValue(registration);
        mfaPasskeyService.registerInTx.mockResolvedValue(passkey);
        mfaService.createBackupCodesInTx.mockResolvedValue(['CODE000001']);
        activityLogQueue.recordEffect.mockReturnValue(entryEffect);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MfaRegisterPasskeyUseCase,
                { provide: MfaService, useValue: mfaService },
                { provide: MfaPasskeyService, useValue: mfaPasskeyService },
                { provide: MfaChallengeService, useValue: mfaChallengeService },
                { provide: UserAuthService, useValue: userAuthService },
                { provide: ActivityLogQueue, useValue: activityLogQueue },
                { provide: DatabaseService, useValue: databaseService },
                { provide: OutboxService, useValue: outboxService },
                ...TestUnitKitProviders,
                {
                    provide: ConfigService,
                    useValue: buildConfigService(TestUnitKitConfigValues),
                },
            ],
        }).compile();
        useCase = module.get(MfaRegisterPasskeyUseCase);
    });

    describe('execute', () => {
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

        it('rejects with the enrollment gate exception and calls no other collaborator', async () => {
            const failure = new FeatureFlagDisabledException();
            mfaService.assertEnrollmentAllowed.mockRejectedValue(failure);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    dto
                )
            ).rejects.toBe(failure);

            expect(mfaService.assertEnrollmentAllowed).toHaveBeenCalledWith(
                EnumMfaMethod.passkey
            );
            expect(
                userAuthService.checkReauthenticationPassword
            ).not.toHaveBeenCalled();
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('reads the registration and asserts the enrollment gate together', async () => {
            const gate = buildDeferred<void>();
            mfaService.assertEnrollmentAllowed.mockReturnValue(gate.promise);
            mfaChallengeService.getWebAuthnChallengeForUser.mockImplementation(
                async () => {
                    gate.resolve();
                    return 'challenge-stored';
                }
            );

            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                dto
            );

            expect(mfaPasskeyService.assertRegistrable).toHaveBeenCalledBefore(
                userAuthService.checkReauthenticationPassword
            );
        });

        it('reads the registration challenge, then asserts the re-authentication', async () => {
            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                dto
            );

            expect(
                userAuthService.checkReauthenticationPassword
            ).toHaveBeenCalledWith(user, {
                action: EnumUserReauthenticationAction.mfaPasskeyRegister,
                password: 'Current-pass1',
                method: null,
                code: null,
                backupCode: null,
                passkeyChallengeToken: null,
                passkeyResponse: null,
                otp: null,
            });
            expect(
                mfaChallengeService.getWebAuthnChallengeForUser
            ).toHaveBeenCalledWith(
                'token-quartz',
                EnumMfaChallengePurpose.registration,
                authContext.userId
            );
            expect(
                mfaChallengeService.getWebAuthnChallengeForUser
            ).toHaveBeenCalledBefore(
                userAuthService.checkReauthenticationPassword
            );
        });

        it('passes the method, codes, and email code of the request to the re-authentication', async () => {
            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                {
                    ...dto,
                    password: undefined,
                    method: EnumMfaMethod.backupCode,
                    backupCode: 'B1',
                    passkeyChallengeToken: 'challenge-quartz',
                    passkeyResponse,
                    otp: '123456',
                }
            );

            expect(
                userAuthService.checkReauthenticationPassword
            ).toHaveBeenCalledWith(user, {
                action: EnumUserReauthenticationAction.mfaPasskeyRegister,
                password: null,
                method: EnumMfaMethod.backupCode,
                code: null,
                backupCode: 'B1',
                passkeyChallengeToken: 'challenge-quartz',
                passkeyResponse,
                otp: '123456',
            });
        });

        it('completes the re-authentication first on one tx, claims the challenge, registers the passkey, creates the codes, adds the entry, and answers the passkey with the codes', async () => {
            const calls: string[] = [];
            userAuthService.completeReauthenticationInTx.mockImplementation(
                async () => {
                    calls.push('complete');
                }
            );
            mfaChallengeService.consumeInTx.mockImplementation(async () => {
                calls.push('consume');
            });
            mfaPasskeyService.registerInTx.mockImplementation(async () => {
                calls.push('register');

                return passkey;
            });
            mfaService.createBackupCodesInTx.mockImplementation(async () => {
                calls.push('codes');

                return ['CODE000001'];
            });
            outboxService.addInTx.mockImplementation(async () => {
                calls.push('entry');

                return 'outbox-id';
            });

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    dto
                )
            ).resolves.toEqual({
                data: { passkey, backupCodes: ['CODE000001'] },
            });

            expect(calls).toEqual([
                'complete',
                'consume',
                'register',
                'codes',
                'entry',
            ]);
            expect(
                userAuthService.completeReauthenticationInTx
            ).toHaveBeenCalledWith(tx, authContext, true, null, false);
            expect(mfaService.getFactorState).toHaveBeenCalledTimes(1);
            expect(mfaService.getFactorState).toHaveBeenCalledWith(
                'user-quartz'
            );
            expect(mfaService.checkReauthentication).toHaveBeenCalledWith(
                'user-quartz',
                expect.objectContaining({
                    action: EnumUserReauthenticationAction.mfaPasskeyRegister,
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
            expect(mfaChallengeService.consumeInTx).toHaveBeenCalledWith(
                tx,
                'token-quartz',
                EnumMfaChallengePurpose.registration,
                'user-quartz'
            );
            expect(mfaPasskeyService.registerInTx).toHaveBeenCalledWith(
                tx,
                'user-quartz',
                'iPhone',
                registration
            );
            expect(mfaService.createBackupCodesInTx).toHaveBeenCalledWith(
                tx,
                'user-quartz'
            );
            expect(activityLogQueue.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                null,
                { action: EnumActivityLogAction.userMfaPasskeyRegistered }
            );
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, entryEffect);
        });

        it('answers null codes for a passkey that is not the first factor', async () => {
            mfaService.createBackupCodesInTx.mockResolvedValue(null);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    dto
                )
            ).resolves.toEqual({ data: { passkey, backupCodes: null } });
        });

        it('reads the challenge, then asserts the registration against it before any transaction', async () => {
            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                dto
            );

            expect(mfaPasskeyService.assertRegistrable).toHaveBeenCalledWith(
                'user-quartz',
                dto.registrationResponse,
                'challenge-stored'
            );
            expect(
                mfaChallengeService.getWebAuthnChallengeForUser
            ).toHaveBeenCalledBefore(mfaPasskeyService.assertRegistrable);
            expect(mfaPasskeyService.assertRegistrable).toHaveBeenCalledBefore(
                databaseService.withTransaction
            );
        });

        it.each([
            ['the cap', new MfaPasskeyLimitException()],
            ['the attestation', new MfaPasskeyInvalidException()],
            [
                'a registered credential',
                new MfaPasskeyAlreadyRegisteredException(),
            ],
        ])(
            'passes on the refusal of %s, proving nothing and opening no transaction',
            async (_label, failure) => {
                mfaPasskeyService.assertRegistrable.mockRejectedValue(failure);

                await expect(
                    useCase.execute(
                        requestContext,
                        apiKeyContext,
                        authContext,
                        userContext,
                        dto
                    )
                ).rejects.toBe(failure);

                expect(
                    userAuthService.checkReauthenticationPassword
                ).not.toHaveBeenCalled();
                expect(databaseService.withTransaction).not.toHaveBeenCalled();
                expect(mfaPasskeyService.registerInTx).not.toHaveBeenCalled();
            }
        );

        it('passes on the challenge exception of the service, writing nothing', async () => {
            const failure = new MfaChallengeInvalidException();
            mfaChallengeService.getWebAuthnChallengeForUser.mockRejectedValue(
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

            expect(
                userAuthService.checkReauthenticationPassword
            ).not.toHaveBeenCalled();
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('rethrows an app exception of the transaction unchanged, adding no entry', async () => {
            const failure = new MfaPasskeyInvalidException();
            mfaPasskeyService.registerInTx.mockRejectedValue(failure);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    dto
                )
            ).rejects.toBe(failure);

            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });

        it('rethrows any other failure of the transaction untouched', async () => {
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
            ).rejects.toBe(cause);
        });
    });
});
