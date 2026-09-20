import { createMock } from '@golevelup/ts-vitest';
import { Test, type TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import { DatabaseService } from '@common/database/services/database.service';
import { RequestStoreService } from '@common/request/services/request.store.service';
import {
    EnumRoleType,
    EnumDevicePlatform,
    EnumUserGender,
    EnumUserLoginFrom,
    EnumUserLoginWith,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
} from '@generated/prisma-client';
import type { Session } from '@generated/prisma-client';
import { AuthJwtRefreshTokenInvalidException } from '@modules/auth/exceptions/auth.jwt-refresh-token-invalid.exception';
import { AuthTwoFactorAttemptTemporaryLockException } from '@modules/auth/exceptions/auth.two-factor-attempt-temporary-lock.exception';
import { AuthTwoFactorInvalidException } from '@modules/auth/exceptions/auth.two-factor-invalid.exception';
import { AuthTwoFactorMethodRequiredException } from '@modules/auth/exceptions/auth.two-factor-method-required.exception';
import { EnumAuthTwoFactorMethod } from '@modules/auth/enums/auth.enum';
import type { IAuthToken } from '@modules/auth/interfaces/auth.interface';
import { AuthCache } from '@modules/auth/caches/auth.cache';
import { AuthJwtDomain } from '@modules/auth/domains/auth.jwt.domain';
import { AuthTwoFactorDomain } from '@modules/auth/domains/auth.two-factor.domain';
import { DeviceUtil } from '@modules/device/utils/device.util';
import { DeviceDomain } from '@modules/device/domains/device.domain';
import { FeatureFlagDomain } from '@modules/feature-flag/domains/feature-flag.domain';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { SessionCache } from '@modules/session/caches/session.cache';
import { SessionDomain } from '@modules/session/domains/session.domain';
import type { IUser } from '@modules/user/interfaces/user.interface';
import { SessionRepository } from '@modules/session/repositories/session.repository';
import { UserTwoFactorRepository } from '@modules/user/repositories/user.two-factor.repository';
import { UserVerificationRepository } from '@modules/user/repositories/user.verification.repository';
import { UserRepository } from '@modules/user/repositories/user.repository';
import { UserLoginDomain } from '@modules/user/domains/user.login.domain';
import {
    createDatabaseServiceMock,
    mockDatabaseServiceTransaction,
} from '@test/support/database.mock';
import { UserVerificationDomain } from '@modules/user/domains/user.verification.domain';
import { UserUtil } from '@modules/user/utils/user.util';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';

describe('UserLoginDomain', () => {
    const userSessionRepository =
        createMock<SessionRepository>() as unknown as Record<
            string,
            ReturnType<typeof vi.fn>
        >;
    const userTwoFactorRepository = createMock<UserTwoFactorRepository>();
    const userRepository = createMock<UserRepository>();
    const userVerificationRepository = createMock<UserVerificationRepository>();
    const payloadToken = vi.fn((_token: string): unknown => null);
    const authJwtService = createMock<AuthJwtDomain>({
        jwtRefreshTokenExpirationTimeInSeconds: 2_592_000,
        payloadToken: <T>(token: string) => payloadToken(token) as T,
    });
    const authTwoFactorService = createMock<AuthTwoFactorDomain>();
    const authCacheService = createMock<AuthCache>();
    const sessionCacheService = createMock<SessionCache>();
    const sessionService = createMock<SessionDomain>();
    const notificationQueue = createMock<NotificationQueue>();
    const helperDateService = createMock<HelperDateService>();
    const helperHashService = createMock<HelperHashService>();
    const userUtil = createMock<UserUtil>();
    const userVerificationService = createMock<UserVerificationDomain>();
    const featureFlagService = createMock<FeatureFlagDomain>();
    const deviceUtil = createMock<DeviceUtil>();
    const deviceDomain = createMock<DeviceDomain>();
    const createdSession = createMock<Session>();
    const activityLogDomain = createMock<ActivityLogDomain>();
    const requestStoreGet = vi.fn((_key: string): unknown => null);
    const requestStoreService = {
        get<T>(key: string): T | null {
            return requestStoreGet(key) as T | null;
        },
    } satisfies Pick<RequestStoreService, 'get'>;
    const databaseService = createDatabaseServiceMock();
    const now = new Date('2026-01-01T00:00:00.000Z');
    const expiredAt = new Date('2026-02-01T00:00:00.000Z');
    const tokens = {
        tokenType: 'Bearer',
        roleType: EnumRoleType.user,
        expiresIn: 3600,
        accessToken: 'access-token',
        refreshToken: 'refreshInTx-token',
    } satisfies IAuthToken;
    const user = {
        id: 'user-id',
        name: 'User',
        username: 'user',
        isVerified: true,
        verifiedAt: now,
        email: 'user@example.com',
        roleId: 'role-id',
        password: 'hash',
        passwordExpired: null,
        passwordCreated: now,
        passwordAttempt: 0,
        signUpAt: now,
        signUpFrom: EnumUserSignUpFrom.website,
        signUpWith: EnumUserSignUpWith.credential,
        status: EnumUserStatus.active,
        gender: EnumUserGender.male,
        countryId: 'country-id',
        lastLoginAt: null,
        lastIPAddress: null,
        lastLoginFrom: null,
        lastLoginWith: null,
        lastWorkspaceId: null,
        lastWorkspaceChangedAt: null,
        createdAt: now,
        createdBy: null,
        updatedAt: now,
        updatedBy: null,
        deletedAt: null,
        deletedBy: null,
        termsOfServiceAccepted: true,
        privacyAccepted: true,
        cookiesAccepted: false,
        marketingAccepted: false,
        role: {
            id: 'role-id',
            name: 'User',
            description: null,
            type: EnumRoleType.user,
            createdAt: now,
            createdBy: null,
            updatedAt: now,
            updatedBy: null,
            policies: [],
        },
        twoFactor: {
            id: 'two-factor-id',
            userId: 'user-id',
            secret: 'secret',
            pendingSecret: null,
            enabled: true,
            requiredSetup: false,
            confirmedAt: now,
            lastUsedAt: null,
            attempt: 0,
            createdAt: now,
            createdBy: null,
            updatedAt: now,
            updatedBy: null,
            backupCodes: [],
        },
    } satisfies IUser;
    const requestLog = {
        userAgent: { ua: 'browser' },
        ipAddress: '127.0.0.1',
        geoLocation: null,
    };
    const device = {
        id: 'device-id',
        fingerprint: 'fingerprint',
        name: 'Browser',
        platform: EnumDevicePlatform.web,
        lastActiveAt: now,
        notificationToken: null,
        notificationProvider: null,
        createdAt: now,
        createdBy: null,
        updatedAt: now,
        updatedBy: null,
    };
    const deviceOwnership = {
        id: 'ownership-id',
        deviceId: device.id,
        userId: user.id,
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
    };

    let service: UserLoginDomain;

    beforeEach(async () => {
        vi.resetAllMocks();
        mockDatabaseServiceTransaction(databaseService);
        requestStoreGet.mockReturnValue(requestLog);
        authCacheService.getLockTwoFactorAttempt.mockResolvedValue(0);
        helperHashService.sha256Hash.mockImplementation(value => value);
        helperHashService.sha256Compare.mockReturnValue(false);
        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                UserLoginDomain,
                { provide: SessionRepository, useValue: userSessionRepository },
                { provide: UserRepository, useValue: userRepository },
                {
                    provide: UserTwoFactorRepository,
                    useValue: userTwoFactorRepository,
                },
                {
                    provide: UserVerificationRepository,
                    useValue: userVerificationRepository,
                },
                { provide: UserUtil, useValue: userUtil },
                {
                    provide: UserVerificationDomain,
                    useValue: userVerificationService,
                },
                { provide: DeviceDomain, useValue: deviceDomain },
                { provide: DeviceUtil, useValue: deviceUtil },
                { provide: ActivityLogDomain, useValue: activityLogDomain },
                { provide: DatabaseService, useValue: databaseService },
                { provide: AuthJwtDomain, useValue: authJwtService },
                {
                    provide: AuthTwoFactorDomain,
                    useValue: authTwoFactorService,
                },
                { provide: AuthCache, useValue: authCacheService },
                { provide: SessionCache, useValue: sessionCacheService },
                { provide: SessionDomain, useValue: sessionService },
                { provide: NotificationQueue, useValue: notificationQueue },
                { provide: FeatureFlagDomain, useValue: featureFlagService },
                { provide: HelperDateService, useValue: helperDateService },
                { provide: HelperHashService, useValue: helperHashService },
                { provide: RequestStoreService, useValue: requestStoreService },
            ],
        }).compile();
        service = moduleRef.get(UserLoginDomain);
    });

    it('creates the session cache and notifies a new device', async () => {
        authJwtService.createTokens.mockReturnValue({
            tokens,
            sessionId: 'session-id',
            jti: 'jti',
        });
        helperDateService.forward.mockReturnValue(expiredAt);
        helperDateService.formatToIso.mockReturnValue(now.toISOString());
        userSessionRepository.login.mockResolvedValue({
            user,
            device,
            deviceOwnership,
            isNewDevice: true,
            sessionShouldBeInactive: [{ id: 'old-session' }],
        });
        deviceDomain.upsertForLoginInTx.mockResolvedValue({
            isNewDevice: true,
            deviceOwnership,
            device,
        });
        sessionService.createInTx.mockResolvedValue(createdSession);
        userRepository.updateLoginInTx.mockResolvedValue(user);

        await expect(
            service.createTokenAndSession(
                user,
                { fingerprint: 'fingerprint' },
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential,
                now
            )
        ).resolves.toBe(tokens);
        expect(sessionCacheService.setLogin).toHaveBeenCalledWith(
            user.id,
            'session-id',
            'jti',
            expiredAt
        );
        expect(sessionService.purgeLoginsByUser).not.toHaveBeenCalled();
        expect(notificationQueue.sendNewDeviceLogin).toHaveBeenCalled();
    });

    it('rejects two-factor validation while the user is temporarily locked', async () => {
        authCacheService.getLockTwoFactorAttempt.mockResolvedValue(30_000);

        await expect(
            service.handleTwoFactorValidation(user, {
                method: EnumAuthTwoFactorMethod.code,
                code: '123456',
            })
        ).rejects.toBeInstanceOf(AuthTwoFactorAttemptTemporaryLockException);
        expect(authTwoFactorService.verifyTwoFactor).not.toHaveBeenCalled();
    });

    it('requires an explicit two-factor method', async () => {
        await expect(
            service.handleTwoFactorValidation(user, { code: '123456' })
        ).rejects.toBeInstanceOf(AuthTwoFactorMethodRequiredException);
    });

    it('increments attempts, locks at the limit, and rejects an invalid code', async () => {
        authTwoFactorService.verifyTwoFactor.mockResolvedValue({
            isValid: false,
            method: EnumAuthTwoFactorMethod.code,
        });
        const attempted = {
            ...user,
            twoFactor: { ...user.twoFactor!, attempt: 5 },
        };
        userTwoFactorRepository.increaseTwoFactorAttempt.mockResolvedValue(
            attempted.twoFactor
        );
        authTwoFactorService.checkAttempt.mockReturnValue(true);

        await expect(
            service.handleTwoFactorValidation(user, {
                method: EnumAuthTwoFactorMethod.code,
                code: 'wrong',
            })
        ).rejects.toBeInstanceOf(AuthTwoFactorInvalidException);
        expect(authCacheService.lockTwoFactorAttempt).toHaveBeenCalledWith(
            attempted
        );
    });

    it('resets attempts after successful backup-code verification', async () => {
        const verified = {
            isValid: true,
            method: EnumAuthTwoFactorMethod.backupCodes,
            usedBackupCodeHash: 'isUsedById-hash',
        };
        authTwoFactorService.verifyTwoFactor.mockResolvedValue(verified);

        await expect(
            service.handleTwoFactorValidation(user, {
                method: EnumAuthTwoFactorMethod.backupCodes,
                backupCode: 'BACKUP01',
            })
        ).resolves.toEqual(verified);
        expect(
            userTwoFactorRepository.resetTwoFactorAttempt
        ).toHaveBeenCalledWith(user.id);
    });

    it('rejects refreshInTx when the session is missing or its jti was rotated', async () => {
        payloadToken.mockReturnValue({
            userId: user.id,
            sessionId: 'session-id',
            deviceOwnershipId: 'ownership-id',
            loginAt: now,
            loginFrom: EnumUserLoginFrom.website,
            loginWith: EnumUserLoginWith.credential,
            jti: 'request-jti',
        });
        sessionCacheService.getLogin.mockResolvedValue({
            userId: user.id,
            sessionId: 'session-id',
            expiredAt,
            jti: 'newer-jti',
        });

        await expect(
            service.refreshSession(user, 'refreshInTx-token')
        ).rejects.toBeInstanceOf(AuthJwtRefreshTokenInvalidException);
        expect(authJwtService.refreshToken).not.toHaveBeenCalled();
    });

    it('rotates the cache and persisted session to the new jti', async () => {
        helperHashService.sha256Compare.mockReturnValue(true);
        const session = {
            userId: user.id,
            sessionId: 'session-id',
            expiredAt,
            jti: 'old-jti',
        };
        payloadToken.mockReturnValue({
            userId: user.id,
            sessionId: 'session-id',
            deviceOwnershipId: 'ownership-id',
            loginAt: now,
            loginFrom: EnumUserLoginFrom.website,
            loginWith: EnumUserLoginWith.credential,
            jti: 'old-jti',
        });
        sessionCacheService.getLogin.mockResolvedValue(session);
        authJwtService.refreshToken.mockReturnValue({
            tokens,
            jti: 'new-jti',
            sessionId: 'session-id',
            expiredInMs: 120_000,
        });

        await expect(
            service.refreshSession(user, 'refreshInTx-token')
        ).resolves.toBe(tokens);
        expect(sessionCacheService.updateLogin).toHaveBeenCalledWith(
            user.id,
            'session-id',
            session,
            'new-jti',
            120_000
        );
    });
});
