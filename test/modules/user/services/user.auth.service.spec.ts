import { createMock } from '@golevelup/ts-vitest';
import { Test, type TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
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
import type { IAuthToken } from '@modules/auth/interfaces/auth.interface';
import { AuthPasswordService } from '@modules/auth/services/auth.password.service';
import { CountryService } from '@modules/country/services/country.service';
import { FeatureFlagCacheService } from '@modules/feature-flag/services/feature-flag.cache.service';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { RoleService } from '@modules/role/services/role.service';
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
import { UserOnboardingRepository } from '@modules/user/repositories/user.onboarding.repository';
import { UserPasswordRepository } from '@modules/user/repositories/user.password.repository';
import { UserRepository } from '@modules/user/repositories/user.repository';
import { UserSessionRepository } from '@modules/user/repositories/user.session.repository';
import { UserVerificationRepository } from '@modules/user/repositories/user.verification.repository';
import { UserAuthService } from '@modules/user/services/user.auth.service';
import { UserLoginService } from '@modules/user/services/user.login.service';
import { UserOnboardingService } from '@modules/user/services/user.onboarding.service';
import { UserVerificationService } from '@modules/user/services/user.verification.service';
import { UserOnboardingUtil } from '@modules/user/utils/user.onboarding.util';
import { UserUtil } from '@modules/user/utils/user.util';

describe('UserAuthService', () => {
    const userRepository = {
        findOneWithRoleByEmail:
            vi.fn<UserRepository['findOneWithRoleByEmail']>(),
    } satisfies Pick<UserRepository, 'findOneWithRoleByEmail'>;
    const userPasswordRepository = {
        reachMaxPasswordAttempt:
            vi.fn<UserPasswordRepository['reachMaxPasswordAttempt']>(),
        increasePasswordAttempt:
            vi.fn<UserPasswordRepository['increasePasswordAttempt']>(),
        resetPasswordAttempt:
            vi.fn<UserPasswordRepository['resetPasswordAttempt']>(),
    } satisfies Pick<
        UserPasswordRepository,
        | 'reachMaxPasswordAttempt'
        | 'increasePasswordAttempt'
        | 'resetPasswordAttempt'
    >;
    const userSessionRepository = {
        logout: vi.fn<UserSessionRepository['logout']>(),
    } satisfies Pick<UserSessionRepository, 'logout'>;
    const userVerificationRepository = {
        verify: vi.fn<UserVerificationRepository['verify']>(),
    } satisfies Pick<UserVerificationRepository, 'verify'>;
    const userLoginService = {
        handleLogin: vi.fn<UserLoginService['handleLogin']>(),
        refreshSession: vi.fn<UserLoginService['refreshSession']>(),
        revokeSession: vi.fn<UserLoginService['revokeSession']>(),
    } satisfies Pick<
        UserLoginService,
        'handleLogin' | 'refreshSession' | 'revokeSession'
    >;
    const authPasswordService = {
        checkPasswordAttempt:
            vi.fn<AuthPasswordService['checkPasswordAttempt']>(),
        validatePassword: vi.fn<AuthPasswordService['validatePassword']>(),
        checkPasswordExpired:
            vi.fn<AuthPasswordService['checkPasswordExpired']>(),
    } satisfies Pick<
        AuthPasswordService,
        'checkPasswordAttempt' | 'validatePassword' | 'checkPasswordExpired'
    >;
    const getFeatureFlagMetadata = vi.fn(
        async (_key: string): Promise<unknown> => null
    );
    const featureFlagCacheService = {
        async getMetadataByKeyAndCache<T>(key: string): Promise<T | null> {
            return (await getFeatureFlagMetadata(key)) as T | null;
        },
    } satisfies Pick<FeatureFlagCacheService, 'getMetadataByKeyAndCache'>;
    const helperDateService = {
        create: vi.fn<HelperDateService['create']>(),
    } satisfies Pick<HelperDateService, 'create'>;
    const requestStoreGet = vi.fn((_key: string): unknown => null);
    const requestStoreService = {
        get<T>(key: string): T | null {
            return requestStoreGet(key) as T | null;
        },
    } satisfies Pick<RequestStoreService, 'get'>;
    const configGet = vi.fn((_key: string): unknown => undefined);
    const configService = {
        get<T>(key: string): T | undefined {
            return configGet(key) as T | undefined;
        },
    } satisfies Pick<ConfigService, 'get'>;
    const userOnboardingRepository = createMock<UserOnboardingRepository>();
    const roleService = createMock<RoleService>();
    const countryService = createMock<CountryService>();
    const userUtil = createMock<UserUtil>();
    const userVerificationService = createMock<UserVerificationService>();
    const userOnboardingUtil = createMock<UserOnboardingUtil>();
    const userOnboardingService = createMock<UserOnboardingService>();
    const helperHashService = createMock<HelperHashService>();
    const databaseUtil = createMock<DatabaseUtil>();
    const notificationQueue = createMock<NotificationQueue>();

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
        refreshToken: 'refresh-token',
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

    let service: UserAuthService;

    beforeEach(async () => {
        vi.resetAllMocks();
        requestStoreGet.mockReturnValue(requestLog);
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
        userVerificationRepository.verify.mockResolvedValue({
            ...user,
            isVerified: true,
            verifiedAt: now,
        });

        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                UserAuthService,
                { provide: UserRepository, useValue: userRepository },
                {
                    provide: UserOnboardingRepository,
                    useValue: userOnboardingRepository,
                },
                {
                    provide: UserPasswordRepository,
                    useValue: userPasswordRepository,
                },
                {
                    provide: UserSessionRepository,
                    useValue: userSessionRepository,
                },
                {
                    provide: UserVerificationRepository,
                    useValue: userVerificationRepository,
                },
                { provide: RoleService, useValue: roleService },
                { provide: CountryService, useValue: countryService },
                { provide: UserUtil, useValue: userUtil },
                {
                    provide: UserVerificationService,
                    useValue: userVerificationService,
                },
                { provide: HelperHashService, useValue: helperHashService },
                { provide: UserOnboardingUtil, useValue: userOnboardingUtil },
                {
                    provide: UserOnboardingService,
                    useValue: userOnboardingService,
                },
                { provide: UserLoginService, useValue: userLoginService },
                { provide: AuthPasswordService, useValue: authPasswordService },
                {
                    provide: FeatureFlagCacheService,
                    useValue: featureFlagCacheService,
                },
                { provide: DatabaseUtil, useValue: databaseUtil },
                { provide: NotificationQueue, useValue: notificationQueue },
                { provide: HelperDateService, useValue: helperDateService },
                { provide: RequestStoreService, useValue: requestStoreService },
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();

        service = moduleRef.get(UserAuthService);
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
                userPasswordRepository.resetPasswordAttempt
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
                userPasswordRepository.reachMaxPasswordAttempt
            ).toHaveBeenCalledWith(user.id, requestLog);
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
                userPasswordRepository.increasePasswordAttempt
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
                userPasswordRepository.resetPasswordAttempt
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

            expect(userVerificationRepository.verify).toHaveBeenCalledWith(
                user.id,
                requestLog
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

    describe('refresh', () => {
        it('delegates refresh token rotation to the login service', async () => {
            await expect(
                service.refresh(user, 'refresh-token')
            ).resolves.toEqual(tokens);
            expect(userLoginService.refreshSession).toHaveBeenCalledWith(
                user,
                'refresh-token'
            );
        });
    });

    describe('logout', () => {
        it('revokes the session cache before persisting the logout', async () => {
            const order: string[] = [];
            userLoginService.revokeSession.mockImplementation(async () => {
                order.push('revoke');
            });
            userSessionRepository.logout.mockImplementation(async () => {
                order.push('logout');
                return user;
            });

            await service.logout('user-id', 'session-id', 'ownership-id');

            expect(order).toEqual(['revoke', 'logout']);
            expect(userSessionRepository.logout).toHaveBeenCalledWith(
                'user-id',
                'session-id',
                'ownership-id',
                requestLog
            );
        });
    });
});
