import type { IActivityLogCreateManyEffect } from '@modules/activity-log/interfaces/activity-log.interface';
import {
    TestUnitReauthenticationMfaFailure,
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
import { DatabaseService } from '@common/database/services/database.service';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { SessionService } from '@modules/session/services/session.service';
import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
import {
    EnumActivityLogProcess,
    EnumActivityLogQueue,
} from '@modules/activity-log/enums/activity-log.enum';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import type { ISessionRef } from '@modules/session/interfaces/session.interface';
import { MfaAttemptMaxException } from '@modules/mfa/exceptions/mfa.attempt-max.exception';
import { MfaInvalidException } from '@modules/mfa/exceptions/mfa.invalid.exception';
import { MfaTotpNotEnabledException } from '@modules/mfa/exceptions/mfa.totp-not-enabled.exception';
import type { IMfaReauthenticationResult } from '@modules/mfa/interfaces/mfa.interface';
import { buildMfaFactorState } from '@test/unit/helpers/test.unit.mfa.helper';
import { MfaService } from '@modules/mfa/services/mfa.service';
import { MfaTotpService } from '@modules/mfa/services/mfa.totp.service';
import { EnumMfaMethod } from '@modules/mfa/enums/mfa.enum';
import { UserAuthService } from '@modules/user/services/user.auth.service';
import type { MfaTotpDisableRequestDto } from '@modules/mfa/dtos/request/mfa.totp-disable.request.dto';
import { MfaDisableTotpUseCase } from '@modules/mfa/use-cases/mfa.disable-totp.use-case';
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

describe('MfaDisableTotpUseCase', () => {
    const userAuthService: MockProxy<UserAuthService> = mock<UserAuthService>();
    const sessionService: MockProxy<SessionService> = mock<SessionService>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();
    const activityLogQueue: MockProxy<ActivityLogQueue> =
        mock<ActivityLogQueue>();
    const mfaService: MockProxy<MfaService> = mock<MfaService>();
    const mfaTotpService: MockProxy<MfaTotpService> = mock<MfaTotpService>();

    let useCase: MfaDisableTotpUseCase;

    const user = buildUser('user-marten', 'marten@example.com');
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
    const revoked: ISessionRef[] = [{ id: 'session-one', userId: 'user-1' }];
    const tx = {} as IDatabaseTransactionClient;
    const now = new Date('2026-03-05T00:00:00.000Z');
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

    beforeAll(() => {
        vi.useFakeTimers();
        vi.setSystemTime(now);
    });

    afterAll(() => {
        vi.useRealTimers();
    });

    beforeEach(async () => {
        activityLogQueue.recordEffect.mockReturnValue(entryEffect);
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
        sessionService.revokeActiveByUserExceptInTx.mockResolvedValue(revoked);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MfaDisableTotpUseCase,
                { provide: MfaService, useValue: mfaService },
                { provide: MfaTotpService, useValue: mfaTotpService },
                { provide: UserAuthService, useValue: userAuthService },
                ...TestUnitKitProviders,
                {
                    provide: ConfigService,
                    useValue: buildConfigService(TestUnitKitConfigValues),
                },
                { provide: SessionService, useValue: sessionService },
                { provide: DatabaseService, useValue: databaseService },
                { provide: OutboxService, useValue: outboxService },
                { provide: ActivityLogQueue, useValue: activityLogQueue },
            ],
        }).compile();
        useCase = module.get(MfaDisableTotpUseCase);
    });

    describe('execute', () => {
        const dto: MfaTotpDisableRequestDto = {
            password: 'Current-pass1',
            method: EnumMfaMethod.totp,
            code: '123456',
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

        it('asserts the re-authentication before the transaction, then completes, disables, revokes every other session and keeps the current one, and adds the disable entry on one tx', async () => {
            const calls: string[] = [];
            userAuthService.checkReauthenticationPassword.mockImplementation(
                async () => {
                    calls.push('assert');

                    return TestUnitReauthenticationPasswordPassed;
                }
            );
            databaseService.withTransaction.mockImplementation(async fn => {
                calls.push('begin');
                const value = await fn(tx);
                calls.push('commit');

                return value as never;
            });
            userAuthService.completeReauthenticationInTx.mockImplementation(
                async () => {
                    calls.push('complete');
                }
            );
            mfaTotpService.disableInTx.mockImplementation(async () => {
                calls.push('disableInTx');
            });
            mfaService.clearBackupCodesIfNoFactorInTx.mockImplementation(
                async () => {
                    calls.push('clearBackupCodes');
                }
            );
            sessionService.revokeActiveByUserExceptInTx.mockImplementation(
                async () => {
                    calls.push('revokeSessions');

                    return revoked;
                }
            );
            outboxService.addInTx.mockImplementation(async () => {
                calls.push('addInTx');

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
            ).resolves.toEqual({});

            expect(mfaTotpService.assertConfirmed).toHaveBeenCalledWith(
                factorState.totp
            );
            expect(mfaTotpService.assertConfirmed).toHaveBeenCalledBefore(
                userAuthService.checkReauthenticationPassword
            );
            expect(mfaService.isEnabled).not.toHaveBeenCalled();
            expect(mfaService.assertEnabled).not.toHaveBeenCalled();
            expect(
                userAuthService.checkReauthenticationPassword
            ).toHaveBeenCalledWith(user, {
                action: EnumUserReauthenticationAction.mfaTotpDisable,
                password: 'Current-pass1',
                method: EnumMfaMethod.totp,
                code: '123456',
                backupCode: null,
                passkeyChallengeToken: null,
                passkeyResponse: null,
                otp: null,
            });
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
                    action: EnumUserReauthenticationAction.mfaTotpDisable,
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
                mfaVerified
            );
            expect(mfaTotpService.disableInTx).toHaveBeenCalledWith(
                tx,
                'user-marten'
            );
            expect(
                mfaService.clearBackupCodesIfNoFactorInTx
            ).toHaveBeenCalledWith(tx, 'user-marten');
            expect(
                sessionService.revokeActiveByUserExceptInTx
            ).toHaveBeenCalledWith(
                tx,
                'user-marten',
                'session-1',
                'user-marten',
                now
            );
            expect(activityLogQueue.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                null,
                { action: EnumActivityLogAction.userMfaTotpDisabled }
            );
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, entryEffect);
            expect(calls).toEqual([
                'assert',
                'begin',
                'complete',
                'disableInTx',
                'clearBackupCodes',
                'revokeSessions',
                'addInTx',
                'commit',
            ]);
        });

        it('passes a backup code and null for every omitted field', async () => {
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
                action: EnumUserReauthenticationAction.mfaTotpDisable,
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
                action: EnumUserReauthenticationAction.mfaTotpDisable,
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
                action: EnumUserReauthenticationAction.mfaTotpDisable,
                password: null,
                method: null,
                code: null,
                backupCode: null,
                passkeyChallengeToken: null,
                passkeyResponse: null,
                otp: null,
            });
        });

        it('asserts nothing and writes nothing when the user has no confirmed TOTP', async () => {
            mfaTotpService.assertConfirmed.mockImplementation(() => {
                throw new MfaTotpNotEnabledException();
            });

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
                statusCode: EnumMfaStatusCodeError.totpNotEnabled,
            });

            expect(
                userAuthService.checkReauthenticationPassword
            ).not.toHaveBeenCalled();
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('leaves the work undone when the proof fails', async () => {
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
            expect(mfaTotpService.disableInTx).not.toHaveBeenCalled();
            expect(
                sessionService.revokeActiveByUserExceptInTx
            ).not.toHaveBeenCalled();
        });

        it('rethrows an app exception of the transaction unchanged, adding no entry', async () => {
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

            expect(mfaTotpService.disableInTx).not.toHaveBeenCalled();
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
