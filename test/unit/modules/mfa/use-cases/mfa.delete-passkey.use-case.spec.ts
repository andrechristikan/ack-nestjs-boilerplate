import { ConfigService } from '@nestjs/config';
import {
    TestUnitReauthenticationMfaFailure,
    TestUnitReauthenticationMfaOff,
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
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseWriteConflictCode } from '@common/database/constants/database.constant';
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
import { EnumMfaMethod } from '@modules/mfa/enums/mfa.enum';
import { MfaInvalidException } from '@modules/mfa/exceptions/mfa.invalid.exception';
import { EnumMfaStatusCodeError } from '@modules/mfa/enums/mfa.status-code.enum';
import { MfaPasskeyNotFoundException } from '@modules/mfa/exceptions/mfa.passkey-not-found.exception';
import { MfaPasskeyService } from '@modules/mfa/services/mfa.passkey.service';
import { MfaService } from '@modules/mfa/services/mfa.service';
import { MfaDeletePasskeyUseCase } from '@modules/mfa/use-cases/mfa.delete-passkey.use-case';
import { SessionService } from '@modules/session/services/session.service';
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

describe('MfaDeletePasskeyUseCase', () => {
    const mfaService: MockProxy<MfaService> = mock<MfaService>();
    const mfaPasskeyService: MockProxy<MfaPasskeyService> =
        mock<MfaPasskeyService>();
    const userAuthService: MockProxy<UserAuthService> = mock<UserAuthService>();
    const sessionService: MockProxy<SessionService> = mock<SessionService>();
    const activityLogQueue: MockProxy<ActivityLogQueue> =
        mock<ActivityLogQueue>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();

    let useCase: MfaDeletePasskeyUseCase;

    const user = buildUser('user-quartz', 'quartz@example.com');
    const tx = {} as IDatabaseTransactionClient;
    const now = new Date('2026-03-05T00:00:00.000Z');
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

    beforeAll(() => {
        vi.useFakeTimers();
        vi.setSystemTime(now);
    });

    afterAll(() => {
        vi.useRealTimers();
    });

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
        userAuthService.getReauthenticationVerificationId.mockResolvedValue(
            null
        );
        sessionService.revokeActiveByUserExceptInTx.mockResolvedValue([]);
        activityLogQueue.recordEffect.mockReturnValue(entryEffect);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MfaDeletePasskeyUseCase,
                { provide: MfaService, useValue: mfaService },
                { provide: MfaPasskeyService, useValue: mfaPasskeyService },
                { provide: UserAuthService, useValue: userAuthService },
                { provide: SessionService, useValue: sessionService },
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
        useCase = module.get(MfaDeletePasskeyUseCase);
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
                    'passkey-one',
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
                    'passkey-one',
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

        it('asserts the re-authentication before the transaction, then completes it first, deletes the passkey, clears the codes when no factor is left, revokes every other session, and adds the entry on one tx', async () => {
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
            mfaPasskeyService.deleteInTx.mockImplementation(async () => {
                calls.push('delete');
            });
            mfaService.clearBackupCodesIfNoFactorInTx.mockImplementation(
                async () => {
                    calls.push('clearCodes');
                }
            );
            sessionService.revokeActiveByUserExceptInTx.mockImplementation(
                async () => {
                    calls.push('revoke');

                    return [];
                }
            );
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
                    'passkey-one',
                    { password: 'Current-pass1' }
                )
            ).resolves.toEqual({});

            expect(calls).toEqual([
                'assert',
                'begin',
                'complete',
                'delete',
                'clearCodes',
                'revoke',
                'entry',
                'commit',
            ]);
            expect(
                userAuthService.checkReauthenticationPassword
            ).toHaveBeenCalledWith(user, {
                action: EnumUserReauthenticationAction.mfaPasskeyDelete,
                password: 'Current-pass1',
                method: null,
                code: null,
                backupCode: null,
                passkeyChallengeToken: null,
                passkeyResponse: null,
                otp: null,
            });
            expect(mfaPasskeyService.deleteInTx).toHaveBeenCalledWith(
                tx,
                'user-quartz',
                'passkey-one'
            );
            expect(
                mfaService.clearBackupCodesIfNoFactorInTx
            ).toHaveBeenCalledWith(tx, 'user-quartz');
            expect(
                sessionService.revokeActiveByUserExceptInTx
            ).toHaveBeenCalledWith(
                tx,
                'user-quartz',
                'session-1',
                'user-quartz',
                now
            );
            expect(activityLogQueue.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                null,
                { action: EnumActivityLogAction.userMfaPasskeyDeleted }
            );
        });

        it('passes a TOTP proof to the re-authentication', async () => {
            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                'passkey-one',
                {
                    password: 'Current-pass1',
                    method: EnumMfaMethod.totp,
                    code: '123456',
                    otp: '654321',
                    passkeyChallengeToken: 'challenge-quartz',
                    passkeyResponse,
                }
            );

            expect(
                userAuthService.checkReauthenticationPassword
            ).toHaveBeenCalledWith(user, {
                action: EnumUserReauthenticationAction.mfaPasskeyDelete,
                password: 'Current-pass1',
                method: EnumMfaMethod.totp,
                code: '123456',
                backupCode: null,
                passkeyChallengeToken: 'challenge-quartz',
                passkeyResponse,
                otp: '654321',
            });
        });

        it('leaves the work undone when the proof fails', async () => {
            const failure = new MfaInvalidException();
            mfaService.checkReauthentication.mockRejectedValue(failure);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    'passkey-one',
                    {}
                )
            ).rejects.toBe(failure);

            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('rethrows MfaPasskeyNotFoundException for the passkey of another user, revoking and adding nothing', async () => {
            const failure = new MfaPasskeyNotFoundException();
            mfaPasskeyService.deleteInTx.mockRejectedValue(failure);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    'passkey-other',
                    {}
                )
            ).rejects.toBe(failure);

            expect(
                sessionService.revokeActiveByUserExceptInTx
            ).not.toHaveBeenCalled();
            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });

        it('answers MfaInvalidException on a write conflict after an MFA proof', async () => {
            mfaService.checkReauthentication.mockResolvedValue({
                isEnabled: true,
                check: {
                    method: EnumMfaMethod.totp,
                    totpStep: 1,
                    backupCodeHash: null,
                    passkey: null,
                },
                failure: null,
                passkeyChallengeToken: null,
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
                    'passkey-one',
                    {}
                )
            ).rejects.toMatchObject({
                module: 'mfa',
                statusCode: EnumMfaStatusCodeError.invalid,
            });
        });

        it('answers MfaPasskeyNotFoundException on a write conflict with no MFA proof', async () => {
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
                    'passkey-one',
                    {}
                )
            ).rejects.toMatchObject({
                module: 'mfa',
                statusCode: EnumMfaStatusCodeError.passkeyNotFound,
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
                    'passkey-one',
                    {}
                )
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: cause,
            });
        });
    });
});
