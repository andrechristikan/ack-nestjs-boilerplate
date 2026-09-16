import { createMock } from '@golevelup/ts-vitest';
import { Test, type TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import {
    EnumRoleType,
    EnumUserGender,
    EnumUserLoginFrom,
    EnumUserLoginWith,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
} from '@generated/prisma-client';
import type { IAuthToken } from '@modules/auth/interfaces/auth.interface';
import { AuthPasswordUtil } from '@modules/auth/utils/auth.password.util';
import { CountryDomain } from '@modules/country/domains/country.domain';
import { FeatureFlagCache } from '@modules/feature-flag/caches/feature-flag.cache';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { RoleDomain } from '@modules/role/domains/role.domain';
import { UserInactiveForbiddenException } from '@modules/user/exceptions/user.inactive-forbidden.exception';
import { UserNotFoundException } from '@modules/user/exceptions/user.not-found.exception';
import { UserPasswordAttemptMaxException } from '@modules/user/exceptions/user.password-attempt-max.exception';
import { UserPasswordExpiredException } from '@modules/user/exceptions/user.password-expired.exception';
import { UserPasswordNotMatchException } from '@modules/user/exceptions/user.password-not-match.exception';
import { UserPasswordNotSetException } from '@modules/user/exceptions/user.password-not-set.exception';
import type {
    IUser,
    IUserLoginOutcome,
} from '@modules/user/interfaces/user.interface';
import { UserRepository } from '@modules/user/repositories/user.repository';
import { UserAuthDomain } from '@modules/user/domains/user.auth.domain';
import { UserLoginDomain } from '@modules/user/domains/user.login.domain';
import { UserPasswordDomain } from '@modules/user/domains/user.password.domain';
import { UserVerificationDomain } from '@modules/user/domains/user.verification.domain';
import { UserUtil } from '@modules/user/utils/user.util';

describe('UserAuthDomain', () => {
    const userRepository = {
        findOneWithRoleByEmail:
            vi.fn<UserRepository['findOneWithRoleByEmail']>(),
    } satisfies Pick<UserRepository, 'findOneWithRoleByEmail'>;
    const userPasswordDomain = createMock<UserPasswordDomain>();
    const userLoginService = {
        handleLogin: vi.fn<UserLoginDomain['handleLogin']>(),
        refreshSession: vi.fn<UserLoginDomain['refreshSession']>(),
        revokeSession: vi.fn<UserLoginDomain['revokeSession']>(),
        logout: vi.fn<UserLoginDomain['logout']>(),
        stageLoginFailed: vi.fn<UserLoginDomain['stageLoginFailed']>(),
    } satisfies Pick<
        UserLoginDomain,
        | 'handleLogin'
        | 'refreshSession'
        | 'revokeSession'
        | 'logout'
        | 'stageLoginFailed'
    >;
    const authPasswordService = {
        checkPasswordAttempt: vi.fn<AuthPasswordUtil['checkPasswordAttempt']>(),
        validatePassword: vi.fn<AuthPasswordUtil['validatePassword']>(),
        checkPasswordExpired: vi.fn<AuthPasswordUtil['checkPasswordExpired']>(),
    } satisfies Pick<
        AuthPasswordUtil,
        'checkPasswordAttempt' | 'validatePassword' | 'checkPasswordExpired'
    >;
    const getFeatureFlagMetadata = vi.fn(
        async (_key: string): Promise<unknown> => null
    );
    const featureFlagCacheService = {
        async getMetadataByKeyAndCache<T>(key: string): Promise<T | null> {
            return (await getFeatureFlagMetadata(key)) as T | null;
        },
    } satisfies Pick<FeatureFlagCache, 'getMetadataByKeyAndCache'>;
    const helperDateService = {
        create: vi.fn<HelperDateService['create']>(),
    } satisfies Pick<HelperDateService, 'create'>;
    const configGet = vi.fn((_key: string): unknown => undefined);
    const configService = {
        get<T>(key: string): T | undefined {
            return configGet(key) as T | undefined;
        },
    } satisfies Pick<ConfigService, 'get'>;
    const roleService = createMock<RoleDomain>();
    const countryService = createMock<CountryDomain>();
    const userUtil = createMock<UserUtil>();
    const userVerificationService = createMock<UserVerificationDomain>();
    const databaseUtil = createMock<DatabaseUtil>();
    const notificationQueue = createMock<NotificationQueue>();

    const now = new Date('2026-01-01T00:00:00.000Z');
    const tokens = {
        tokenType: 'Bearer',
        roleType: EnumRoleType.user,
        expiresIn: 3600,
        accessToken: 'access-token',
        refreshToken: 'refreshInTx-token',
    } satisfies IAuthToken;
    const loginOutcome = {
        isTwoFactorEnable: false,
        lastWorkspaceId: null,
        lastWorkspaceChangedAt: null,
        tokens,
    } satisfies IUserLoginOutcome;
    const user = {
        id: 'user-id',
        name: 'User',
        username: 'user',
        isVerified: true,
        verifiedAt: now,
        email: 'user@example.com',
        roleId: 'role-id',
        password: 'password-hash',
        passwordExpired: new Date('2026-02-01T00:00:00.000Z'),
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
        twoFactor: null,
    } satisfies IUser;
    const device = {
        fingerprint: 'fingerprint',
        name: 'Browser',
    };

    let service: UserAuthDomain;

    beforeEach(async () => {
        vi.resetAllMocks();
        configGet.mockImplementation((key: string) => {
            const values = {
                'user.default.role': 'User',
            };

            return values[key as keyof typeof values];
        });
        helperDateService.create.mockReturnValue(now);
        userRepository.findOneWithRoleByEmail.mockResolvedValue(user);
        authPasswordService.checkPasswordAttempt.mockReturnValue(false);
        authPasswordService.validatePassword.mockReturnValue(true);
        authPasswordService.checkPasswordExpired.mockReturnValue(false);
        userLoginService.handleLogin.mockResolvedValue(loginOutcome);
        userLoginService.refreshSession.mockResolvedValue(tokens);
        userLoginService.revokeSession.mockResolvedValue(undefined);
        userVerificationService.markVerified.mockResolvedValue(undefined);

        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                UserAuthDomain,
                { provide: UserRepository, useValue: userRepository },
                { provide: UserPasswordDomain, useValue: userPasswordDomain },
                { provide: RoleDomain, useValue: roleService },
                { provide: CountryDomain, useValue: countryService },
                { provide: UserUtil, useValue: userUtil },
                {
                    provide: UserVerificationDomain,
                    useValue: userVerificationService,
                },
                { provide: UserLoginDomain, useValue: userLoginService },
                { provide: AuthPasswordUtil, useValue: authPasswordService },
                {
                    provide: FeatureFlagCache,
                    useValue: featureFlagCacheService,
                },
                { provide: DatabaseUtil, useValue: databaseUtil },
                { provide: NotificationQueue, useValue: notificationQueue },
                { provide: HelperDateService, useValue: helperDateService },
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();
        service = moduleRef.get(UserAuthDomain);
    });

    describe('loginCredential', () => {
        it('resets password attempts and delegates a credential login for an active user', async () => {
            await expect(
                service.loginCredential({
                    email: user.email,
                    password: 'plain-password',
                    from: EnumUserLoginFrom.website,
                    device,
                })
            ).resolves.toEqual(loginOutcome);

            expect(userRepository.findOneWithRoleByEmail).toHaveBeenCalledWith(
                user.email
            );
            expect(authPasswordService.validatePassword).toHaveBeenCalledWith(
                'plain-password',
                user.password
            );
            expect(
                userPasswordDomain.resetPasswordAttempt
            ).toHaveBeenCalledWith(user.id);
            expect(userLoginService.handleLogin).toHaveBeenCalledWith(
                user,
                device,
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential,
                now
            );
        });

        it('throws UserNotFoundException when the email has no account', async () => {
            userRepository.findOneWithRoleByEmail.mockResolvedValue(null);

            await expect(
                service.loginCredential({
                    email: user.email,
                    password: 'plain-password',
                    from: EnumUserLoginFrom.website,
                    device,
                })
            ).rejects.toBeInstanceOf(UserNotFoundException);
            expect(authPasswordService.validatePassword).not.toHaveBeenCalled();
        });

        it('throws UserInactiveForbiddenException when the user is inactive', async () => {
            userRepository.findOneWithRoleByEmail.mockResolvedValue({
                ...user,
                status: EnumUserStatus.inactive,
            });

            await expect(
                service.loginCredential({
                    email: user.email,
                    password: 'plain-password',
                    from: EnumUserLoginFrom.website,
                    device,
                })
            ).rejects.toBeInstanceOf(UserInactiveForbiddenException);
        });

        it('throws UserPasswordNotSetException before validating credentials when no password exists', async () => {
            userRepository.findOneWithRoleByEmail.mockResolvedValue({
                ...user,
                password: null,
            });

            await expect(
                service.loginCredential({
                    email: user.email,
                    password: 'plain-password',
                    from: EnumUserLoginFrom.website,
                    device,
                })
            ).rejects.toBeInstanceOf(UserPasswordNotSetException);
            expect(authPasswordService.validatePassword).not.toHaveBeenCalled();
        });

        it('marks max-attempt users inactive before throwing UserPasswordAttemptMaxException', async () => {
            authPasswordService.checkPasswordAttempt.mockReturnValue(true);

            await expect(
                service.loginCredential({
                    email: user.email,
                    password: 'plain-password',
                    from: EnumUserLoginFrom.website,
                    device,
                })
            ).rejects.toBeInstanceOf(UserPasswordAttemptMaxException);
            expect(
                userPasswordDomain.reachMaxPasswordAttempt
            ).toHaveBeenCalledWith(user.id);
        });

        it('increments password attempts when the password does not match', async () => {
            authPasswordService.validatePassword.mockReturnValue(false);

            await expect(
                service.loginCredential({
                    email: user.email,
                    password: 'wrong-password',
                    from: EnumUserLoginFrom.website,
                    device,
                })
            ).rejects.toBeInstanceOf(UserPasswordNotMatchException);
            expect(
                userPasswordDomain.increasePasswordAttempt
            ).toHaveBeenCalledWith(user.id);
        });

        it('throws UserPasswordExpiredException after resetting attempts for expired credentials', async () => {
            authPasswordService.checkPasswordExpired.mockReturnValue(true);

            await expect(
                service.loginCredential({
                    email: user.email,
                    password: 'plain-password',
                    from: EnumUserLoginFrom.website,
                    device,
                })
            ).rejects.toBeInstanceOf(UserPasswordExpiredException);
            expect(
                userPasswordDomain.resetPasswordAttempt
            ).toHaveBeenCalledWith(user.id);
            expect(userLoginService.handleLogin).not.toHaveBeenCalled();
        });
    });

    describe('loginWithSocial', () => {
        it('verifies an existing unverified social user before login', async () => {
            const unverifiedUser = {
                ...user,
                isVerified: false,
                verifiedAt: null,
                signUpWith: EnumUserSignUpWith.socialGoogle,
                password: null,
            } satisfies IUser;
            userRepository.findOneWithRoleByEmail.mockResolvedValue(
                unverifiedUser
            );

            await expect(
                service.loginWithSocial(
                    user.email,
                    EnumUserLoginWith.socialGoogle,
                    {
                        username: 'user',
                        countryId: 'country-id',
                        from: EnumUserLoginFrom.website,
                        device,
                        cookies: true,
                        marketing: false,
                    }
                )
            ).resolves.toEqual(loginOutcome);

            expect(userVerificationService.markVerified).toHaveBeenCalledWith(
                user.id
            );
            expect(userLoginService.handleLogin).toHaveBeenCalledWith(
                expect.objectContaining({ id: user.id, isVerified: true }),
                device,
                EnumUserLoginFrom.website,
                EnumUserLoginWith.socialGoogle,
                now
            );
        });
    });

    describe('refreshInTx', () => {
        it('delegates refreshInTx token rotation to the login service', async () => {
            await expect(
                service.refresh(user, 'refreshInTx-token')
            ).resolves.toEqual(tokens);
            expect(userLoginService.refreshSession).toHaveBeenCalledWith(
                user,
                'refreshInTx-token'
            );
        });
    });

    describe('logout', () => {
        it('revokes the session cache before persisting the logout', async () => {
            const order: string[] = [];
            userLoginService.revokeSession.mockImplementation(async () => {
                order.push('revokeInTx');
            });
            userLoginService.logout.mockImplementation(async () => {
                order.push('logout');
            });

            await service.logout('user-id', 'session-id', 'ownership-id');

            expect(order).toEqual(['logout']);
            expect(userLoginService.logout).toHaveBeenCalledWith(
                'user-id',
                'session-id',
                'ownership-id'
            );
        });
    });
});
