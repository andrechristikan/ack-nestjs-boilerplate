import { FeatureFlagDisabledException } from '@modules/feature-flag/exceptions/feature-flag.disabled.exception';
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
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import type { IActivityLogCreateManyEffect } from '@modules/activity-log/interfaces/activity-log.interface';
import {
    EnumActivityLogProcess,
    EnumActivityLogQueue,
} from '@modules/activity-log/enums/activity-log.enum';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import type { MfaPasskeyRegisterRequestDto } from '@modules/mfa/dtos/request/mfa.passkey-register.request.dto';
import { EnumMfaMethod } from '@modules/mfa/enums/mfa.enum';
import {
    EnumFeatureFlagKey,
    EnumFeatureFlagMetadataKey,
} from '@modules/feature-flag/enums/feature-flag.enum';
import { FeatureFlagNotConfiguredException } from '@modules/feature-flag/exceptions/feature-flag.not-configured.exception';
import { MfaChallengeInvalidException } from '@modules/mfa/exceptions/mfa.challenge-invalid.exception';
import { MfaInvalidException } from '@modules/mfa/exceptions/mfa.invalid.exception';
import { MfaPasskeyInvalidException } from '@modules/mfa/exceptions/mfa.passkey-invalid.exception';
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
    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();

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
        vi.resetAllMocks();
        outboxService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );
        userAuthService.assertReauthentication.mockResolvedValue(passwordOnly);
        mfaChallengeService.getWebAuthnChallengeForUser.mockResolvedValue(
            'challenge-stored'
        );
        mfaPasskeyService.getMaxPerUser.mockResolvedValue(10);
        mfaPasskeyService.registerInTx.mockResolvedValue(passkey);
        mfaService.createBackupCodesInTx.mockResolvedValue(['CODE000001']);
        activityLogService.recordEffect.mockReturnValue(entryEffect);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MfaRegisterPasskeyUseCase,
                { provide: MfaService, useValue: mfaService },
                { provide: MfaPasskeyService, useValue: mfaPasskeyService },
                { provide: MfaChallengeService, useValue: mfaChallengeService },
                { provide: UserAuthService, useValue: userAuthService },
                { provide: ActivityLogService, useValue: activityLogService },
                { provide: OutboxService, useValue: outboxService },
                { provide: DatabaseUtil, useValue: databaseUtil },
            ],
        }).compile();
        useCase = module.get(MfaRegisterPasskeyUseCase);
    });

    describe('execute', () => {
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
                userAuthService.assertReauthentication
            ).not.toHaveBeenCalled();
            expect(
                mfaChallengeService.getWebAuthnChallengeForUser
            ).not.toHaveBeenCalled();
            expect(outboxService.withTransaction).not.toHaveBeenCalled();
        });

        it('asserts the re-authentication, then reads the registration challenge', async () => {
            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                dto
            );

            expect(userAuthService.assertReauthentication).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
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
                userAuthService.assertReauthentication
            ).toHaveBeenCalledBefore(
                mfaChallengeService.getWebAuthnChallengeForUser
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

            expect(userAuthService.assertReauthentication).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
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
                dto.registrationResponse,
                'challenge-stored',
                10
            );
            expect(mfaService.createBackupCodesInTx).toHaveBeenCalledWith(
                tx,
                'user-quartz'
            );
            expect(activityLogService.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                null,
                { action: EnumActivityLogAction.userRegisterMfaPasskey }
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

        it('passes the number getMaxPerUser returns to registerInTx as its last argument', async () => {
            mfaPasskeyService.getMaxPerUser.mockResolvedValue(4);

            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                dto
            );

            expect(mfaPasskeyService.registerInTx).toHaveBeenCalledWith(
                tx,
                'user-quartz',
                'iPhone',
                dto.registrationResponse,
                'challenge-stored',
                4
            );
        });

        it('passes on the FeatureFlagNotConfiguredException of getMaxPerUser, opening no transaction', async () => {
            const failure = new FeatureFlagNotConfiguredException(
                EnumFeatureFlagKey.mfa,
                EnumFeatureFlagMetadataKey.passkeyMaxPerUser
            );
            mfaPasskeyService.getMaxPerUser.mockRejectedValue(failure);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    dto
                )
            ).rejects.toBe(failure);

            expect(outboxService.withTransaction).not.toHaveBeenCalled();
            expect(mfaPasskeyService.registerInTx).not.toHaveBeenCalled();
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

            expect(outboxService.withTransaction).not.toHaveBeenCalled();
        });

        it('reads no challenge when the proof fails', async () => {
            const failure = new MfaInvalidException();
            userAuthService.assertReauthentication.mockRejectedValue(failure);

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
                mfaChallengeService.getWebAuthnChallengeForUser
            ).not.toHaveBeenCalled();
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
            expect(databaseUtil.toException).not.toHaveBeenCalled();
        });

        it('answers MfaInvalidException on a write conflict after an MFA proof', async () => {
            userAuthService.assertReauthentication.mockResolvedValue({
                ...passwordOnly,
                mfa: {
                    method: EnumMfaMethod.totp,
                    totpStep: 1,
                    backupCodeIndex: null,
                    passkey: null,
                },
            });
            outboxService.withTransaction.mockRejectedValue(new Error('wc'));
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
            ).rejects.toBeInstanceOf(MfaInvalidException);
        });

        it('answers MfaChallengeInvalidException on a write conflict with no MFA proof', async () => {
            outboxService.withTransaction.mockRejectedValue(new Error('wc'));
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
            ).rejects.toBeInstanceOf(MfaChallengeInvalidException);
        });

        it('wraps any other transaction failure in the unknown exception', async () => {
            const cause = new Error('boom');
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
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: cause,
            });
        });
    });
});
