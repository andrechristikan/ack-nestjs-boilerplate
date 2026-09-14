import { createMock } from '@golevelup/ts-vitest';
import { Test, type TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { HelperDateService } from '@common/helper/services/helper.date.service';
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
import { AuthJwtRefreshTokenInvalidException } from '@modules/auth/exceptions/auth.jwt-refresh-token-invalid.exception';
import { AuthTwoFactorAttemptTemporaryLockException } from '@modules/auth/exceptions/auth.two-factor-attempt-temporary-lock.exception';
import { AuthTwoFactorInvalidException } from '@modules/auth/exceptions/auth.two-factor-invalid.exception';
import { AuthTwoFactorMethodRequiredException } from '@modules/auth/exceptions/auth.two-factor-method-required.exception';
import { EnumAuthTwoFactorMethod } from '@modules/auth/enums/auth.enum';
import type { IAuthToken } from '@modules/auth/interfaces/auth.interface';
import { AuthCacheService } from '@modules/auth/services/auth.cache.service';
import { AuthJwtService } from '@modules/auth/services/auth.jwt.service';
import { AuthTwoFactorService } from '@modules/auth/services/auth.two-factor.service';
import { DeviceUtil } from '@modules/device/utils/device.util';
import { FeatureFlagService } from '@modules/feature-flag/services/feature-flag.service';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { SessionCacheService } from '@modules/session/services/session.cache.service';
import { SessionService } from '@modules/session/services/session.service';
import type { IUser } from '@modules/user/interfaces/user.interface';
import { UserSessionRepository } from '@modules/user/repositories/user.session.repository';
import { UserTwoFactorRepository } from '@modules/user/repositories/user.two-factor.repository';
import { UserVerificationRepository } from '@modules/user/repositories/user.verification.repository';
import { UserLoginService } from '@modules/user/services/user.login.service';
import { UserVerificationService } from '@modules/user/services/user.verification.service';
import { UserUtil } from '@modules/user/utils/user.util';

describe('UserLoginService', () => {
    const userSessionRepository = createMock<UserSessionRepository>();
    const userTwoFactorRepository = createMock<UserTwoFactorRepository>();
    const userVerificationRepository = createMock<UserVerificationRepository>();
    const payloadToken = vi.fn((_token: string): unknown => null);
    const authJwtService = createMock<AuthJwtService>({
        jwtRefreshTokenExpirationTimeInSeconds: 2_592_000,
        payloadToken: <T>(token: string) => payloadToken(token) as T,
    });
    const authTwoFactorService = createMock<AuthTwoFactorService>();
    const authCacheService = createMock<AuthCacheService>();
    const sessionCacheService = createMock<SessionCacheService>();
    const sessionService = createMock<SessionService>();
    const notificationQueue = createMock<NotificationQueue>();
    const helperDateService = createMock<HelperDateService>();
    const userUtil = createMock<UserUtil>();
    const userVerificationService = createMock<UserVerificationService>();
    const featureFlagService = createMock<FeatureFlagService>();
    const deviceUtil = createMock<DeviceUtil>();
    const requestStoreGet = vi.fn((_key: string): unknown => null);
    const requestStoreService = {
        get<T>(key: string): T | null {
            return requestStoreGet(key) as T | null;
        },
    } satisfies Pick<RequestStoreService, 'get'>;
    const now = new Date('2026-01-01T00:00:00.000Z');
    const expiredAt = new Date('2026-02-01T00:00:00.000Z');
    const tokens = {
        tokenType: 'Bearer',
        roleType: EnumRoleType.user,
        expiresIn: 3600,
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
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
            iv: 'iv',
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

    let service: UserLoginService;

    beforeEach(async () => {
        vi.resetAllMocks();
        requestStoreGet.mockReturnValue(requestLog);
        authCacheService.getLockTwoFactorAttempt.mockResolvedValue(0);
        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                UserLoginService,
                {
                    provide: UserSessionRepository,
                    useValue: userSessionRepository,
                },
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
                    provide: UserVerificationService,
                    useValue: userVerificationService,
                },
                { provide: DeviceUtil, useValue: deviceUtil },
                { provide: AuthJwtService, useValue: authJwtService },
                {
                    provide: AuthTwoFactorService,
                    useValue: authTwoFactorService,
                },
                { provide: AuthCacheService, useValue: authCacheService },
                { provide: SessionCacheService, useValue: sessionCacheService },
                { provide: SessionService, useValue: sessionService },
                { provide: NotificationQueue, useValue: notificationQueue },
                {
                    provide: FeatureFlagService,
                    useValue: featureFlagService,
                },
                { provide: HelperDateService, useValue: helperDateService },
                { provide: RequestStoreService, useValue: requestStoreService },
            ],
        }).compile();
        service = moduleRef.get(UserLoginService);
    });

    it('creates the session cache, removes superseded logins, and notifies a new device', async () => {
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
        expect(sessionCacheService.deleteAllLogins).toHaveBeenCalledWith(
            user.id,
            [{ id: 'old-session' }]
        );
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
            attempted
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
            usedBackupCodeHash: 'used-hash',
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

    it('rejects refresh when the session is missing or its jti was rotated', async () => {
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
            service.refreshSession(user, 'refresh-token')
        ).rejects.toBeInstanceOf(AuthJwtRefreshTokenInvalidException);
        expect(authJwtService.refreshToken).not.toHaveBeenCalled();
    });

    it('rotates the cache and persisted session to the new jti', async () => {
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
            service.refreshSession(user, 'refresh-token')
        ).resolves.toBe(tokens);
        expect(sessionCacheService.updateLogin).toHaveBeenCalledWith(
            user.id,
            'session-id',
            session,
            'new-jti',
            120_000
        );
        expect(userSessionRepository.refresh).toHaveBeenCalledWith(
            user.id,
            expect.objectContaining({
                sessionId: 'session-id',
                jti: 'new-jti',
                expiredAt,
            }),
            requestLog
        );
    });
});
