import { FeatureFlagDisabledException } from '@modules/feature-flag/exceptions/feature-flag.disabled.exception';
import type { IMfaAttemptFailure } from '@modules/mfa/interfaces/mfa.interface';
import {
    TestUnitReauthenticationMfaFailure,
    TestUnitReauthenticationMfaOff,
    TestUnitReauthenticationPasswordLimit,
    TestUnitReauthenticationPasswordPassed,
} from '@test/unit/helpers/test.unit.user.helper';
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
import { DatabaseWriteConflictCode } from '@common/database/constants/database.constant';
import { Prisma } from '@generated/prisma-client/client';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
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
import { MfaService } from '@modules/mfa/services/mfa.service';
import { MfaTotpService } from '@modules/mfa/services/mfa.totp.service';
import { MfaAttemptMaxException } from '@modules/mfa/exceptions/mfa.attempt-max.exception';
import { MfaInvalidException } from '@modules/mfa/exceptions/mfa.invalid.exception';
import { MfaTotpSetupRequiredException } from '@modules/mfa/exceptions/mfa.totp-setup-required.exception';
import { UserPasswordNotMatchException } from '@modules/user/exceptions/user.password-not-match.exception';
import { UserAuthService } from '@modules/user/services/user.auth.service';
import { MfaEnableTotpUseCase } from '@modules/mfa/use-cases/mfa.enable-totp.use-case';
import {
    buildRequestContext,
    buildApiKeyContext,
    buildAuthJwtAccessContext,
    buildUser,
    buildUserContext,
} from '@test/unit/helpers/test.unit.request.helper';
import { EnumMfaStatusCodeError } from '@modules/mfa/enums/mfa.status-code.enum';

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

describe('MfaEnableTotpUseCase', () => {
    const mfaService: MockProxy<MfaService> = mock<MfaService>();
    const mfaTotpService: MockProxy<MfaTotpService> = mock<MfaTotpService>();
    const userAuthService: MockProxy<UserAuthService> = mock<UserAuthService>();
    const activityLogQueue: MockProxy<ActivityLogQueue> =
        mock<ActivityLogQueue>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();

    let useCase: MfaEnableTotpUseCase;

    const user = buildUser('user-nell', 'nell@example.com');
    const tx = {} as IDatabaseTransactionClient;
    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    const authContext = buildAuthJwtAccessContext(user.id);
    const userContext = buildUserContext(user);
    const entryEffect: IActivityLogCreateManyEffect = {
        queue: EnumActivityLogQueue.activityLog,
        name: EnumActivityLogProcess.createMany,
        data: { rows: [] },
        priority: EnumQueuePriority.low,
        idempotencyKey: null,
    };
    const enableDto = { code: '654321', password: 'Current-pass1' };

    beforeEach(async () => {
        databaseService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MfaEnableTotpUseCase,
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
        useCase = module.get(MfaEnableTotpUseCase);
    });

    describe('execute', () => {
        beforeEach(() => {
            userAuthService.checkReauthenticationPassword.mockResolvedValue(
                TestUnitReauthenticationPasswordPassed
            );
            mfaService.checkReauthentication.mockResolvedValue(
                TestUnitReauthenticationMfaOff
            );
            userAuthService.getReauthenticationVerificationId.mockResolvedValue(
                null
            );
            mfaService.checkTotpSetupCode.mockResolvedValue({
                totpStep: 42,
                pendingSecret: 'encrypted-pending',
                failure: null,
            });
            mfaService.createBackupCodesInTx.mockResolvedValue(['CODE000001']);
            activityLogQueue.recordEffect.mockReturnValue(entryEffect);
        });

        it('commits the failed count in a transaction of its own, then throws, and enables nothing on a wrong setup code', async () => {
            const refusal = new Error('refused');
            const failure: IMfaAttemptFailure = {
                method: EnumMfaMethod.totp,
                maxAttempts: 5,
                lockedUntil: new Date('2026-03-01T00:15:00.000Z'),
            };
            mfaService.checkTotpSetupCode.mockResolvedValue({
                totpStep: null,
                pendingSecret: null,
                failure,
            });
            mfaService.countFailedAttemptInTx.mockResolvedValue(false);
            mfaService.throwFailedAttempt.mockImplementation(() => {
                throw refusal;
            });

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    enableDto
                )
            ).rejects.toBe(refusal);

            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
            expect(mfaService.countFailedAttemptInTx).toHaveBeenCalledWith(
                tx,
                requestContext,
                apiKeyContext,
                'user-nell',
                failure
            );
            expect(mfaService.countFailedAttemptInTx).toHaveBeenCalledBefore(
                mfaService.throwFailedAttempt
            );
            expect(mfaService.throwFailedAttempt).toHaveBeenCalledWith(
                failure,
                false
            );
            expect(
                userAuthService.completeReauthenticationInTx
            ).not.toHaveBeenCalled();
            expect(
                mfaService.completeReauthenticationInTx
            ).not.toHaveBeenCalled();
            expect(mfaTotpService.enableInTx).not.toHaveBeenCalled();
        });

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
                    enableDto
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
                    enableDto
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

        it('rejects with the enrolment gate exception and calls no other collaborator', async () => {
            const failure = new FeatureFlagDisabledException();
            mfaService.assertEnrolmentAllowed.mockRejectedValue(failure);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    enableDto
                )
            ).rejects.toBe(failure);

            expect(mfaService.assertEnrolmentAllowed).toHaveBeenCalledWith(
                EnumMfaMethod.totp
            );
            expect(
                userAuthService.checkReauthenticationPassword
            ).not.toHaveBeenCalled();
            expect(mfaService.checkTotpSetupCode).not.toHaveBeenCalled();
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('asserts the password with no old MFA proof, then checks the code of the new authenticator', async () => {
            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                enableDto
            );

            expect(
                userAuthService.checkReauthenticationPassword
            ).toHaveBeenCalledWith(user, {
                action: EnumUserReauthenticationAction.mfaTotpEnable,
                password: 'Current-pass1',
                method: null,
                code: null,
                backupCode: null,
                passkeyChallengeToken: null,
                passkeyResponse: null,
                otp: null,
            });
            expect(mfaService.checkTotpSetupCode).toHaveBeenCalledWith(
                'user-nell',
                '654321'
            );
            expect(mfaService.check).not.toHaveBeenCalled();
            expect(
                userAuthService.checkReauthenticationPassword
            ).toHaveBeenCalledBefore(mfaService.checkTotpSetupCode);
        });

        it('completes the re-authentication first in the transaction, enables the TOTP, resets the budget, creates the backup codes, adds the entry, and returns the codes', async () => {
            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    enableDto
                )
            ).resolves.toEqual({ data: { backupCodes: ['CODE000001'] } });

            expect(
                userAuthService.completeReauthenticationInTx
            ).toHaveBeenCalledWith(tx, authContext, true, null);
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
            ).toHaveBeenCalledBefore(mfaTotpService.enableInTx);
            expect(mfaTotpService.enableInTx).toHaveBeenCalledWith(
                tx,
                'user-nell',
                'encrypted-pending',
                42
            );
            expect(mfaTotpService.enableInTx).toHaveBeenCalledBefore(
                mfaService.resetAttemptInTx
            );
            expect(mfaService.resetAttemptInTx).toHaveBeenCalledWith(
                tx,
                'user-nell'
            );
            expect(mfaService.createBackupCodesInTx).toHaveBeenCalledWith(
                tx,
                'user-nell'
            );
            expect(activityLogQueue.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                null,
                {
                    action: EnumActivityLogAction.userMfaTotpEnabled,
                    userId: 'user-nell',
                    createdBy: 'user-nell',
                }
            );
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, entryEffect);
        });

        it('answers null backup codes when the account already holds codes', async () => {
            mfaService.createBackupCodesInTx.mockResolvedValue(null);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    enableDto
                )
            ).resolves.toEqual({ data: { backupCodes: null } });
        });

        it('passes null for an omitted password', async () => {
            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                { code: '654321' }
            );

            expect(
                userAuthService.checkReauthenticationPassword
            ).toHaveBeenCalledWith(
                user,
                expect.objectContaining({ password: null })
            );
        });

        it('passes the backup code of the request on with the backupCode method', async () => {
            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                { code: '654321', backupCode: 'ABCD1234EF' }
            );

            expect(
                userAuthService.checkReauthenticationPassword
            ).toHaveBeenCalledWith(
                user,
                expect.objectContaining({
                    method: EnumMfaMethod.backupCode,
                    code: null,
                    backupCode: 'ABCD1234EF',
                })
            );
        });

        it('passes the email code of the request on', async () => {
            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                {
                    code: '654321',
                    otp: '123456',
                    passkeyChallengeToken: 'challenge-quartz',
                    passkeyResponse,
                }
            );

            expect(
                userAuthService.checkReauthenticationPassword
            ).toHaveBeenCalledWith(user, {
                action: EnumUserReauthenticationAction.mfaTotpEnable,
                password: null,
                method: null,
                code: null,
                backupCode: null,
                passkeyChallengeToken: 'challenge-quartz',
                passkeyResponse,
                otp: '123456',
            });
        });

        it('leaves the work undone when the password proof fails', async () => {
            const failure = new UserPasswordNotMatchException();
            userAuthService.checkReauthenticationPassword.mockRejectedValue(
                failure
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    enableDto
                )
            ).rejects.toBe(failure);

            expect(mfaService.checkTotpSetupCode).not.toHaveBeenCalled();
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('leaves the work undone when the setup-code check refuses with an exception', async () => {
            const failure = new MfaAttemptMaxException();
            mfaService.checkTotpSetupCode.mockRejectedValue(failure);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    enableDto
                )
            ).rejects.toBe(failure);

            expect(databaseService.withTransaction).not.toHaveBeenCalled();
            expect(mfaTotpService.enableInTx).not.toHaveBeenCalled();
        });

        it('throws MfaTotpSetupRequiredException from the setup-code check when no pending secret exists, opening no transaction', async () => {
            const failure = new MfaTotpSetupRequiredException();
            mfaService.checkTotpSetupCode.mockRejectedValue(failure);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    enableDto
                )
            ).rejects.toBe(failure);

            expect(databaseService.withTransaction).not.toHaveBeenCalled();
            expect(mfaTotpService.enableInTx).not.toHaveBeenCalled();
        });

        it('rethrows an AppBaseException of the transaction as it is', async () => {
            const failure = new MfaInvalidException();
            mfaTotpService.enableInTx.mockRejectedValue(failure);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    enableDto
                )
            ).rejects.toBe(failure);

            expect(mfaService.createBackupCodesInTx).not.toHaveBeenCalled();
        });

        it('answers MfaTotpSetupRequiredException on a write conflict', async () => {
            const conflict = new Prisma.PrismaClientKnownRequestError(
                'conflict',
                {
                    code: DatabaseWriteConflictCode,
                    clientVersion: 'test',
                }
            );
            databaseService.withTransaction.mockRejectedValue(conflict);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    enableDto
                )
            ).rejects.toMatchObject({
                statusCode: EnumMfaStatusCodeError.totpSetupRequired,

                module: 'mfa',
            });
        });

        it('wraps an unknown error of the transaction in AppUnknownException', async () => {
            const cause = new Error('boom');
            databaseService.withTransaction.mockRejectedValue(cause);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    enableDto
                )
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: cause,
            });
        });
    });
});
