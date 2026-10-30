import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumDevicePlatform,
    EnumRoleType,
    EnumUserLoginFrom,
    EnumUserLoginWith,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
} from '@generated/prisma-client/client';
import type { TwoFactor } from '@generated/prisma-client/client';
import { EnumAppStatusCodeError } from '@app/enums/app.status-code.enum';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { RequestLogStoreKey } from '@common/request/constants/request.constant';
import { EnumRequestStatusCodeError } from '@common/request/enums/request.status-code.enum';
import { RequestContextMissingException } from '@common/request/exceptions/request.context-missing.exception';
import type { IRequestLog } from '@common/request/interfaces/request.interface';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { AccountDomain } from '@modules/account/domains/account.domain';
import { AccountLoginDomain } from '@modules/account/domains/account.login.domain';
import { EnumAuthStatusCodeError } from '@modules/auth/enums/auth.status-code.enum';
import type {
    IAuthAccessTokenGenerate,
    IAuthJwtRefreshTokenPayload,
    IAuthToken,
} from '@modules/auth/interfaces/auth.interface';
import { AuthJwtDomain } from '@modules/auth/domains/auth.jwt.domain';
import { AuthTwoFactorDomain } from '@modules/auth/domains/auth.two-factor.domain';
import { DeviceDomain } from '@modules/device/domains/device.domain';
import type {
    IDeviceIdentity,
    IDeviceLoginUpsert,
} from '@modules/device/interfaces/device.interface';
import { DeviceUtil } from '@modules/device/utils/device.util';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import type { INotificationRecipient } from '@modules/notification/interfaces/notification.interface';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { SessionDomain } from '@modules/session/domains/session.domain';
import { SessionQueue } from '@modules/session/queues/session.queue';
import { EnumSessionCacheUpdate } from '@modules/session/enums/session.enum';
import { SessionNotFoundException } from '@modules/session/exceptions/session.not-found.exception';
import type {
    ISession,
    ISessionRef,
} from '@modules/session/interfaces/session.interface';
import { UserDomain } from '@modules/user/domains/user.domain';
import { UserTwoFactorDomain } from '@modules/user/domains/user.two-factor.domain';
import type { IUser } from '@modules/user/interfaces/user.interface';
import {
    expectSessionRevoked,
    stubAccountRefreshSession,
} from '@test/unit/helpers/test.unit.account.helper';
import type { IAccountRefreshSessionDoubles } from '@test/unit/helpers/test.unit.account.helper';
import { TestRecipient } from '@test/unit/helpers/test.unit.notification-push.helper';

describe('AccountLoginDomain', () => {
    const userDomain: MockProxy<UserDomain> = mock<UserDomain>();
    const userTwoFactorDomain: MockProxy<UserTwoFactorDomain> =
        mock<UserTwoFactorDomain>();
    const accountDomain: MockProxy<AccountDomain> = mock<AccountDomain>();
    const deviceDomain: MockProxy<DeviceDomain> = mock<DeviceDomain>();
    const deviceUtil: MockProxy<DeviceUtil> = mock<DeviceUtil>();
    const sessionDomain: MockProxy<SessionDomain> = mock<SessionDomain>();
    const authJwtDomain: MockProxy<AuthJwtDomain> = mock<AuthJwtDomain>();
    const authTwoFactorDomain: MockProxy<AuthTwoFactorDomain> =
        mock<AuthTwoFactorDomain>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();
    const sessionQueue: MockProxy<SessionQueue> = mock<SessionQueue>();
    const notificationQueue: MockProxy<NotificationQueue> =
        mock<NotificationQueue>();
    const refreshSessionDoubles: IAccountRefreshSessionDoubles = {
        authJwtDomain,
        sessionDomain,
    };

    let domain: AccountLoginDomain;

    const tx = {} as IDatabaseTransactionClient;
    const now = new Date('2026-03-01T00:00:00.000Z');
    const loginAt = new Date('2026-01-01T00:05:00.000Z');
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
    const device: IDeviceIdentity = {
        fingerprint: 'device-wisteria',
        name: null,
        platform: EnumDevicePlatform.android,
        notificationToken: null,
    };
    const tokens: IAuthToken = {
        tokenType: 'Bearer',
        roleType: EnumRoleType.user,
        expiresIn: 3600,
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
    };
    const baseTwoFactor: TwoFactor = {
        id: 'two-factor-wisteria',
        userId: 'user-wisteria',
        secret: 'encrypted-secret',
        pendingSecret: null,
        backupCodes: ['hash-one'],
        enabled: false,
        requiredSetup: false,
        confirmedAt: null,
        lastUsedAt: null,
        attempt: 0,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
    };
    const baseUser: IUser = {
        id: 'user-wisteria',
        name: 'Wisteria Lark',
        username: 'wisteriaLark',
        isVerified: true,
        verifiedAt: new Date('2026-01-01T00:00:00.000Z'),
        email: 'wisteria@example.com',
        roleId: 'role-wisteria',
        password: 'hashed-password',
        passwordExpired: new Date('2026-06-01T00:00:00.000Z'),
        passwordCreated: new Date('2026-01-01T00:00:00.000Z'),
        passwordAttempt: 0,
        signUpAt: new Date('2026-01-01T00:00:00.000Z'),
        signUpFrom: EnumUserSignUpFrom.website,
        signUpWith: EnumUserSignUpWith.credential,
        status: EnumUserStatus.active,
        gender: null,
        countryId: 'country-wisteria',
        lastLoginAt: null,
        lastIPAddress: null,
        lastLoginFrom: EnumUserLoginFrom.website,
        lastLoginWith: EnumUserLoginWith.credential,
        lastWorkspaceId: 'workspace-wisteria',
        lastWorkspaceChangedAt: new Date('2026-01-02T00:00:00.000Z'),
        photo: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
        deletedAt: null,
        deletedBy: null,
        role: {
            id: 'role-wisteria',
            name: 'user',
            description: null,
            type: EnumRoleType.user,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            createdBy: null,
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedBy: null,
            policies: [],
        },
        twoFactor: baseTwoFactor,
    };
    const recipient: INotificationRecipient = {
        ...TestRecipient,
        userId: baseUser.id,
    };
    const upsert: IDeviceLoginUpsert = {
        device: {
            id: 'device-wisteria',
            fingerprint: device.fingerprint,
            name: null,
            platform: EnumDevicePlatform.android,
            lastActiveAt: now,
            createdAt: now,
            createdBy: null,
            updatedAt: now,
            updatedBy: null,
        },
        deviceOwnership: {
            id: 'device-ownership-wisteria',
            deviceId: 'device-wisteria',
            userId: 'user-wisteria',
            revokedAt: null,
            isRevoked: false,
            revokedById: null,
            lastActiveAt: now,
            notificationToken: null,
            notificationProvider: null,
            biometricEnabled: false,
            biometricToken: null,
            biometricType: null,
            biometricEnabledAt: null,
            createdAt: now,
            createdBy: null,
            updatedAt: now,
            updatedBy: null,
        },
        isNewDevice: true,
    };
    const revokedRef: ISessionRef[] = [{ id: 'session-wisteria' }];

    beforeEach(async () => {
        vi.resetAllMocks();

        accountDomain.getNotificationRecipientOfUser.mockResolvedValue(
            recipient
        );
        databaseService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );
        helperDateService.create.mockReturnValue(now);
        helperDateService.forward.mockImplementation(date => date);
        helperDateService.formatToIso.mockReturnValue(
            '2026-01-01T00:05:00.000Z'
        );
        requestStoreService.get.mockReturnValue(requestLog);
        authJwtDomain.createLoginIdentifiers.mockReturnValue({
            sessionId: 'session-wisteria',
            jti: 'jti-wisteria',
        });
        authJwtDomain.createTokens.mockReturnValue(tokens);
        Object.defineProperty(
            authJwtDomain,
            'jwtRefreshTokenExpirationTimeInSeconds',
            { value: 2592000, configurable: true }
        );
        deviceUtil.resolveNotificationProvider.mockReturnValue(null);
        deviceDomain.upsertForLoginInTx.mockResolvedValue(upsert);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AccountLoginDomain,
                { provide: UserDomain, useValue: userDomain },
                {
                    provide: UserTwoFactorDomain,
                    useValue: userTwoFactorDomain,
                },
                { provide: AccountDomain, useValue: accountDomain },
                { provide: DeviceDomain, useValue: deviceDomain },
                { provide: DeviceUtil, useValue: deviceUtil },
                { provide: SessionDomain, useValue: sessionDomain },
                { provide: AuthJwtDomain, useValue: authJwtDomain },
                {
                    provide: AuthTwoFactorDomain,
                    useValue: authTwoFactorDomain,
                },
                { provide: DatabaseService, useValue: databaseService },
                { provide: HelperDateService, useValue: helperDateService },
                {
                    provide: RequestStoreService,
                    useValue: requestStoreService,
                },
                { provide: SessionQueue, useValue: sessionQueue },
                {
                    provide: NotificationQueue,
                    useValue: notificationQueue,
                },
            ],
        }).compile();
        domain = module.get(AccountLoginDomain);
    });

    describe('createTokenAndSession', () => {
        it('reads the recipient, creates the session on the transaction, stamps the login, and caches the entry in order', async () => {
            const callOrder: string[] = [];
            accountDomain.getNotificationRecipientOfUser.mockImplementation(
                async () => {
                    callOrder.push('getRecipient');

                    return recipient;
                }
            );
            databaseService.withTransaction.mockImplementation(async fn => {
                const result = await fn(tx);
                callOrder.push('committed');

                return result as never;
            });
            authJwtDomain.createTokens.mockImplementation(() => {
                callOrder.push('createTokens');

                return tokens;
            });
            sessionDomain.setLogin.mockImplementation(async () => {
                callOrder.push('setLogin');
            });

            const result = await domain.createTokenAndSession(
                baseUser,
                device,
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential,
                loginAt
            );

            expect(result).toBe(tokens);
            expect(sessionQueue.purgeLogins).toHaveBeenCalledWith(
                baseUser.id,
                []
            );
            expect(notificationQueue.sendNewDeviceLogin).toHaveBeenCalledWith(
                recipient,
                {
                    requestLog,
                    loginFrom: EnumUserLoginFrom.website,
                    loginWith: EnumUserLoginWith.credential,
                    loginAt: '2026-01-01T00:05:00.000Z',
                },
                'session-wisteria'
            );
            expect(
                accountDomain.getNotificationRecipientOfUser
            ).toHaveBeenCalledWith(
                baseUser,
                EnumNotificationKind.newDeviceLogin
            );
            expect(deviceDomain.upsertForLoginInTx).toHaveBeenCalledWith(
                tx,
                baseUser.id,
                device,
                null,
                now
            );
            expect(
                sessionDomain.revokeByDeviceOwnershipInTx
            ).not.toHaveBeenCalled();
            expect(sessionDomain.createInTx).toHaveBeenCalledWith(
                tx,
                baseUser.id,
                'session-wisteria',
                'device-ownership-wisteria',
                'jti-wisteria',
                loginAt,
                requestLog
            );
            expect(userDomain.updateLoginInTx).toHaveBeenCalledWith(
                tx,
                baseUser.id,
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential,
                requestLog.ipAddress,
                now
            );
            expect(authJwtDomain.createTokens).toHaveBeenCalledWith(
                baseUser,
                {
                    sessionId: 'session-wisteria',
                    jti: 'jti-wisteria',
                    deviceOwnershipId: 'device-ownership-wisteria',
                    loginAt,
                },
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential
            );
            expect(sessionDomain.setLogin).toHaveBeenCalledWith(
                baseUser.id,
                'session-wisteria',
                'jti-wisteria'
            );
            expect(callOrder).toEqual([
                'getRecipient',
                'committed',
                'createTokens',
                'setLogin',
            ]);
        });

        it('revokes the previous sessions of an existing device, returns them to purge, and announces no new device', async () => {
            deviceDomain.upsertForLoginInTx.mockResolvedValue({
                ...upsert,
                isNewDevice: false,
            });
            sessionDomain.revokeByDeviceOwnershipInTx.mockResolvedValue(
                revokedRef
            );

            const result = await domain.createTokenAndSession(
                baseUser,
                device,
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential,
                loginAt
            );

            expect(result).toBe(tokens);
            expect(sessionQueue.purgeLogins).toHaveBeenCalledWith(
                baseUser.id,
                revokedRef
            );
            expect(notificationQueue.sendNewDeviceLogin).not.toHaveBeenCalled();
            expect(
                sessionDomain.revokeByDeviceOwnershipInTx
            ).toHaveBeenCalledWith(
                tx,
                baseUser.id,
                'device-ownership-wisteria',
                baseUser.id,
                now
            );
            expect(
                sessionDomain.revokeByDeviceOwnershipInTx
            ).toHaveBeenCalledBefore(sessionDomain.createInTx);
        });

        it('still enqueues the session purge and the new-device notice when the login cache write rejects', async () => {
            const error = new Error('cache down');
            sessionDomain.setLogin.mockRejectedValue(error);
            deviceDomain.upsertForLoginInTx.mockResolvedValue({
                ...upsert,
                isNewDevice: true,
            });
            sessionDomain.revokeByDeviceOwnershipInTx.mockResolvedValue(
                revokedRef
            );

            await expect(
                domain.createTokenAndSession(
                    baseUser,
                    device,
                    EnumUserLoginFrom.website,
                    EnumUserLoginWith.credential,
                    loginAt
                )
            ).rejects.toBe(error);
            expect(sessionQueue.purgeLogins).toHaveBeenCalledWith(
                baseUser.id,
                []
            );
            expect(notificationQueue.sendNewDeviceLogin).toHaveBeenCalledTimes(
                1
            );
        });

        it('resolves the notification provider from a null platform when the device carries none', async () => {
            await domain.createTokenAndSession(
                baseUser,
                { ...device, platform: null },
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential,
                loginAt
            );

            expect(deviceUtil.resolveNotificationProvider).toHaveBeenCalledWith(
                null
            );
        });

        it('fails the login before the transaction when the recipient read rejects', async () => {
            const error = new Error('recipient-unavailable');
            accountDomain.getNotificationRecipientOfUser.mockRejectedValue(
                error
            );

            const call = domain.createTokenAndSession(
                baseUser,
                device,
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential,
                loginAt
            );

            await expect(call).rejects.toBe(error);
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('throws RequestContextMissingException before any write when the store has no request log', async () => {
            requestStoreService.get.mockReturnValue(null);

            const call = domain.createTokenAndSession(
                baseUser,
                device,
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential,
                loginAt
            );

            await expect(call).rejects.toBeInstanceOf(
                RequestContextMissingException
            );
            await expect(call).rejects.toMatchObject({
                module: 'request',
                statusCode: EnumRequestStatusCodeError.contextMissing,
                messagePath: 'request.error.contextMissing',
            });
            expect(requestStoreService.get).toHaveBeenCalledWith(
                RequestLogStoreKey
            );
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('signs nothing and writes no cache key when the transaction fails', async () => {
            const error = new Error('tx failed');
            databaseService.withTransaction.mockRejectedValue(error);

            await expect(
                domain.createTokenAndSession(
                    baseUser,
                    device,
                    EnumUserLoginFrom.website,
                    EnumUserLoginWith.credential,
                    loginAt
                )
            ).rejects.toBe(error);
            expect(authJwtDomain.createTokens).not.toHaveBeenCalled();
            expect(sessionDomain.setLogin).not.toHaveBeenCalled();
        });
    });

    describe('login', () => {
        it('issues the tokens directly when two-factor is not enabled', async () => {
            const result = await domain.login(
                baseUser,
                device,
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential,
                loginAt
            );

            expect(result).toEqual({
                isTwoFactorEnable: false,
                lastWorkspaceId: baseUser.lastWorkspaceId,
                lastWorkspaceChangedAt: baseUser.lastWorkspaceChangedAt,
                tokens,
            });
            expect(authTwoFactorDomain.createChallenge).not.toHaveBeenCalled();
        });

        it('creates a challenge and issues nothing for an already set-up two-factor user', async () => {
            const user = {
                ...baseUser,
                twoFactor: { ...baseTwoFactor, enabled: true },
            };
            authTwoFactorDomain.createChallenge.mockResolvedValue({
                challengeToken: 'challenge-token',
                expiresInMs: 60000,
            });

            const result = await domain.login(
                user,
                device,
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential,
                loginAt
            );

            expect(result).toEqual({
                isTwoFactorEnable: true,
                lastWorkspaceId: baseUser.lastWorkspaceId,
                lastWorkspaceChangedAt: baseUser.lastWorkspaceChangedAt,
                twoFactor: {
                    isRequiredSetup: false,
                    challengeToken: 'challenge-token',
                    challengeExpiresInMs: 60000,
                    backupCodesRemaining: 1,
                },
            });
            expect(authTwoFactorDomain.createChallenge).toHaveBeenCalledWith({
                userId: user.id,
                device,
                loginFrom: EnumUserLoginFrom.website,
                loginWith: EnumUserLoginWith.credential,
            });
            expect(userTwoFactorDomain.saveSetup).not.toHaveBeenCalled();
            expect(sessionDomain.createInTx).not.toHaveBeenCalled();
        });

        it('creates a challenge and a fresh setup, then stores the secret, when two-factor requires setup', async () => {
            const user = {
                ...baseUser,
                twoFactor: {
                    ...baseTwoFactor,
                    enabled: true,
                    requiredSetup: true,
                },
            };
            authTwoFactorDomain.createChallenge.mockResolvedValue({
                challengeToken: 'challenge-token',
                expiresInMs: 60000,
            });
            authTwoFactorDomain.setupTwoFactor.mockResolvedValue({
                encryptedSecret: 'encrypted-secret',
                otpauthUrl: 'otpauth://totp/secret',
                secret: 'secret',
            });

            const result = await domain.login(
                user,
                device,
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential,
                loginAt
            );

            expect(result).toMatchObject({
                isTwoFactorEnable: true,
                twoFactor: {
                    isRequiredSetup: true,
                    challengeToken: 'challenge-token',
                    challengeExpiresInMs: 60000,
                    backupCodesRemaining: 1,
                    otpauthUrl: 'otpauth://totp/secret',
                    secret: 'secret',
                },
            });
            expect(authTwoFactorDomain.setupTwoFactor).toHaveBeenCalledWith(
                user.id,
                user.email
            );
            expect(userTwoFactorDomain.saveSetup).toHaveBeenCalledWith(
                user.id,
                'encrypted-secret'
            );
        });

        it('writes no secret when the challenge fails during setup', async () => {
            const user = {
                ...baseUser,
                twoFactor: {
                    ...baseTwoFactor,
                    enabled: true,
                    requiredSetup: true,
                },
            };
            authTwoFactorDomain.createChallenge.mockRejectedValue(
                new Error('redis down')
            );
            authTwoFactorDomain.setupTwoFactor.mockResolvedValue({
                encryptedSecret: 'enc',
                otpauthUrl: 'otpauth://x',
                secret: 'secret',
            });

            const call = domain.login(
                user,
                device,
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential,
                loginAt
            );

            await expect(call).rejects.toThrow('redis down');
            expect(userTwoFactorDomain.saveSetup).not.toHaveBeenCalled();
        });
    });

    describe('refresh', () => {
        const payload: IAuthJwtRefreshTokenPayload = {
            loginAt: now,
            userId: 'user-wisteria',
            sessionId: 'session-wisteria',
            deviceOwnershipId: 'device-ownership-wisteria',
            loginFrom: EnumUserLoginFrom.website,
            loginWith: EnumUserLoginWith.credential,
            jti: 'old-jti',
        };
        const session: ISession = {
            id: 'session-wisteria',
            userId: 'user-wisteria',
            deviceOwnershipId: 'device-ownership-wisteria',
            jti: 'old-jti',
            ipAddress: '127.0.0.1',
            userAgent: requestLog.userAgent,
            geoLocation: null,
            expiredAt: new Date('2026-04-01T00:00:00.000Z'),
            revokedAt: null,
            isRevoked: false,
            revokedById: null,
            createdAt: now,
            createdBy: null,
            updatedAt: now,
            updatedBy: null,
            user: {
                id: 'user-wisteria',
                name: 'Wisteria Lark',
                username: 'wisteriaLark',
                photo: null,
                createdAt: now,
                createdBy: null,
                updatedAt: now,
                updatedBy: null,
                deletedAt: null,
                deletedBy: null,
            },
            revokedBy: null,
        };
        const refreshed: IAuthAccessTokenGenerate = {
            tokens,
            jti: 'new-jti',
            sessionId: 'session-wisteria',
        };

        it('rotates the session by compare-and-set, stamps the login, then rotates the cached entry in order', async () => {
            stubAccountRefreshSession(refreshSessionDoubles, {
                payload,
                session,
                refreshed,
            });
            const callOrder: string[] = [];
            sessionDomain.updateJtiInTx.mockImplementation(async () => {
                callOrder.push('updateJtiInTx');
                return true;
            });
            userDomain.updateLoginInTx.mockImplementation(async () => {
                callOrder.push('updateLoginInTx');
                return baseUser;
            });
            sessionDomain.updateLogin.mockImplementation(async () => {
                callOrder.push('updateLogin');
                return EnumSessionCacheUpdate.updated;
            });

            await expect(
                domain.refresh(baseUser, 'refresh-token')
            ).resolves.toEqual({ tokens, revoked: [] });
            expect(sessionDomain.findOneActive).toHaveBeenCalledWith(
                'user-wisteria',
                'session-wisteria'
            );
            expect(sessionDomain.updateJtiInTx).toHaveBeenCalledWith(
                tx,
                'session-wisteria',
                'old-jti',
                'new-jti'
            );
            expect(userDomain.updateLoginInTx).toHaveBeenCalledWith(
                tx,
                'user-wisteria',
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential,
                requestLog.ipAddress,
                now
            );
            expect(sessionDomain.updateLogin).toHaveBeenCalledWith(
                'user-wisteria',
                'session-wisteria',
                'old-jti',
                'new-jti'
            );
            expect(sessionDomain.setLogin).not.toHaveBeenCalled();
            expect(callOrder).toEqual([
                'updateJtiInTx',
                'updateLoginInTx',
                'updateLogin',
            ]);
        });

        it('writes a fresh login entry when the cached one expired with the access token', async () => {
            stubAccountRefreshSession(refreshSessionDoubles, {
                payload,
                session,
                refreshed,
            });
            sessionDomain.updateLogin.mockResolvedValue(
                EnumSessionCacheUpdate.absent
            );

            await expect(
                domain.refresh(baseUser, 'refresh-token')
            ).resolves.toEqual({ tokens, revoked: [] });
            expect(sessionDomain.setLogin).toHaveBeenCalledWith(
                'user-wisteria',
                'session-wisteria',
                'new-jti'
            );
            expect(sessionDomain.revokeOnReuse).not.toHaveBeenCalled();
        });

        it('throws RequestContextMissingException before reading the token when the store has no request log', async () => {
            requestStoreService.get.mockReturnValue(null);

            const call = domain.refresh(baseUser, 'refresh-token');

            await expect(call).rejects.toMatchObject({
                module: 'request',
                statusCode: EnumRequestStatusCodeError.contextMissing,
                messagePath: 'request.error.contextMissing',
            });
            expect(authJwtDomain.payloadToken).not.toHaveBeenCalled();
        });

        it('throws AuthJwtRefreshTokenInvalidException when the token carries no jti', async () => {
            authJwtDomain.payloadToken.mockReturnValue({
                ...payload,
                jti: undefined,
            });

            const call = domain.refresh(baseUser, 'refresh-token');

            await expect(call).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.jwtRefreshTokenInvalid,
                messagePath: 'auth.error.refreshTokenUnauthorized',
            });
            expect(sessionDomain.findOneActive).not.toHaveBeenCalled();
        });

        it('throws SessionRevokedException when the session row is gone, revoking nothing', async () => {
            stubAccountRefreshSession(refreshSessionDoubles, {
                payload,
                session: null,
                refreshed,
            });

            const call = domain.refresh(baseUser, 'refresh-token');

            await expectSessionRevoked(call);
            expect(sessionDomain.updateJtiInTx).not.toHaveBeenCalled();
            expect(sessionDomain.revokeOnReuse).not.toHaveBeenCalled();
        });

        it('revokes the session after the commit and answers no tokens when the jti compare-and-set matches no row', async () => {
            stubAccountRefreshSession(refreshSessionDoubles, {
                payload,
                session,
                refreshed,
            });
            const callOrder: string[] = [];
            sessionDomain.updateJtiInTx.mockResolvedValue(false);
            sessionDomain.revokeOnReuse.mockImplementation(async () => {
                callOrder.push('revokeOnReuse');
                return revokedRef;
            });
            databaseService.withTransaction.mockImplementation(async fn => {
                const result = await fn(tx);
                callOrder.push('committed');

                return result as never;
            });

            await expect(
                domain.refresh(baseUser, 'refresh-token')
            ).resolves.toEqual({ tokens: null, revoked: revokedRef });
            expect(sessionDomain.revokeOnReuse).toHaveBeenCalledWith(
                'user-wisteria',
                'session-wisteria'
            );
            expect(userDomain.updateLoginInTx).not.toHaveBeenCalled();
            expect(sessionDomain.updateLogin).not.toHaveBeenCalled();
            expect(callOrder).toEqual(['committed', 'revokeOnReuse']);
        });

        it('revokes the session and answers no tokens when the cached jti is not the one presented', async () => {
            stubAccountRefreshSession(refreshSessionDoubles, {
                payload,
                session,
                refreshed,
            });
            sessionDomain.updateLogin.mockResolvedValue(
                EnumSessionCacheUpdate.mismatch
            );
            sessionDomain.revokeOnReuse.mockResolvedValue(revokedRef);

            await expect(
                domain.refresh(baseUser, 'refresh-token')
            ).resolves.toEqual({ tokens: null, revoked: revokedRef });
            expect(sessionDomain.revokeOnReuse).toHaveBeenCalledWith(
                'user-wisteria',
                'session-wisteria'
            );
            expect(sessionDomain.setLogin).not.toHaveBeenCalled();
        });

        it('wraps an unknown error raised while rotating the session', async () => {
            stubAccountRefreshSession(refreshSessionDoubles, {
                payload,
                session,
                refreshed,
            });
            const error = new Error('boom');
            databaseService.withTransaction.mockRejectedValueOnce(error);

            const call = domain.refresh(baseUser, 'refresh-token');

            await expect(call).rejects.toMatchObject({
                module: 'app',
                statusCode: EnumAppStatusCodeError.unknown,
                statusCodeKey:
                    EnumAppStatusCodeError[EnumAppStatusCodeError.unknown],
                messagePath: 'http.serverError.internalServerError',
                rawError: error,
            });
        });
    });

    describe('getRefreshedTokens', () => {
        it('returns the tokens of a rotated refresh', () => {
            expect(domain.getRefreshedTokens({ tokens, revoked: [] })).toBe(
                tokens
            );
        });

        it('throws SessionRevokedException for a replayed refresh', () => {
            expect(() =>
                domain.getRefreshedTokens({ tokens: null, revoked: revokedRef })
            ).toThrow(
                expect.objectContaining({
                    module: 'session',
                    messagePath: 'session.error.revoked',
                })
            );
        });
    });

    describe('logout', () => {
        it('revokes the session and clears the device notification on one transaction, then answers the ref to purge', async () => {
            await expect(
                domain.logout(
                    'user-wisteria',
                    'session-wisteria',
                    'device-ownership-wisteria'
                )
            ).resolves.toEqual([{ id: 'session-wisteria' }]);

            expect(sessionDomain.validateActive).toHaveBeenCalledWith(
                'user-wisteria',
                'session-wisteria'
            );
            expect(sessionDomain.revokeInTx).toHaveBeenCalledWith(
                tx,
                'user-wisteria',
                'session-wisteria',
                'user-wisteria',
                now
            );
            expect(deviceDomain.clearNotificationInTx).toHaveBeenCalledWith(
                tx,
                'user-wisteria',
                'device-ownership-wisteria',
                'user-wisteria',
                now
            );
            expect(sessionDomain.revokeInTx).toHaveBeenCalledBefore(
                deviceDomain.clearNotificationInTx
            );
        });

        it('rethrows the not-active gate of the session', async () => {
            const error = new SessionNotFoundException();
            sessionDomain.validateActive.mockRejectedValue(error);

            await expect(
                domain.logout('user-wisteria', 'session-wisteria', 'device')
            ).rejects.toBe(error);
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('wraps an unknown error raised while logging out', async () => {
            const error = new Error('boom');
            databaseService.withTransaction.mockRejectedValue(error);

            await expect(
                domain.logout('user-wisteria', 'session-wisteria', 'device')
            ).rejects.toMatchObject({
                module: 'app',
                statusCode: EnumAppStatusCodeError.unknown,
                rawError: error,
            });
        });
    });
});
