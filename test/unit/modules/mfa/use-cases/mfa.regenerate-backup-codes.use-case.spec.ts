import { ConfigService } from '@nestjs/config';
import {
    TestUnitReauthenticationMfaFailure,
    TestUnitReauthenticationPasswordLimit,
    TestUnitReauthenticationPasswordPassed,
} from '@test/unit/helpers/test.unit.user.helper';
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
import { EnumMfaMethod } from '@modules/mfa/enums/mfa.enum';
import { MfaAttemptMaxException } from '@modules/mfa/exceptions/mfa.attempt-max.exception';
import { MfaInvalidException } from '@modules/mfa/exceptions/mfa.invalid.exception';
import { MfaNotEnabledException } from '@modules/mfa/exceptions/mfa.not-enabled.exception';
import type { IMfaReauthenticationResult } from '@modules/mfa/interfaces/mfa.interface';
import { buildMfaFactorState } from '@test/unit/helpers/test.unit.mfa.helper';
import { MfaService } from '@modules/mfa/services/mfa.service';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import type { IActivityLogCreateManyEffect } from '@modules/activity-log/interfaces/activity-log.interface';
import {
    EnumActivityLogProcess,
    EnumActivityLogQueue,
} from '@modules/activity-log/enums/activity-log.enum';
import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
import { UserAuthService } from '@modules/user/services/user.auth.service';
import type { MfaBackupCodeRegenerateRequestDto } from '@modules/mfa/dtos/request/mfa.backup-code-regenerate.request.dto';
import { MfaRegenerateBackupCodesUseCase } from '@modules/mfa/use-cases/mfa.regenerate-backup-codes.use-case';
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

describe('MfaRegenerateBackupCodesUseCase', () => {
    const userAuthService: MockProxy<UserAuthService> = mock<UserAuthService>();
    const mfaService: MockProxy<MfaService> = mock<MfaService>();
    const activityLogQueue: MockProxy<ActivityLogQueue> =
        mock<ActivityLogQueue>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();

    let useCase: MfaRegenerateBackupCodesUseCase;

    const user = buildUser('user-marten', 'marten@example.com');
    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    const authContext = buildAuthJwtAccessContext(user.id);
    const factorState = buildMfaFactorState('user-marten');
    const userContext = buildUserContext(user);
    const tx = {} as IDatabaseTransactionClient;
    const entryEffect: IActivityLogCreateManyEffect = {
        queue: EnumActivityLogQueue.activityLog,
        name: EnumActivityLogProcess.createMany,
        data: { rows: [] },
        priority: EnumQueuePriority.low,
        idempotencyKey: null,
    };
    const mfaVerified: IMfaReauthenticationResult = {
        isEnabled: true,
        check: {
            method: EnumMfaMethod.totp,
            totpStep: 58123456,
            backupCodeHash: null,
            passkey: null,
        },
        failure: null,
        passkeyChallengeToken: null,
    };

    beforeEach(async () => {
        databaseService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );
        userAuthService.checkReauthenticationPassword.mockResolvedValue(
            TestUnitReauthenticationPasswordPassed
        );
        mfaService.checkReauthentication.mockResolvedValue(mfaVerified);
        mfaService.getFactorState.mockResolvedValue(factorState);
        userAuthService.getReauthenticationVerificationId.mockResolvedValue(
            null
        );
        activityLogQueue.recordEffect.mockReturnValue(entryEffect);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MfaRegenerateBackupCodesUseCase,
                { provide: MfaService, useValue: mfaService },
                { provide: UserAuthService, useValue: userAuthService },
                { provide: ActivityLogQueue, useValue: activityLogQueue },
                ...TestUnitKitProviders,
                {
                    provide: ConfigService,
                    useValue: buildConfigService(TestUnitKitConfigValues),
                },
                { provide: DatabaseService, useValue: databaseService },
                { provide: OutboxService, useValue: outboxService },
            ],
        }).compile();
        useCase = module.get(MfaRegenerateBackupCodesUseCase);
    });

    describe('execute', () => {
        const dto: MfaBackupCodeRegenerateRequestDto = {
            password: 'Current-pass1',
            method: EnumMfaMethod.totp,
            code: '654321',
        };

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

        it('asserts the re-authentication before the transaction, then completes and regenerates on one tx', async () => {
            mfaService.regenerateBackupCodesInTx.mockResolvedValue([
                'CODE000001',
                'CODE000002',
            ]);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    dto
                )
            ).resolves.toEqual({
                data: { backupCodes: ['CODE000001', 'CODE000002'] },
            });

            expect(mfaService.assertEnabled).toHaveBeenCalledWith(factorState);
            expect(mfaService.assertEnabled).toHaveBeenCalledBefore(
                userAuthService.checkReauthenticationPassword
            );
            expect(mfaService.getFactorState).toHaveBeenCalledTimes(1);
            expect(mfaService.getFactorState).toHaveBeenCalledWith(
                'user-marten'
            );
            expect(mfaService.checkReauthentication).toHaveBeenCalledWith(
                'user-marten',
                expect.objectContaining({
                    action: EnumUserReauthenticationAction.mfaBackupCodeRegenerate,
                }),
                true,
                factorState
            );
            expect(mfaService.getFactorState).toHaveBeenCalledBefore(
                mfaService.checkReauthentication
            );
            expect(
                userAuthService.checkReauthenticationPassword
            ).toHaveBeenCalledWith(user, {
                action: EnumUserReauthenticationAction.mfaBackupCodeRegenerate,
                password: 'Current-pass1',
                method: EnumMfaMethod.totp,
                code: '654321',
                backupCode: null,
                passkeyChallengeToken: null,
                passkeyResponse: null,
                otp: null,
            });
            expect(
                userAuthService.checkReauthenticationPassword
            ).toHaveBeenCalledBefore(databaseService.withTransaction);
            expect(
                userAuthService.completeReauthenticationInTx
            ).toHaveBeenCalledWith(tx, authContext, true, null, false);
            expect(
                mfaService.completeReauthenticationInTx
            ).toHaveBeenCalledWith(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                mfaVerified
            );
            expect(
                userAuthService.completeReauthenticationInTx
            ).toHaveBeenCalledBefore(mfaService.regenerateBackupCodesInTx);
            expect(mfaService.regenerateBackupCodesInTx).toHaveBeenCalledWith(
                tx,
                'user-marten'
            );
            expect(activityLogQueue.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                { action: EnumActivityLogAction.userMfaBackupCodesRegenerated }
            );
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, entryEffect);
        });

        it('passes a backup code and null for every omitted field', async () => {
            mfaService.regenerateBackupCodesInTx.mockResolvedValue([]);

            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                {
                    method: EnumMfaMethod.backupCode,
                    backupCode: 'B1',
                }
            );

            expect(
                userAuthService.checkReauthenticationPassword
            ).toHaveBeenCalledWith(user, {
                action: EnumUserReauthenticationAction.mfaBackupCodeRegenerate,
                password: null,
                method: EnumMfaMethod.backupCode,
                code: null,
                backupCode: 'B1',
                passkeyChallengeToken: null,
                passkeyResponse: null,
                otp: null,
            });
        });

        it('passes the email code of the request on', async () => {
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
                action: EnumUserReauthenticationAction.mfaBackupCodeRegenerate,
                password: null,
                method: null,
                code: null,
                backupCode: null,
                passkeyChallengeToken: 'challenge-quartz',
                passkeyResponse,
                otp: '123456',
            });
        });

        it('passes null for every field the request omits', async () => {
            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                {}
            );

            expect(
                userAuthService.checkReauthenticationPassword
            ).toHaveBeenCalledWith(user, {
                action: EnumUserReauthenticationAction.mfaBackupCodeRegenerate,
                password: null,
                method: null,
                code: null,
                backupCode: null,
                passkeyChallengeToken: null,
                passkeyResponse: null,
                otp: null,
            });
        });

        it('asserts nothing when MFA is not enabled', async () => {
            const failure = new MfaNotEnabledException();
            mfaService.assertEnabled.mockRejectedValue(failure);

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
        });

        it('opens no transaction when the proof fails', async () => {
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

        it('regenerates nothing when the completion refuses the proof', async () => {
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

            expect(mfaService.regenerateBackupCodesInTx).not.toHaveBeenCalled();
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
