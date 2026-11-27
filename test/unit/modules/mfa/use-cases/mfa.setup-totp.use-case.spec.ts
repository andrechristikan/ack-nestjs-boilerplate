import { FeatureFlagDisabledException } from '@modules/feature-flag/exceptions/feature-flag.disabled.exception';
import {
    TestUnitReauthenticationMfaFailure,
    TestUnitReauthenticationMfaOff,
    TestUnitReauthenticationPasswordLimit,
    TestUnitReauthenticationPasswordPassed,
} from '@test/unit/helpers/test.unit.user.helper';
import { buildDeferred } from '@test/unit/helpers/test.unit.deferred.helper';
import { buildMfaFactorState } from '@test/unit/helpers/test.unit.mfa.helper';
import { MfaService } from '@modules/mfa/services/mfa.service';
import { ConfigService } from '@nestjs/config';
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
import { EnumMfaMethod } from '@modules/mfa/enums/mfa.enum';
import { MfaInvalidException } from '@modules/mfa/exceptions/mfa.invalid.exception';
import { MfaTotpAlreadyEnabledException } from '@modules/mfa/exceptions/mfa.totp-already-enabled.exception';
import type { IMfaTotpSetup } from '@modules/mfa/interfaces/mfa.interface';
import { MfaTotpService } from '@modules/mfa/services/mfa.totp.service';
import { UserAuthService } from '@modules/user/services/user.auth.service';
import { MfaSetupTotpUseCase } from '@modules/mfa/use-cases/mfa.setup-totp.use-case';
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

describe('MfaSetupTotpUseCase', () => {
    const mfaService: MockProxy<MfaService> = mock<MfaService>();
    const mfaTotpService: MockProxy<MfaTotpService> = mock<MfaTotpService>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();
    const userAuthService: MockProxy<UserAuthService> = mock<UserAuthService>();
    const activityLogQueue: MockProxy<ActivityLogQueue> =
        mock<ActivityLogQueue>();

    let useCase: MfaSetupTotpUseCase;

    const user = buildUser('user-marten', 'marten@example.com');
    const tx = {} as IDatabaseTransactionClient;
    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    const authContext = buildAuthJwtAccessContext(user.id);
    const factorState = buildMfaFactorState('user-marten');
    const userContext = buildUserContext(user);
    const entryEffect: IActivityLogCreateManyEffect = {
        queue: EnumActivityLogQueue.activityLog,
        name: EnumActivityLogProcess.createMany,
        data: { rows: [] },
        priority: EnumQueuePriority.low,
        idempotencyKey: null,
    };
    const setup: IMfaTotpSetup = {
        secret: 'secret',
        otpauthUrl: 'otpauth://totp/secret',
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
        mfaTotpService.setupInTx.mockResolvedValue(setup);
        activityLogQueue.recordEffect.mockReturnValue(entryEffect);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MfaSetupTotpUseCase,
                { provide: MfaService, useValue: mfaService },
                { provide: MfaTotpService, useValue: mfaTotpService },
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
        useCase = module.get(MfaSetupTotpUseCase);
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
                    { password: 'Current-pass1' }
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
                    { password: 'Current-pass1' }
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
                    { password: 'Current-pass1' }
                )
            ).rejects.toBe(failure);

            expect(mfaService.assertEnrollmentAllowed).toHaveBeenCalledWith(
                EnumMfaMethod.totp
            );
            expect(
                userAuthService.checkReauthenticationPassword
            ).not.toHaveBeenCalled();
            expect(mfaTotpService.setupInTx).not.toHaveBeenCalled();
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('asserts the whole re-authentication request, the MFA proof included', async () => {
            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                {
                    password: 'Current-pass1',
                    method: EnumMfaMethod.backupCode,
                    backupCode: 'BACKUP1',
                }
            );

            expect(
                userAuthService.checkReauthenticationPassword
            ).toHaveBeenCalledWith(user, {
                action: EnumUserReauthenticationAction.mfaTotpSetup,
                password: 'Current-pass1',
                method: EnumMfaMethod.backupCode,
                code: null,
                backupCode: 'BACKUP1',
                passkeyChallengeToken: null,
                passkeyResponse: null,
                otp: null,
            });
        });

        it('passes null for every field the request omits and the email code on', async () => {
            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                {
                    otp: '123456',
                    passkeyChallengeToken: 'challenge-quartz',
                    passkeyResponse,
                }
            );

            expect(
                userAuthService.checkReauthenticationPassword
            ).toHaveBeenCalledWith(user, {
                action: EnumUserReauthenticationAction.mfaTotpSetup,
                password: null,
                method: null,
                code: null,
                backupCode: null,
                passkeyChallengeToken: 'challenge-quartz',
                passkeyResponse,
                otp: '123456',
            });
        });

        it('completes the re-authentication first in the transaction, stores the pending secret, adds the setup entry, and returns the setup', async () => {
            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    { password: 'Current-pass1' }
                )
            ).resolves.toEqual({ data: setup });

            expect(
                userAuthService.completeReauthenticationInTx
            ).toHaveBeenCalledWith(tx, authContext, true, null, false);
            expect(mfaService.getFactorState).toHaveBeenCalledTimes(1);
            expect(mfaService.getFactorState).toHaveBeenCalledWith(
                'user-marten'
            );
            expect(mfaService.checkReauthentication).toHaveBeenCalledWith(
                'user-marten',
                expect.objectContaining({
                    action: EnumUserReauthenticationAction.mfaTotpSetup,
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
            expect(
                userAuthService.completeReauthenticationInTx
            ).toHaveBeenCalledBefore(mfaTotpService.setupInTx);
            expect(mfaTotpService.setupInTx).toHaveBeenCalledWith(
                tx,
                'user-marten',
                'marten@example.com'
            );
            expect(activityLogQueue.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                {
                    action: EnumActivityLogAction.userMfaTotpSetUp,
                    userId: 'user-marten',
                    createdBy: 'user-marten',
                }
            );
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, entryEffect);
        });

        it('leaves the work undone when the re-authentication fails', async () => {
            const failure = new MfaInvalidException();
            mfaService.checkReauthentication.mockRejectedValue(failure);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    { password: 'Current-pass1' }
                )
            ).rejects.toBe(failure);

            expect(databaseService.withTransaction).not.toHaveBeenCalled();
            expect(mfaTotpService.setupInTx).not.toHaveBeenCalled();
        });

        it('reads the state with the enrollment gate, then asserts the setup on the state row before the re-authentication', async () => {
            const gate = buildDeferred<void>();
            mfaService.assertEnrollmentAllowed.mockReturnValue(gate.promise);
            mfaService.getFactorState.mockImplementation(async () => {
                gate.resolve();

                return factorState;
            });

            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                { password: 'Current-pass1' }
            );

            expect(mfaTotpService.assertSetupAllowed).toHaveBeenCalledWith(
                factorState.totp
            );
            expect(mfaService.getFactorState).toHaveBeenCalledBefore(
                mfaTotpService.assertSetupAllowed
            );
            expect(mfaTotpService.assertSetupAllowed).toHaveBeenCalledBefore(
                userAuthService.checkReauthenticationPassword
            );
            expect(mfaService.assertEnrollmentAllowed).toHaveBeenCalledBefore(
                userAuthService.checkReauthenticationPassword
            );
        });

        it('passes on the refusal of a confirmed TOTP, opening no transaction', async () => {
            const failure = new MfaTotpAlreadyEnabledException();
            mfaTotpService.assertSetupAllowed.mockImplementation(() => {
                throw failure;
            });

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    { password: 'Current-pass1' }
                )
            ).rejects.toBe(failure);

            expect(
                userAuthService.checkReauthenticationPassword
            ).not.toHaveBeenCalled();
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
            expect(mfaTotpService.setupInTx).not.toHaveBeenCalled();
        });

        it('rethrows the typed exception of the setup statement untouched', async () => {
            const failure = new MfaTotpAlreadyEnabledException();
            mfaTotpService.setupInTx.mockRejectedValue(failure);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    { password: 'Current-pass1' }
                )
            ).rejects.toBe(failure);
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
                    { password: 'Current-pass1' }
                )
            ).rejects.toBe(cause);
        });
    });
});
