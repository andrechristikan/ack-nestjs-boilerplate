import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumRoleType,
    EnumTermPolicyType,
    EnumUserLoginFrom,
    EnumUserLoginWith,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
    EnumVerificationType,
} from '@generated/prisma-client/client';
import { EnumAppStatusCodeError } from '@app/enums/app.status-code.enum';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { AuthPasswordUtil } from '@modules/auth/utils/auth.password.util';
import type { IAuthToken } from '@modules/auth/interfaces/auth.interface';
import { CountryDomain } from '@modules/country/domains/country.domain';
import { CountryNotFoundException } from '@modules/country/exceptions/country.not-found.exception';
import { EnumCountryStatusCodeError } from '@modules/country/enums/country.status-code.enum';
import { FeatureFlagCache } from '@modules/feature-flag/caches/feature-flag.cache';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { RoleDomain } from '@modules/role/domains/role.domain';
import { RoleNotFoundException } from '@modules/role/exceptions/role.not-found.exception';
import { EnumRoleStatusCodeError } from '@modules/role/enums/role.status-code.enum';
import type { IRole } from '@modules/role/interfaces/role.interface';
import { UserAuthDomain } from '@modules/user/domains/user.auth.domain';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
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
    IUserSignUpWorkspacePersonal,
    IUserVerificationEmailCreate,
} from '@modules/user/interfaces/user.interface';
import { UserPasswordDomain } from '@modules/user/domains/user.password.domain';
import { UserRepository } from '@modules/user/repositories/user.repository';
import { UserLoginDomain } from '@modules/user/domains/user.login.domain';
import { UserVerificationDomain } from '@modules/user/domains/user.verification.domain';
import { UserUtil } from '@modules/user/utils/user.util';
import { EnumUserSignUpWorkspaceContextType } from '@modules/user/enums/user.enum';

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
    const configGet = vi.fn<(key: string) => string | undefined>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });

    let domain: UserAuthDomain;

    const now = new Date('2026-03-01T00:00:00.000Z');
    const workspaceContext: IUserSignUpWorkspacePersonal = {
        type: EnumUserSignUpWorkspaceContextType.personal,
        workspaceId: 'workspace-halcyon',
        slugCandidates: ['w-halcyon'],
        name: "halcyonVane's Workspace",
    };

    function buildUser(overrides: Partial<IUser> = {}): IUser {
        return {
            id: 'user-halcyon',
            name: 'Halcyon Vane',
            username: 'halcyonVane',
            isVerified: true,
            verifiedAt: new Date('2026-01-01T00:00:00.000Z'),
            email: 'halcyon@example.com',
            roleId: 'role-halcyon',
            password: 'hashed-password',
            passwordExpired: new Date('2026-06-01T00:00:00.000Z'),
            passwordCreated: new Date('2026-01-01T00:00:00.000Z'),
            passwordAttempt: 0,
            signUpAt: new Date('2026-01-01T00:00:00.000Z'),
            signUpFrom: EnumUserSignUpFrom.website,
            signUpWith: EnumUserSignUpWith.credential,
            status: EnumUserStatus.active,
            gender: null,
            countryId: 'country-halcyon',
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
                id: 'role-halcyon',
                name: 'user',
                description: null,
                type: EnumRoleType.user,
                createdAt: new Date('2026-01-01T00:00:00.000Z'),
                createdBy: null,
                updatedAt: new Date('2026-01-01T00:00:00.000Z'),
                updatedBy: null,
                policies: [],
            },
            twoFactor: null,
            ...overrides,
        };
    }

    const outcome: IUserLoginOutcome = {
        isTwoFactorEnable: false,
        lastWorkspaceId: null,
        lastWorkspaceChangedAt: null,
        tokens: {
            tokenType: 'Bearer',
            roleType: EnumRoleType.user,
            expiresIn: 3600,
            accessToken: 'access-token',
            refreshToken: 'refresh-token',
        },
    };
    const device = { fingerprint: 'device-halcyon' };

    beforeEach(async () => {
        vi.resetAllMocks();

        configGet.mockImplementation(() => 'user');
        helperDateService.create.mockReturnValue(now);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserAuthDomain,
                { provide: UserRepository, useValue: userRepository },
                {
                    provide: UserPasswordDomain,
                    useValue: userPasswordDomain,
                },
                { provide: RoleDomain, useValue: roleDomain },
                { provide: CountryDomain, useValue: countryDomain },
                { provide: UserUtil, useValue: userUtil },
                {
                    provide: UserVerificationDomain,
                    useValue: userVerificationDomain,
                },
                { provide: UserLoginDomain, useValue: userLoginDomain },
                { provide: AuthPasswordUtil, useValue: authPasswordUtil },
                { provide: FeatureFlagCache, useValue: featureFlagCache },
                { provide: DatabaseUtil, useValue: databaseUtil },
                { provide: NotificationQueue, useValue: notificationQueue },
                { provide: HelperDateService, useValue: helperDateService },
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();
        domain = module.get(UserAuthDomain);
    });

    describe('assertWorkspaceInvitationAllowed', () => {
        it('delegates to the login domain', async () => {
            await domain.assertWorkspaceInvitationAllowed();

            expect(
                userLoginDomain.assertWorkspaceInvitationAllowed
            ).toHaveBeenCalled();
        });
    });

    describe('loginCredential', () => {
        it('logs the user in when the credentials are valid', async () => {
            const user = buildUser();
            userRepository.findOneWithRoleByEmail.mockResolvedValue(user);
            authPasswordUtil.checkPasswordAttempt.mockReturnValue(false);
            authPasswordUtil.validatePassword.mockReturnValue(true);
            authPasswordUtil.checkPasswordExpired.mockReturnValue(false);
            userLoginDomain.handleLogin.mockResolvedValue(outcome);

            await expect(
                domain.loginCredential({
                    email: user.email,
                    password: 'plain-password',
                    from: EnumUserLoginFrom.website,
                    device,
                })
            ).resolves.toBe(outcome);
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

        it('throws UserNotFoundException when the user does not exist', async () => {
            userRepository.findOneWithRoleByEmail.mockResolvedValue(null);

            const call = (): Promise<IUserLoginOutcome> =>
                domain.loginCredential({
                    email: 'missing@example.com',
                    password: 'plain-password',
                    from: EnumUserLoginFrom.website,
                    device,
                });

            await expect(call()).rejects.toThrow(UserNotFoundException);
            await expect(call()).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.notFound,
                statusCodeKey:
                    EnumUserStatusCodeError[EnumUserStatusCodeError.notFound],
                messagePath: 'user.error.notFound',
            });
        });

        it('throws UserInactiveForbiddenException when the user is not active', async () => {
            userRepository.findOneWithRoleByEmail.mockResolvedValue(
                buildUser({ status: EnumUserStatus.inactive })
            );

            const call = (): Promise<IUserLoginOutcome> =>
                domain.loginCredential({
                    email: 'halcyon@example.com',
                    password: 'plain-password',
                    from: EnumUserLoginFrom.website,
                    device,
                });

            await expect(call()).rejects.toThrow(
                UserInactiveForbiddenException
            );
            await expect(call()).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.inactiveForbidden,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.inactiveForbidden
                    ],
                messagePath: 'user.error.inactive',
            });
        });

        it('throws UserPasswordNotSetException when the user has no password', async () => {
            userRepository.findOneWithRoleByEmail.mockResolvedValue(
                buildUser({ password: null })
            );

            const call = (): Promise<IUserLoginOutcome> =>
                domain.loginCredential({
                    email: 'halcyon@example.com',
                    password: 'plain-password',
                    from: EnumUserLoginFrom.website,
                    device,
                });

            await expect(call()).rejects.toThrow(UserPasswordNotSetException);
            await expect(call()).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.passwordNotSet,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.passwordNotSet
                    ],
                messagePath: 'auth.error.passwordNotSet',
            });
        });

        it('reaches the max attempt limit and throws UserPasswordAttemptMaxException', async () => {
            const user = buildUser();
            userRepository.findOneWithRoleByEmail.mockResolvedValue(user);
            authPasswordUtil.checkPasswordAttempt.mockReturnValue(true);

            const call = (): Promise<IUserLoginOutcome> =>
                domain.loginCredential({
                    email: user.email,
                    password: 'plain-password',
                    from: EnumUserLoginFrom.website,
                    device,
                });

            await expect(call()).rejects.toThrow(
                UserPasswordAttemptMaxException
            );
            await expect(call()).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.passwordAttemptMax,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.passwordAttemptMax
                    ],
                messagePath: 'auth.error.passwordAttemptMax',
            });
            expect(
                userPasswordDomain.reachMaxPasswordAttempt
            ).toHaveBeenCalledWith(user.id);
        });

        it('records a failed login and throws UserPasswordNotMatchException', async () => {
            const user = buildUser();
            userRepository.findOneWithRoleByEmail.mockResolvedValue(user);
            authPasswordUtil.checkPasswordAttempt.mockReturnValue(false);
            authPasswordUtil.validatePassword.mockReturnValue(false);

            const call = (): Promise<IUserLoginOutcome> =>
                domain.loginCredential({
                    email: user.email,
                    password: 'wrong-password',
                    from: EnumUserLoginFrom.website,
                    device,
                });

            await expect(call()).rejects.toThrow(UserPasswordNotMatchException);
            await expect(call()).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.passwordNotMatch,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.passwordNotMatch
                    ],
                messagePath: 'auth.error.passwordNotMatch',
            });
            expect(userLoginDomain.recordLoginFailed).toHaveBeenCalledWith(
                user.id
            );
        });

        it('throws UserPasswordExpiredException when the password has expired', async () => {
            const user = buildUser();
            userRepository.findOneWithRoleByEmail.mockResolvedValue(user);
            authPasswordUtil.checkPasswordAttempt.mockReturnValue(false);
            authPasswordUtil.validatePassword.mockReturnValue(true);
            authPasswordUtil.checkPasswordExpired.mockReturnValue(true);

            const call = (): Promise<IUserLoginOutcome> =>
                domain.loginCredential({
                    email: user.email,
                    password: 'plain-password',
                    from: EnumUserLoginFrom.website,
                    device,
                });

            await expect(call()).rejects.toThrow(UserPasswordExpiredException);
            await expect(call()).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.passwordExpired,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.passwordExpired
                    ],
                messagePath: 'auth.error.passwordExpired',
            });
        });
    });

    describe('prepareSocialCreate', () => {
        const socialInput = {
            from: EnumUserSignUpFrom.mobile,
            username: 'halcyonVane',
            name: 'Halcyon Vane',
            countryId: 'country-halcyon',
            cookies: true,
            marketing: false,
            device,
        };

        it('returns null when the user already exists', async () => {
            featureFlagCache.getMetadataByKeyAndCache.mockResolvedValue({
                signUpAllowed: true,
            });
            userRepository.findOneWithRoleByEmail.mockResolvedValue(
                buildUser()
            );

            await expect(
                domain.prepareSocialCreate(
                    'halcyon@example.com',
                    EnumUserLoginWith.socialGoogle,
                    socialInput,
                    workspaceContext
                )
            ).resolves.toBeNull();
        });

        it('returns null when sign-up is disabled by the feature flag', async () => {
            featureFlagCache.getMetadataByKeyAndCache.mockResolvedValue({
                signUpAllowed: false,
            });
            userRepository.findOneWithRoleByEmail.mockResolvedValue(null);

            await expect(
                domain.prepareSocialCreate(
                    'halcyon@example.com',
                    EnumUserLoginWith.socialGoogle,
                    socialInput,
                    workspaceContext
                )
            ).resolves.toBeNull();
        });

        it('returns null when the feature flag metadata is absent', async () => {
            featureFlagCache.getMetadataByKeyAndCache.mockResolvedValue(null);
            userRepository.findOneWithRoleByEmail.mockResolvedValue(null);

            await expect(
                domain.prepareSocialCreate(
                    'halcyon@example.com',
                    EnumUserLoginWith.socialApple,
                    socialInput,
                    workspaceContext
                )
            ).resolves.toBeNull();
            expect(
                featureFlagCache.getMetadataByKeyAndCache
            ).toHaveBeenCalledWith('loginWithApple');
        });

        it('prepares a Google social create input', async () => {
            featureFlagCache.getMetadataByKeyAndCache.mockResolvedValue({
                signUpAllowed: true,
            });
            userRepository.findOneWithRoleByEmail.mockResolvedValue(null);
            roleDomain.getByName.mockResolvedValue({
                id: 'role-halcyon',
                type: EnumRoleType.user,
                name: 'user',
            });
            userUtil.checkUsernamePattern.mockReturnValue(false);
            userUtil.checkBadWord.mockResolvedValue(false);
            userRepository.existsByUsername.mockResolvedValue(false);
            databaseUtil.createId.mockReturnValue('user-id-halcyon');

            const result = await domain.prepareSocialCreate(
                'halcyon@example.com',
                EnumUserLoginWith.socialGoogle,
                socialInput,
                workspaceContext
            );

            expect(result).toMatchObject({
                userId: 'user-id-halcyon',
                email: 'halcyon@example.com',
                username: 'halcyonVane',
                signUpFrom: EnumUserSignUpFrom.mobile,
                signUpWith: EnumUserSignUpWith.socialGoogle,
                isVerified: true,
                password: null,
                verification: null,
                createdBy: 'user-id-halcyon',
                termPolicy: expect.objectContaining({
                    [EnumTermPolicyType.cookies]: true,
                    [EnumTermPolicyType.marketing]: false,
                }),
                acceptedTermPolicyTypes: expect.arrayContaining([
                    EnumTermPolicyType.cookies,
                ]),
            });
        });

        it('prepares an Apple social create input with no optional term policy accepted', async () => {
            featureFlagCache.getMetadataByKeyAndCache.mockResolvedValue({
                signUpAllowed: true,
            });
            userRepository.findOneWithRoleByEmail.mockResolvedValue(null);
            roleDomain.getByName.mockResolvedValue({
                id: 'role-halcyon',
                type: EnumRoleType.user,
                name: 'user',
            });
            userUtil.checkUsernamePattern.mockReturnValue(false);
            userUtil.checkBadWord.mockResolvedValue(false);
            userRepository.existsByUsername.mockResolvedValue(false);
            databaseUtil.createId.mockReturnValue('user-id-halcyon');

            const result = await domain.prepareSocialCreate(
                'halcyon@example.com',
                EnumUserLoginWith.socialApple,
                { ...socialInput, cookies: false, marketing: false },
                workspaceContext
            );

            expect(result).toMatchObject({
                signUpWith: EnumUserSignUpWith.socialApple,
                acceptedTermPolicyTypes: [
                    EnumTermPolicyType.termsOfService,
                    EnumTermPolicyType.privacy,
                ],
            });
        });

        it('defaults name to null and accepts marketing when no name is given', async () => {
            featureFlagCache.getMetadataByKeyAndCache.mockResolvedValue({
                signUpAllowed: true,
            });
            userRepository.findOneWithRoleByEmail.mockResolvedValue(null);
            roleDomain.getByName.mockResolvedValue({
                id: 'role-halcyon',
                type: EnumRoleType.user,
                name: 'user',
            });
            userUtil.checkUsernamePattern.mockReturnValue(false);
            userUtil.checkBadWord.mockResolvedValue(false);
            userRepository.existsByUsername.mockResolvedValue(false);
            databaseUtil.createId.mockReturnValue('user-id-halcyon');
            const { name: _name, ...socialInputWithoutName } = socialInput;

            const result = await domain.prepareSocialCreate(
                'halcyon@example.com',
                EnumUserLoginWith.socialGoogle,
                { ...socialInputWithoutName, marketing: true },
                workspaceContext
            );

            expect(result).toMatchObject({
                name: null,
                acceptedTermPolicyTypes: expect.arrayContaining([
                    EnumTermPolicyType.marketing,
                ]),
            });
        });

        it('throws RoleNotFoundException when the default role is missing', async () => {
            featureFlagCache.getMetadataByKeyAndCache.mockResolvedValue({
                signUpAllowed: true,
            });
            userRepository.findOneWithRoleByEmail.mockResolvedValue(null);
            roleDomain.getByName.mockResolvedValue(null);

            const call = () =>
                domain.prepareSocialCreate(
                    'halcyon@example.com',
                    EnumUserLoginWith.socialGoogle,
                    socialInput,
                    workspaceContext
                );

            await expect(call()).rejects.toThrow(RoleNotFoundException);
            await expect(call()).rejects.toMatchObject({
                module: 'role',
                statusCode: EnumRoleStatusCodeError.notFound,
                statusCodeKey:
                    EnumRoleStatusCodeError[EnumRoleStatusCodeError.notFound],
                messagePath: 'role.error.notFound',
            });
        });

        it('throws UserUsernameNotAllowedException when the username breaks the pattern', async () => {
            featureFlagCache.getMetadataByKeyAndCache.mockResolvedValue({
                signUpAllowed: true,
            });
            userRepository.findOneWithRoleByEmail.mockResolvedValue(null);
            roleDomain.getByName.mockResolvedValue({
                id: 'role-halcyon',
                type: EnumRoleType.user,
                name: 'user',
            });
            userUtil.checkUsernamePattern.mockReturnValue(true);
            userUtil.checkBadWord.mockResolvedValue(false);
            userRepository.existsByUsername.mockResolvedValue(false);

            const call = () =>
                domain.prepareSocialCreate(
                    'halcyon@example.com',
                    EnumUserLoginWith.socialGoogle,
                    socialInput,
                    workspaceContext
                );

            await expect(call()).rejects.toThrow(
                UserUsernameNotAllowedException
            );
            await expect(call()).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.usernameNotAllowed,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.usernameNotAllowed
                    ],
                messagePath: 'user.error.usernameNotAllowed',
            });
        });

        it('throws UserUsernameContainBadWordException when the username is profane', async () => {
            featureFlagCache.getMetadataByKeyAndCache.mockResolvedValue({
                signUpAllowed: true,
            });
            userRepository.findOneWithRoleByEmail.mockResolvedValue(null);
            roleDomain.getByName.mockResolvedValue({
                id: 'role-halcyon',
                type: EnumRoleType.user,
                name: 'user',
            });
            userUtil.checkUsernamePattern.mockReturnValue(false);
            userUtil.checkBadWord.mockResolvedValue(true);
            userRepository.existsByUsername.mockResolvedValue(false);

            const call = () =>
                domain.prepareSocialCreate(
                    'halcyon@example.com',
                    EnumUserLoginWith.socialGoogle,
                    socialInput,
                    workspaceContext
                );

            await expect(call()).rejects.toThrow(
                UserUsernameContainBadWordException
            );
            await expect(call()).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.usernameContainBadWord,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.usernameContainBadWord
                    ],
                messagePath: 'user.error.usernameContainBadWord',
            });
        });

        it('throws UserUsernameExistException when the username is taken', async () => {
            featureFlagCache.getMetadataByKeyAndCache.mockResolvedValue({
                signUpAllowed: true,
            });
            userRepository.findOneWithRoleByEmail.mockResolvedValue(null);
            roleDomain.getByName.mockResolvedValue({
                id: 'role-halcyon',
                type: EnumRoleType.user,
                name: 'user',
            });
            userUtil.checkUsernamePattern.mockReturnValue(false);
            userUtil.checkBadWord.mockResolvedValue(false);
            userRepository.existsByUsername.mockResolvedValue(true);

            const call = () =>
                domain.prepareSocialCreate(
                    'halcyon@example.com',
                    EnumUserLoginWith.socialGoogle,
                    socialInput,
                    workspaceContext
                );

            await expect(call()).rejects.toThrow(UserUsernameExistException);
            await expect(call()).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.usernameExist,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.usernameExist
                    ],
                messagePath: 'user.error.usernameExist',
            });
        });
    });

    describe('loginWithSocial', () => {
        const socialInput = {
            username: 'halcyonVane',
            countryId: 'country-halcyon',
            from: EnumUserLoginFrom.website,
            device,
            cookies: true,
            marketing: false,
        };

        it('logs an already verified user in without marking verification again', async () => {
            const user = buildUser({ isVerified: true });
            userRepository.findOneWithRoleByEmail.mockResolvedValue(user);
            userLoginDomain.handleLogin.mockResolvedValue(outcome);

            await expect(
                domain.loginWithSocial(
                    user.email,
                    EnumUserLoginWith.socialGoogle,
                    socialInput
                )
            ).resolves.toBe(outcome);
            expect(userVerificationDomain.markVerified).not.toHaveBeenCalled();
        });

        it('marks the user verified before logging in when not yet verified', async () => {
            const user = buildUser({ isVerified: false });
            userRepository.findOneWithRoleByEmail.mockResolvedValue(user);
            userLoginDomain.handleLogin.mockResolvedValue(outcome);

            await domain.loginWithSocial(
                user.email,
                EnumUserLoginWith.socialGoogle,
                socialInput
            );

            expect(userVerificationDomain.markVerified).toHaveBeenCalledWith(
                user.id
            );
            expect(userLoginDomain.handleLogin).toHaveBeenCalledWith(
                expect.objectContaining({ isVerified: true }),
                device,
                EnumUserLoginFrom.website,
                EnumUserLoginWith.socialGoogle,
                now
            );
        });

        it('throws UserNotFoundException when the user does not exist', async () => {
            userRepository.findOneWithRoleByEmail.mockResolvedValue(null);

            const call = () =>
                domain.loginWithSocial(
                    'missing@example.com',
                    EnumUserLoginWith.socialGoogle,
                    socialInput
                );

            await expect(call()).rejects.toThrow(UserNotFoundException);
            await expect(call()).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.notFound,
                statusCodeKey:
                    EnumUserStatusCodeError[EnumUserStatusCodeError.notFound],
                messagePath: 'user.error.notFound',
            });
        });

        it('throws UserInactiveForbiddenException when the user is not active', async () => {
            userRepository.findOneWithRoleByEmail.mockResolvedValue(
                buildUser({ status: EnumUserStatus.inactive })
            );

            const call = () =>
                domain.loginWithSocial(
                    'halcyon@example.com',
                    EnumUserLoginWith.socialGoogle,
                    socialInput
                );

            await expect(call()).rejects.toThrow(
                UserInactiveForbiddenException
            );
            await expect(call()).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.inactiveForbidden,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.inactiveForbidden
                    ],
                messagePath: 'user.error.inactive',
            });
        });
    });

    describe('refresh', () => {
        it('delegates to the login domain', async () => {
            const user = buildUser();
            const tokens: IAuthToken = outcome.tokens!;
            userLoginDomain.refreshSession.mockResolvedValue(tokens);

            await expect(domain.refresh(user, 'refresh-token')).resolves.toBe(
                tokens
            );
            expect(userLoginDomain.refreshSession).toHaveBeenCalledWith(
                user,
                'refresh-token'
            );
        });
    });

    describe('prepareSignUp', () => {
        const signUpInput = {
            countryId: 'country-halcyon',
            email: 'halcyon@example.com',
            username: 'halcyonVane',
            password: 'plain-password',
            name: 'Halcyon Vane',
            from: EnumUserSignUpFrom.website,
            cookies: true,
            marketing: true,
        };
        const role: IRole = {
            id: 'role-halcyon',
            type: EnumRoleType.user,
            name: 'user',
        };
        const emailVerification: IUserVerificationEmailCreate = {
            type: 'email',
            expiredAt: new Date('2026-03-05T00:00:00.000Z'),
            expiredInMinutes: 15,
            resendInMinutes: 5,
            reference: 'VRF-halcyon',
            token: 'raw-token',
            hashedToken: 'hashed-token',
            link: 'https://example.com/verify?token=raw-token',
        };

        function stubHappyPath(): void {
            roleDomain.getByName.mockResolvedValue(role);
            userRepository.existsByEmail.mockResolvedValue(false);
            countryDomain.existsById.mockResolvedValue(true);
            userUtil.checkUsernamePattern.mockReturnValue(false);
            userUtil.checkBadWord.mockResolvedValue(false);
            userRepository.existsByUsername.mockResolvedValue(false);
            databaseUtil.createId.mockReturnValue('user-id-halcyon');
            authPasswordUtil.createPassword.mockReturnValue({
                passwordHash: 'hashed',
                passwordExpired: new Date('2026-06-01T00:00:00.000Z'),
                passwordCreated: new Date('2026-01-01T00:00:00.000Z'),
                passwordPeriodExpired: new Date('2026-04-01T00:00:00.000Z'),
            });
            userVerificationDomain.verificationCreateVerification.mockReturnValue(
                emailVerification
            );
        }

        it('prepares the sign-up input and the email verification', async () => {
            stubHappyPath();

            const result = await domain.prepareSignUp(
                signUpInput,
                workspaceContext
            );

            expect(result.emailVerification).toBe(emailVerification);
            expect(result.input).toMatchObject({
                userId: 'user-id-halcyon',
                email: signUpInput.email,
                username: signUpInput.username,
                roleId: role.id,
                signUpFrom: EnumUserSignUpFrom.website,
                signUpWith: EnumUserSignUpWith.credential,
                isVerified: false,
                createdBy: 'user-id-halcyon',
                verification: {
                    reference: emailVerification.reference,
                    token: emailVerification.hashedToken,
                    type: EnumVerificationType.email,
                    to: signUpInput.email,
                    expiredAt: emailVerification.expiredAt,
                    verifiedAt: null,
                    isUsed: false,
                },
            });
        });

        it('defaults name to null and skips cookies and marketing when neither is accepted', async () => {
            stubHappyPath();
            const { name: _name, ...signUpInputWithoutName } = signUpInput;

            const result = await domain.prepareSignUp(
                {
                    ...signUpInputWithoutName,
                    cookies: false,
                    marketing: false,
                },
                workspaceContext
            );

            expect(result.input.name).toBeNull();
            expect(result.input.acceptedTermPolicyTypes).toEqual([
                EnumTermPolicyType.termsOfService,
                EnumTermPolicyType.privacy,
            ]);
        });

        it('throws RoleNotFoundException when the default role is missing', async () => {
            stubHappyPath();
            roleDomain.getByName.mockResolvedValue(null);

            const call = () =>
                domain.prepareSignUp(signUpInput, workspaceContext);

            await expect(call()).rejects.toThrow(RoleNotFoundException);
            await expect(call()).rejects.toMatchObject({
                module: 'role',
                statusCode: EnumRoleStatusCodeError.notFound,
                statusCodeKey:
                    EnumRoleStatusCodeError[EnumRoleStatusCodeError.notFound],
                messagePath: 'role.error.notFound',
            });
        });

        it('throws CountryNotFoundException when the country is missing', async () => {
            stubHappyPath();
            countryDomain.existsById.mockResolvedValue(false);

            const call = () =>
                domain.prepareSignUp(signUpInput, workspaceContext);

            await expect(call()).rejects.toThrow(CountryNotFoundException);
            await expect(call()).rejects.toMatchObject({
                module: 'country',
                statusCode: EnumCountryStatusCodeError.notFound,
                statusCodeKey:
                    EnumCountryStatusCodeError[
                        EnumCountryStatusCodeError.notFound
                    ],
                messagePath: 'country.error.notFound',
            });
        });

        it('throws UserEmailExistException when the email is taken', async () => {
            stubHappyPath();
            userRepository.existsByEmail.mockResolvedValue(true);

            const call = () =>
                domain.prepareSignUp(signUpInput, workspaceContext);

            await expect(call()).rejects.toThrow(UserEmailExistException);
            await expect(call()).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.emailExist,
                statusCodeKey:
                    EnumUserStatusCodeError[EnumUserStatusCodeError.emailExist],
                messagePath: 'user.error.emailExist',
            });
        });

        it('throws UserUsernameNotAllowedException when the username breaks the pattern', async () => {
            stubHappyPath();
            userUtil.checkUsernamePattern.mockReturnValue(true);

            const call = () =>
                domain.prepareSignUp(signUpInput, workspaceContext);

            await expect(call()).rejects.toThrow(
                UserUsernameNotAllowedException
            );
            await expect(call()).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.usernameNotAllowed,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.usernameNotAllowed
                    ],
                messagePath: 'user.error.usernameNotAllowed',
            });
        });

        it('throws UserUsernameContainBadWordException when the username is profane', async () => {
            stubHappyPath();
            userUtil.checkBadWord.mockResolvedValue(true);

            const call = () =>
                domain.prepareSignUp(signUpInput, workspaceContext);

            await expect(call()).rejects.toThrow(
                UserUsernameContainBadWordException
            );
            await expect(call()).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.usernameContainBadWord,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.usernameContainBadWord
                    ],
                messagePath: 'user.error.usernameContainBadWord',
            });
        });

        it('throws UserUsernameExistException when the username is taken', async () => {
            stubHappyPath();
            userRepository.existsByUsername.mockResolvedValue(true);

            const call = () =>
                domain.prepareSignUp(signUpInput, workspaceContext);

            await expect(call()).rejects.toThrow(UserUsernameExistException);
            await expect(call()).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.usernameExist,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.usernameExist
                    ],
                messagePath: 'user.error.usernameExist',
            });
        });
    });

    describe('notifyWelcome', () => {
        it('sends the welcome notification', async () => {
            const emailVerification: IUserVerificationEmailCreate = {
                type: 'email',
                expiredAt: new Date('2026-03-05T00:00:00.000Z'),
                expiredInMinutes: 15,
                resendInMinutes: 5,
                reference: 'VRF-halcyon',
                token: 'raw-token',
                hashedToken: 'hashed-token',
                link: 'https://example.com/verify?token=raw-token',
            };
            helperDateService.formatToIso.mockReturnValue(
                '2026-03-05T00:00:00.000Z'
            );

            await domain.notifyWelcome('user-halcyon', emailVerification);

            expect(notificationQueue.sendWelcome).toHaveBeenCalledWith(
                'user-halcyon',
                {
                    expiredAt: '2026-03-05T00:00:00.000Z',
                    reference: emailVerification.reference,
                    link: emailVerification.link,
                    expiredInMinutes: emailVerification.expiredInMinutes,
                }
            );
        });
    });

    describe('logout', () => {
        it('delegates to the login domain', async () => {
            await domain.logout(
                'user-halcyon',
                'session-halcyon',
                'device-ownership-halcyon'
            );

            expect(userLoginDomain.logout).toHaveBeenCalledWith(
                'user-halcyon',
                'session-halcyon',
                'device-ownership-halcyon'
            );
        });

        it('rethrows an AppBaseException raised while logging out', async () => {
            const error = new UserNotFoundException();
            userLoginDomain.logout.mockRejectedValue(error);

            const call = domain.logout(
                'user-halcyon',
                'session-halcyon',
                'device-ownership-halcyon'
            );

            await expect(call).rejects.toBeInstanceOf(UserNotFoundException);
            await expect(call).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.notFound,
                statusCodeKey:
                    EnumUserStatusCodeError[EnumUserStatusCodeError.notFound],
                messagePath: 'user.error.notFound',
            });
            await expect(call).rejects.toBe(error);
        });

        it('wraps an unknown error raised while logging out', async () => {
            const error = new Error('boom');
            userLoginDomain.logout.mockRejectedValue(error);

            const call = domain.logout(
                'user-halcyon',
                'session-halcyon',
                'device-ownership-halcyon'
            );

            await expect(call).rejects.toBeInstanceOf(AppUnknownException);
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
});
