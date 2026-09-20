import { createMock } from '@golevelup/ts-vitest';
import { Test, type TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { HelperDateService } from '@common/helper/services/helper.date.service';
import { DatabaseService } from '@common/database/services/database.service';
import { RequestStoreService } from '@common/request/services/request.store.service';
import {
    EnumRoleType,
    EnumUserGender,
    EnumUserLoginFrom,
    EnumUserLoginWith,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
} from '@generated/prisma-client';
import { EnumAuthTwoFactorMethod } from '@modules/auth/enums/auth.enum';
import { AuthTwoFactorBackupCodeRequiredException } from '@modules/auth/exceptions/auth.two-factor-backup-code-required.exception';
import { AuthTwoFactorChallengeInvalidException } from '@modules/auth/exceptions/auth.two-factor-challenge-invalid.exception';
import { AuthTwoFactorNotEnabledException } from '@modules/auth/exceptions/auth.two-factor-not-enabled.exception';
import { AuthTwoFactorSetupRequiredException } from '@modules/auth/exceptions/auth.two-factor-setup-required.exception';
import type {
    IAuthToken,
    IAuthTwoFactorVerifyResult,
} from '@modules/auth/interfaces/auth.interface';
import { AuthCache } from '@modules/auth/caches/auth.cache';
import { AuthTwoFactorDomain } from '@modules/auth/domains/auth.two-factor.domain';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { UserBlockedInvalidException } from '@modules/user/exceptions/user.blocked-invalid.exception';
import { UserNotSelfException } from '@modules/user/exceptions/user.not-self.exception';
import type { IUser } from '@modules/user/interfaces/user.interface';
import { UserRepository } from '@modules/user/repositories/user.repository';
import { UserTwoFactorRepository } from '@modules/user/repositories/user.two-factor.repository';
import { UserLoginDomain } from '@modules/user/domains/user.login.domain';
import { UserTwoFactorDomain } from '@modules/user/domains/user.two-factor.domain';
import { UserUtil } from '@modules/user/utils/user.util';
import { SessionDomain } from '@modules/session/domains/session.domain';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import {
    createDatabaseServiceMock,
    mockDatabaseServiceTransaction,
} from '@test/support/database.mock';

describe('UserTwoFactorDomain', () => {
    const userTwoFactorRepository = {
        verifyTwoFactorInTx:
            vi.fn<UserTwoFactorRepository['verifyTwoFactorInTx']>(),
        setupTwoFactor: vi.fn<UserTwoFactorRepository['setupTwoFactor']>(),
        enableTwoFactor: vi.fn<UserTwoFactorRepository['enableTwoFactor']>(),
        disableTwoFactorInTx:
            vi.fn<UserTwoFactorRepository['disableTwoFactorInTx']>(),
        regenerateTwoFactorBackupCodes:
            vi.fn<UserTwoFactorRepository['regenerateTwoFactorBackupCodes']>(),
        resetTwoFactorByAdminInTx:
            vi.fn<UserTwoFactorRepository['resetTwoFactorByAdminInTx']>(),
    } satisfies Pick<
        UserTwoFactorRepository,
        | 'verifyTwoFactorInTx'
        | 'setupTwoFactor'
        | 'enableTwoFactor'
        | 'disableTwoFactorInTx'
        | 'regenerateTwoFactorBackupCodes'
        | 'resetTwoFactorByAdminInTx'
    >;
    const userRepository = {
        findOneWithRoleById: vi.fn<UserRepository['findOneWithRoleById']>(),
    } satisfies Pick<UserRepository, 'findOneWithRoleById'>;
    const userLoginService = {
        handleTwoFactorValidation:
            vi.fn<UserLoginDomain['handleTwoFactorValidation']>(),
        createTokenAndSession:
            vi.fn<UserLoginDomain['createTokenAndSession']>(),
        recordTwoFactorVerification:
            vi.fn<UserLoginDomain['recordTwoFactorVerification']>(),
        handleTwoFactorSetupValidation:
            vi.fn<UserLoginDomain['handleTwoFactorSetupValidation']>(),
    } satisfies Pick<
        UserLoginDomain,
        | 'handleTwoFactorValidation'
        | 'createTokenAndSession'
        | 'recordTwoFactorVerification'
        | 'handleTwoFactorSetupValidation'
    >;
    const authTwoFactorService = {
        setupTwoFactor: vi.fn<AuthTwoFactorDomain['setupTwoFactor']>(),
        generateBackupCodes:
            vi.fn<AuthTwoFactorDomain['generateBackupCodes']>(),
    } satisfies Pick<
        AuthTwoFactorDomain,
        'setupTwoFactor' | 'generateBackupCodes'
    >;
    const authCacheService = {
        getChallenge: vi.fn<AuthCache['getChallenge']>(),
        clearChallenge: vi.fn<AuthCache['clearChallenge']>(),
        clearLockTwoFactorAttempt:
            vi.fn<AuthCache['clearLockTwoFactorAttempt']>(),
    } satisfies Pick<
        AuthCache,
        'getChallenge' | 'clearChallenge' | 'clearLockTwoFactorAttempt'
    >;
    const notificationQueue = {
        sendResetTwoFactorByAdmin:
            vi.fn<NotificationQueue['sendResetTwoFactorByAdmin']>(),
    } satisfies Pick<NotificationQueue, 'sendResetTwoFactorByAdmin'>;
    const helperDateService = {
        create: vi.fn<HelperDateService['create']>(),
    } satisfies Pick<HelperDateService, 'create'>;
    const requestStoreGet = vi.fn((_key: string): unknown => null);
    const requestStoreService = {
        get<T>(key: string): T | null {
            return requestStoreGet(key) as T | null;
        },
    } satisfies Pick<RequestStoreService, 'get'>;
    const databaseService = createDatabaseServiceMock();
    const sessionDomain = createMock<SessionDomain>();
    const activityLogDomain = createMock<ActivityLogDomain>();
    const userUtil = createMock<UserUtil>();

    const now = new Date('2026-01-01T00:00:00.000Z');
    const requestLog = {
        userAgent: { ua: 'browser' },
        ipAddress: '127.0.0.1',
        geoLocation: null,
    };
    const tokens = {
        tokenType: 'Bearer',
        roleType: EnumRoleType.user,
        expiresIn: 3600,
        accessToken: 'access-token',
        refreshToken: 'refreshInTx-token',
    } satisfies IAuthToken;
    const twoFactorVerified = {
        isValid: true,
        method: EnumAuthTwoFactorMethod.code,
    } satisfies IAuthTwoFactorVerifyResult;
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
            backupCodes: [
                {
                    id: 'backup-code-id',
                    twoFactorId: 'two-factor-id',
                    codeHash: 'backup-code-hash',
                    usedAt: null,
                    createdAt: now,
                },
            ],
        },
    } satisfies IUser;
    const challenge = {
        userId: user.id,
        device: {
            fingerprint: 'fingerprint',
            name: 'Browser',
        },
        loginFrom: EnumUserLoginFrom.website,
        loginWith: EnumUserLoginWith.credential,
    };
    const backupCodes = {
        codes: ['BACKUP1', 'BACKUP2'],
        hashes: ['hash-1', 'hash-2'],
    };

    let service: UserTwoFactorDomain;

    beforeEach(async () => {
        vi.resetAllMocks();
        mockDatabaseServiceTransaction(databaseService);
        requestStoreGet.mockReturnValue(requestLog);
        helperDateService.create.mockReturnValue(now);
        authCacheService.getChallenge.mockResolvedValue(challenge);
        userRepository.findOneWithRoleById.mockResolvedValue(user);
        userLoginService.handleTwoFactorValidation.mockResolvedValue(
            twoFactorVerified
        );
        userLoginService.createTokenAndSession.mockResolvedValue(tokens);
        authTwoFactorService.generateBackupCodes.mockReturnValue(backupCodes);

        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                UserTwoFactorDomain,
                {
                    provide: UserTwoFactorRepository,
                    useValue: userTwoFactorRepository,
                },
                { provide: UserRepository, useValue: userRepository },
                { provide: UserLoginDomain, useValue: userLoginService },
                { provide: UserUtil, useValue: userUtil },
                { provide: SessionDomain, useValue: sessionDomain },
                { provide: ActivityLogDomain, useValue: activityLogDomain },
                { provide: DatabaseService, useValue: databaseService },
                {
                    provide: AuthTwoFactorDomain,
                    useValue: authTwoFactorService,
                },
                { provide: AuthCache, useValue: authCacheService },
                { provide: NotificationQueue, useValue: notificationQueue },
                { provide: HelperDateService, useValue: helperDateService },
                { provide: RequestStoreService, useValue: requestStoreService },
            ],
        }).compile();
        service = moduleRef.get(UserTwoFactorDomain);
    });

    describe('loginVerifyTwoFactor', () => {
        it('creates tokens, clears the challenge, and records the verified method', async () => {
            const result = await service.loginVerifyTwoFactor(
                'challenge-token',
                {
                    method: EnumAuthTwoFactorMethod.code,
                    code: '123456',
                }
            );

            expect(result).toEqual(tokens);
            expect(
                userLoginService.handleTwoFactorValidation
            ).toHaveBeenCalledWith(user, {
                method: EnumAuthTwoFactorMethod.code,
                code: '123456',
                backupCode: undefined,
            });
            expect(userLoginService.createTokenAndSession).toHaveBeenCalledWith(
                user,
                challenge.device,
                challenge.loginFrom,
                challenge.loginWith,
                now
            );
            expect(authCacheService.clearChallenge).toHaveBeenCalledWith(
                'challenge-token'
            );
            expect(
                userLoginService.recordTwoFactorVerification
            ).toHaveBeenCalledWith(user, twoFactorVerified);
        });

        it('throws AuthTwoFactorChallengeInvalidException when the challenge is missing', async () => {
            authCacheService.getChallenge.mockResolvedValue(null);

            await expect(
                service.loginVerifyTwoFactor('missing-token', {
                    method: EnumAuthTwoFactorMethod.code,
                    code: '123456',
                })
            ).rejects.toBeInstanceOf(AuthTwoFactorChallengeInvalidException);
            expect(userRepository.findOneWithRoleById).not.toHaveBeenCalled();
        });
    });

    describe('loginSetupTwoFactor', () => {
        it('confirms required setup and returns newly generated backup codes', async () => {
            const setupRequiredUser = {
                ...user,
                twoFactor: {
                    ...user.twoFactor!,
                    requiredSetup: true,
                    pendingSecret: 'pending-secret',
                    confirmedAt: null,
                },
            } satisfies IUser;
            userRepository.findOneWithRoleById.mockResolvedValue(
                setupRequiredUser
            );

            const result = await service.loginSetupTwoFactor(
                'challenge-token',
                '123456'
            );

            expect(result).toEqual(backupCodes.codes);
            expect(
                userLoginService.handleTwoFactorSetupValidation
            ).toHaveBeenCalledWith(
                setupRequiredUser,
                'pending-secret',
                '123456'
            );
            expect(
                userTwoFactorRepository.enableTwoFactor
            ).toHaveBeenCalledWith(
                user.id,
                setupRequiredUser.twoFactor!.pendingSecret,
                backupCodes.hashes
            );
        });
    });

    describe('setupTwoFactor', () => {
        it('stores the encrypted setup secret and returns the visible setup data', async () => {
            const disabledUser = {
                ...user,
                twoFactor: {
                    ...user.twoFactor!,
                    enabled: false,
                    secret: null,
                    pendingSecret: null,
                    confirmedAt: null,
                },
            } satisfies IUser;
            authTwoFactorService.setupTwoFactor.mockResolvedValue({
                secret: 'plain-secret',
                otpauthUrl: 'otpauth://totp/user',
                encryptedSecret: 'encrypted-secret',
            });

            await expect(
                service.setupTwoFactor(disabledUser, null)
            ).resolves.toEqual({
                secret: 'plain-secret',
                otpauthUrl: 'otpauth://totp/user',
            });
            expect(authTwoFactorService.setupTwoFactor).toHaveBeenCalledWith(
                disabledUser.id,
                disabledUser.email
            );
            expect(userTwoFactorRepository.setupTwoFactor).toHaveBeenCalledWith(
                disabledUser.id,
                'encrypted-secret'
            );
        });

        it('requires a backup code when setup is already enabled', async () => {
            await expect(
                service.setupTwoFactor(user, null)
            ).rejects.toBeInstanceOf(AuthTwoFactorBackupCodeRequiredException);
            expect(authTwoFactorService.setupTwoFactor).not.toHaveBeenCalled();
        });
    });

    describe('enableTwoFactor', () => {
        it('verifies the setup code and stores hashed backup codes', async () => {
            const pendingUser = {
                ...user,
                twoFactor: {
                    ...user.twoFactor!,
                    enabled: false,
                    confirmedAt: null,
                    pendingSecret: 'pending-secret',
                },
            } satisfies IUser;

            const result = await service.enableTwoFactor(pendingUser, '123456');

            expect(result).toEqual(backupCodes.codes);
            expect(
                userLoginService.handleTwoFactorSetupValidation
            ).toHaveBeenCalledWith(pendingUser, 'pending-secret', '123456');
            expect(
                userTwoFactorRepository.enableTwoFactor
            ).toHaveBeenCalledWith(
                pendingUser.id,
                'pending-secret',
                backupCodes.hashes
            );
        });

        it('throws AuthTwoFactorSetupRequiredException when no setup secret exists', async () => {
            const disabledUser = {
                ...user,
                twoFactor: {
                    ...user.twoFactor!,
                    enabled: false,
                    secret: null,
                    pendingSecret: null,
                    confirmedAt: null,
                },
            } satisfies IUser;

            await expect(
                service.enableTwoFactor(disabledUser, '123456')
            ).rejects.toBeInstanceOf(AuthTwoFactorSetupRequiredException);
            expect(
                userLoginService.handleTwoFactorValidation
            ).not.toHaveBeenCalled();
        });
    });

    describe('disableTwoFactorInTx', () => {
        it('validates the factor before revoking sessions and disabling 2FA', async () => {
            const order: string[] = [];
            sessionDomain.revokeActiveByUserInTx.mockImplementation(
                async () => {
                    order.push('revokeInTx');
                    return [];
                }
            );
            userTwoFactorRepository.disableTwoFactorInTx.mockImplementation(
                async () => {
                    order.push('disable');
                    return user.twoFactor!;
                }
            );

            await service.disableTwoFactor(user, {
                method: EnumAuthTwoFactorMethod.backupCodes,
                backupCode: 'BACKUP1',
            });

            expect(
                userLoginService.handleTwoFactorValidation
            ).toHaveBeenCalledWith(user, {
                method: EnumAuthTwoFactorMethod.backupCodes,
                code: undefined,
                backupCode: 'BACKUP1',
            });
            expect(order).toEqual(['disable', 'revokeInTx']);
            expect(
                userTwoFactorRepository.disableTwoFactorInTx
            ).toHaveBeenCalledWith(expect.any(Object), user.id);
        });

        it('throws AuthTwoFactorNotEnabledException when 2FA is disabled', async () => {
            const disabledUser = {
                ...user,
                twoFactor: { ...user.twoFactor!, enabled: false },
            } satisfies IUser;

            await expect(
                service.disableTwoFactor(disabledUser, {
                    method: EnumAuthTwoFactorMethod.code,
                    code: '123456',
                })
            ).rejects.toBeInstanceOf(AuthTwoFactorNotEnabledException);
            expect(
                userLoginService.handleTwoFactorValidation
            ).not.toHaveBeenCalled();
        });
    });

    describe('regenerateTwoFactorBackupCodes', () => {
        it('requires a code and replaces stored backup-code hashes', async () => {
            const result = await service.regenerateTwoFactorBackupCodes(
                user,
                '123456'
            );

            expect(result).toEqual(backupCodes.codes);
            expect(
                userLoginService.handleTwoFactorValidation
            ).toHaveBeenCalledWith(user, {
                method: EnumAuthTwoFactorMethod.code,
                code: '123456',
            });
            expect(
                userTwoFactorRepository.regenerateTwoFactorBackupCodes
            ).toHaveBeenCalledWith(user.id, backupCodes.hashes);
        });
    });

    describe('resetTwoFactorByAdminInTx', () => {
        it('resets another active user, clears attempt locks, and sends the notification', async () => {
            await service.resetTwoFactorByAdmin(user.id, 'admin-id');

            expect(sessionDomain.revokeActiveByUserInTx).toHaveBeenCalled();
            expect(
                userTwoFactorRepository.resetTwoFactorByAdminInTx
            ).toHaveBeenCalledWith(expect.any(Object), user.id);
            expect(
                authCacheService.clearLockTwoFactorAttempt
            ).toHaveBeenCalledWith(user);
            expect(
                notificationQueue.sendResetTwoFactorByAdmin
            ).toHaveBeenCalledWith(user.id, 'admin-id');
        });

        it('throws UserNotSelfException when an admin resets their own 2FA', async () => {
            await expect(
                service.resetTwoFactorByAdmin(user.id, user.id)
            ).rejects.toBeInstanceOf(UserNotSelfException);
            expect(userRepository.findOneWithRoleById).not.toHaveBeenCalled();
        });

        it('throws UserBlockedInvalidException when the target user is blocked', async () => {
            userRepository.findOneWithRoleById.mockResolvedValue({
                ...user,
                status: EnumUserStatus.blocked,
            });

            await expect(
                service.resetTwoFactorByAdmin(user.id, 'admin-id')
            ).rejects.toBeInstanceOf(UserBlockedInvalidException);
            expect(sessionDomain.revokeActiveByUserInTx).not.toHaveBeenCalled();
        });
    });

    describe('getTwoFactorStatus', () => {
        it('returns the user two-factor record', () => {
            expect(service.getTwoFactorStatus(user)).toBe(user.twoFactor);
        });
    });
});
