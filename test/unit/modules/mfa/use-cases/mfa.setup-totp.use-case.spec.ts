import { FeatureFlagDisabledException } from '@modules/feature-flag/exceptions/feature-flag.disabled.exception';
import { TestUnitReauthenticationPasswordFailure } from '@test/unit/helpers/test.unit.user.helper';
import { buildDeferred } from '@test/unit/helpers/test.unit.deferred.helper';
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
import {
    DatabaseUniqueConstraintCode,
    DatabaseWriteConflictCode,
} from '@common/database/constants/database.constant';
import { Prisma } from '@generated/prisma-client/client';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { EnumAppStatusCodeError } from '@app/enums/app.status-code.enum';
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
import type { IUserReauthenticationCheck } from '@modules/user/interfaces/user.interface';
import { MfaSetupTotpUseCase } from '@modules/mfa/use-cases/mfa.setup-totp.use-case';
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
    const userContext = buildUserContext(user);
    const entryEffect: IActivityLogCreateManyEffect = {
        queue: EnumActivityLogQueue.activityLog,
        name: EnumActivityLogProcess.createMany,
        data: { rows: [] },
        priority: EnumQueuePriority.low,
        idempotencyKey: null,
    };
    const passwordOnly: IUserReauthenticationCheck = {
        isPasswordChecked: true,
        mfa: null,
        verificationId: null,
        passkeyChallengeToken: null,
    };
    const withBackupCode: IUserReauthenticationCheck = {
        isPasswordChecked: true,
        mfa: {
            method: EnumMfaMethod.backupCode,
            totpStep: null,
            backupCodeHash: 'hash-one',
            passkey: null,
        },
        verificationId: null,
        passkeyChallengeToken: null,
    };
    const setup: IMfaTotpSetup = {
        secret: 'secret',
        otpauthUrl: 'otpauth://totp/secret',
    };

    beforeEach(async () => {
        databaseService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );
        userAuthService.checkReauthentication.mockResolvedValue({
            check: passwordOnly,
            failure: null,
        });
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
                    { password: 'Current-pass1' }
                )
            ).rejects.toBe(failure);

            expect(mfaService.assertEnrolmentAllowed).toHaveBeenCalledWith(
                EnumMfaMethod.totp
            );
            expect(
                userAuthService.checkReauthentication
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

            expect(userAuthService.checkReauthentication).toHaveBeenCalledWith(
                user,
                {
                    action: EnumUserReauthenticationAction.mfaTotpSetup,
                    password: 'Current-pass1',
                    method: EnumMfaMethod.backupCode,
                    code: null,
                    backupCode: 'BACKUP1',
                    passkeyChallengeToken: null,
                    passkeyResponse: null,
                    otp: null,
                }
            );
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

            expect(userAuthService.checkReauthentication).toHaveBeenCalledWith(
                user,
                {
                    action: EnumUserReauthenticationAction.mfaTotpSetup,
                    password: null,
                    method: null,
                    code: null,
                    backupCode: null,
                    passkeyChallengeToken: 'challenge-quartz',
                    passkeyResponse,
                    otp: '123456',
                }
            );
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
            ).toHaveBeenCalledWith(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                passwordOnly
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
                null,
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
            userAuthService.checkReauthentication.mockRejectedValue(failure);

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

        it('asserts the enrolment gate and the setup together, before the re-authentication', async () => {
            const gate = buildDeferred<void>();
            mfaService.assertEnrolmentAllowed.mockReturnValue(gate.promise);
            mfaTotpService.assertSetupAllowed.mockImplementation(async () => {
                gate.resolve();
            });

            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                { password: 'Current-pass1' }
            );

            expect(mfaTotpService.assertSetupAllowed).toHaveBeenCalledWith(
                'user-marten'
            );
            expect(mfaTotpService.assertSetupAllowed).toHaveBeenCalledBefore(
                userAuthService.checkReauthentication
            );
            expect(mfaService.assertEnrolmentAllowed).toHaveBeenCalledBefore(
                userAuthService.checkReauthentication
            );
        });

        it('passes on the refusal of a confirmed TOTP, opening no transaction', async () => {
            const failure = new MfaTotpAlreadyEnabledException();
            mfaTotpService.assertSetupAllowed.mockRejectedValue(failure);

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
                userAuthService.checkReauthentication
            ).not.toHaveBeenCalled();
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
            expect(mfaTotpService.setupInTx).not.toHaveBeenCalled();
        });

        it('answers MfaTotpAlreadyEnabledException on a unique collision of the user id', async () => {
            databaseService.withTransaction.mockRejectedValue(
                new Prisma.PrismaClientKnownRequestError('unique', {
                    code: DatabaseUniqueConstraintCode,
                    clientVersion: 'test',
                    meta: { target: ['userId'] },
                })
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    { password: 'Current-pass1' }
                )
            ).rejects.toMatchObject({
                module: 'mfa',
                statusCode: EnumMfaStatusCodeError.totpAlreadyEnabled,
            });
        });

        it('rethrows an AppBaseException of the transaction as it is', async () => {
            const failure = new MfaInvalidException();
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

        it('answers MfaInvalidException on a write conflict when an MFA proof was checked', async () => {
            const conflict = new Prisma.PrismaClientKnownRequestError(
                'conflict',
                {
                    code: DatabaseWriteConflictCode,
                    clientVersion: 'test',
                }
            );
            userAuthService.checkReauthentication.mockResolvedValue({
                check: withBackupCode,
                failure: null,
            });
            databaseService.withTransaction.mockRejectedValue(conflict);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    {
                        password: 'Current-pass1',
                        method: EnumMfaMethod.backupCode,
                        backupCode: 'BACKUP1',
                    }
                )
            ).rejects.toMatchObject({
                statusCode: EnumMfaStatusCodeError.invalid,

                module: 'mfa',
            });
        });

        it('wraps a write conflict in AppUnknownException when no MFA proof was checked', async () => {
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
                    { password: 'Current-pass1' }
                )
            ).rejects.toMatchObject({
                module: 'app',
                statusCode: EnumAppStatusCodeError.unknown,
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
                    { password: 'Current-pass1' }
                )
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: cause,
            });
        });
    });
});
