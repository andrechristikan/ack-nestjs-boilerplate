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
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseWriteConflictCode } from '@common/database/constants/database.constant';
import { Prisma } from '@generated/prisma-client/client';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
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
import { MfaPasskeyNotFoundException } from '@modules/mfa/exceptions/mfa.passkey-not-found.exception';
import { MfaPasskeyService } from '@modules/mfa/services/mfa.passkey.service';
import { MfaService } from '@modules/mfa/services/mfa.service';
import { MfaDeletePasskeyUseCase } from '@modules/mfa/use-cases/mfa.delete-passkey.use-case';
import { SessionService } from '@modules/session/services/session.service';
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

describe('MfaDeletePasskeyUseCase', () => {
    const mfaService: MockProxy<MfaService> = mock<MfaService>();
    const mfaPasskeyService: MockProxy<MfaPasskeyService> =
        mock<MfaPasskeyService>();
    const userAuthService: MockProxy<UserAuthService> = mock<UserAuthService>();
    const sessionService: MockProxy<SessionService> = mock<SessionService>();
    const activityLogQueue: MockProxy<ActivityLogQueue> =
        mock<ActivityLogQueue>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();

    let useCase: MfaDeletePasskeyUseCase;

    const user = buildUser('user-quartz', 'quartz@example.com');
    const tx = {} as IDatabaseTransactionClient;
    const now = new Date('2026-03-05T00:00:00.000Z');
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

    beforeAll(() => {
        vi.useFakeTimers();
        vi.setSystemTime(now);
    });

    afterAll(() => {
        vi.useRealTimers();
    });

    beforeEach(async () => {
        outboxService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );
        userAuthService.assertReauthentication.mockResolvedValue(passwordOnly);
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
        it('asserts the re-authentication before the transaction, then completes it first, deletes the passkey, clears the codes when no factor is left, revokes every other session, and adds the entry on one tx', async () => {
            const calls: string[] = [];
            userAuthService.assertReauthentication.mockImplementation(
                async () => {
                    calls.push('assert');

                    return passwordOnly;
                }
            );
            outboxService.withTransaction.mockImplementation(async fn => {
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
            expect(userAuthService.assertReauthentication).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                user,
                {
                    action: EnumUserReauthenticationAction.mfaPasskeyDelete,
                    password: 'Current-pass1',
                    method: null,
                    code: null,
                    backupCode: null,
                    passkeyChallengeToken: null,
                    passkeyResponse: null,
                    otp: null,
                }
            );
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
                { action: EnumActivityLogAction.userDeleteMfaPasskey }
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

            expect(userAuthService.assertReauthentication).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                user,
                {
                    action: EnumUserReauthenticationAction.mfaPasskeyDelete,
                    password: 'Current-pass1',
                    method: EnumMfaMethod.totp,
                    code: '123456',
                    backupCode: null,
                    passkeyChallengeToken: 'challenge-quartz',
                    passkeyResponse,
                    otp: '654321',
                }
            );
        });

        it('leaves the work undone when the proof fails', async () => {
            const failure = new MfaInvalidException();
            userAuthService.assertReauthentication.mockRejectedValue(failure);

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

            expect(outboxService.withTransaction).not.toHaveBeenCalled();
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
            userAuthService.assertReauthentication.mockResolvedValue({
                ...passwordOnly,
                mfa: {
                    method: EnumMfaMethod.totp,
                    totpStep: 1,
                    backupCodeHash: null,
                    passkey: null,
                },
            });
            outboxService.withTransaction.mockRejectedValue(
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
            ).rejects.toBeInstanceOf(MfaInvalidException);
        });

        it('answers MfaPasskeyNotFoundException on a write conflict with no MFA proof', async () => {
            outboxService.withTransaction.mockRejectedValue(
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
            ).rejects.toBeInstanceOf(MfaPasskeyNotFoundException);
        });

        it('wraps any other transaction failure in the unknown exception', async () => {
            const cause = new Error('boom');
            outboxService.withTransaction.mockRejectedValue(cause);

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
