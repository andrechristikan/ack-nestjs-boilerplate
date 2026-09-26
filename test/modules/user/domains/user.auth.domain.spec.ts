import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { ConfigService } from '@nestjs/config';

import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
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
import { CountryNotFoundException } from '@modules/country/exceptions/country.not-found.exception';
import { FeatureFlagCache } from '@modules/feature-flag/caches/feature-flag.cache';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { RoleDomain } from '@modules/role/domains/role.domain';
import { RoleNotFoundException } from '@modules/role/exceptions/role.not-found.exception';
import { UserEmailExistException } from '@modules/user/exceptions/user.email-exist.exception';
import { UserInactiveForbiddenException } from '@modules/user/exceptions/user.inactive-forbidden.exception';
import { UserNotFoundException } from '@modules/user/exceptions/user.not-found.exception';
import { UserPasswordAttemptMaxException } from '@modules/user/exceptions/user.password-attempt-max.exception';
import { UserPasswordExpiredException } from '@modules/user/exceptions/user.password-expired.exception';
import { UserPasswordNotMatchException } from '@modules/user/exceptions/user.password-not-match.exception';
import { UserPasswordNotSetException } from '@modules/user/exceptions/user.password-not-set.exception';
import { UserUsernameContainBadWordException } from '@modules/user/exceptions/user.username-contain-bad-word.exception';
import { UserUsernameExistException } from '@modules/user/exceptions/user.username-exist.exception';
import { UserUsernameNotAllowedException } from '@modules/user/exceptions/user.username-not-allowed.exception';
import type {
    IUser,
    IUserLoginOutcome,
    IUserSignUpWorkspaceContext,
} from '@modules/user/interfaces/user.interface';
import { UserRepository } from '@modules/user/repositories/user.repository';
import { UserAuthDomain } from '@modules/user/domains/user.auth.domain';
import { UserLoginDomain } from '@modules/user/domains/user.login.domain';
import { UserPasswordDomain } from '@modules/user/domains/user.password.domain';
import { UserVerificationDomain } from '@modules/user/domains/user.verification.domain';
import { UserUtil } from '@modules/user/utils/user.util';

vi.mock('@common/sentry/services/sentry.service', () => ({
    SentryService: class {},
}));

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
    const workspaceContext = mock<IUserSignUpWorkspaceContext>();
    const socialInput = {
        username: 'social-user',
        name: 'Social User',
        countryId: 'country-id',
        from: EnumUserLoginFrom.website,
        device,
        cookies: true,
        marketing: false,
    };

    let service: UserAuthDomain;

    beforeEach(async () => {
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
        roleDomain.getByName.mockResolvedValue(user.role);
        countryDomain.existsById.mockResolvedValue(true);
        featureFlagCache.getMetadataByKeyAndCache.mockResolvedValue({
            signUpAllowed: true,
        });
        userRepository.existsByEmail.mockResolvedValue(false);
        userRepository.existsByUsername.mockResolvedValue(false);
        userUtil.checkUsernamePattern.mockReturnValue(false);
        userUtil.checkBadWord.mockResolvedValue(false);
        databaseUtil.createId.mockReturnValue('new-user-id');

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

    it('delegates workspace invitation eligibility', async () => {
        await expect(
            service.assertWorkspaceInvitationAllowed()
        ).resolves.toBeUndefined();
        expect(
            userLoginDomain.assertWorkspaceInvitationAllowed
        ).toHaveBeenCalledOnce();
    });

    describe('prepareSocialCreate', () => {
        beforeEach(() => {
            userRepository.findOneWithRoleByEmail.mockResolvedValue(null);
        });

        it.each([
            ['existing user', user, { signUpAllowed: true }],
            ['disabled provider', null, { signUpAllowed: false }],
            ['missing provider metadata', null, null],
        ])('returns null for an %s', async (_case, found, metadata) => {
            userRepository.findOneWithRoleByEmail.mockResolvedValue(found);
            featureFlagCache.getMetadataByKeyAndCache.mockResolvedValue(
                metadata
            );

            await expect(
                service.prepareSocialCreate(
                    user.email,
                    EnumUserLoginWith.socialGoogle,
                    socialInput,
                    workspaceContext
                )
            ).resolves.toBeNull();
        });

        it('maps an Apple account and accepted optional policies into onboarding input', async () => {
            const result = await service.prepareSocialCreate(
                user.email,
                EnumUserLoginWith.socialApple,
                { ...socialInput, cookies: true, marketing: true },
                workspaceContext
            );

            expect(
                featureFlagCache.getMetadataByKeyAndCache
            ).toHaveBeenCalledWith('loginWithApple');
            expect(result).toMatchObject({
                userId: 'new-user-id',
                signUpWith: EnumUserSignUpWith.socialApple,
                isVerified: true,
                password: null,
                verification: null,
                workspaceContext,
                createdBy: 'new-user-id',
                termPolicy: {
                    cookies: true,
                    marketing: true,
                },
            });
            expect(result?.acceptedTermPolicyTypes).toEqual(
                expect.arrayContaining(['cookies', 'marketing'])
            );
        });

        it('maps a Google account with nullable name and declined optional policies', async () => {
            const result = await service.prepareSocialCreate(
                user.email,
                EnumUserLoginWith.socialGoogle,
                {
                    ...socialInput,
                    name: undefined,
                    cookies: false,
                    marketing: false,
                },
                workspaceContext
            );

            expect(
                featureFlagCache.getMetadataByKeyAndCache
            ).toHaveBeenCalledWith('loginWithGoogle');
            expect(result).toMatchObject({
                name: null,
                signUpWith: EnumUserSignUpWith.socialGoogle,
            });
        });

        it('rejects social creation without the configured user role', async () => {
            roleDomain.getByName.mockResolvedValue(null);

            await expect(
                service.prepareSocialCreate(
                    user.email,
                    EnumUserLoginWith.socialGoogle,
                    socialInput,
                    workspaceContext
                )
            ).rejects.toBeInstanceOf(RoleNotFoundException);
        });

        it.each([
            [
                'invalid pattern',
                true,
                false,
                false,
                UserUsernameNotAllowedException,
            ],
            [
                'bad word',
                false,
                true,
                false,
                UserUsernameContainBadWordException,
            ],
            ['duplicate', false, false, true, UserUsernameExistException],
        ])(
            'rejects a social username with %s',
            async (_case, invalid, badWord, exists, ExceptionClass) => {
                userUtil.checkUsernamePattern.mockReturnValue(invalid);
                userUtil.checkBadWord.mockResolvedValue(badWord);
                userRepository.existsByUsername.mockResolvedValue(exists);

                await expect(
                    service.prepareSocialCreate(
                        user.email,
                        EnumUserLoginWith.socialGoogle,
                        socialInput,
                        workspaceContext
                    )
                ).rejects.toBeInstanceOf(ExceptionClass);
            }
        );
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

        it('logs in an already verified social user without marking it again', async () => {
            await service.loginWithSocial(
                user.email,
                EnumUserLoginWith.socialGoogle,
                socialInput
            );

            expect(userVerificationDomain.markVerified).not.toHaveBeenCalled();
        });

        it.each([
            ['missing', null, UserNotFoundException],
            [
                'inactive',
                { ...user, status: EnumUserStatus.inactive },
                UserInactiveForbiddenException,
            ],
        ])('rejects a %s social user', async (_case, found, ExceptionClass) => {
            userRepository.findOneWithRoleByEmail.mockResolvedValue(found);

            await expect(
                service.loginWithSocial(
                    user.email,
                    EnumUserLoginWith.socialGoogle,
                    socialInput
                )
            ).rejects.toBeInstanceOf(ExceptionClass);
        });
    });

    describe('prepareSignUp', () => {
        const signUpInput = {
            username: 'new-user',
            email: 'new@example.com',
            name: 'New User',
            countryId: 'country-id',
            password: 'plain-password',
            from: EnumUserSignUpFrom.website,
            cookies: true,
            marketing: true,
        };
        const emailVerification = {
            type: 'email' as const,
            expiredAt: new Date('2026-01-01T01:00:00.000Z'),
            expiredInMinutes: 60,
            resendInMinutes: 10,
            reference: 'VE-RANDOM',
            token: 'plain-token',
            hashedToken: 'hashed-token',
            link: 'https://app.example.com/verify?token=plain-token',
        };

        beforeEach(() => {
            authPasswordUtil.createPassword.mockReturnValue({
                passwordHash: 'hash',
                passwordCreated: now,
                passwordExpired: user.passwordExpired!,
                passwordPeriodExpired: user.passwordExpired!,
            });
            userVerificationDomain.verificationCreateVerification.mockReturnValue(
                emailVerification
            );
        });

        it('prepares credential onboarding and its email verification', async () => {
            const result = await service.prepareSignUp(
                signUpInput,
                workspaceContext
            );

            expect(result.emailVerification).toBe(emailVerification);
            expect(result.input).toMatchObject({
                userId: 'new-user-id',
                email: signUpInput.email,
                name: signUpInput.name,
                username: signUpInput.username,
                signUpWith: EnumUserSignUpWith.credential,
                isVerified: false,
                workspaceContext,
                createdBy: 'new-user-id',
                verification: {
                    reference: emailVerification.reference,
                    token: emailVerification.hashedToken,
                    to: signUpInput.email,
                    isUsed: false,
                },
            });
            expect(result.input.acceptedTermPolicyTypes).toEqual(
                expect.arrayContaining(['cookies', 'marketing'])
            );
        });

        it('normalizes an omitted name and declined optional policies', async () => {
            const result = await service.prepareSignUp(
                {
                    ...signUpInput,
                    name: undefined,
                    cookies: false,
                    marketing: false,
                },
                workspaceContext
            );

            expect(result.input.name).toBeNull();
            expect(result.input.termPolicy.cookies).toBe(false);
            expect(result.input.termPolicy.marketing).toBe(false);
        });

        it.each([
            ['missing role', null, true, false, RoleNotFoundException],
            [
                'missing country',
                user.role,
                false,
                false,
                CountryNotFoundException,
            ],
            ['duplicate email', user.role, true, true, UserEmailExistException],
        ])(
            'rejects sign-up for a %s',
            async (_case, role, countryExists, emailExists, ExceptionClass) => {
                roleDomain.getByName.mockResolvedValue(role);
                countryDomain.existsById.mockResolvedValue(countryExists);
                userRepository.existsByEmail.mockResolvedValue(emailExists);

                await expect(
                    service.prepareSignUp(signUpInput, workspaceContext)
                ).rejects.toBeInstanceOf(ExceptionClass);
            }
        );

        it.each([
            [
                'invalid pattern',
                true,
                false,
                false,
                UserUsernameNotAllowedException,
            ],
            [
                'bad word',
                false,
                true,
                false,
                UserUsernameContainBadWordException,
            ],
            ['duplicate', false, false, true, UserUsernameExistException],
        ])(
            'rejects sign-up with a username containing %s',
            async (_case, invalid, badWord, exists, ExceptionClass) => {
                userUtil.checkUsernamePattern.mockReturnValue(invalid);
                userUtil.checkBadWord.mockResolvedValue(badWord);
                userRepository.existsByUsername.mockResolvedValue(exists);

                await expect(
                    service.prepareSignUp(signUpInput, workspaceContext)
                ).rejects.toBeInstanceOf(ExceptionClass);
            }
        );

        it('shapes and queues a welcome notification', async () => {
            helperDateService.formatToIso.mockReturnValue(
                '2026-01-01T01:00:00.000Z'
            );

            await service.notifyWelcome(user.id, emailVerification);

            expect(notificationQueue.sendWelcome).toHaveBeenCalledWith(
                user.id,
                {
                    expiredAt: '2026-01-01T01:00:00.000Z',
                    reference: emailVerification.reference,
                    link: emailVerification.link,
                    expiredInMinutes: 60,
                }
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

        it('preserves a domain exception raised during logout', async () => {
            userLoginDomain.logout.mockRejectedValue(
                new UserNotFoundException()
            );

            await expect(
                service.logout('user-id', 'session-id', 'ownership-id')
            ).rejects.toBeInstanceOf(UserNotFoundException);
        });

        it('wraps an unexpected logout failure', async () => {
            userLoginDomain.logout.mockRejectedValue(new Error('cache down'));

            await expect(
                service.logout('user-id', 'session-id', 'ownership-id')
            ).rejects.toBeInstanceOf(AppUnknownException);
        });
    });
});
