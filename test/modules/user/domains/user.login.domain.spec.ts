import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock, mockDeep } from 'vitest-mock-extended';
import type { DeepMockProxy, MockProxy } from 'vitest-mock-extended';

import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
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
import type { Session, TwoFactorBackupCode } from '@generated/prisma-client';
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
import { UserEmailNotVerifiedException } from '@modules/user/exceptions/user.email-not-verified.exception';

vi.mock('@common/sentry/services/sentry.service', () => ({
    SentryService: class {},
}));

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
    const deviceIdentity = {
        fingerprint: device.fingerprint,
        name: device.name,
        platform: device.platform,
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
        databaseService.withTransaction.mockImplementation(async callback =>
            callback(transactionClient)
        );
        requestStoreService.get.mockReturnValue(requestLog);
        authCache.getLockTwoFactorAttempt.mockResolvedValue(0);
        helperHashService.sha256Hash.mockImplementation(value => value);
        helperHashService.sha256Compare.mockReturnValue(false);
        helperDateService.create.mockReturnValue(now);
        helperDateService.forward.mockReturnValue(expiredAt);
        authJwtDomain.createTokens.mockReturnValue({
            tokens,
            sessionId: 'session-id',
            jti: 'jti',
        });
        deviceDomain.upsertForLoginInTx.mockResolvedValue({
            isNewDevice: true,
            deviceOwnership,
            device,
        });
        authCache.createChallenge.mockResolvedValue({
            challengeToken: 'challenge-token',
            expiresInMs: 300_000,
        });
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

    it('revokes and purges old sessions when an existing device logs in', async () => {
        const revoked = [{ id: 'old-session-id' }];
        deviceDomain.upsertForLoginInTx.mockResolvedValue({
            isNewDevice: false,
            deviceOwnership,
            device,
        });
        sessionDomain.revokeByDeviceOwnershipInTx.mockResolvedValue(revoked);

        await service.createTokenAndSession(
            user,
            { fingerprint: 'fingerprint', platform: EnumDevicePlatform.web },
            EnumUserLoginFrom.website,
            EnumUserLoginWith.credential,
            now
        );

        expect(deviceUtil.resolveNotificationProvider).toHaveBeenCalledWith(
            EnumDevicePlatform.web
        );
        expect(sessionDomain.revokeByDeviceOwnershipInTx).toHaveBeenCalledWith(
            transactionClient,
            user.id,
            deviceOwnership.id,
            user.id,
            now
        );
        expect(sessionDomain.purgeRevokedLogins).toHaveBeenCalledWith(
            user.id,
            revoked
        );
        expect(notificationQueue.sendNewDeviceLogin).not.toHaveBeenCalled();
    });

    it('does not purge when an existing device has no active old session', async () => {
        deviceDomain.upsertForLoginInTx.mockResolvedValue({
            isNewDevice: false,
            deviceOwnership,
            device,
        });
        sessionDomain.revokeByDeviceOwnershipInTx.mockResolvedValue([]);

        await service.createTokenAndSession(
            user,
            { fingerprint: 'fingerprint' },
            EnumUserLoginFrom.website,
            EnumUserLoginWith.credential,
            now
        );

        expect(deviceUtil.resolveNotificationProvider).toHaveBeenCalledWith(
            null
        );
        expect(sessionDomain.purgeRevokedLogins).not.toHaveBeenCalled();
    });

    it('validates workspace invitation availability through its feature flag', async () => {
        await service.assertWorkspaceInvitationAllowed();

        expect(
            featureFlagDomain.validateFeatureFlagMetadata
        ).toHaveBeenCalledWith('workspace', 'invitationAllowed');
    });

    it('records a failed login and stages the error-path audit event', async () => {
        await service.recordLoginFailed(user.id);

        expect(userRepository.increasePasswordAttempt).toHaveBeenCalledWith(
            user.id
        );
        expect(activityLogDomain.prepare).toHaveBeenCalledWith({
            action: 'userLoginFailed',
            userId: user.id,
            createdBy: user.id,
            onError: true,
        });
    });

    describe('handleLogin', () => {
        it('persists and sends verification for an unverified user', async () => {
            const unverified = { ...user, isVerified: false };
            const emailVerification = {
                type: 'email' as const,
                expiredAt,
                expiredInMinutes: 60,
                resendInMinutes: 10,
                reference: 'VE-RANDOM',
                token: 'plain-token',
                hashedToken: 'hashed-token',
                link: 'https://app.example.com/verify',
            };
            userVerificationDomain.verificationCreateVerification.mockReturnValue(
                emailVerification
            );
            helperDateService.formatToIso.mockReturnValue(
                expiredAt.toISOString()
            );

            await expect(
                service.handleLogin(
                    unverified,
                    deviceIdentity,
                    EnumUserLoginFrom.website,
                    EnumUserLoginWith.credential,
                    now
                )
            ).rejects.toBeInstanceOf(UserEmailNotVerifiedException);
            expect(
                userVerificationDomain.persistVerificationEmail
            ).toHaveBeenCalledWith(user.id, user.email, emailVerification);
            expect(
                notificationQueue.sendVerificationEmail
            ).toHaveBeenCalledWith(user.id, {
                expiredAt: expiredAt.toISOString(),
                reference: emailVerification.reference,
                link: emailVerification.link,
                expiredInMinutes: 60,
            });
        });

        it('returns tokens directly when two-factor is disabled', async () => {
            const withoutTwoFactor = { ...user, twoFactor: null };
            vi.spyOn(service, 'createTokenAndSession').mockResolvedValue(
                tokens
            );

            await expect(
                service.handleLogin(
                    withoutTwoFactor,
                    deviceIdentity,
                    EnumUserLoginFrom.website,
                    EnumUserLoginWith.credential,
                    now
                )
            ).resolves.toEqual({
                isTwoFactorEnable: false,
                lastWorkspaceId: null,
                lastWorkspaceChangedAt: null,
                tokens,
            });
        });

        it('creates and persists pending setup for a required two-factor enrollment', async () => {
            const requiredSetup = {
                ...user,
                twoFactor: {
                    ...user.twoFactor!,
                    requiredSetup: true,
                    backupCodes: [
                        mock<TwoFactorBackupCode>(),
                        mock<TwoFactorBackupCode>(),
                    ],
                },
            };
            authTwoFactorDomain.setupTwoFactor.mockResolvedValue({
                encryptedSecret: 'encrypted-secret',
                secret: 'secret',
                otpauthUrl: 'otpauth://totp/ACK',
            });

            await expect(
                service.handleLogin(
                    requiredSetup,
                    deviceIdentity,
                    EnumUserLoginFrom.website,
                    EnumUserLoginWith.credential,
                    now
                )
            ).resolves.toEqual({
                isTwoFactorEnable: true,
                lastWorkspaceId: null,
                lastWorkspaceChangedAt: null,
                twoFactor: {
                    isRequiredSetup: true,
                    challengeToken: 'challenge-token',
                    challengeExpiresInMs: 300_000,
                    backupCodesRemaining: 2,
                    otpauthUrl: 'otpauth://totp/ACK',
                    secret: 'secret',
                },
            });
            expect(userTwoFactorRepository.setupTwoFactor).toHaveBeenCalledWith(
                user.id,
                'encrypted-secret'
            );
        });

        it('returns a normal two-factor challenge without setup data', async () => {
            await expect(
                service.handleLogin(
                    user,
                    deviceIdentity,
                    EnumUserLoginFrom.website,
                    EnumUserLoginWith.credential,
                    now
                )
            ).resolves.toEqual({
                isTwoFactorEnable: true,
                lastWorkspaceId: null,
                lastWorkspaceChangedAt: null,
                twoFactor: {
                    isRequiredSetup: false,
                    challengeToken: 'challenge-token',
                    challengeExpiresInMs: 300_000,
                    backupCodesRemaining: 0,
                },
            });
        });
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

    it('increments attempts without locking below the two-factor limit', async () => {
        authTwoFactorDomain.verifyTwoFactor.mockResolvedValue({
            isValid: false,
            method: EnumAuthTwoFactorMethod.code,
        });
        userTwoFactorRepository.increaseTwoFactorAttempt.mockResolvedValue({
            ...user.twoFactor!,
            attempt: 1,
        });
        authTwoFactorDomain.checkAttempt.mockReturnValue(false);

        await expect(
            service.handleTwoFactorValidation(user, {
                method: EnumAuthTwoFactorMethod.code,
                code: 'wrong',
            })
        ).rejects.toBeInstanceOf(AuthTwoFactorInvalidException);
        expect(authCache.lockTwoFactorAttempt).not.toHaveBeenCalled();
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

    describe('handleTwoFactorSetupValidation', () => {
        it('rejects setup validation while the user is temporarily locked', async () => {
            authCache.getLockTwoFactorAttempt.mockResolvedValue(30_000);

            await expect(
                service.handleTwoFactorSetupValidation(
                    user,
                    'encrypted-secret',
                    '123456'
                )
            ).rejects.toBeInstanceOf(
                AuthTwoFactorAttemptTemporaryLockException
            );
        });

        it('records and rejects an invalid setup code', async () => {
            authTwoFactorDomain.verifySetupCode.mockReturnValue(false);
            userTwoFactorRepository.increaseTwoFactorAttempt.mockResolvedValue({
                ...user.twoFactor!,
                attempt: 1,
            });

            await expect(
                service.handleTwoFactorSetupValidation(
                    user,
                    'encrypted-secret',
                    'wrong'
                )
            ).rejects.toBeInstanceOf(AuthTwoFactorInvalidException);
        });

        it('resets attempts after a valid setup code', async () => {
            authTwoFactorDomain.verifySetupCode.mockReturnValue(true);

            await service.handleTwoFactorSetupValidation(
                user,
                'encrypted-secret',
                '123456'
            );

            expect(
                userTwoFactorRepository.resetTwoFactorAttempt
            ).toHaveBeenCalledWith(user.id);
        });
    });

    it.each([
        ['transactional', 'verifyTwoFactorInTx'],
        ['direct', 'verifyTwoFactor'],
    ])('records a %s two-factor verification', async (_case, method) => {
        const verified = {
            isValid: true,
            method: EnumAuthTwoFactorMethod.code,
        };
        if (method === 'verifyTwoFactorInTx') {
            userTwoFactorRepository.verifyTwoFactorInTx.mockResolvedValue(true);
        } else {
            userTwoFactorRepository.verifyTwoFactor.mockResolvedValue(true);
        }

        if (method === 'verifyTwoFactorInTx') {
            await service.recordTwoFactorVerificationInTx(
                transactionClient,
                user,
                verified
            );
        } else {
            await service.recordTwoFactorVerification(user, verified);
        }
    });

    it.each([
        ['transactional', 'verifyTwoFactorInTx'],
        ['direct', 'verifyTwoFactor'],
    ])('rejects a lost %s two-factor verification', async (_case, method) => {
        const verified = {
            isValid: true,
            method: EnumAuthTwoFactorMethod.code,
        };
        if (method === 'verifyTwoFactorInTx') {
            userTwoFactorRepository.verifyTwoFactorInTx.mockResolvedValue(
                false
            );
        } else {
            userTwoFactorRepository.verifyTwoFactor.mockResolvedValue(false);
        }

        const result =
            method === 'verifyTwoFactorInTx'
                ? service.recordTwoFactorVerificationInTx(
                      transactionClient,
                      user,
                      verified
                  )
                : service.recordTwoFactorVerification(user, verified);
        await expect(result).rejects.toBeInstanceOf(
            AuthTwoFactorInvalidException
        );
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

    it('rejects refresh when the token has no jti', async () => {
        authJwtDomain.payloadToken.mockReturnValue({
            userId: user.id,
            sessionId: 'session-id',
            deviceOwnershipId: 'ownership-id',
            loginAt: now,
            loginFrom: EnumUserLoginFrom.website,
            loginWith: EnumUserLoginWith.credential,
            jti: '',
        });
        sessionCache.getLogin.mockResolvedValue({
            userId: user.id,
            sessionId: 'session-id',
            expiredAt,
            jti: 'stored-jti',
        });

        await expect(
            service.refreshSession(user, 'refresh-token')
        ).rejects.toBeInstanceOf(AuthJwtRefreshTokenInvalidException);
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

    it('rejects refresh when the cache compare-and-set loses the race', async () => {
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
        sessionCache.updateLogin.mockResolvedValue(false);
        authJwtDomain.refreshToken.mockReturnValue({
            tokens,
            jti: 'new-jti',
            sessionId: 'session-id',
            expiredInMs: 120_000,
        });

        await expect(
            service.refreshSession(user, 'refresh-token')
        ).rejects.toBeInstanceOf(AuthJwtRefreshTokenInvalidException);
    });

    it('wraps an unexpected refresh failure', async () => {
        helperHashService.sha256Compare.mockReturnValue(true);
        authJwtDomain.payloadToken.mockReturnValue({
            userId: user.id,
            sessionId: 'session-id',
            deviceOwnershipId: 'ownership-id',
            loginAt: now,
            loginFrom: EnumUserLoginFrom.website,
            loginWith: EnumUserLoginWith.credential,
            jti: 'old-jti',
        });
        sessionCache.getLogin.mockResolvedValue({
            userId: user.id,
            sessionId: 'session-id',
            expiredAt,
            jti: 'old-jti',
        });
        authJwtDomain.refreshToken.mockImplementation(() => {
            throw new Error('signing failed');
        });

        await expect(
            service.refreshSession(user, 'refresh-token')
        ).rejects.toBeInstanceOf(AppUnknownException);
    });

    it('revokes the session, clears device notification state, and purges cache on logout', async () => {
        await service.logout(user.id, 'session-id', deviceOwnership.id);

        expect(sessionDomain.validateActive).toHaveBeenCalledWith(
            user.id,
            'session-id'
        );
        expect(sessionDomain.revokeInTx).toHaveBeenCalledWith(
            transactionClient,
            user.id,
            'session-id',
            user.id,
            now
        );
        expect(deviceDomain.clearNotificationInTx).toHaveBeenCalledWith(
            transactionClient,
            user.id,
            deviceOwnership.id,
            user.id,
            now
        );
        expect(sessionDomain.purgeRevokedLogins).toHaveBeenCalledWith(user.id, [
            { id: 'session-id' },
        ]);
    });
});
