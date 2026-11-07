import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { RedisUnavailableException } from '@common/redis/exceptions/redis.unavailable.exception';
import { EnumRequestStatusCodeError } from '@common/request/enums/request.status-code.enum';
import type { IRequestLog } from '@common/request/interfaces/request.interface';
import { RequestContextMissingException } from '@common/request/exceptions/request.context-missing.exception';
import { RequestLogStoreKey } from '@common/request/constants/request.constant';
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
import type {
    DeviceOwnership,
    TwoFactor,
} from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import type {
    IActivityLogMetadata,
    IActivityLogStaged,
} from '@modules/activity-log/interfaces/activity-log.interface';
import { AuthJwtService } from '@modules/auth/services/auth.jwt.service';
import { AuthUtil } from '@modules/auth/utils/auth.util';
import { AuthTwoFactorService } from '@modules/auth/services/auth.two-factor.service';
import { EnumAuthTwoFactorMethod } from '@modules/auth/enums/auth.enum';
import { EnumAuthStatusCodeError } from '@modules/auth/enums/auth.status-code.enum';
import { AuthTwoFactorAttemptMaxException } from '@modules/auth/exceptions/auth.two-factor-attempt-max.exception';
import { AuthTwoFactorChallengeInvalidException } from '@modules/auth/exceptions/auth.two-factor-challenge-invalid.exception';
import type {
    IAuthToken,
    IAuthTwoFactorChallengeCache,
} from '@modules/auth/interfaces/auth.interface';
import { DeviceService } from '@modules/device/services/device.service';
import type {
    IDeviceIdentity,
    IDeviceLoginUpsert,
} from '@modules/device/interfaces/device.interface';
import { NotificationService } from '@modules/notification/services/notification.service';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import type { INotificationRecipient } from '@modules/notification/interfaces/notification.interface';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { SessionService } from '@modules/session/services/session.service';
import type {
    ISessionPurgeLoginsPayload,
    ISessionRef,
} from '@modules/session/interfaces/session.interface';
import { SessionQueue } from '@modules/session/queues/session.queue';
import { SessionUtil } from '@modules/session/utils/session.util';
import { UserService } from '@modules/user/services/user.service';
import { UserTwoFactorService } from '@modules/user/services/user.two-factor.service';
import type {
    IUser,
    IUserTwoFactorAttempt,
    IUserTwoFactorVerifyResult,
} from '@modules/user/interfaces/user.interface';
import { UserUtil } from '@modules/user/utils/user.util';
import { TestRecipient } from '@test/unit/helpers/test.unit.notification-push.helper';
import { UserLoginSetupTwoFactorUseCase } from '@modules/user/use-cases/user.login-setup-two-factor.use-case';
import { UserLoginVerifyTwoFactorUseCase } from '@modules/user/use-cases/user.login-verify-two-factor.use-case';

describe('UserLoginVerifyTwoFactorUseCase', () => {
    const userService: MockProxy<UserService> = mock<UserService>();
    const userTwoFactorService: MockProxy<UserTwoFactorService> =
        mock<UserTwoFactorService>();
    const userUtil: MockProxy<UserUtil> = mock<UserUtil>();
    const notificationService: MockProxy<NotificationService> =
        mock<NotificationService>();
    const notificationQueue: MockProxy<NotificationQueue> =
        mock<NotificationQueue>();
    const deviceService: MockProxy<DeviceService> = mock<DeviceService>();
    const sessionService: MockProxy<SessionService> = mock<SessionService>();
    const sessionQueue: MockProxy<SessionQueue> = mock<SessionQueue>();
    const sessionUtil: MockProxy<SessionUtil> = mock<SessionUtil>();
    const authJwtService: MockProxy<AuthJwtService> = mock<AuthJwtService>();
    const authUtil: MockProxy<AuthUtil> = mock<AuthUtil>();
    const authTwoFactorService: MockProxy<AuthTwoFactorService> =
        mock<AuthTwoFactorService>();
    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    let useCase: UserLoginVerifyTwoFactorUseCase;
    let setupUseCase: UserLoginSetupTwoFactorUseCase;

    const tx = {} as IDatabaseTransactionClient;
    const now = new Date('2026-03-01T00:00:00.000Z');
    const loginAt = new Date('2026-03-01T00:05:00.000Z');
    const twoFactorAttempt: IUserTwoFactorAttempt = {
        isAttemptCounted: true,
        lockoutStages: [],
    };
    const twoFactorSpentAttempt: IUserTwoFactorAttempt = {
        isAttemptCounted: false,
        lockoutStages: [
            {
                action: EnumActivityLogAction.userRevokeAllSessions,
                userId: 'user-bramble',
                createdBy: 'user-bramble',
            },
            {
                action: EnumActivityLogAction.userReachMaxTwoFactorAttempt,
                userId: 'user-bramble',
                createdBy: 'user-bramble',
            },
        ],
    };
    const requestLog: IRequestLog = {
        userAgent: {
            ua: 'ua',
            browser: null,
            cpu: null,
            device: null,
            engine: null,
            os: null,
        },
        ipAddress: '127.0.0.1',
        geoLocation: null,
    };
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
    const activityLog: IActivityLogStaged = {
        action: EnumActivityLogAction.userLoginCredential,
        metadata: {},
        userId: null,
        createdBy: null,
        workspaceId: null,
    };
    const recipient: INotificationRecipient = {
        ...TestRecipient,
        userId: 'user-bramble',
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
    const twoFactorUser: IUser = {
        ...baseUser,
        twoFactor: enabledTwoFactor,
    };
    const committedUser: IUser = { ...baseUser, twoFactor };
    const ownership: DeviceOwnership = {
        id: 'device-ownership-bramble',
        deviceId: 'device-bramble',
        userId: 'user-bramble',
        revokedAt: null,
        isRevoked: false,
        revokedById: null,
        lastActiveAt: now,
        notificationToken: 'token-bramble',
        notificationProvider: null,
        biometricEnabled: false,
        biometricToken: null,
        biometricType: null,
        biometricEnabledAt: null,
        createdAt: now,
        createdBy: null,
        updatedAt: now,
        updatedBy: null,
    };
    const upsert: IDeviceLoginUpsert = {
        device: {
            id: 'device-bramble',
            fingerprint: 'device-bramble',
            name: null,
            platform: EnumDevicePlatform.android,
            lastActiveAt: now,
            createdAt: now,
            createdBy: null,
            updatedAt: now,
            updatedBy: null,
        },
        deviceOwnership: ownership,
        isNewDevice: true,
    };
    const revokedRef: ISessionRef[] = [{ id: 'session-bramble' }];
    const challenge: IAuthTwoFactorChallengeCache = {
        userId: 'user-bramble',
        device: deviceIdentity,
        loginFrom: EnumUserLoginFrom.website,
        loginWith: EnumUserLoginWith.credential,
    };
    const verified: IUserTwoFactorVerifyResult = {
        method: EnumAuthTwoFactorMethod.code,
        newBackupCodes: null,
    };

    beforeEach(async () => {
        vi.resetAllMocks();

        databaseService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );
        helperDateService.create.mockReturnValue(now);
        helperDateService.forward.mockImplementation(date => date);
        helperDateService.formatToIso.mockReturnValue(
            '2026-03-05T00:00:00.000Z'
        );
        sessionService.getRequestLog.mockReturnValue(requestLog);
        activityLogService.prepare.mockReturnValue(activityLog);
        userUtil.resolveLoginActivityLogAction.mockReturnValue(
            EnumActivityLogAction.userLoginCredential
        );
        userUtil.isUnverified.mockReturnValue(false);
        userUtil.isTwoFactorEnabled.mockReturnValue(false);
        userUtil.requiresTwoFactorSetup.mockReturnValue(false);
        notificationService.getRecipient.mockResolvedValue(recipient);
        deviceService.upsertForLoginInTx.mockResolvedValue(upsert);
        deviceService.getOtherOwnershipIdsByDeviceInTx.mockResolvedValue([]);
        authUtil.createLoginIdentifiers.mockReturnValue({
            sessionId: 'session-bramble',
            jti: 'jti-bramble',
        });
        authJwtService.createTokens.mockReturnValue(tokens);
        Object.defineProperty(
            authJwtService,
            'jwtRefreshTokenExpirationTimeInSeconds',
            { value: 2592000, configurable: true }
        );
        userService.createManyInTx.mockResolvedValue([committedUser]);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserLoginVerifyTwoFactorUseCase,
                UserLoginSetupTwoFactorUseCase,
                { provide: UserService, useValue: userService },
                {
                    provide: UserTwoFactorService,
                    useValue: userTwoFactorService,
                },
                { provide: NotificationService, useValue: notificationService },
                { provide: DeviceService, useValue: deviceService },
                { provide: SessionService, useValue: sessionService },
                { provide: AuthJwtService, useValue: authJwtService },
                {
                    provide: AuthTwoFactorService,
                    useValue: authTwoFactorService,
                },
                { provide: AuthUtil, useValue: authUtil },
                { provide: ActivityLogService, useValue: activityLogService },
                { provide: SessionQueue, useValue: sessionQueue },
                { provide: SessionUtil, useValue: sessionUtil },
                { provide: NotificationQueue, useValue: notificationQueue },
                { provide: UserUtil, useValue: userUtil },
                { provide: DatabaseService, useValue: databaseService },
                { provide: HelperDateService, useValue: helperDateService },
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
            authTwoFactorService.getChallenge.mockResolvedValue(challenge);
            authTwoFactorService.consumeChallenge.mockResolvedValue(challenge);
            userTwoFactorService.getOneForLoginVerify.mockResolvedValue(
                twoFactorUser
            );
            userTwoFactorService.countAttempt.mockResolvedValue(
                twoFactorAttempt
            );
            userTwoFactorService.verify.mockResolvedValue(verified);
            userUtil.resolveLoginActivityLogAction.mockReturnValue(
                EnumActivityLogAction.userLoginCredential
            );
        });

        it('verifies the challenge user, claims the challenge, records the verification, issues the session on one transaction, and stages both rows', async () => {
            const callOrder: string[] = [];
            userTwoFactorService.countAttempt.mockImplementation(async () => {
                callOrder.push('countAttempt');

                return twoFactorAttempt;
            });
            userTwoFactorService.assertAttemptCounted.mockImplementation(() => {
                callOrder.push('assertAttemptCounted');
            });
            userTwoFactorService.verify.mockImplementation(async () => {
                callOrder.push('verify');

                return verified;
            });
            authTwoFactorService.consumeChallenge.mockImplementation(
                async () => {
                    callOrder.push('consumeChallenge');

                    return challenge;
                }
            );
            userTwoFactorService.recordVerification.mockImplementation(
                async () => {
                    callOrder.push('recordVerification');
                }
            );
            databaseService.withTransaction.mockImplementation(async fn => {
                const result = await fn(tx);
                callOrder.push('committed');

                return result as never;
            });
            activityLogService.stagePrepared.mockImplementation(() => {
                callOrder.push('stagePrepared');
            });

            await expect(useCase.execute(dto)).resolves.toEqual({
                data: tokens,
            });

            expect(authTwoFactorService.getChallenge).toHaveBeenCalledWith(
                'challenge-token'
            );
            expect(
                userTwoFactorService.getOneForLoginVerify
            ).toHaveBeenCalledWith('user-bramble');
            expect(userTwoFactorService.countAttempt).toHaveBeenCalledWith(
                twoFactorUser
            );
            expect(userTwoFactorService.verify).toHaveBeenCalledWith(
                twoFactorUser,
                {
                    code: '123456',
                    backupCode: null,
                    method: EnumAuthTwoFactorMethod.code,
                }
            );
            expect(
                userTwoFactorService.recordVerification
            ).toHaveBeenCalledWith(twoFactorUser, verified);
            expect(deviceService.upsertForLoginInTx).toHaveBeenCalledWith(
                tx,
                'user-bramble',
                deviceIdentity,
                now
            );
            expect(sessionService.createInTx).toHaveBeenCalledTimes(1);
            expect(userService.updateLoginInTx).toHaveBeenCalledTimes(1);
            expect(sessionQueue.purgeLogins).toHaveBeenCalledWith(
                'user-bramble',
                []
            );
            expect(authTwoFactorService.consumeChallenge).toHaveBeenCalledWith(
                'challenge-token'
            );
            expect(activityLogService.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userVerifyTwoFactor,
                userId: 'user-bramble',
                createdBy: 'user-bramble',
            });
            expect(userUtil.resolveLoginActivityLogAction).toHaveBeenCalledWith(
                EnumUserLoginWith.credential
            );
            expect(
                userTwoFactorService.assertAttemptCounted
            ).toHaveBeenCalledWith(true);
            expect(userUtil.buildTwoFactorLockoutStages).not.toHaveBeenCalled();
            expect(activityLogService.stagePrepared).toHaveBeenNthCalledWith(
                1,
                []
            );
            expect(callOrder).toEqual([
                'countAttempt',
                'stagePrepared',
                'assertAttemptCounted',
                'verify',
                'consumeChallenge',
                'recordVerification',
                'stagePrepared',
                'committed',
                'stagePrepared',
            ]);
        });

        it('claims the challenge once and issues tokens after the setup step left it in place', async () => {
            userTwoFactorService.getOneForLoginSetup.mockResolvedValue({
                user: twoFactorUser,
                pendingSecret: 'pending-secret',
            });
            userTwoFactorService.countAttempt.mockResolvedValue(
                twoFactorAttempt
            );
            userTwoFactorService.enableTwoFactor.mockResolvedValue([
                'backup-one',
            ]);

            await setupUseCase.execute({
                challengeToken: 'challenge-token',
                code: '123456',
            });

            expect(
                authTwoFactorService.consumeChallenge
            ).not.toHaveBeenCalled();

            await expect(useCase.execute(dto)).resolves.toEqual({
                data: tokens,
            });

            expect(authTwoFactorService.getChallenge).toHaveBeenCalledTimes(2);
            expect(authTwoFactorService.consumeChallenge).toHaveBeenCalledTimes(
                1
            );
        });

        it('forwards the backup code', async () => {
            await useCase.execute({
                challengeToken: 'challenge-token',
                method: EnumAuthTwoFactorMethod.backupCodes,
                backupCode: 'backup-code',
            });

            expect(userTwoFactorService.verify).toHaveBeenCalledWith(
                twoFactorUser,
                {
                    code: null,
                    backupCode: 'backup-code',
                    method: EnumAuthTwoFactorMethod.backupCodes,
                }
            );
        });

        it('throws AuthTwoFactorChallengeInvalidException without reading the user when the challenge is missing', async () => {
            authTwoFactorService.getChallenge.mockRejectedValue(
                new AuthTwoFactorChallengeInvalidException()
            );

            await expect(useCase.execute(dto)).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.twoFactorChallengeInvalid,
            });
            expect(
                userTwoFactorService.getOneForLoginVerify
            ).not.toHaveBeenCalled();
        });

        it('stages both lockout rows after the spent count before the two-factor attempt limit is answered', async () => {
            const callOrder: string[] = [];
            userTwoFactorService.countAttempt.mockImplementation(async () => {
                callOrder.push('countAttempt');

                return twoFactorSpentAttempt;
            });
            userTwoFactorService.assertAttemptCounted.mockImplementation(() => {
                callOrder.push('assert');

                throw new AuthTwoFactorAttemptMaxException();
            });
            activityLogService.stagePrepared.mockImplementation(() => {
                callOrder.push('stagePrepared');
            });

            await expect(useCase.execute(dto)).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.twoFactorAttemptMax,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.twoFactorAttemptMax
                    ],
                messagePath: 'auth.error.twoFactorAttemptMax',
            });

            expect(userUtil.buildTwoFactorLockoutStages).not.toHaveBeenCalled();
            expect(activityLogService.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userRevokeAllSessions,
                userId: 'user-bramble',
                createdBy: 'user-bramble',
            });
            expect(activityLogService.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userReachMaxTwoFactorAttempt,
                userId: 'user-bramble',
                createdBy: 'user-bramble',
            });
            expect(
                activityLogService.stagePrepared
            ).toHaveBeenCalledExactlyOnceWith([activityLog, activityLog]);
            expect(
                userTwoFactorService.assertAttemptCounted
            ).toHaveBeenCalledWith(false);
            expect(callOrder).toEqual([
                'countAttempt',
                'stagePrepared',
                'assert',
            ]);
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
            expect(sessionQueue.purgeLogins).not.toHaveBeenCalled();
            expect(userTwoFactorService.verify).not.toHaveBeenCalled();
            expect(
                authTwoFactorService.consumeChallenge
            ).not.toHaveBeenCalled();
        });

        it('issues nothing and stages no row when the verification fails', async () => {
            const failure = new Error('invalid code');
            userTwoFactorService.verify.mockRejectedValue(failure);

            await expect(useCase.execute(dto)).rejects.toBe(failure);

            expect(
                userTwoFactorService.recordVerification
            ).not.toHaveBeenCalled();
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
            expect(
                activityLogService.stagePrepared
            ).toHaveBeenCalledExactlyOnceWith([]);
        });

        it('leaves the challenge claimable when the code is wrong', async () => {
            userTwoFactorService.verify.mockRejectedValue(
                new Error('invalid code')
            );

            await expect(useCase.execute(dto)).rejects.toThrow('invalid code');

            expect(
                authTwoFactorService.consumeChallenge
            ).not.toHaveBeenCalled();
        });

        it('creates no session when the challenge claim fails', async () => {
            const failure = new Error('redis down');
            authTwoFactorService.consumeChallenge.mockRejectedValue(failure);

            await expect(useCase.execute(dto)).rejects.toBe(failure);

            expect(
                userTwoFactorService.recordVerification
            ).not.toHaveBeenCalled();
            expect(sessionService.createInTx).not.toHaveBeenCalled();
        });

        it('stages no login row when the session transaction fails', async () => {
            const failure = new Error('tx failed');
            databaseService.withTransaction.mockRejectedValue(failure);
            const callOrder: string[] = [];
            activityLogService.stagePrepared.mockImplementation(() => {
                callOrder.push('stagePrepared');
            });

            await expect(useCase.execute(dto)).rejects.toBe(failure);

            expect(callOrder).toEqual(['stagePrepared', 'stagePrepared']);
            expect(activityLogService.stagePrepared).toHaveBeenNthCalledWith(
                1,
                []
            );
        });
    });

    describe('createTokenAndSession', () => {
        const otherOwnershipIds = [
            'device-ownership-thistle',
            'device-ownership-clover',
        ];
        const affected: ISessionPurgeLoginsPayload[] = [
            {
                userId: 'user-thistle',
                sessions: [
                    { id: 'session-thistle-1' },
                    { id: 'session-thistle-2' },
                ],
            },
            { userId: 'user-clover', sessions: [{ id: 'session-clover' }] },
        ];
        const revokeMetadata: IActivityLogMetadata = {
            actorUserId: 'user-bramble',
            sessionCount: 2,
        };
        const thistleLog: IActivityLogStaged = {
            action: EnumActivityLogAction.userRevokeSessionByDeviceLogin,
            metadata: revokeMetadata,
            userId: 'user-thistle',
            createdBy: 'user-bramble',
            workspaceId: null,
        };
        const cloverLog: IActivityLogStaged = {
            ...thistleLog,
            userId: 'user-clover',
        };

        it('reads the recipient, creates the session on the transaction, stamps the login, caches the entry, and enqueues the purge and the new-device notice', async () => {
            const callOrder: string[] = [];
            notificationService.getRecipient.mockImplementation(async () => {
                callOrder.push('getRecipient');

                return recipient;
            });
            databaseService.withTransaction.mockImplementation(async fn => {
                const result = await fn(tx);
                callOrder.push('committed');

                return result as never;
            });
            authJwtService.createTokens.mockImplementation(() => {
                callOrder.push('createTokens');

                return tokens;
            });
            sessionService.setLogin.mockImplementation(async () => {
                callOrder.push('setLogin');
            });

            const result = await useCase['createTokenAndSession'](
                baseUser,
                deviceIdentity,
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential,
                loginAt
            );

            expect(result).toBe(tokens);
            expect(notificationService.getRecipient).toHaveBeenCalledWith(
                baseUser,
                EnumNotificationKind.newDeviceLogin
            );
            expect(
                sessionService.revokeByDeviceOwnershipInTx
            ).not.toHaveBeenCalled();
            expect(sessionService.createInTx).toHaveBeenCalledWith(
                tx,
                'user-bramble',
                'session-bramble',
                'device-ownership-bramble',
                'jti-bramble',
                loginAt,
                requestLog
            );
            expect(userService.updateLoginInTx).toHaveBeenCalledWith(
                tx,
                'user-bramble',
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential,
                requestLog.ipAddress,
                now
            );
            expect(authJwtService.createTokens).toHaveBeenCalledWith(
                baseUser,
                {
                    sessionId: 'session-bramble',
                    jti: 'jti-bramble',
                    deviceOwnershipId: 'device-ownership-bramble',
                    loginAt,
                },
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential
            );
            expect(sessionService.setLogin).toHaveBeenCalledWith(
                'user-bramble',
                'session-bramble',
                'jti-bramble'
            );
            expect(sessionQueue.purgeLogins).toHaveBeenCalledWith(
                'user-bramble',
                []
            );
            expect(notificationQueue.sendNewDeviceLogin).toHaveBeenCalledWith(
                recipient,
                {
                    requestLog,
                    loginFrom: EnumUserLoginFrom.website,
                    loginWith: EnumUserLoginWith.credential,
                    loginAt: '2026-03-05T00:00:00.000Z',
                },
                'session-bramble'
            );
            expect(callOrder).toEqual([
                'getRecipient',
                'committed',
                'createTokens',
                'setLogin',
            ]);
        });

        it('announces no new device for an existing one', async () => {
            deviceService.upsertForLoginInTx.mockResolvedValue({
                ...upsert,
                isNewDevice: false,
            });

            await useCase['createTokenAndSession'](
                baseUser,
                deviceIdentity,
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential,
                loginAt
            );

            expect(notificationQueue.sendNewDeviceLogin).not.toHaveBeenCalled();
        });

        it('revokes the new session, purges it, and rethrows when the login cache write rejects, still enqueueing the repeat-device purge and the new-device notice', async () => {
            const failure = new Error('cache down');
            sessionService.setLogin.mockRejectedValue(failure);
            sessionService.revokeIfActive.mockResolvedValue(revokedRef);

            await expect(
                useCase['createTokenAndSession'](
                    baseUser,
                    deviceIdentity,
                    EnumUserLoginFrom.website,
                    EnumUserLoginWith.credential,
                    loginAt
                )
            ).rejects.toMatchObject({ rawError: failure });
            expect(sessionService.revokeIfActive).toHaveBeenCalledWith(
                'user-bramble',
                'session-bramble'
            );
            expect(sessionQueue.purgeLogins).toHaveBeenCalledWith(
                'user-bramble',
                revokedRef
            );
            expect(sessionQueue.purgeLogins).toHaveBeenCalledWith(
                'user-bramble',
                []
            );
            expect(notificationQueue.sendNewDeviceLogin).toHaveBeenCalledTimes(
                1
            );
        });

        it('rethrows a typed login cache failure unwrapped after the compensating revoke', async () => {
            const failure = new RedisUnavailableException();
            sessionService.setLogin.mockRejectedValue(failure);
            sessionService.revokeIfActive.mockResolvedValue(revokedRef);

            await expect(
                useCase['createTokenAndSession'](
                    baseUser,
                    deviceIdentity,
                    EnumUserLoginFrom.website,
                    EnumUserLoginWith.credential,
                    loginAt
                )
            ).rejects.toBe(failure);
            expect(sessionService.revokeIfActive).toHaveBeenCalledTimes(1);
        });

        it("still enqueues the affected users' purges and stages no activity row when the login cache write rejects", async () => {
            const failure = new Error('cache down');
            deviceService.getOtherOwnershipIdsByDeviceInTx.mockResolvedValue(
                otherOwnershipIds
            );
            sessionService.revokeByDeviceOwnershipIdsInTx.mockResolvedValue(
                affected
            );
            sessionService.setLogin.mockRejectedValue(failure);
            sessionService.revokeIfActive.mockResolvedValue(revokedRef);

            await expect(
                useCase['createTokenAndSession'](
                    baseUser,
                    deviceIdentity,
                    EnumUserLoginFrom.website,
                    EnumUserLoginWith.credential,
                    loginAt
                )
            ).rejects.toMatchObject({ rawError: failure });
            expect(sessionQueue.purgeLogins).toHaveBeenCalledWith(
                'user-thistle',
                affected[0]!.sessions
            );
            expect(sessionQueue.purgeLogins).toHaveBeenCalledWith(
                'user-clover',
                affected[1]!.sessions
            );
            expect(activityLogService.stagePrepared).not.toHaveBeenCalled();
        });

        it('revokes nothing when the login cache write succeeds', async () => {
            await useCase['createTokenAndSession'](
                baseUser,
                deviceIdentity,
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential,
                loginAt
            );

            expect(sessionService.revokeIfActive).not.toHaveBeenCalled();
        });

        it('fails the login before the transaction when the recipient read rejects', async () => {
            const failure = new Error('recipient-unavailable');
            notificationService.getRecipient.mockRejectedValue(failure);

            await expect(
                useCase['createTokenAndSession'](
                    baseUser,
                    deviceIdentity,
                    EnumUserLoginFrom.website,
                    EnumUserLoginWith.credential,
                    loginAt
                )
            ).rejects.toBe(failure);
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('throws RequestContextMissingException before any write when the store has no request log', async () => {
            sessionService.getRequestLog.mockImplementation(() => {
                throw new RequestContextMissingException(RequestLogStoreKey);
            });

            await expect(
                useCase['createTokenAndSession'](
                    baseUser,
                    deviceIdentity,
                    EnumUserLoginFrom.website,
                    EnumUserLoginWith.credential,
                    loginAt
                )
            ).rejects.toMatchObject({
                module: 'request',
                statusCode: EnumRequestStatusCodeError.contextMissing,
            });
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('signs nothing and writes no cache key when the transaction fails', async () => {
            const failure = new Error('tx failed');
            databaseService.withTransaction.mockRejectedValue(failure);

            await expect(
                useCase['createTokenAndSession'](
                    baseUser,
                    deviceIdentity,
                    EnumUserLoginFrom.website,
                    EnumUserLoginWith.credential,
                    loginAt
                )
            ).rejects.toBe(failure);
            expect(authJwtService.createTokens).not.toHaveBeenCalled();
            expect(sessionService.setLogin).not.toHaveBeenCalled();
            expect(sessionQueue.purgeLogins).not.toHaveBeenCalled();
        });

        it("reads the other users' ownerships of the device and revokes their sessions on the login transaction for a new ownership", async () => {
            deviceService.getOtherOwnershipIdsByDeviceInTx.mockResolvedValue(
                otherOwnershipIds
            );
            sessionService.revokeByDeviceOwnershipIdsInTx.mockResolvedValue(
                affected
            );

            await useCase['createTokenAndSession'](
                baseUser,
                deviceIdentity,
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential,
                loginAt
            );

            expect(
                deviceService.getOtherOwnershipIdsByDeviceInTx
            ).toHaveBeenCalledWith(tx, 'device-bramble', 'user-bramble');
            expect(
                sessionService.revokeByDeviceOwnershipIdsInTx
            ).toHaveBeenCalledWith(
                tx,
                ['device-ownership-thistle', 'device-ownership-clover'],
                'user-bramble',
                now
            );
            expect(
                sessionService.revokeByDeviceOwnershipInTx
            ).not.toHaveBeenCalled();
        });

        it('signs other users out for a repeat ownership too', async () => {
            deviceService.upsertForLoginInTx.mockResolvedValue({
                ...upsert,
                isNewDevice: false,
            });
            deviceService.getOtherOwnershipIdsByDeviceInTx.mockResolvedValue(
                otherOwnershipIds
            );
            sessionService.revokeByDeviceOwnershipInTx.mockResolvedValue([]);
            sessionService.revokeByDeviceOwnershipIdsInTx.mockResolvedValue(
                affected
            );

            await useCase['createTokenAndSession'](
                baseUser,
                deviceIdentity,
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential,
                loginAt
            );

            expect(
                deviceService.getOtherOwnershipIdsByDeviceInTx
            ).toHaveBeenCalledWith(tx, 'device-bramble', 'user-bramble');
            expect(
                sessionService.revokeByDeviceOwnershipIdsInTx
            ).toHaveBeenCalledWith(
                tx,
                ['device-ownership-thistle', 'device-ownership-clover'],
                'user-bramble',
                now
            );
            expect(
                sessionService.revokeByDeviceOwnershipInTx
            ).toHaveBeenCalled();
        });

        it('runs no session revoke when no other user owns the device', async () => {
            await useCase['createTokenAndSession'](
                baseUser,
                deviceIdentity,
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential,
                loginAt
            );

            expect(
                sessionService.revokeByDeviceOwnershipIdsInTx
            ).not.toHaveBeenCalled();
            expect(
                sessionUtil.mapActivityLogRevokeAllTargetMetadata
            ).not.toHaveBeenCalled();
            expect(activityLogService.stagePrepared).not.toHaveBeenCalled();
            expect(sessionQueue.purgeLogins).toHaveBeenCalledTimes(1);
            expect(sessionQueue.purgeLogins).toHaveBeenCalledWith(
                'user-bramble',
                []
            );
        });

        it('enqueues one purge per affected user after the commit and stages one activity row each', async () => {
            const callOrder: string[] = [];
            deviceService.getOtherOwnershipIdsByDeviceInTx.mockResolvedValue(
                otherOwnershipIds
            );
            sessionService.revokeByDeviceOwnershipIdsInTx.mockResolvedValue(
                affected
            );
            sessionUtil.mapActivityLogRevokeAllTargetMetadata.mockReturnValue(
                revokeMetadata
            );
            activityLogService.prepare
                .mockReturnValueOnce(thistleLog)
                .mockReturnValueOnce(cloverLog);
            databaseService.withTransaction.mockImplementation(async fn => {
                const result = await fn(tx);
                callOrder.push('committed');

                return result as never;
            });
            sessionQueue.purgeLogins.mockImplementation(async userId => {
                callOrder.push(`purge:${userId}`);
            });
            activityLogService.stagePrepared.mockImplementation(() => {
                callOrder.push('stagePrepared');
            });

            await useCase['createTokenAndSession'](
                baseUser,
                deviceIdentity,
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential,
                loginAt
            );

            expect(sessionQueue.purgeLogins).toHaveBeenCalledWith(
                'user-thistle',
                affected[0]!.sessions
            );
            expect(sessionQueue.purgeLogins).toHaveBeenCalledWith(
                'user-clover',
                affected[1]!.sessions
            );
            expect(
                sessionUtil.mapActivityLogRevokeAllTargetMetadata
            ).toHaveBeenCalledWith('user-bramble', 2);
            expect(
                sessionUtil.mapActivityLogRevokeAllTargetMetadata
            ).toHaveBeenCalledWith('user-bramble', 1);
            expect(activityLogService.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userRevokeSessionByDeviceLogin,
                userId: 'user-thistle',
                createdBy: 'user-bramble',
                metadata: revokeMetadata,
            });
            expect(activityLogService.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userRevokeSessionByDeviceLogin,
                userId: 'user-clover',
                createdBy: 'user-bramble',
                metadata: revokeMetadata,
            });
            expect(activityLogService.stagePrepared).toHaveBeenCalledTimes(1);
            expect(activityLogService.stagePrepared).toHaveBeenCalledWith([
                thistleLog,
                cloverLog,
            ]);
            expect(callOrder).toEqual([
                'committed',
                'purge:user-bramble',
                'purge:user-thistle',
                'purge:user-clover',
                'stagePrepared',
            ]);
        });
    });
});
