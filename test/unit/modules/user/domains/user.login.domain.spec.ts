import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
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
import { EnumAppStatusCodeError } from '@app/enums/app.status-code.enum';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import { RequestLogStoreKey } from '@common/request/constants/request.constant';
import { EnumRequestStatusCodeError } from '@common/request/enums/request.status-code.enum';
import { RequestContextMissingException } from '@common/request/exceptions/request.context-missing.exception';
import type { IRequestLog } from '@common/request/interfaces/request.interface';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { IActivityLogStagedEvent } from '@modules/activity-log/interfaces/activity-log.interface';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import { EnumAuthTwoFactorMethod } from '@modules/auth/enums/auth.enum';
import { EnumAuthStatusCodeError } from '@modules/auth/enums/auth.status-code.enum';
import type {
    IAuthJwtRefreshTokenPayload,
    IAuthRefreshTokenGenerate,
    IAuthToken,
    IAuthTwoFactorVerifyResult,
} from '@modules/auth/interfaces/auth.interface';
import { AuthCache } from '@modules/auth/caches/auth.cache';
import { AuthTwoFactorDomain } from '@modules/auth/domains/auth.two-factor.domain';
import { AuthJwtDomain } from '@modules/auth/domains/auth.jwt.domain';
import type { IDeviceIdentity } from '@modules/device/interfaces/device.interface';
import { DeviceDomain } from '@modules/device/domains/device.domain';
import { DeviceUtil } from '@modules/device/utils/device.util';
import { FeatureFlagDomain } from '@modules/feature-flag/domains/feature-flag.domain';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { SessionDomain } from '@modules/session/domains/session.domain';
import { SessionCache } from '@modules/session/caches/session.cache';
import type { ISessionCache } from '@modules/session/interfaces/session.interface';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import type { IUser } from '@modules/user/interfaces/user.interface';
import { UserRepository } from '@modules/user/repositories/user.repository';
import { UserTwoFactorRepository } from '@modules/user/repositories/user.two-factor.repository';
import { UserVerificationDomain } from '@modules/user/domains/user.verification.domain';
import { UserLoginDomain } from '@modules/user/domains/user.login.domain';
import { UserUtil } from '@modules/user/utils/user.util';
import { stubUserRefreshSession } from '@test/unit/helpers/test.unit.user.helper';
import type { IUserRefreshSessionDoubles } from '@test/unit/helpers/test.unit.user.helper';

describe('UserLoginDomain', () => {
    const userRepository: MockProxy<UserRepository> = mock<UserRepository>();
    const userTwoFactorRepository: MockProxy<UserTwoFactorRepository> =
        mock<UserTwoFactorRepository>();
    const userUtil: MockProxy<UserUtil> = mock<UserUtil>();
    const userVerificationDomain: MockProxy<UserVerificationDomain> =
        mock<UserVerificationDomain>();
    const deviceDomain: MockProxy<DeviceDomain> = mock<DeviceDomain>();
    const deviceUtil: MockProxy<DeviceUtil> = mock<DeviceUtil>();
    const activityLogDomain: MockProxy<ActivityLogDomain> =
        mock<ActivityLogDomain>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const authJwtDomain: MockProxy<AuthJwtDomain> = mock<AuthJwtDomain>();
    const authTwoFactorDomain: MockProxy<AuthTwoFactorDomain> =
        mock<AuthTwoFactorDomain>();
    const authCache: MockProxy<AuthCache> = mock<AuthCache>();
    const sessionCache: MockProxy<SessionCache> = mock<SessionCache>();
    const sessionDomain: MockProxy<SessionDomain> = mock<SessionDomain>();
    const notificationQueue: MockProxy<NotificationQueue> =
        mock<NotificationQueue>();
    const featureFlagDomain: MockProxy<FeatureFlagDomain> =
        mock<FeatureFlagDomain>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const helperHashService: MockProxy<HelperHashService> =
        mock<HelperHashService>();
    const refreshSessionDoubles: IUserRefreshSessionDoubles = {
        authJwtDomain,
        sessionCache,
        helperHashService,
    };
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();

    let domain: UserLoginDomain;

    const tx = {} as IDatabaseTransactionClient;
    const now = new Date('2026-03-01T00:00:00.000Z');
    const event: IActivityLogStagedEvent = {
        action: EnumActivityLogAction.userLoginCredential,
        metadata: {},
        onError: false,
        userId: null,
        createdBy: null,
        workspaceId: null,
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
        lastWorkspaceId: null,
        lastWorkspaceChangedAt: null,
        termPolicy: {
            termsOfService: true,
            privacy: true,
            marketing: false,
            cookies: false,
        },
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

    beforeEach(async () => {
        vi.resetAllMocks();

        activityLogDomain.prepare.mockReturnValue(event);
        databaseService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );
        helperDateService.create.mockReturnValue(now);
        helperDateService.forward.mockImplementation(date => date);
        requestStoreService.get.mockReturnValue(requestLog);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserLoginDomain,
                { provide: UserRepository, useValue: userRepository },
                {
                    provide: UserTwoFactorRepository,
                    useValue: userTwoFactorRepository,
                },
                { provide: UserUtil, useValue: userUtil },
                {
                    provide: UserVerificationDomain,
                    useValue: userVerificationDomain,
                },
                { provide: DeviceDomain, useValue: deviceDomain },
                { provide: DeviceUtil, useValue: deviceUtil },
                { provide: ActivityLogDomain, useValue: activityLogDomain },
                { provide: DatabaseService, useValue: databaseService },
                { provide: AuthJwtDomain, useValue: authJwtDomain },
                {
                    provide: AuthTwoFactorDomain,
                    useValue: authTwoFactorDomain,
                },
                { provide: AuthCache, useValue: authCache },
                { provide: SessionCache, useValue: sessionCache },
                { provide: SessionDomain, useValue: sessionDomain },
                { provide: NotificationQueue, useValue: notificationQueue },
                { provide: FeatureFlagDomain, useValue: featureFlagDomain },
                { provide: HelperDateService, useValue: helperDateService },
                { provide: HelperHashService, useValue: helperHashService },
                {
                    provide: RequestStoreService,
                    useValue: requestStoreService,
                },
            ],
        }).compile();
        domain = module.get(UserLoginDomain);
    });

    describe('assertWorkspaceInvitationAllowed', () => {
        it('delegates to the feature-flag domain', async () => {
            await domain.assertWorkspaceInvitationAllowed();

            expect(
                featureFlagDomain.validateFeatureFlagMetadata
            ).toHaveBeenCalledWith('workspace', 'invitationAllowed');
        });
    });

    describe('recordLoginFailed', () => {
        it('increases the password attempt and stages an on-error activity event', async () => {
            await domain.recordLoginFailed('user-wisteria');

            expect(activityLogDomain.prepare).toHaveBeenCalledWith(
                expect.objectContaining({
                    action: EnumActivityLogAction.userLoginFailed,
                    userId: 'user-wisteria',
                    createdBy: 'user-wisteria',
                    onError: true,
                })
            );
            expect(userRepository.increasePasswordAttempt).toHaveBeenCalledWith(
                'user-wisteria'
            );
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                event,
            ]);
        });
    });

    describe('createTokenAndSession', () => {
        const loginAt = new Date('2026-01-01T00:05:00.000Z');

        beforeEach(() => {
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
        });

        it('creates a session for a new device, notifies of the new login, and stages the event in order', async () => {
            userUtil.resolveLoginActivityLogAction.mockReturnValue(
                EnumActivityLogAction.userLoginCredential
            );
            const callOrder: string[] = [];
            databaseService.withTransaction.mockImplementation(async fn => {
                const result = await fn(tx);
                callOrder.push('committed');

                return result as never;
            });
            authJwtDomain.createTokens.mockImplementation(() => {
                callOrder.push('createTokens');

                return tokens;
            });
            sessionCache.setLogin.mockImplementation(async () => {
                callOrder.push('setLogin');
            });
            notificationQueue.sendNewDeviceLogin.mockImplementation(
                async () => {
                    callOrder.push('sendNewDeviceLogin');
                }
            );
            activityLogDomain.stagePrepared.mockImplementation(() => {
                callOrder.push('stagePrepared');
            });
            deviceUtil.resolveNotificationProvider.mockReturnValue(null);
            deviceDomain.upsertForLoginInTx.mockResolvedValue({
                device: {
                    id: 'device-wisteria',
                    fingerprint: device.fingerprint,
                    name: null,
                    platform: EnumDevicePlatform.android,
                    lastActiveAt: now,
                    notificationToken: null,
                    notificationProvider: null,
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
            });

            const user = baseUser;
            const result = await domain.createTokenAndSession(
                user,
                device,
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential,
                loginAt
            );

            expect(result).toBe(tokens);
            expect(authJwtDomain.createTokens).toHaveBeenCalledWith(
                user,
                {
                    sessionId: 'session-wisteria',
                    jti: 'jti-wisteria',
                    deviceOwnershipId: 'device-ownership-wisteria',
                    loginAt,
                },
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential
            );
            expect(helperDateService.forward).toHaveBeenCalledWith(
                loginAt,
                expect.anything()
            );
            expect(userRepository.updateLoginInTx).toHaveBeenCalledWith(
                tx,
                user.id,
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential,
                requestLog.ipAddress,
                now
            );
            expect(requestStoreService.get).toHaveBeenCalledWith(
                RequestLogStoreKey
            );
            expect(
                sessionDomain.revokeByDeviceOwnershipInTx
            ).not.toHaveBeenCalled();
            expect(sessionDomain.createInTx).toHaveBeenCalledWith(
                tx,
                user.id,
                'session-wisteria',
                'device-ownership-wisteria',
                'jti-wisteria',
                loginAt,
                requestLog
            );
            expect(sessionCache.setLogin).toHaveBeenCalledWith(
                user.id,
                'session-wisteria',
                'jti-wisteria',
                loginAt
            );
            expect(sessionDomain.purgeRevokedLogins).not.toHaveBeenCalled();
            expect(notificationQueue.sendNewDeviceLogin).toHaveBeenCalledWith(
                user.id,
                expect.objectContaining({ requestLog })
            );
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userLoginCredential,
                userId: user.id,
                createdBy: user.id,
            });
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                event,
            ]);
            expect(callOrder).toEqual([
                'committed',
                'createTokens',
                'setLogin',
                'sendNewDeviceLogin',
                'stagePrepared',
            ]);
        });

        it('revokes the previous session and purges it for an existing device with no new-device notice', async () => {
            deviceUtil.resolveNotificationProvider.mockReturnValue(null);
            deviceDomain.upsertForLoginInTx.mockResolvedValue({
                device: {
                    id: 'device-wisteria',
                    fingerprint: device.fingerprint,
                    name: null,
                    platform: EnumDevicePlatform.android,
                    lastActiveAt: now,
                    notificationToken: null,
                    notificationProvider: null,
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
                    biometricEnabled: false,
                    biometricToken: null,
                    biometricType: null,
                    biometricEnabledAt: null,
                    createdAt: now,
                    createdBy: null,
                    updatedAt: now,
                    updatedBy: null,
                },
                isNewDevice: false,
            });
            sessionDomain.revokeByDeviceOwnershipInTx.mockResolvedValue([
                { id: 'session-old' },
            ]);

            const user = baseUser;
            await domain.createTokenAndSession(
                user,
                device,
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential,
                now
            );

            expect(
                sessionDomain.revokeByDeviceOwnershipInTx
            ).toHaveBeenCalledWith(
                tx,
                user.id,
                'device-ownership-wisteria',
                user.id,
                now
            );
            expect(sessionDomain.purgeRevokedLogins).toHaveBeenCalledWith(
                user.id,
                [{ id: 'session-old' }]
            );
            expect(notificationQueue.sendNewDeviceLogin).not.toHaveBeenCalled();
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                event,
            ]);
        });

        it('skips the purge for an existing device with no revoked session', async () => {
            deviceUtil.resolveNotificationProvider.mockReturnValue(null);
            deviceDomain.upsertForLoginInTx.mockResolvedValue({
                device: {
                    id: 'device-wisteria',
                    fingerprint: device.fingerprint,
                    name: null,
                    platform: EnumDevicePlatform.android,
                    lastActiveAt: now,
                    notificationToken: null,
                    notificationProvider: null,
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
                    biometricEnabled: false,
                    biometricToken: null,
                    biometricType: null,
                    biometricEnabledAt: null,
                    createdAt: now,
                    createdBy: null,
                    updatedAt: now,
                    updatedBy: null,
                },
                isNewDevice: false,
            });
            sessionDomain.revokeByDeviceOwnershipInTx.mockResolvedValue([]);

            const user = baseUser;
            await domain.createTokenAndSession(
                user,
                device,
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential,
                now
            );

            expect(sessionDomain.purgeRevokedLogins).not.toHaveBeenCalled();
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                event,
            ]);
        });

        it('resolves the notification provider from a null platform when the device carries none', async () => {
            deviceUtil.resolveNotificationProvider.mockReturnValue(null);
            deviceDomain.upsertForLoginInTx.mockResolvedValue({
                device: {
                    id: 'device-wisteria',
                    fingerprint: device.fingerprint,
                    name: null,
                    platform: EnumDevicePlatform.android,
                    lastActiveAt: now,
                    notificationToken: null,
                    notificationProvider: null,
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
            });

            const user = baseUser;
            const deviceWithoutPlatform: IDeviceIdentity = {
                fingerprint: 'device-wisteria',
                name: null,
                platform: null,
                notificationToken: null,
            };
            await domain.createTokenAndSession(
                user,
                deviceWithoutPlatform,
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential,
                now
            );

            expect(deviceUtil.resolveNotificationProvider).toHaveBeenCalledWith(
                null
            );
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                event,
            ]);
        });

        it('signs and persists the existing ownership id for a repeat device', async () => {
            deviceUtil.resolveNotificationProvider.mockReturnValue(null);
            deviceDomain.upsertForLoginInTx.mockResolvedValue({
                device: {
                    id: 'device-wisteria',
                    fingerprint: device.fingerprint,
                    name: null,
                    platform: EnumDevicePlatform.android,
                    lastActiveAt: now,
                    notificationToken: null,
                    notificationProvider: null,
                    createdAt: now,
                    createdBy: null,
                    updatedAt: now,
                    updatedBy: null,
                },
                deviceOwnership: {
                    id: 'device-ownership-existing',
                    deviceId: 'device-wisteria',
                    userId: 'user-wisteria',
                    revokedAt: null,
                    isRevoked: false,
                    revokedById: null,
                    lastActiveAt: now,
                    biometricEnabled: false,
                    biometricToken: null,
                    biometricType: null,
                    biometricEnabledAt: null,
                    createdAt: now,
                    createdBy: null,
                    updatedAt: now,
                    updatedBy: null,
                },
                isNewDevice: false,
            });
            sessionDomain.revokeByDeviceOwnershipInTx.mockResolvedValue([]);

            const user = baseUser;
            await domain.createTokenAndSession(
                user,
                device,
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential,
                loginAt
            );

            expect(authJwtDomain.createTokens).toHaveBeenCalledWith(
                user,
                expect.objectContaining({
                    deviceOwnershipId: 'device-ownership-existing',
                }),
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential
            );
            expect(sessionDomain.createInTx).toHaveBeenCalledWith(
                tx,
                user.id,
                'session-wisteria',
                'device-ownership-existing',
                'jti-wisteria',
                loginAt,
                requestLog
            );
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
                statusCodeKey:
                    EnumRequestStatusCodeError[
                        EnumRequestStatusCodeError.contextMissing
                    ],
                messagePath: 'request.error.contextMissing',
            });
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
            expect(authJwtDomain.createTokens).not.toHaveBeenCalled();
        });

        it('signs nothing and writes no cache key when the transaction fails', async () => {
            databaseService.withTransaction.mockRejectedValue(
                new Error('tx failed')
            );

            const call = domain.createTokenAndSession(
                baseUser,
                device,
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential,
                loginAt
            );

            await expect(call).rejects.toThrow('tx failed');
            expect(authJwtDomain.createTokens).not.toHaveBeenCalled();
            expect(sessionCache.setLogin).not.toHaveBeenCalled();
        });
    });

    describe('handleLogin', () => {
        it('requests a fresh verification and throws UserEmailNotVerifiedException for an unverified user', async () => {
            const user = { ...baseUser, isVerified: false };
            userVerificationDomain.verificationCreateVerification.mockReturnValue(
                {
                    type: 'email',
                    expiredAt: new Date('2026-03-05T00:00:00.000Z'),
                    expiredInMinutes: 15,
                    resendInMinutes: 5,
                    reference: 'VRF-wisteria',
                    token: 'raw-token',
                    hashedToken: 'hashed-token',
                    link: 'https://example.com/verify?token=raw-token',
                }
            );
            helperDateService.formatToIso.mockReturnValue(
                '2026-03-05T00:00:00.000Z'
            );

            const call = domain.handleLogin(
                user,
                device,
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential,
                now
            );

            await expect(call).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.emailNotVerified,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.emailNotVerified
                    ],
                messagePath: 'user.error.emailNotVerified',
            });
            expect(
                userVerificationDomain.persistVerificationEmail
            ).toHaveBeenCalledWith(
                user.id,
                user.email,
                expect.objectContaining({ reference: 'VRF-wisteria' })
            );
            expect(notificationQueue.sendVerificationEmail).toHaveBeenCalled();
        });

        it('logs the user in directly when two-factor is not enabled', async () => {
            const user = {
                ...baseUser,
                twoFactor: { ...baseTwoFactor, enabled: false },
            };
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
            deviceDomain.upsertForLoginInTx.mockResolvedValue({
                device: {
                    id: 'device-wisteria',
                    fingerprint: device.fingerprint,
                    name: null,
                    platform: EnumDevicePlatform.android,
                    lastActiveAt: now,
                    notificationToken: null,
                    notificationProvider: null,
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
            });

            const result = await domain.handleLogin(
                user,
                device,
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential,
                now
            );

            expect(result).toEqual({
                isTwoFactorEnable: false,
                lastWorkspaceId: user.lastWorkspaceId,
                lastWorkspaceChangedAt: user.lastWorkspaceChangedAt,
                tokens,
            });
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                event,
            ]);
        });

        it('creates a challenge, a fresh setup, and stages the event in order when two-factor requires it', async () => {
            const user = {
                ...baseUser,
                twoFactor: {
                    ...baseTwoFactor,
                    enabled: true,
                    requiredSetup: true,
                },
            };
            authCache.createChallenge.mockResolvedValue({
                challengeToken: 'challenge-token',
                expiresInMs: 60000,
            });
            authTwoFactorDomain.setupTwoFactor.mockResolvedValue({
                encryptedSecret: 'encrypted-secret',
                otpauthUrl: 'otpauth://totp/secret',
                secret: 'secret',
            });
            const stagedEvent: IActivityLogStagedEvent = {
                action: EnumActivityLogAction.userSetupTwoFactor,
                metadata: {},
                onError: false,
                userId: null,
                createdBy: null,
                workspaceId: null,
            };
            activityLogDomain.prepare.mockReturnValue(stagedEvent);
            const callOrder: string[] = [];
            userTwoFactorRepository.setupTwoFactor.mockImplementation(
                async () => {
                    callOrder.push('setupTwoFactor');
                    return {
                        ...baseTwoFactor,
                        enabled: true,
                        requiredSetup: false,
                    };
                }
            );
            activityLogDomain.stagePrepared.mockImplementation(() => {
                callOrder.push('stagePrepared');
            });

            const result = await domain.handleLogin(
                user,
                device,
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential,
                now
            );

            expect(result).toMatchObject({
                isTwoFactorEnable: true,
                twoFactor: {
                    isRequiredSetup: true,
                    challengeToken: 'challenge-token',
                    challengeExpiresInMs: 60000,
                    otpauthUrl: 'otpauth://totp/secret',
                    secret: 'secret',
                },
            });
            expect(userTwoFactorRepository.setupTwoFactor).toHaveBeenCalledWith(
                user.id,
                'encrypted-secret'
            );
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userSetupTwoFactor,
                userId: user.id,
                createdBy: user.id,
            });
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                stagedEvent,
            ]);
            expect(callOrder).toEqual(['setupTwoFactor', 'stagePrepared']);
        });

        it('writes no secret and stages nothing when the challenge fails during setup', async () => {
            const user = {
                ...baseUser,
                twoFactor: {
                    ...baseTwoFactor,
                    enabled: true,
                    requiredSetup: true,
                },
            };
            authCache.createChallenge.mockRejectedValue(
                new Error('redis down')
            );
            authTwoFactorDomain.setupTwoFactor.mockResolvedValue({
                encryptedSecret: 'enc',
                otpauthUrl: 'otpauth://x',
                secret: 'secret',
            });

            const call = domain.handleLogin(
                user,
                device,
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential,
                now
            );

            await expect(call).rejects.toThrow('redis down');
            expect(authTwoFactorDomain.setupTwoFactor).toHaveBeenCalled();
            expect(
                userTwoFactorRepository.setupTwoFactor
            ).not.toHaveBeenCalled();
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
        });

        it('creates a challenge for an already set-up two-factor user', async () => {
            const user = {
                ...baseUser,
                twoFactor: {
                    ...baseTwoFactor,
                    enabled: true,
                    requiredSetup: false,
                },
            };
            authCache.createChallenge.mockResolvedValue({
                challengeToken: 'challenge-token',
                expiresInMs: 60000,
            });

            const result = await domain.handleLogin(
                user,
                device,
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential,
                now
            );

            expect(result).toMatchObject({
                isTwoFactorEnable: true,
                twoFactor: {
                    isRequiredSetup: false,
                    challengeToken: 'challenge-token',
                    challengeExpiresInMs: 60000,
                },
            });
            expect(
                userTwoFactorRepository.setupTwoFactor
            ).not.toHaveBeenCalled();
        });
    });

    describe('handleTwoFactorValidation', () => {
        it('returns the verification result on a valid code', async () => {
            const user = baseUser;
            authCache.getLockTwoFactorAttempt.mockResolvedValue(0);
            const verified: IAuthTwoFactorVerifyResult = {
                isValid: true,
                method: EnumAuthTwoFactorMethod.code,
                newBackupCodes: null,
            };
            authTwoFactorDomain.verifyTwoFactor.mockResolvedValue(verified);

            await expect(
                domain.handleTwoFactorValidation(user, {
                    method: EnumAuthTwoFactorMethod.code,
                    code: '123456',
                    backupCode: null,
                })
            ).resolves.toBe(verified);
            expect(
                userTwoFactorRepository.resetTwoFactorAttempt
            ).toHaveBeenCalledWith(user.id);
        });

        it('throws AuthTwoFactorAttemptTemporaryLockException while locked', async () => {
            const user = baseUser;
            authCache.getLockTwoFactorAttempt.mockResolvedValue(29001);

            const call = domain.handleTwoFactorValidation(user, {
                method: EnumAuthTwoFactorMethod.code,
                code: '123456',
                backupCode: null,
            });

            await expect(call).rejects.toMatchObject({
                module: 'auth',
                statusCode:
                    EnumAuthStatusCodeError.twoFactorAttemptTemporaryLock,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.twoFactorAttemptTemporaryLock
                    ],
                messagePath: 'auth.error.twoFactorAttemptTemporaryLock',
                messageProperties: { retryAfterSeconds: 30 },
            });
        });

        it('throws AuthTwoFactorMethodRequiredException when no method is given', async () => {
            const user = baseUser;
            authCache.getLockTwoFactorAttempt.mockResolvedValue(0);

            const call = domain.handleTwoFactorValidation(user, {
                method: null,
                code: null,
                backupCode: null,
            });

            await expect(call).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.twoFactorMethodRequired,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.twoFactorMethodRequired
                    ],
                messagePath: 'auth.error.twoFactorMethodRequired',
            });
        });

        it('records a failure and locks after too many wrong attempts', async () => {
            const user = { ...baseUser };
            authCache.getLockTwoFactorAttempt.mockResolvedValue(0);
            authTwoFactorDomain.verifyTwoFactor.mockResolvedValue({
                isValid: false,
                method: EnumAuthTwoFactorMethod.code,
                newBackupCodes: null,
            });
            userTwoFactorRepository.increaseTwoFactorAttempt.mockResolvedValue({
                ...baseTwoFactor,
                attempt: 5,
            });
            authTwoFactorDomain.checkAttempt.mockReturnValue(true);

            const call = domain.handleTwoFactorValidation(user, {
                method: EnumAuthTwoFactorMethod.code,
                code: '000000',
                backupCode: null,
            });

            await expect(call).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.twoFactorInvalid,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.twoFactorInvalid
                    ],
                messagePath: 'auth.error.twoFactorInvalid',
            });
            expect(authCache.lockTwoFactorAttempt).toHaveBeenCalledWith(user);
        });

        it('records a failure without locking when under the attempt limit', async () => {
            const user = { ...baseUser };
            authCache.getLockTwoFactorAttempt.mockResolvedValue(0);
            authTwoFactorDomain.verifyTwoFactor.mockResolvedValue({
                isValid: false,
                method: EnumAuthTwoFactorMethod.code,
                newBackupCodes: null,
            });
            userTwoFactorRepository.increaseTwoFactorAttempt.mockResolvedValue({
                ...baseTwoFactor,
                attempt: 1,
            });
            authTwoFactorDomain.checkAttempt.mockReturnValue(false);

            const call = domain.handleTwoFactorValidation(user, {
                method: EnumAuthTwoFactorMethod.code,
                code: '000000',
                backupCode: null,
            });

            await expect(call).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.twoFactorInvalid,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.twoFactorInvalid
                    ],
                messagePath: 'auth.error.twoFactorInvalid',
            });
            expect(authCache.lockTwoFactorAttempt).not.toHaveBeenCalled();
        });
    });

    describe('handleTwoFactorSetupValidation', () => {
        it('resets the attempt counter on a valid code', async () => {
            const user = baseUser;
            authCache.getLockTwoFactorAttempt.mockResolvedValue(0);
            authTwoFactorDomain.verifySetupCode.mockReturnValue(true);

            await domain.handleTwoFactorSetupValidation(
                user,
                'encrypted-pending',
                '123456'
            );

            expect(
                userTwoFactorRepository.resetTwoFactorAttempt
            ).toHaveBeenCalledWith(user.id);
        });

        it('throws AuthTwoFactorInvalidException and records the failure on an invalid code', async () => {
            const user = { ...baseUser };
            authCache.getLockTwoFactorAttempt.mockResolvedValue(0);
            authTwoFactorDomain.verifySetupCode.mockReturnValue(false);
            userTwoFactorRepository.increaseTwoFactorAttempt.mockResolvedValue({
                ...baseTwoFactor,
                attempt: 1,
            });
            authTwoFactorDomain.checkAttempt.mockReturnValue(false);

            const call = domain.handleTwoFactorSetupValidation(
                user,
                'encrypted-pending',
                '000000'
            );

            await expect(call).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.twoFactorInvalid,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.twoFactorInvalid
                    ],
                messagePath: 'auth.error.twoFactorInvalid',
            });
        });
    });

    describe('recordTwoFactorVerificationInTx', () => {
        it('resolves when the verification is recorded', async () => {
            const user = baseUser;
            const verified: IAuthTwoFactorVerifyResult = {
                isValid: true,
                method: EnumAuthTwoFactorMethod.code,
                newBackupCodes: null,
            };
            userTwoFactorRepository.verifyTwoFactorInTx.mockResolvedValue(true);

            await domain.recordTwoFactorVerificationInTx(tx, user, verified);

            expect(
                userTwoFactorRepository.verifyTwoFactorInTx
            ).toHaveBeenCalledWith(
                tx,
                user.id,
                verified,
                user.twoFactor!.backupCodes
            );
        });

        it('throws AuthTwoFactorInvalidException when the stored codes moved on', async () => {
            const user = baseUser;
            const verified: IAuthTwoFactorVerifyResult = {
                isValid: true,
                method: EnumAuthTwoFactorMethod.code,
                newBackupCodes: null,
            };
            userTwoFactorRepository.verifyTwoFactorInTx.mockResolvedValue(
                false
            );

            const call = domain.recordTwoFactorVerificationInTx(
                tx,
                user,
                verified
            );

            await expect(call).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.twoFactorInvalid,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.twoFactorInvalid
                    ],
                messagePath: 'auth.error.twoFactorInvalid',
            });
        });

        it('falls back to an empty backup-code list when the user carries no two-factor row', async () => {
            const user = { ...baseUser, twoFactor: null };
            const verified: IAuthTwoFactorVerifyResult = {
                isValid: true,
                method: EnumAuthTwoFactorMethod.code,
                newBackupCodes: null,
            };
            userTwoFactorRepository.verifyTwoFactorInTx.mockResolvedValue(true);

            await domain.recordTwoFactorVerificationInTx(tx, user, verified);

            expect(
                userTwoFactorRepository.verifyTwoFactorInTx
            ).toHaveBeenCalledWith(tx, user.id, verified, []);
        });
    });

    describe('recordTwoFactorVerification', () => {
        it('resolves when the verification is recorded', async () => {
            const user = baseUser;
            const verified: IAuthTwoFactorVerifyResult = {
                isValid: true,
                method: EnumAuthTwoFactorMethod.code,
                newBackupCodes: null,
            };
            userTwoFactorRepository.verifyTwoFactor.mockResolvedValue(true);

            await domain.recordTwoFactorVerification(user, verified);

            expect(
                userTwoFactorRepository.verifyTwoFactor
            ).toHaveBeenCalledWith(
                user.id,
                verified,
                user.twoFactor!.backupCodes
            );
        });

        it('throws AuthTwoFactorInvalidException when the stored codes moved on', async () => {
            const user = baseUser;
            const verified: IAuthTwoFactorVerifyResult = {
                isValid: true,
                method: EnumAuthTwoFactorMethod.code,
                newBackupCodes: null,
            };
            userTwoFactorRepository.verifyTwoFactor.mockResolvedValue(false);

            const call = domain.recordTwoFactorVerification(user, verified);

            await expect(call).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.twoFactorInvalid,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.twoFactorInvalid
                    ],
                messagePath: 'auth.error.twoFactorInvalid',
            });
        });

        it('falls back to an empty backup-code list when the user carries no two-factor row', async () => {
            const user = { ...baseUser, twoFactor: null };
            const verified: IAuthTwoFactorVerifyResult = {
                isValid: true,
                method: EnumAuthTwoFactorMethod.code,
                newBackupCodes: null,
            };
            userTwoFactorRepository.verifyTwoFactor.mockResolvedValue(true);

            await domain.recordTwoFactorVerification(user, verified);

            expect(
                userTwoFactorRepository.verifyTwoFactor
            ).toHaveBeenCalledWith(user.id, verified, []);
        });
    });

    describe('refreshSession', () => {
        const payload: IAuthJwtRefreshTokenPayload = {
            loginAt: now,
            userId: 'user-wisteria',
            sessionId: 'session-wisteria',
            deviceOwnershipId: 'device-ownership-wisteria',
            loginFrom: EnumUserLoginFrom.website,
            loginWith: EnumUserLoginWith.credential,
            jti: 'old-jti',
        };
        const session: ISessionCache = {
            userId: 'user-wisteria',
            sessionId: 'session-wisteria',
            expiredAt: now,
            jti: 'session-jti',
        };
        const refreshed: IAuthRefreshTokenGenerate = {
            tokens,
            jti: 'new-jti',
            sessionId: 'session-wisteria',
            expiredInMs: 2592000000,
        };

        it('rotates the session, returns fresh tokens, and stages the event in order', async () => {
            stubUserRefreshSession(refreshSessionDoubles, {
                payload,
                session,
                refreshed,
            });
            const user = baseUser;
            const callOrder: string[] = [];
            userRepository.updateLoginInTx.mockImplementation(async () => {
                callOrder.push('updateLoginInTx');
                return undefined as never;
            });
            sessionCache.updateLogin.mockImplementation(async () => {
                callOrder.push('updateLogin');
                return true;
            });
            activityLogDomain.stagePrepared.mockImplementation(() => {
                callOrder.push('stagePrepared');
            });

            await expect(
                domain.refreshSession(user, 'refresh-token')
            ).resolves.toBe(tokens);
            expect(sessionDomain.updateJtiInTx).toHaveBeenCalledWith(
                tx,
                'session-wisteria',
                'new-jti'
            );
            expect(userRepository.updateLoginInTx).toHaveBeenCalledWith(
                tx,
                'user-wisteria',
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential,
                requestLog.ipAddress,
                now
            );
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userRefreshToken,
            });
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                event,
            ]);
            expect(callOrder).toEqual([
                'updateLoginInTx',
                'updateLogin',
                'stagePrepared',
            ]);
        });

        it('throws RequestContextMissingException before reading the token when the store has no request log', async () => {
            requestStoreService.get.mockReturnValue(null);

            const call = domain.refreshSession(baseUser, 'refresh-token');

            await expect(call).rejects.toBeInstanceOf(
                RequestContextMissingException
            );
            await expect(call).rejects.toMatchObject({
                module: 'request',
                statusCode: EnumRequestStatusCodeError.contextMissing,
                statusCodeKey:
                    EnumRequestStatusCodeError[
                        EnumRequestStatusCodeError.contextMissing
                    ],
                messagePath: 'request.error.contextMissing',
            });
            expect(authJwtDomain.payloadToken).not.toHaveBeenCalled();
            expect(sessionCache.getLogin).not.toHaveBeenCalled();
        });

        it('throws AuthJwtRefreshTokenInvalidException when there is no cached session', async () => {
            authJwtDomain.payloadToken.mockReturnValue(payload);
            sessionCache.getLogin.mockResolvedValue(null);

            const call = domain.refreshSession(baseUser, 'refresh-token');

            await expect(call).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.jwtRefreshTokenInvalid,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.jwtRefreshTokenInvalid
                    ],
                messagePath: 'auth.error.refreshTokenUnauthorized',
            });
        });

        it('throws AuthJwtRefreshTokenInvalidException when the token carries no jti', async () => {
            authJwtDomain.payloadToken.mockReturnValue({
                ...payload,
                jti: undefined,
            });
            sessionCache.getLogin.mockResolvedValue(session);

            const call = domain.refreshSession(baseUser, 'refresh-token');

            await expect(call).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.jwtRefreshTokenInvalid,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.jwtRefreshTokenInvalid
                    ],
                messagePath: 'auth.error.refreshTokenUnauthorized',
            });
        });

        it('throws AuthJwtRefreshTokenInvalidException when the jti does not match', async () => {
            authJwtDomain.payloadToken.mockReturnValue(payload);
            sessionCache.getLogin.mockResolvedValue(session);
            helperHashService.sha256Hash.mockImplementation(
                value => `hash(${value})`
            );
            helperHashService.sha256Compare.mockReturnValue(false);

            const call = domain.refreshSession(baseUser, 'refresh-token');

            await expect(call).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.jwtRefreshTokenInvalid,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.jwtRefreshTokenInvalid
                    ],
                messagePath: 'auth.error.refreshTokenUnauthorized',
            });
        });

        it('rethrows an AppBaseException raised while rotating the session', async () => {
            stubUserRefreshSession(refreshSessionDoubles, {
                payload,
                session,
                refreshed,
            });
            sessionCache.updateLogin.mockResolvedValue(false);

            const call = domain.refreshSession(baseUser, 'refresh-token');

            await expect(call).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.jwtRefreshTokenInvalid,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.jwtRefreshTokenInvalid
                    ],
                messagePath: 'auth.error.refreshTokenUnauthorized',
            });
        });

        it('wraps an unknown error raised while rotating the session', async () => {
            stubUserRefreshSession(refreshSessionDoubles, {
                payload,
                session,
                refreshed,
            });
            const error = new Error('boom');
            databaseService.withTransaction.mockRejectedValueOnce(error);

            const call = domain.refreshSession(baseUser, 'refresh-token');

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

    describe('logout', () => {
        it('revokes the session, clears the device notification and stages the activity log event', async () => {
            await domain.logout(
                'user-wisteria',
                'session-wisteria',
                'device-ownership-wisteria'
            );

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
            expect(sessionDomain.purgeRevokedLogins).toHaveBeenCalledWith(
                'user-wisteria',
                [{ id: 'session-wisteria' }]
            );
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                event,
            ]);
        });
    });

    describe('assertTwoFactorUnlocked', () => {
        it('resolves when there is no lock', async () => {
            authCache.getLockTwoFactorAttempt.mockResolvedValue(0);

            await expect(
                domain['assertTwoFactorUnlocked'](baseUser)
            ).resolves.toBeUndefined();
        });

        it('throws AuthTwoFactorAttemptTemporaryLockException while locked', async () => {
            authCache.getLockTwoFactorAttempt.mockResolvedValue(14001);

            const call = domain['assertTwoFactorUnlocked'](baseUser);

            await expect(call).rejects.toMatchObject({
                module: 'auth',
                statusCode:
                    EnumAuthStatusCodeError.twoFactorAttemptTemporaryLock,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.twoFactorAttemptTemporaryLock
                    ],
                messagePath: 'auth.error.twoFactorAttemptTemporaryLock',
                messageProperties: { retryAfterSeconds: 15 },
            });
        });
    });

    describe('recordTwoFactorFailure', () => {
        it('locks two-factor attempts once the max is reached', async () => {
            const user = { ...baseUser };
            userTwoFactorRepository.increaseTwoFactorAttempt.mockResolvedValue({
                ...baseTwoFactor,
                attempt: 5,
            });
            authTwoFactorDomain.checkAttempt.mockReturnValue(true);

            await domain['recordTwoFactorFailure'](user);

            expect(authCache.lockTwoFactorAttempt).toHaveBeenCalledWith(user);
        });

        it('does not lock while under the attempt limit', async () => {
            const user = { ...baseUser };
            userTwoFactorRepository.increaseTwoFactorAttempt.mockResolvedValue({
                ...baseTwoFactor,
                attempt: 1,
            });
            authTwoFactorDomain.checkAttempt.mockReturnValue(false);

            await domain['recordTwoFactorFailure'](user);

            expect(authCache.lockTwoFactorAttempt).not.toHaveBeenCalled();
        });
    });
});
