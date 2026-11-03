import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
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
import { DatabaseUtil } from '@common/database/utils/database.util';
import { AuthPasswordUtil } from '@modules/auth/utils/auth.password.util';
import { UserAuthDomain } from '@modules/user/domains/user.auth.domain';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import type {
    IUser,
    IUserSignUpResolved,
    IUserSignUpWorkspacePersonal,
    IUserVerificationEmailCreate,
} from '@modules/user/interfaces/user.interface';
import { UserPasswordDomain } from '@modules/user/domains/user.password.domain';
import { UserRepository } from '@modules/user/repositories/user.repository';
import { UserVerificationDomain } from '@modules/user/domains/user.verification.domain';
import { UserVerificationUtil } from '@modules/user/utils/user.verification.util';
import { EnumUserSignUpWorkspaceContextType } from '@modules/user/enums/user.enum';

describe('UserAuthDomain', () => {
    const userRepository: MockProxy<UserRepository> = mock<UserRepository>();
    const userPasswordDomain: MockProxy<UserPasswordDomain> =
        mock<UserPasswordDomain>();
    const userVerificationDomain: MockProxy<UserVerificationDomain> =
        mock<UserVerificationDomain>();
    const userVerificationUtil: MockProxy<UserVerificationUtil> =
        mock<UserVerificationUtil>();
    const authPasswordUtil: MockProxy<AuthPasswordUtil> =
        mock<AuthPasswordUtil>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();

    let domain: UserAuthDomain;

    const workspaceContext: IUserSignUpWorkspacePersonal = {
        type: EnumUserSignUpWorkspaceContextType.personal,
        workspaceId: 'workspace-halcyon',
        slugCandidates: ['w-halcyon'],
        name: "halcyonVane's Workspace",
    };

    const resolved: IUserSignUpResolved = {
        roleId: 'role-halcyon',
        workspaceContext,
    };

    const baseUser: IUser = {
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
    };

    const device = {
        fingerprint: 'device-halcyon',
        name: null,
        platform: null,
        notificationToken: null,
    };

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserAuthDomain,
                { provide: UserRepository, useValue: userRepository },
                {
                    provide: UserPasswordDomain,
                    useValue: userPasswordDomain,
                },
                {
                    provide: UserVerificationDomain,
                    useValue: userVerificationDomain,
                },
                {
                    provide: UserVerificationUtil,
                    useValue: userVerificationUtil,
                },
                { provide: AuthPasswordUtil, useValue: authPasswordUtil },
                { provide: DatabaseUtil, useValue: databaseUtil },
            ],
        }).compile();
        domain = module.get(UserAuthDomain);
    });

    describe('incrementCredentialAttempt', () => {
        it('returns the user with a counted attempt', async () => {
            userRepository.findOneWithRoleByEmail.mockResolvedValue(baseUser);
            userPasswordDomain.incrementPasswordAttempt.mockResolvedValue(true);

            await expect(
                domain.incrementCredentialAttempt(baseUser.email)
            ).resolves.toEqual({
                user: baseUser,
                hashedPassword: 'hashed-password',
                isAttemptCounted: true,
            });
            expect(
                userPasswordDomain.incrementPasswordAttempt
            ).toHaveBeenCalledWith(baseUser.id);
        });

        it('returns the user with a spent attempt budget', async () => {
            userRepository.findOneWithRoleByEmail.mockResolvedValue(baseUser);
            userPasswordDomain.incrementPasswordAttempt.mockResolvedValue(
                false
            );

            await expect(
                domain.incrementCredentialAttempt(baseUser.email)
            ).resolves.toEqual({
                user: baseUser,
                hashedPassword: 'hashed-password',
                isAttemptCounted: false,
            });
        });

        it('throws UserCredentialInvalidException when the user does not exist', async () => {
            userRepository.findOneWithRoleByEmail.mockResolvedValue(null);

            await expect(
                domain.incrementCredentialAttempt('missing@example.com')
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.credentialInvalid,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.credentialInvalid
                    ],
                messagePath: 'user.error.credentialInvalid',
            });
            expect(
                userPasswordDomain.incrementPasswordAttempt
            ).not.toHaveBeenCalled();
        });

        it('throws UserCredentialInvalidException when the user is not active', async () => {
            userRepository.findOneWithRoleByEmail.mockResolvedValue({
                ...baseUser,
                status: EnumUserStatus.inactive,
            });

            await expect(
                domain.incrementCredentialAttempt('halcyon@example.com')
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.credentialInvalid,
                messagePath: 'user.error.credentialInvalid',
            });
            expect(
                userPasswordDomain.incrementPasswordAttempt
            ).not.toHaveBeenCalled();
        });

        it('throws UserCredentialInvalidException when the user has no password', async () => {
            userRepository.findOneWithRoleByEmail.mockResolvedValue({
                ...baseUser,
                password: null,
            });

            await expect(
                domain.incrementCredentialAttempt('halcyon@example.com')
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.credentialInvalid,
                messagePath: 'user.error.credentialInvalid',
            });
            expect(
                userPasswordDomain.incrementPasswordAttempt
            ).not.toHaveBeenCalled();
        });
    });

    describe('verifyCredential', () => {
        const counted = {
            user: baseUser,
            hashedPassword: 'hashed-password',
            isAttemptCounted: true,
        };

        it('returns true and resets the attempt counter when the credentials are valid', async () => {
            authPasswordUtil.validatePassword.mockResolvedValue(true);
            authPasswordUtil.checkPasswordExpired.mockReturnValue(false);

            await expect(
                domain.verifyCredential(counted, 'plain-password')
            ).resolves.toBe(true);
            expect(authPasswordUtil.validatePassword).toHaveBeenCalledWith(
                'plain-password',
                'hashed-password'
            );
            expect(
                userPasswordDomain.resetPasswordAttempt
            ).toHaveBeenCalledWith(baseUser.id);
        });

        it('returns false without resetting the counter on a wrong password', async () => {
            authPasswordUtil.validatePassword.mockResolvedValue(false);

            await expect(
                domain.verifyCredential(counted, 'wrong-password')
            ).resolves.toBe(false);
            expect(
                userPasswordDomain.resetPasswordAttempt
            ).not.toHaveBeenCalled();
        });

        it('throws UserPasswordExpiredException when the password has expired', async () => {
            authPasswordUtil.validatePassword.mockResolvedValue(true);
            authPasswordUtil.checkPasswordExpired.mockReturnValue(true);

            const call = domain.verifyCredential(counted, 'plain-password');

            await expect(call).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.passwordExpired,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.passwordExpired
                    ],
                messagePath: 'user.error.passwordExpired',
            });
        });
    });

    describe('assertPasswordMatched', () => {
        it('passes when the password matched', () => {
            expect(() => domain.assertPasswordMatched(true)).not.toThrow();
        });

        it('throws UserPasswordNotMatchException when the password did not match', () => {
            expect(() => domain.assertPasswordMatched(false)).toThrow(
                expect.objectContaining({
                    module: 'user',
                    statusCode: EnumUserStatusCodeError.passwordNotMatch,
                    messagePath: 'user.error.passwordNotMatch',
                })
            );
        });
    });

    describe('assertCredentialMatched', () => {
        it('passes when the password matched', () => {
            expect(() => domain.assertCredentialMatched(true)).not.toThrow();
        });

        it('throws UserCredentialInvalidException when the password did not match', () => {
            expect(() => domain.assertCredentialMatched(false)).toThrow(
                expect.objectContaining({
                    module: 'user',
                    statusCode: EnumUserStatusCodeError.credentialInvalid,
                    messagePath: 'user.error.credentialInvalid',
                })
            );
        });
    });

    describe('getOneByEmail', () => {
        it('returns the live user of the email', async () => {
            userRepository.findOneWithRoleByEmail.mockResolvedValue(baseUser);

            await expect(domain.getOneByEmail(baseUser.email)).resolves.toBe(
                baseUser
            );
        });

        it('looks the email up trimmed and lowercased', async () => {
            userRepository.findOneWithRoleByEmail.mockResolvedValue(baseUser);

            await domain.getOneByEmail('  Halcyon@Example.COM ');

            expect(userRepository.findOneWithRoleByEmail).toHaveBeenCalledWith(
                'halcyon@example.com'
            );
        });

        it('returns null when no live user holds the email', async () => {
            userRepository.findOneWithRoleByEmail.mockResolvedValue(null);

            await expect(
                domain.getOneByEmail('missing@example.com')
            ).resolves.toBeNull();
        });
    });

    describe('prepareSocialCreate', () => {
        const socialInput = {
            from: EnumUserSignUpFrom.mobile,
            username: 'halcyonVane',
            name: 'Halcyon Vane',
            inviteToken: null,
            countryId: 'country-halcyon',
            cookies: true,
            marketing: false,
            device,
        };

        beforeEach(() => {
            databaseUtil.createId.mockReturnValue('user-id-halcyon');
        });

        it('stores the email trimmed and lowercased', () => {
            const result = domain.prepareSocialCreate(
                '  Halcyon@Example.COM ',
                EnumUserLoginWith.socialGoogle,
                socialInput,
                resolved
            );

            expect(result.email).toBe('halcyon@example.com');
        });

        it('prepares a Google social create input from the resolved ids without re-reading the username', () => {
            const result = domain.prepareSocialCreate(
                'halcyon@example.com',
                EnumUserLoginWith.socialGoogle,
                socialInput,
                resolved
            );

            expect(result).toMatchObject({
                userId: 'user-id-halcyon',
                email: 'halcyon@example.com',
                username: 'halcyonVane',
                roleId: 'role-halcyon',
                countryId: 'country-halcyon',
                signUpFrom: EnumUserSignUpFrom.mobile,
                signUpWith: EnumUserSignUpWith.socialGoogle,
                isVerified: true,
                password: null,
                verification: null,
                workspaceContext,
                createdBy: 'user-id-halcyon',
                acceptedTermPolicyTypes: expect.arrayContaining([
                    EnumTermPolicyType.cookies,
                ]),
            });
            expect(result).not.toHaveProperty('termPolicy');
            expect(userRepository.existsByUsername).not.toHaveBeenCalled();
        });

        it('prepares an Apple social create input with no optional term policy accepted', () => {
            const result = domain.prepareSocialCreate(
                'halcyon@example.com',
                EnumUserLoginWith.socialApple,
                { ...socialInput, cookies: false, marketing: false },
                resolved
            );

            expect(result).toMatchObject({
                signUpWith: EnumUserSignUpWith.socialApple,
                acceptedTermPolicyTypes: [
                    EnumTermPolicyType.termsOfService,
                    EnumTermPolicyType.privacy,
                ],
            });
        });

        it('defaults name to null and accepts marketing when no name is given', () => {
            const result = domain.prepareSocialCreate(
                'halcyon@example.com',
                EnumUserLoginWith.socialGoogle,
                { ...socialInput, name: null, marketing: true },
                resolved
            );

            expect(result).toMatchObject({
                name: null,
                acceptedTermPolicyTypes: expect.arrayContaining([
                    EnumTermPolicyType.marketing,
                ]),
            });
        });
    });

    describe('getOneForSocialLogin', () => {
        it('returns the active user of the email', async () => {
            userRepository.findOneWithRoleByEmail.mockResolvedValue(baseUser);

            await expect(
                domain.getOneForSocialLogin(baseUser.email)
            ).resolves.toBe(baseUser);
        });

        it('looks the email up trimmed and lowercased', async () => {
            userRepository.findOneWithRoleByEmail.mockResolvedValue(baseUser);

            await domain.getOneForSocialLogin('  Halcyon@Example.COM ');

            expect(userRepository.findOneWithRoleByEmail).toHaveBeenCalledWith(
                'halcyon@example.com'
            );
        });

        it('throws UserNotFoundException when the user does not exist', async () => {
            userRepository.findOneWithRoleByEmail.mockResolvedValue(null);

            await expect(
                domain.getOneForSocialLogin('missing@example.com')
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.notFound,
                statusCodeKey:
                    EnumUserStatusCodeError[EnumUserStatusCodeError.notFound],
                messagePath: 'user.error.notFound',
            });
        });

        it('throws UserInactiveForbiddenException when the user is not active', async () => {
            userRepository.findOneWithRoleByEmail.mockResolvedValue({
                ...baseUser,
                status: EnumUserStatus.inactive,
            });

            await expect(
                domain.getOneForSocialLogin('halcyon@example.com')
            ).rejects.toMatchObject({
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

    describe('verifyEmailBySocial', () => {
        it('marks the user verified and returns it verified', async () => {
            const user = { ...baseUser, isVerified: false };

            await expect(domain.verifyEmailBySocial(user)).resolves.toEqual({
                ...user,
                isVerified: true,
            });
            expect(userVerificationDomain.markVerified).toHaveBeenCalledWith(
                user.id
            );
        });
    });

    describe('assertVerified', () => {
        it('passes for a verified user', () => {
            expect(() => domain.assertVerified(baseUser)).not.toThrow();
        });

        it('throws UserEmailNotVerifiedException for an unverified user', () => {
            expect(() =>
                domain.assertVerified({ ...baseUser, isVerified: false })
            ).toThrow(
                expect.objectContaining({
                    module: 'user',
                    statusCode: EnumUserStatusCodeError.emailNotVerified,
                    messagePath: 'user.error.emailNotVerified',
                })
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
            inviteToken: null,
            from: EnumUserSignUpFrom.website,
            cookies: true,
            marketing: true,
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

        beforeEach(() => {
            databaseUtil.createId.mockReturnValue('user-id-halcyon');
            authPasswordUtil.createPassword.mockResolvedValue({
                passwordHash: 'hashed',
                passwordExpired: new Date('2026-06-01T00:00:00.000Z'),
                passwordCreated: new Date('2026-01-01T00:00:00.000Z'),
                passwordPeriodExpired: new Date('2026-04-01T00:00:00.000Z'),
            });
            userVerificationUtil.createEmail.mockReturnValue(emailVerification);
        });

        it('prepares the sign-up input and the email verification', async () => {
            const result = await domain.prepareSignUp(signUpInput, resolved);

            expect(result.emailVerification).toBe(emailVerification);
            expect(userRepository.existsByEmail).not.toHaveBeenCalled();
            expect(userRepository.existsByUsername).not.toHaveBeenCalled();
            expect(result.input).toMatchObject({
                userId: 'user-id-halcyon',
                email: signUpInput.email,
                username: signUpInput.username,
                roleId: 'role-halcyon',
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
            const result = await domain.prepareSignUp(
                {
                    ...signUpInput,
                    name: null,
                    cookies: false,
                    marketing: false,
                },
                resolved
            );

            expect(result.input.name).toBeNull();
            expect(result.input.acceptedTermPolicyTypes).toEqual([
                EnumTermPolicyType.termsOfService,
                EnumTermPolicyType.privacy,
            ]);
            expect(result.input).not.toHaveProperty('termPolicy');
        });
    });
});
