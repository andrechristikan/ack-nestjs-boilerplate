import { FeatureFlagDisabledException } from '@modules/feature-flag/exceptions/feature-flag.disabled.exception';
import { TestUnitReauthenticationPasswordFailure } from '@test/unit/helpers/test.unit.user.helper';
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
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import {
    DatabaseUniqueConstraintCode,
    DatabaseWriteConflictCode,
} from '@common/database/constants/database.constant';
import { Prisma } from '@generated/prisma-client/client';
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
import { EnumMfaStatusCodeError } from '@modules/mfa/enums/mfa.status-code.enum';
import { MfaPasskeyInvalidException } from '@modules/mfa/exceptions/mfa.passkey-invalid.exception';
import { MfaPasskeyLimitException } from '@modules/mfa/exceptions/mfa.passkey-limit.exception';
import type { IMfaPasskeyRegistration } from '@modules/mfa/interfaces/mfa.interface';
import { MfaChallengeService } from '@modules/mfa/services/mfa.challenge.service';
import { MfaPasskeyService } from '@modules/mfa/services/mfa.passkey.service';
import { MfaService } from '@modules/mfa/services/mfa.service';
import { MfaRegisterPasskeyUseCase } from '@modules/mfa/use-cases/mfa.register-passkey.use-case';
import type { IUserReauthenticationCheck } from '@modules/user/interfaces/user.interface';
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
    const userContext = buildUserContext(user);
    const passwordOnly: IUserReauthenticationCheck = {
        isPasswordChecked: true,
        mfa: null,
        verificationId: null,
        passkeyChallengeToken: null,
    };
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
        userAuthService.checkReauthentication.mockResolvedValue({
            check: passwordOnly,
            failure: null,
        });
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

        it('rejects with the enrolment gate exception and calls no other collaborator', async () => {
            const failure = new FeatureFlagDisabledException();
            mfaService.assertEnrolmentAllowed.mockRejectedValue(failure);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    dto
                )
            ).rejects.toBe(failure);

            expect(mfaService.assertEnrolmentAllowed).toHaveBeenCalledWith(
                EnumMfaMethod.passkey
            );
            expect(
                userAuthService.checkReauthentication
            ).not.toHaveBeenCalled();
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('reads the registration and asserts the enrolment gate together', async () => {
            const gate = buildDeferred<void>();
            mfaService.assertEnrolmentAllowed.mockReturnValue(gate.promise);
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
                userAuthService.checkReauthentication
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

            expect(userAuthService.checkReauthentication).toHaveBeenCalledWith(
                user,
                {
                    action: EnumUserReauthenticationAction.mfaPasskeyRegister,
                    password: 'Current-pass1',
                    method: null,
                    code: null,
                    backupCode: null,
                    passkeyChallengeToken: null,
                    passkeyResponse: null,
                    otp: null,
                }
            );
            expect(
                mfaChallengeService.getWebAuthnChallengeForUser
            ).toHaveBeenCalledWith(
                'token-quartz',
                EnumMfaChallengePurpose.registration,
                authContext.userId
            );
            expect(
                mfaChallengeService.getWebAuthnChallengeForUser
            ).toHaveBeenCalledBefore(userAuthService.checkReauthentication);
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

            expect(userAuthService.checkReauthentication).toHaveBeenCalledWith(
                user,
                {
                    action: EnumUserReauthenticationAction.mfaPasskeyRegister,
                    password: null,
                    method: EnumMfaMethod.backupCode,
                    code: null,
                    backupCode: 'B1',
                    passkeyChallengeToken: 'challenge-quartz',
                    passkeyResponse,
                    otp: '123456',
                }
            );
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
            ).toHaveBeenCalledWith(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                passwordOnly
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
                    userAuthService.checkReauthentication
                ).not.toHaveBeenCalled();
                expect(databaseService.withTransaction).not.toHaveBeenCalled();
                expect(mfaPasskeyService.registerInTx).not.toHaveBeenCalled();
            }
        );

        it('answers MfaPasskeyAlreadyRegisteredException on a unique collision of the credential id', async () => {
            databaseService.withTransaction.mockRejectedValue(
                new Prisma.PrismaClientKnownRequestError('unique', {
                    code: DatabaseUniqueConstraintCode,
                    clientVersion: 'test',
                    meta: { target: ['credentialId'] },
                })
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
                module: 'mfa',
                statusCode: EnumMfaStatusCodeError.passkeyAlreadyRegistered,
            });
        });

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
                userAuthService.checkReauthentication
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

        it('answers MfaInvalidException on a write conflict after an MFA proof', async () => {
            userAuthService.checkReauthentication.mockResolvedValue({
                check: {
                    ...passwordOnly,
                    mfa: {
                        method: EnumMfaMethod.totp,
                        totpStep: 1,
                        backupCodeHash: null,
                        passkey: null,
                    },
                },
                failure: null,
            });
            databaseService.withTransaction.mockRejectedValue(
                new Prisma.PrismaClientKnownRequestError('conflict', {
                    code: DatabaseWriteConflictCode,
                    clientVersion: 'test',
                })
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
                module: 'mfa',
                statusCode: EnumMfaStatusCodeError.invalid,
            });
        });

        it('answers MfaChallengeInvalidException on a write conflict with no MFA proof', async () => {
            databaseService.withTransaction.mockRejectedValue(
                new Prisma.PrismaClientKnownRequestError('conflict', {
                    code: DatabaseWriteConflictCode,
                    clientVersion: 'test',
                })
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
                module: 'mfa',
                statusCode: EnumMfaStatusCodeError.challengeInvalid,
            });
        });

        it('wraps any other transaction failure in the unknown exception', async () => {
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
