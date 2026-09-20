import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock, mockDeep } from 'vitest-mock-extended';
import type { DeepMockProxy, MockProxy } from 'vitest-mock-extended';

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
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
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
import { UserTwoFactorRepository } from '@modules/user/repositories/user.two-factor.repository';
import { UserRepository } from '@modules/user/repositories/user.repository';
import { UserLoginDomain } from '@modules/user/domains/user.login.domain';
import { UserVerificationDomain } from '@modules/user/domains/user.verification.domain';
import { UserUtil } from '@modules/user/utils/user.util';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';

describe('UserLoginDomain', () => {
    const userTwoFactorRepository: MockProxy<UserTwoFactorRepository> =
        mock<UserTwoFactorRepository>();
    const userRepository: MockProxy<UserRepository> = mock<UserRepository>();
    const authJwtDomain: MockProxy<AuthJwtDomain> = mock<AuthJwtDomain>({
        jwtRefreshTokenExpirationTimeInSeconds: 2_592_000,
    });
    const authTwoFactorDomain: MockProxy<AuthTwoFactorDomain> =
        mock<AuthTwoFactorDomain>();
    const authCache: MockProxy<AuthCache> = mock<AuthCache>();
    const sessionCache: MockProxy<SessionCache> = mock<SessionCache>();
    const sessionDomain: MockProxy<SessionDomain> = mock<SessionDomain>();
    const notificationQueue: MockProxy<NotificationQueue> =
        mock<NotificationQueue>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const helperHashService: MockProxy<HelperHashService> =
        mock<HelperHashService>();
    const userUtil: MockProxy<UserUtil> = mock<UserUtil>();
    const userVerificationDomain: MockProxy<UserVerificationDomain> =
        mock<UserVerificationDomain>();
    const featureFlagDomain: MockProxy<FeatureFlagDomain> =
        mock<FeatureFlagDomain>();
    const deviceUtil: MockProxy<DeviceUtil> = mock<DeviceUtil>();
    const deviceDomain: MockProxy<DeviceDomain> = mock<DeviceDomain>();
    const createdSession: MockProxy<Session> = mock<Session>();
    const activityLogDomain: MockProxy<ActivityLogDomain> =
        mock<ActivityLogDomain>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();
    const databaseService: DeepMockProxy<DatabaseService> =
        mockDeep<DatabaseService>();
    const transactionClient: MockProxy<IDatabaseTransactionClient> =
        mock<IDatabaseTransactionClient>();
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
        databaseService.withTransaction.mockImplementation(async callback =>
            callback(transactionClient)
        );
        requestStoreService.get.mockReturnValue(requestLog);
        authCache.getLockTwoFactorAttempt.mockResolvedValue(0);
        helperHashService.sha256Hash.mockImplementation(value => value);
        helperHashService.sha256Compare.mockReturnValue(false);
        const moduleRef: TestingModule = await Test.createTestingModule({
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
                { provide: RequestStoreService, useValue: requestStoreService },
            ],
        }).compile();
        service = moduleRef.get(UserLoginDomain);
    });

    it('creates the session cache and notifies a new device', async () => {
        authJwtDomain.createTokens.mockReturnValue({
            tokens,
            sessionId: 'session-id',
            jti: 'jti',
        });
        helperDateService.forward.mockReturnValue(expiredAt);
        helperDateService.formatToIso.mockReturnValue(now.toISOString());
        deviceDomain.upsertForLoginInTx.mockResolvedValue({
            isNewDevice: true,
            deviceOwnership,
            device,
        });
        sessionDomain.createInTx.mockResolvedValue(createdSession);
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
        expect(sessionCache.setLogin).toHaveBeenCalledWith(
            user.id,
            'session-id',
            'jti',
            expiredAt
        );
        expect(sessionDomain.purgeLoginsByUser).not.toHaveBeenCalled();
        expect(notificationQueue.sendNewDeviceLogin).toHaveBeenCalled();
    });

    it('rejects two-factor validation while the user is temporarily locked', async () => {
        authCache.getLockTwoFactorAttempt.mockResolvedValue(30_000);

        await expect(
            service.handleTwoFactorValidation(user, {
                method: EnumAuthTwoFactorMethod.code,
                code: '123456',
            })
        ).rejects.toBeInstanceOf(AuthTwoFactorAttemptTemporaryLockException);
        expect(authTwoFactorDomain.verifyTwoFactor).not.toHaveBeenCalled();
    });

    it('requires an explicit two-factor method', async () => {
        await expect(
            service.handleTwoFactorValidation(user, { code: '123456' })
        ).rejects.toBeInstanceOf(AuthTwoFactorMethodRequiredException);
    });

    it('increments attempts, locks at the limit, and rejects an invalid code', async () => {
        authTwoFactorDomain.verifyTwoFactor.mockResolvedValue({
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
        authTwoFactorDomain.checkAttempt.mockReturnValue(true);

        await expect(
            service.handleTwoFactorValidation(user, {
                method: EnumAuthTwoFactorMethod.code,
                code: 'wrong',
            })
        ).rejects.toBeInstanceOf(AuthTwoFactorInvalidException);
        expect(authCache.lockTwoFactorAttempt).toHaveBeenCalledWith(attempted);
    });

    it('resets attempts after successful backup-code verification', async () => {
        const verified = {
            isValid: true,
            method: EnumAuthTwoFactorMethod.backupCodes,
            usedBackupCodeHash: 'isUsedById-hash',
        };
        authTwoFactorDomain.verifyTwoFactor.mockResolvedValue(verified);

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
        authJwtDomain.payloadToken.mockReturnValue({
            userId: user.id,
            sessionId: 'session-id',
            deviceOwnershipId: 'ownership-id',
            loginAt: now,
            loginFrom: EnumUserLoginFrom.website,
            loginWith: EnumUserLoginWith.credential,
            jti: 'request-jti',
        });
        sessionCache.getLogin.mockResolvedValue({
            userId: user.id,
            sessionId: 'session-id',
            expiredAt,
            jti: 'newer-jti',
        });

        await expect(
            service.refreshSession(user, 'refreshInTx-token')
        ).rejects.toBeInstanceOf(AuthJwtRefreshTokenInvalidException);
        expect(authJwtDomain.refreshToken).not.toHaveBeenCalled();
    });

    it('rotates the cache and persisted session to the new jti', async () => {
        helperHashService.sha256Compare.mockReturnValue(true);
        const session = {
            userId: user.id,
            sessionId: 'session-id',
            expiredAt,
            jti: 'old-jti',
        };
        authJwtDomain.payloadToken.mockReturnValue({
            userId: user.id,
            sessionId: 'session-id',
            deviceOwnershipId: 'ownership-id',
            loginAt: now,
            loginFrom: EnumUserLoginFrom.website,
            loginWith: EnumUserLoginWith.credential,
            jti: 'old-jti',
        });
        sessionCache.getLogin.mockResolvedValue(session);
        sessionCache.updateLogin.mockResolvedValue(true);
        authJwtDomain.refreshToken.mockReturnValue({
            tokens,
            jti: 'new-jti',
            sessionId: 'session-id',
            expiredInMs: 120_000,
        });

        await expect(
            service.refreshSession(user, 'refreshInTx-token')
        ).resolves.toBe(tokens);
        expect(sessionCache.updateLogin).toHaveBeenCalledWith(
            user.id,
            'session-id',
            session,
            'new-jti',
            120_000
        );
    });
});
