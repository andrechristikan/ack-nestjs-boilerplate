import type { IActivityLogCreateManyEffect } from '@modules/activity-log/interfaces/activity-log.interface';
import {
    TestUnitReauthenticationMfaFailure,
    TestUnitReauthenticationMfaOff,
    TestUnitReauthenticationPasswordLimit,
    TestUnitReauthenticationPasswordPassed,
} from '@test/unit/helpers/test.unit.user.helper';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import {
    TestUnitKitConfigValues,
    TestUnitKitProviders,
} from '@test/unit/helpers/test.unit.kit.helper';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumActivityLogAction,
    EnumDevicePlatform,
    EnumUserReauthenticationAction,
} from '@generated/prisma-client/client';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import {
    EnumActivityLogProcess,
    EnumActivityLogQueue,
} from '@modules/activity-log/enums/activity-log.enum';
import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
import { EnumMfaMethod } from '@modules/mfa/enums/mfa.enum';
import { MfaInvalidException } from '@modules/mfa/exceptions/mfa.invalid.exception';
import { DeviceNotFoundException } from '@modules/device/exceptions/device.not-found.exception';
import type { IDeviceOwnership } from '@modules/device/interfaces/device.interface';
import { DeviceService } from '@modules/device/services/device.service';
import { DeviceUtil } from '@modules/device/utils/device.util';
import { DeviceRemoveUseCase } from '@modules/device/use-cases/device.remove.use-case';
import { SessionService } from '@modules/session/services/session.service';
import { UserPasswordNotMatchException } from '@modules/user/exceptions/user.password-not-match.exception';
import { buildMfaFactorState } from '@test/unit/helpers/test.unit.mfa.helper';
import { MfaService } from '@modules/mfa/services/mfa.service';
import { UserAuthService } from '@modules/user/services/user.auth.service';
import {
    buildUser,
    buildRequestContext,
    buildApiKeyContext,
    buildUserContext,
    buildAuthJwtAccessContext,
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

describe('DeviceRemoveUseCase', () => {
    const sessionService: MockProxy<SessionService> = mock<SessionService>();
    const deviceService: MockProxy<DeviceService> = mock<DeviceService>();
    const userAuthService: MockProxy<UserAuthService> = mock<UserAuthService>();
    const mfaService: MockProxy<MfaService> = mock<MfaService>();
    const activityLogQueue: MockProxy<ActivityLogQueue> =
        mock<ActivityLogQueue>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();
    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    const user = buildUser('user-1', 'actor@example.com');
    const userContext = buildUserContext(user);
    const authContext = buildAuthJwtAccessContext(user.id);
    const factorState = buildMfaFactorState('user-1');
    const tx = {} as IDatabaseTransactionClient;
    const now = new Date('2026-01-05T00:00:00.000Z');
    const entryEffect: IActivityLogCreateManyEffect = {
        queue: EnumActivityLogQueue.activityLog,
        name: EnumActivityLogProcess.createMany,
        data: { rows: [] },
        priority: EnumQueuePriority.low,
        idempotencyKey: null,
    };
    const deviceOwnership: IDeviceOwnership = {
        id: 'device-ownership-1',
        createdAt: now,
        createdBy: 'user-1',
        updatedAt: now,
        updatedBy: 'user-1',
        deviceId: 'device-1',
        userId: 'user-1',
        revokedAt: null,
        isRevoked: false,
        revokedById: null,
        lastActiveAt: now,
        notificationToken: null,
        notificationProvider: null,
        device: {
            id: 'device-1',
            createdAt: now,
            createdBy: 'user-1',
            updatedAt: now,
            updatedBy: 'user-1',
            fingerprint: 'abc123def456ghi789jkl012mno345pq',
            name: 'iPhone 12',
            platform: EnumDevicePlatform.ios,
            lastActiveAt: now,
        },
        user: {
            id: 'user-1',
            createdAt: now,
            createdBy: 'user-1',
            updatedAt: now,
            updatedBy: 'user-1',
            deletedAt: null,
            deletedBy: null,
            name: 'Jane Doe',
            username: 'jane',
            photo: null,
        },
        revokedBy: null,
        _count: { sessions: 2 },
    };
    const metadata = {
        deviceOwnershipId: 'device-ownership-1',
        deviceId: 'device-1',
        sessionCount: 1,
    };
    const dto = { password: 'Current-pass1' };

    let useCase: DeviceRemoveUseCase;

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
        mfaService.getFactorState.mockResolvedValue(factorState);
        userAuthService.getReauthenticationVerificationId.mockResolvedValue(
            null
        );
        activityLogQueue.recordEffect.mockReturnValue(entryEffect);
        sessionService.revokeByDeviceOwnershipInTx.mockResolvedValue([
            { id: 'session-1', userId: 'user-1' },
            { id: 'session-2', userId: 'user-1' },
        ]);
        deviceService.removeOwnershipInTx.mockResolvedValue(deviceOwnership);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                DeviceRemoveUseCase,
                { provide: SessionService, useValue: sessionService },
                { provide: DeviceService, useValue: deviceService },
                DeviceUtil,
                { provide: UserAuthService, useValue: userAuthService },
                { provide: MfaService, useValue: mfaService },
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
        useCase = module.get(DeviceRemoveUseCase);
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
                    'device-ownership-1',
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
                    'device-ownership-1',
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

        it('asserts the re-authentication, then completes it, removes the ownership, and adds the entry on one transaction', async () => {
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
            sessionService.revokeByDeviceOwnershipInTx.mockImplementation(
                async () => {
                    calls.push('revoke');

                    return [{ id: 'session-1', userId: 'user-1' }];
                }
            );
            deviceService.removeOwnershipInTx.mockImplementation(async () => {
                calls.push('remove');

                return deviceOwnership;
            });
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
                    'device-ownership-1',
                    dto
                )
            ).resolves.toEqual({});

            expect(
                userAuthService.checkReauthenticationPassword
            ).toHaveBeenCalledWith(user, {
                action: EnumUserReauthenticationAction.deviceRemove,
                password: 'Current-pass1',
                method: null,
                code: null,
                backupCode: null,
                passkeyChallengeToken: null,
                passkeyResponse: null,
                otp: null,
            });
            expect(
                userAuthService.completeReauthenticationInTx
            ).toHaveBeenCalledWith(tx, authContext, true, null, false);
            expect(mfaService.getFactorState).toHaveBeenCalledTimes(1);
            expect(mfaService.getFactorState).toHaveBeenCalledWith('user-1');
            expect(mfaService.checkReauthentication).toHaveBeenCalledWith(
                'user-1',
                expect.objectContaining({
                    action: EnumUserReauthenticationAction.deviceRemove,
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
                sessionService.revokeByDeviceOwnershipInTx
            ).toHaveBeenCalledWith(
                tx,
                'user-1',
                'device-ownership-1',
                'user-1',
                now
            );
            expect(deviceService.removeOwnershipInTx).toHaveBeenCalledWith(
                tx,
                'user-1',
                'device-ownership-1',
                'user-1',
                now
            );
            expect(activityLogQueue.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                {
                    action: EnumActivityLogAction.userDeviceRemoved,
                    userId: 'user-1',
                    createdBy: 'user-1',
                    metadata,
                }
            );
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, entryEffect);
            expect(calls).toEqual([
                'assert',
                'begin',
                'complete',
                'revoke',
                'remove',
                'addInTx',
                'commit',
            ]);
        });

        it('passes the MFA and email-code fields of the request on', async () => {
            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                'device-ownership-1',
                {
                    method: EnumMfaMethod.totp,
                    code: '654321',
                    backupCode: 'BACKUP1',
                    passkeyChallengeToken: 'challenge-quartz',
                    passkeyResponse,
                    otp: '123456',
                }
            );

            expect(
                userAuthService.checkReauthenticationPassword
            ).toHaveBeenCalledWith(user, {
                action: EnumUserReauthenticationAction.deviceRemove,
                password: null,
                method: EnumMfaMethod.totp,
                code: '654321',
                backupCode: 'BACKUP1',
                passkeyChallengeToken: 'challenge-quartz',
                passkeyResponse,
                otp: '123456',
            });
        });

        it('leaves the device alone when the re-authentication fails', async () => {
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
                    'device-ownership-1',
                    dto
                )
            ).rejects.toBe(failure);

            expect(databaseService.withTransaction).not.toHaveBeenCalled();
            expect(
                sessionService.revokeByDeviceOwnershipInTx
            ).not.toHaveBeenCalled();
            expect(deviceService.removeOwnershipInTx).not.toHaveBeenCalled();
        });

        it('rethrows an AppBaseException of the transaction as it is, adding no entry', async () => {
            const failure = new DeviceNotFoundException();
            deviceService.removeOwnershipInTx.mockRejectedValue(failure);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    'device-ownership-1',
                    dto
                )
            ).rejects.toBe(failure);

            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });

        it('rethrows a completion refusal as it is', async () => {
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
                    'device-ownership-1',
                    dto
                )
            ).rejects.toBe(failure);

            expect(
                sessionService.revokeByDeviceOwnershipInTx
            ).not.toHaveBeenCalled();
            expect(deviceService.removeOwnershipInTx).not.toHaveBeenCalled();
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
                    'device-ownership-1',
                    dto
                )
            ).rejects.toBe(cause);
        });
    });
});
