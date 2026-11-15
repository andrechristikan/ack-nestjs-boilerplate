import type { IActivityLogCreateManyEffect } from '@modules/activity-log/interfaces/activity-log.interface';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumAppStatusCodeError } from '@app/enums/app.status-code.enum';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import {
    EnumActivityLogAction,
    EnumDevicePlatform,
    EnumRoleType,
    EnumUserLoginFrom,
    EnumUserLoginWith,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
} from '@generated/prisma-client/client';
import type { TwoFactor } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import {
    EnumActivityLogProcess,
    EnumActivityLogQueue,
} from '@modules/activity-log/enums/activity-log.enum';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { EnumAuthTwoFactorMethod } from '@modules/auth/enums/auth.enum';
import { EnumAuthStatusCodeError } from '@modules/auth/enums/auth.status-code.enum';
import { AuthTwoFactorAttemptMaxException } from '@modules/auth/exceptions/auth.two-factor-attempt-max.exception';
import { AuthTwoFactorInvalidException } from '@modules/auth/exceptions/auth.two-factor-invalid.exception';
import { AuthTwoFactorChallengeInvalidException } from '@modules/auth/exceptions/auth.two-factor-challenge-invalid.exception';
import type { IAuthToken } from '@modules/auth/interfaces/auth.interface';
import type { IDeviceIdentity } from '@modules/device/interfaces/device.interface';
import { UserAuthService } from '@modules/user/services/user.auth.service';
import { UserTwoFactorService } from '@modules/user/services/user.two-factor.service';
import type {
    IUser,
    IUserTwoFactorCheck,
    IUserTwoFactorChallenge,
    IUserTwoFactorEnabled,
    IUserTwoFactorVerifyResult,
} from '@modules/user/interfaces/user.interface';
import type { IUserLoginSession } from '@modules/user/interfaces/user.login.interface';
import { UserLoginSetupTwoFactorUseCase } from '@modules/user/use-cases/user.login-setup-two-factor.use-case';
import { UserLoginVerifyTwoFactorUseCase } from '@modules/user/use-cases/user.login-verify-two-factor.use-case';
import {
    buildRequestContext,
    buildApiKeyContext,
} from '@test/unit/helpers/test.unit.request.helper';

describe('UserLoginVerifyTwoFactorUseCase', () => {
    const userTwoFactorService: MockProxy<UserTwoFactorService> =
        mock<UserTwoFactorService>();
    const userAuthService: MockProxy<UserAuthService> = mock<UserAuthService>();
    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();
    const tx = {} as IDatabaseTransactionClient;
    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    let useCase: UserLoginVerifyTwoFactorUseCase;
    let setupUseCase: UserLoginSetupTwoFactorUseCase;

    const now = new Date('2026-03-01T00:00:00.000Z');
    const tokens: IAuthToken = {
        tokenType: 'Bearer',
        roleType: EnumRoleType.user,
        expiresIn: 3600,
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
    };
    const deviceIdentity: IDeviceIdentity = {
        fingerprint: 'device-bramble',
        name: null,
        platform: EnumDevicePlatform.web,
        notificationToken: null,
    };
    const entryEffect: IActivityLogCreateManyEffect = {
        queue: EnumActivityLogQueue.activityLog,
        name: EnumActivityLogProcess.createMany,
        data: { rows: [] },
        priority: EnumQueuePriority.low,
        idempotencyKey: null,
    };
    const twoFactor: TwoFactor = {
        id: 'two-factor-bramble',
        userId: 'user-bramble',
        secret: 'encrypted-secret',
        pendingSecret: null,
        backupCodes: ['hash-one'],
        enabled: false,
        requiredSetup: false,
        confirmedAt: null,
        lastUsedAt: null,
        lastUsedStep: null,
        attempt: 0,
        lockedUntil: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
    };
    const baseUser: IUser = {
        id: 'user-bramble',
        name: 'Bramble Fox',
        username: 'bramble2fox',
        isVerified: true,
        verifiedAt: new Date('2026-01-01T00:00:00.000Z'),
        email: 'bramble@example.com',
        roleId: 'role-bramble',
        password: 'hashed-password',
        passwordExpired: new Date('2026-06-01T00:00:00.000Z'),
        passwordCreated: new Date('2026-01-01T00:00:00.000Z'),
        passwordAttempt: 0,
        passwordLockedUntil: null,
        signUpAt: new Date('2026-01-01T00:00:00.000Z'),
        signUpFrom: EnumUserSignUpFrom.website,
        signUpWith: EnumUserSignUpWith.credential,
        status: EnumUserStatus.active,
        gender: null,
        countryId: 'country-bramble',
        lastLoginAt: null,
        lastIPAddress: null,
        lastLoginFrom: null,
        lastLoginWith: null,
        lastWorkspaceId: null,
        lastWorkspaceChangedAt: null,
        photo: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
        deletedAt: null,
        deletedBy: null,
        role: {
            id: 'role-bramble',
            name: 'user',
            description: null,
            type: EnumRoleType.user,
            isImmutable: false,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            createdBy: null,
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedBy: null,
            policies: [],
        },
        twoFactor: null,
    };
    const enabledTwoFactor = { ...twoFactor, enabled: true };
    const twoFactorUser: IUser & IUserTwoFactorEnabled = {
        ...baseUser,
        twoFactor: enabledTwoFactor,
    };
    const session: IUserLoginSession = {
        tokens,
        sessionId: 'session-bramble',
    };
    const challenge: IUserTwoFactorChallenge = {
        userId: 'user-bramble',
        device: deviceIdentity,
        loginFrom: EnumUserLoginFrom.website,
        loginWith: EnumUserLoginWith.credential,
    };
    const checked: IUserTwoFactorCheck = {
        verified: {
            method: EnumAuthTwoFactorMethod.code,
            newBackupCodes: null,
        },
        totpStep: 58123456,
    };
    const verified: IUserTwoFactorVerifyResult = {
        method: EnumAuthTwoFactorMethod.code,
        newBackupCodes: null,
    };

    beforeEach(async () => {
        vi.resetAllMocks();

        helperDateService.create.mockReturnValue(now);
        activityLogService.recordEffect.mockReturnValue(entryEffect);
        outboxService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );
        userAuthService.createTokenAndSessionInTx.mockResolvedValue(session);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserLoginVerifyTwoFactorUseCase,
                UserLoginSetupTwoFactorUseCase,
                {
                    provide: UserTwoFactorService,
                    useValue: userTwoFactorService,
                },
                { provide: UserAuthService, useValue: userAuthService },
                { provide: ActivityLogService, useValue: activityLogService },
                { provide: OutboxService, useValue: outboxService },
                { provide: HelperDateService, useValue: helperDateService },
                { provide: DatabaseUtil, useValue: databaseUtil },
            ],
        }).compile();
        useCase = module.get(UserLoginVerifyTwoFactorUseCase);
        setupUseCase = module.get(UserLoginSetupTwoFactorUseCase);
    });

    describe('execute', () => {
        const dto = {
            challengeToken: 'challenge-token',
            method: EnumAuthTwoFactorMethod.code,
            code: '123456',
        };

        beforeEach(() => {
            userTwoFactorService.getChallenge.mockResolvedValue(challenge);
            userTwoFactorService.consumeChallengeInTx.mockResolvedValue();
            userTwoFactorService.getOneForLoginVerify.mockResolvedValue(
                twoFactorUser
            );
            userTwoFactorService.check.mockResolvedValue(checked);
        });

        it('checks the code before the transaction, then claims the challenge, verifies, records the verification with its entry, and issues the session on one tx', async () => {
            const callOrder: string[] = [];
            userTwoFactorService.check.mockImplementation(async () => {
                callOrder.push('check');

                return checked;
            });
            userTwoFactorService.verifyInTx.mockImplementation(async () => {
                callOrder.push('verifyInTx');
            });
            userTwoFactorService.consumeChallengeInTx.mockImplementation(
                async () => {
                    callOrder.push('consumeChallengeInTx');
                }
            );
            userTwoFactorService.recordVerificationInTx.mockImplementation(
                async () => {
                    callOrder.push('recordVerificationInTx');
                }
            );
            outboxService.addInTx.mockImplementation(async () => {
                callOrder.push('addInTx');

                return 'outbox-id';
            });
            userAuthService.createTokenAndSessionInTx.mockImplementation(
                async () => {
                    callOrder.push('createTokenAndSessionInTx');

                    return session;
                }
            );

            await expect(
                useCase.execute(requestContext, apiKeyContext, dto)
            ).resolves.toEqual({
                data: tokens,
            });

            expect(userTwoFactorService.getChallenge).toHaveBeenCalledWith(
                'challenge-token'
            );
            expect(
                userTwoFactorService.getOneForLoginVerify
            ).toHaveBeenCalledWith('user-bramble');
            expect(userTwoFactorService.check).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                twoFactorUser,
                {
                    code: '123456',
                    backupCode: null,
                    method: EnumAuthTwoFactorMethod.code,
                }
            );
            expect(userTwoFactorService.verifyInTx).toHaveBeenCalledWith(
                tx,
                'user-bramble',
                checked
            );
            expect(
                userTwoFactorService.recordVerificationInTx
            ).toHaveBeenCalledWith(tx, twoFactorUser, verified);
            expect(activityLogService.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                null,
                null,
                {
                    action: EnumActivityLogAction.userVerifyTwoFactor,
                    userId: 'user-bramble',
                    createdBy: 'user-bramble',
                }
            );
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, entryEffect);
            expect(
                userAuthService.createTokenAndSessionInTx
            ).toHaveBeenCalledWith(
                tx,
                requestContext,
                apiKeyContext,
                twoFactorUser,
                deviceIdentity,
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential,
                now
            );
            expect(
                userTwoFactorService.consumeChallengeInTx
            ).toHaveBeenCalledWith(tx, 'challenge-token');
            expect(callOrder).toEqual([
                'check',
                'consumeChallengeInTx',
                'verifyInTx',
                'recordVerificationInTx',
                'addInTx',
                'createTokenAndSessionInTx',
            ]);
        });

        it('claims the challenge once and issues tokens after the setup step left it in place', async () => {
            userTwoFactorService.getOneForLoginSetup.mockResolvedValue({
                user: twoFactorUser,
                pendingSecret: 'pending-secret',
            });
            userTwoFactorService.enableTwoFactorInTx.mockResolvedValue([
                'backup-one',
            ]);

            await setupUseCase.execute(requestContext, apiKeyContext, {
                challengeToken: 'challenge-token',
                code: '123456',
            });

            expect(
                userTwoFactorService.consumeChallengeInTx
            ).not.toHaveBeenCalled();

            await expect(
                useCase.execute(requestContext, apiKeyContext, dto)
            ).resolves.toEqual({
                data: tokens,
            });

            expect(userTwoFactorService.getChallenge).toHaveBeenCalledTimes(2);
            expect(
                userTwoFactorService.consumeChallengeInTx
            ).toHaveBeenCalledTimes(1);
        });

        it('forwards the backup code', async () => {
            await useCase.execute(requestContext, apiKeyContext, {
                challengeToken: 'challenge-token',
                method: EnumAuthTwoFactorMethod.backupCodes,
                backupCode: 'backup-code',
            });

            expect(userTwoFactorService.check).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                twoFactorUser,
                {
                    code: null,
                    backupCode: 'backup-code',
                    method: EnumAuthTwoFactorMethod.backupCodes,
                }
            );
        });

        it('throws AuthTwoFactorChallengeInvalidException without reading the user when the challenge is missing', async () => {
            userTwoFactorService.getChallenge.mockRejectedValue(
                new AuthTwoFactorChallengeInvalidException()
            );

            await expect(
                useCase.execute(requestContext, apiKeyContext, dto)
            ).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.twoFactorChallengeInvalid,
            });
            expect(
                userTwoFactorService.getOneForLoginVerify
            ).not.toHaveBeenCalled();
        });

        it('answers the two-factor attempt limit of the check and writes nothing', async () => {
            userTwoFactorService.check.mockRejectedValue(
                new AuthTwoFactorAttemptMaxException()
            );

            await expect(
                useCase.execute(requestContext, apiKeyContext, dto)
            ).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.twoFactorAttemptMax,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.twoFactorAttemptMax
                    ],
                messagePath: 'auth.error.twoFactorAttemptMax',
            });

            expect(
                userAuthService.createTokenAndSessionInTx
            ).not.toHaveBeenCalled();
            expect(outboxService.withTransaction).not.toHaveBeenCalled();
            expect(
                userTwoFactorService.consumeChallengeInTx
            ).not.toHaveBeenCalled();
        });

        it('issues nothing and adds no entry when the verification fails', async () => {
            const failure = new Error('invalid code');
            userTwoFactorService.check.mockRejectedValue(failure);

            await expect(
                useCase.execute(requestContext, apiKeyContext, dto)
            ).rejects.toBe(failure);

            expect(
                userTwoFactorService.recordVerificationInTx
            ).not.toHaveBeenCalled();
            expect(
                userAuthService.createTokenAndSessionInTx
            ).not.toHaveBeenCalled();
            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });

        it('leaves the challenge claimable when the code is wrong', async () => {
            userTwoFactorService.check.mockRejectedValue(
                new Error('invalid code')
            );

            await expect(
                useCase.execute(requestContext, apiKeyContext, dto)
            ).rejects.toThrow('invalid code');

            expect(
                userTwoFactorService.consumeChallengeInTx
            ).not.toHaveBeenCalled();
        });

        it('creates no session when the challenge claim is lost', async () => {
            const failure = new AuthTwoFactorChallengeInvalidException();
            userTwoFactorService.consumeChallengeInTx.mockRejectedValue(
                failure
            );

            await expect(
                useCase.execute(requestContext, apiKeyContext, dto)
            ).rejects.toBe(failure);

            expect(
                userTwoFactorService.recordVerificationInTx
            ).not.toHaveBeenCalled();
            expect(
                userAuthService.createTokenAndSessionInTx
            ).not.toHaveBeenCalled();
        });

        it('rethrows an AppBaseException the verification record raises', async () => {
            const failure = new AuthTwoFactorInvalidException();
            userTwoFactorService.recordVerificationInTx.mockRejectedValue(
                failure
            );

            await expect(
                useCase.execute(requestContext, apiKeyContext, dto)
            ).rejects.toBe(failure);

            expect(outboxService.addInTx).not.toHaveBeenCalled();
            expect(
                userAuthService.createTokenAndSessionInTx
            ).not.toHaveBeenCalled();
        });

        it('throws AuthTwoFactorChallengeInvalidException on a write conflict, adds no entry, and issues nothing', async () => {
            const conflict = new Error('write conflict');
            userTwoFactorService.recordVerificationInTx.mockRejectedValue(
                conflict
            );
            databaseUtil.toException.mockReturnValue(
                new DatabaseWriteConflictException()
            );

            await expect(
                useCase.execute(requestContext, apiKeyContext, dto)
            ).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.twoFactorChallengeInvalid,
                messagePath: 'auth.error.twoFactorChallengeInvalid',
            });

            expect(databaseUtil.toException).toHaveBeenCalledWith(conflict);
            expect(outboxService.addInTx).not.toHaveBeenCalled();
            expect(
                userAuthService.createTokenAndSessionInTx
            ).not.toHaveBeenCalled();
        });

        it('wraps an unknown error from the verification record, adds no entry, and issues nothing', async () => {
            const failure = new Error('boom');
            userTwoFactorService.recordVerificationInTx.mockRejectedValue(
                failure
            );
            databaseUtil.toException.mockReturnValue(null);

            await expect(
                useCase.execute(requestContext, apiKeyContext, dto)
            ).rejects.toMatchObject({
                module: 'app',
                statusCode: EnumAppStatusCodeError.unknown,
                rawError: failure,
            });

            expect(outboxService.addInTx).not.toHaveBeenCalled();
            expect(
                userAuthService.createTokenAndSessionInTx
            ).not.toHaveBeenCalled();
        });

        it('wraps the session start failure of the one transaction', async () => {
            const failure = new Error('tx failed');
            userAuthService.createTokenAndSessionInTx.mockRejectedValue(
                failure
            );
            databaseUtil.toException.mockReturnValue(null);

            await expect(
                useCase.execute(requestContext, apiKeyContext, dto)
            ).rejects.toMatchObject({
                module: 'app',
                statusCode: EnumAppStatusCodeError.unknown,
                rawError: failure,
            });
        });

        it('throws AuthTwoFactorChallengeInvalidException when the session write conflicts', async () => {
            const conflict = new Error('write conflict');
            userAuthService.createTokenAndSessionInTx.mockRejectedValue(
                conflict
            );
            databaseUtil.toException.mockReturnValue(
                new DatabaseWriteConflictException()
            );

            await expect(
                useCase.execute(requestContext, apiKeyContext, dto)
            ).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.twoFactorChallengeInvalid,
            });
        });
    });
});
