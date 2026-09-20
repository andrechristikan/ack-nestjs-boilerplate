import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { ConfigService } from '@nestjs/config';

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
    const userRepository: MockProxy<UserRepository> = mock<UserRepository>();
    const userPasswordDomain: MockProxy<UserPasswordDomain> =
        mock<UserPasswordDomain>();
    const roleDomain: MockProxy<RoleDomain> = mock<RoleDomain>();
    const countryDomain: MockProxy<CountryDomain> = mock<CountryDomain>();
    const userUtil: MockProxy<UserUtil> = mock<UserUtil>();
    const userVerificationDomain: MockProxy<UserVerificationDomain> =
        mock<UserVerificationDomain>();
    const userLoginDomain: MockProxy<UserLoginDomain> = mock<UserLoginDomain>();
    const authPasswordUtil: MockProxy<AuthPasswordUtil> =
        mock<AuthPasswordUtil>();
    const featureFlagCache: MockProxy<FeatureFlagCache> =
        mock<FeatureFlagCache>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();
    const notificationQueue: MockProxy<NotificationQueue> =
        mock<NotificationQueue>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>();

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
        vi.mocked(configService.get).mockImplementation((key: string) => {
            const values = {
                'user.default.role': 'User',
            };

            return values[key as keyof typeof values];
        });
        helperDateService.create.mockReturnValue(now);
        userRepository.findOneWithRoleByEmail.mockResolvedValue(user);
        authPasswordUtil.checkPasswordAttempt.mockReturnValue(false);
        authPasswordUtil.validatePassword.mockReturnValue(true);
        authPasswordUtil.checkPasswordExpired.mockReturnValue(false);
        userLoginDomain.handleLogin.mockResolvedValue(loginOutcome);
        userLoginDomain.refreshSession.mockResolvedValue(tokens);
        userLoginDomain.logout.mockResolvedValue(undefined);
        userVerificationDomain.markVerified.mockResolvedValue(undefined);

        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                UserAuthDomain,
                { provide: UserRepository, useValue: userRepository },
                { provide: UserPasswordDomain, useValue: userPasswordDomain },
                { provide: RoleDomain, useValue: roleDomain },
                { provide: CountryDomain, useValue: countryDomain },
                { provide: UserUtil, useValue: userUtil },
                {
                    provide: UserVerificationDomain,
                    useValue: userVerificationDomain,
                },
                { provide: UserLoginDomain, useValue: userLoginDomain },
                { provide: AuthPasswordUtil, useValue: authPasswordUtil },
                {
                    provide: FeatureFlagCache,
                    useValue: featureFlagCache,
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
            expect(authPasswordUtil.validatePassword).toHaveBeenCalledWith(
                'plain-password',
                user.password
            );
            expect(
                userPasswordDomain.resetPasswordAttempt
            ).toHaveBeenCalledWith(user.id);
            expect(userLoginDomain.handleLogin).toHaveBeenCalledWith(
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
            expect(authPasswordUtil.validatePassword).not.toHaveBeenCalled();
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
            expect(authPasswordUtil.validatePassword).not.toHaveBeenCalled();
        });

        it('marks max-attempt users inactive before throwing UserPasswordAttemptMaxException', async () => {
            authPasswordUtil.checkPasswordAttempt.mockReturnValue(true);

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
            authPasswordUtil.validatePassword.mockReturnValue(false);

            await expect(
                service.loginCredential({
                    email: user.email,
                    password: 'wrong-password',
                    from: EnumUserLoginFrom.website,
                    device,
                })
            ).rejects.toBeInstanceOf(UserPasswordNotMatchException);
            expect(userLoginDomain.recordLoginFailed).toHaveBeenCalledWith(
                user.id
            );
        });

        it('throws UserPasswordExpiredException after resetting attempts for expired credentials', async () => {
            authPasswordUtil.checkPasswordExpired.mockReturnValue(true);

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
            expect(userLoginDomain.handleLogin).not.toHaveBeenCalled();
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

            expect(userVerificationDomain.markVerified).toHaveBeenCalledWith(
                user.id
            );
            expect(userLoginDomain.handleLogin).toHaveBeenCalledWith(
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
            expect(userLoginDomain.refreshSession).toHaveBeenCalledWith(
                user,
                'refreshInTx-token'
            );
        });
    });

    describe('logout', () => {
        it('revokes the session cache before persisting the logout', async () => {
            const order: string[] = [];
            userLoginDomain.logout.mockImplementation(async () => {
                order.push('logout');
            });

            await service.logout('user-id', 'session-id', 'ownership-id');

            expect(order).toEqual(['logout']);
            expect(userLoginDomain.logout).toHaveBeenCalledWith(
                'user-id',
                'session-id',
                'ownership-id'
            );
        });
    });
});
