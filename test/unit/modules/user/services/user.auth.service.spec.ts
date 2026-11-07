import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumActivityLogAction,
    EnumRoleType,
    EnumTermPolicyType,
    EnumUserLoginFrom,
    EnumUserLoginWith,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
    EnumVerificationType,
} from '@generated/prisma-client/client';
import type { User } from '@generated/prisma-client/client';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { AuthPasswordUtil } from '@modules/auth/utils/auth.password.util';
import { UserAuthService } from '@modules/user/services/user.auth.service';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { UserPasswordAttemptMaxException } from '@modules/user/exceptions/user.password-attempt-max.exception';
import type {
    IUser,
    IUserSignUpResolved,
    IUserSignUpWorkspacePersonal,
    IUserVerificationEmailCreate,
} from '@modules/user/interfaces/user.interface';
import { UserPasswordService } from '@modules/user/services/user.password.service';
import { UserRepository } from '@modules/user/repositories/user.repository';
import { UserVerificationService } from '@modules/user/services/user.verification.service';
import { UserCreateUtil } from '@modules/user/utils/user.create.util';
import { UserVerificationUtil } from '@modules/user/utils/user.verification.util';
import { EnumUserSignUpWorkspaceContextType } from '@modules/user/enums/user.enum';

describe('UserAuthService', () => {
    const userRepository: MockProxy<UserRepository> = mock<UserRepository>();
    const userPasswordService: MockProxy<UserPasswordService> =
        mock<UserPasswordService>();
    const userVerificationService: MockProxy<UserVerificationService> =
        mock<UserVerificationService>();
    const userVerificationUtil: MockProxy<UserVerificationUtil> =
        mock<UserVerificationUtil>();
    const userCreateUtil: MockProxy<UserCreateUtil> = mock<UserCreateUtil>();
    const authPasswordUtil: MockProxy<AuthPasswordUtil> =
        mock<AuthPasswordUtil>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();

    let service: UserAuthService;

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
            isImmutable: false,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            createdBy: null,
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedBy: null,
            policies: [],
        },
        twoFactor: null,
    };

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserAuthService,
                { provide: UserRepository, useValue: userRepository },
                {
                    provide: UserPasswordService,
                    useValue: userPasswordService,
                },
                {
                    provide: UserVerificationService,
                    useValue: userVerificationService,
                },
                {
                    provide: UserVerificationUtil,
                    useValue: userVerificationUtil,
                },
                { provide: UserCreateUtil, useValue: userCreateUtil },
                { provide: AuthPasswordUtil, useValue: authPasswordUtil },
                { provide: DatabaseUtil, useValue: databaseUtil },
            ],
        }).compile();
        service = module.get(UserAuthService);
    });

    describe('countCredentialAttempt', () => {
        it('returns the counted attempt of the active user', async () => {
            const counted = {
                user: baseUser,
                hashedPassword: 'hashed-password',
                isAttemptCounted: true,
                lockoutStages: [],
            };
            userRepository.findOneWithRoleByEmail.mockResolvedValue(baseUser);
            userPasswordService.countPasswordAttempt.mockResolvedValue(counted);

            await expect(
                service.countCredentialAttempt(baseUser.email)
            ).resolves.toEqual(counted);
            expect(userRepository.findOneWithRoleByEmail).toHaveBeenCalledWith(
                baseUser.email
            );
            expect(
                userPasswordService.countPasswordAttempt
            ).toHaveBeenCalledWith(baseUser);
        });

        it('returns the attempt with a spent budget and its lockout stages', async () => {
            const spent = {
                user: baseUser,
                hashedPassword: 'hashed-password',
                isAttemptCounted: false,
                lockoutStages: [
                    {
                        action: EnumActivityLogAction.userRevokeAllSessions,
                        userId: baseUser.id,
                        createdBy: baseUser.id,
                    },
                    {
                        action: EnumActivityLogAction.userReachMaxPasswordAttempt,
                        userId: baseUser.id,
                        createdBy: baseUser.id,
                    },
                ],
            };
            userRepository.findOneWithRoleByEmail.mockResolvedValue(baseUser);
            userPasswordService.countPasswordAttempt.mockResolvedValue(spent);

            await expect(
                service.countCredentialAttempt(baseUser.email)
            ).resolves.toEqual(spent);
        });

        it('throws UserCredentialInvalidException when the user does not exist', async () => {
            userRepository.findOneWithRoleByEmail.mockResolvedValue(null);

            await expect(
                service.countCredentialAttempt('missing@example.com')
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
                userPasswordService.countPasswordAttempt
            ).not.toHaveBeenCalled();
        });

        it('throws UserCredentialInvalidException when the user is not active', async () => {
            userRepository.findOneWithRoleByEmail.mockResolvedValue({
                ...baseUser,
                status: EnumUserStatus.inactive,
            });

            await expect(
                service.countCredentialAttempt('halcyon@example.com')
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.credentialInvalid,
                messagePath: 'user.error.credentialInvalid',
            });
            expect(
                userPasswordService.countPasswordAttempt
            ).not.toHaveBeenCalled();
        });

        it('throws UserCredentialInvalidException when the user has no password', async () => {
            const passwordless = { ...baseUser, password: null };
            userRepository.findOneWithRoleByEmail.mockResolvedValue(
                passwordless
            );
            userPasswordService.countPasswordAttempt.mockResolvedValue(null);

            await expect(
                service.countCredentialAttempt('halcyon@example.com')
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.credentialInvalid,
                messagePath: 'user.error.credentialInvalid',
            });
            expect(
                userPasswordService.countPasswordAttempt
            ).toHaveBeenCalledWith(passwordless);
        });
    });

    describe('verifyCredential', () => {
        const counted = {
            user: baseUser,
            hashedPassword: 'hashed-password',
            isAttemptCounted: true,
            lockoutStages: [],
        };

        it('returns true and resets the attempt counter when the credentials are valid', async () => {
            authPasswordUtil.validatePassword.mockResolvedValue(true);
            authPasswordUtil.checkPasswordExpired.mockReturnValue(false);

            await expect(
                service.verifyCredential(counted, 'plain-password')
            ).resolves.toBe(true);
            expect(authPasswordUtil.validatePassword).toHaveBeenCalledWith(
                'plain-password',
                'hashed-password'
            );
            expect(
                userPasswordService.resetPasswordAttempt
            ).toHaveBeenCalledWith(baseUser.id);
        });

        it('returns false without resetting the counter on a wrong password', async () => {
            authPasswordUtil.validatePassword.mockResolvedValue(false);

            await expect(
                service.verifyCredential(counted, 'wrong-password')
            ).resolves.toBe(false);
            expect(
                userPasswordService.resetPasswordAttempt
            ).not.toHaveBeenCalled();
        });

        it('returns false for a null password without comparing', async () => {
            await expect(service.verifyCredential(counted, null)).resolves.toBe(
                false
            );
            expect(authPasswordUtil.validatePassword).not.toHaveBeenCalled();
            expect(
                userPasswordService.resetPasswordAttempt
            ).not.toHaveBeenCalled();
        });

        it('returns true and resets the attempt counter when the matched password has expired', async () => {
            authPasswordUtil.validatePassword.mockResolvedValue(true);
            authPasswordUtil.checkPasswordExpired.mockReturnValue(true);

            await expect(
                service.verifyCredential(counted, 'plain-password')
            ).resolves.toBe(true);
            expect(
                userPasswordService.resetPasswordAttempt
            ).toHaveBeenCalledWith(baseUser.id);
        });
    });

    describe('assertPasswordAttempt', () => {
        const counted = {
            user: baseUser,
            hashedPassword: 'hashed-password',
            isAttemptCounted: true,
            lockoutStages: [],
        };

        it('resolves and resets the attempt counter when the password matches', async () => {
            authPasswordUtil.validatePassword.mockResolvedValue(true);
            authPasswordUtil.checkPasswordExpired.mockReturnValue(false);

            await expect(
                service.assertPasswordAttempt(counted, 'plain-password')
            ).resolves.toBeUndefined();
            expect(
                userPasswordService.assertAttemptCounted
            ).toHaveBeenCalledWith(true);
            expect(authPasswordUtil.validatePassword).toHaveBeenCalledWith(
                'plain-password',
                'hashed-password'
            );
            expect(
                userPasswordService.resetPasswordAttempt
            ).toHaveBeenCalledWith(baseUser.id);
        });

        it('throws UserPasswordAttemptMaxException without comparing when the budget is spent', async () => {
            userPasswordService.assertAttemptCounted.mockImplementation(() => {
                throw new UserPasswordAttemptMaxException();
            });

            await expect(
                service.assertPasswordAttempt(
                    { ...counted, isAttemptCounted: false },
                    'plain-password'
                )
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.passwordAttemptMax,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.passwordAttemptMax
                    ],
                messagePath: 'user.error.passwordAttemptMax',
            });
            expect(
                userPasswordService.assertAttemptCounted
            ).toHaveBeenCalledWith(false);
            expect(authPasswordUtil.validatePassword).not.toHaveBeenCalled();
        });

        it('throws UserPasswordNotMatchException on a wrong password', async () => {
            authPasswordUtil.validatePassword.mockResolvedValue(false);

            await expect(
                service.assertPasswordAttempt(counted, 'wrong-password')
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.passwordNotMatch,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.passwordNotMatch
                    ],
                messagePath: 'user.error.passwordNotMatch',
            });
            expect(
                userPasswordService.resetPasswordAttempt
            ).not.toHaveBeenCalled();
            expect(
                authPasswordUtil.checkPasswordExpired
            ).not.toHaveBeenCalled();
        });

        it('throws UserPasswordNotMatchException for a null password without comparing', async () => {
            await expect(
                service.assertPasswordAttempt(counted, null)
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.passwordNotMatch,
                messagePath: 'user.error.passwordNotMatch',
            });
            expect(authPasswordUtil.validatePassword).not.toHaveBeenCalled();
        });

        it('throws UserPasswordExpiredException when the matched password has expired', async () => {
            authPasswordUtil.validatePassword.mockResolvedValue(true);
            authPasswordUtil.checkPasswordExpired.mockReturnValue(true);

            await expect(
                service.assertPasswordAttempt(counted, 'plain-password')
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.passwordExpired,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.passwordExpired
                    ],
                messagePath: 'user.error.passwordExpired',
            });
            expect(
                userPasswordService.resetPasswordAttempt
            ).toHaveBeenCalledWith(baseUser.id);
            expect(authPasswordUtil.checkPasswordExpired).toHaveBeenCalledWith(
                baseUser.passwordExpired
            );
        });
    });

    describe('assertPasswordNotExpired', () => {
        it('returns when the password has not expired', () => {
            authPasswordUtil.checkPasswordExpired.mockReturnValue(false);

            expect(() =>
                service.assertPasswordNotExpired(baseUser)
            ).not.toThrow();
            expect(authPasswordUtil.checkPasswordExpired).toHaveBeenCalledWith(
                baseUser.passwordExpired
            );
        });

        it('throws UserPasswordExpiredException when the password has expired', () => {
            authPasswordUtil.checkPasswordExpired.mockReturnValue(true);

            expect(() => service.assertPasswordNotExpired(baseUser)).toThrow(
                expect.objectContaining({
                    module: 'user',
                    statusCode: EnumUserStatusCodeError.passwordExpired,
                    statusCodeKey:
                        EnumUserStatusCodeError[
                            EnumUserStatusCodeError.passwordExpired
                        ],
                    messagePath: 'user.error.passwordExpired',
                })
            );
            expect(authPasswordUtil.checkPasswordExpired).toHaveBeenCalledWith(
                baseUser.passwordExpired
            );
        });
    });

    describe('assertPasswordMatched', () => {
        it('passes when the password matched', () => {
            expect(() => service.assertPasswordMatched(true)).not.toThrow();
        });

        it('throws UserPasswordNotMatchException when the password did not match', () => {
            expect(() => service.assertPasswordMatched(false)).toThrow(
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
            expect(() => service.assertCredentialMatched(true)).not.toThrow();
        });

        it('throws UserCredentialInvalidException when the password did not match', () => {
            expect(() => service.assertCredentialMatched(false)).toThrow(
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

            await expect(service.getOneByEmail(baseUser.email)).resolves.toBe(
                baseUser
            );
        });

        it('looks the email up trimmed and lowercased', async () => {
            userRepository.findOneWithRoleByEmail.mockResolvedValue(baseUser);

            await service.getOneByEmail('  Halcyon@Example.COM ');

            expect(userRepository.findOneWithRoleByEmail).toHaveBeenCalledWith(
                'halcyon@example.com'
            );
        });

        it('returns null when no live user holds the email', async () => {
            userRepository.findOneWithRoleByEmail.mockResolvedValue(null);

            await expect(
                service.getOneByEmail('missing@example.com')
            ).resolves.toBeNull();
        });
    });

    describe('getOneForSocialLogin', () => {
        it('returns the active user of the email', async () => {
            userRepository.findOneWithRoleByEmail.mockResolvedValue(baseUser);

            await expect(
                service.getOneForSocialLogin(baseUser.email)
            ).resolves.toBe(baseUser);
        });

        it('looks the email up trimmed and lowercased', async () => {
            userRepository.findOneWithRoleByEmail.mockResolvedValue(baseUser);

            await service.getOneForSocialLogin('  Halcyon@Example.COM ');

            expect(userRepository.findOneWithRoleByEmail).toHaveBeenCalledWith(
                'halcyon@example.com'
            );
        });

        it('throws UserNotFoundException when the user does not exist', async () => {
            userRepository.findOneWithRoleByEmail.mockResolvedValue(null);

            await expect(
                service.getOneForSocialLogin('missing@example.com')
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
                service.getOneForSocialLogin('halcyon@example.com')
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
        it('returns the user merged with the written row', async () => {
            const user = { ...baseUser, isVerified: false, verifiedAt: null };
            const writtenRow: User = {
                id: 'user-halcyon',
                name: 'Halcyon Vane',
                username: 'halcyonVane',
                isVerified: true,
                verifiedAt: new Date('2026-03-01T00:00:00.000Z'),
                email: 'halcyon@example.com',
                roleId: 'role-halcyon',
                password: null,
                passwordExpired: null,
                passwordCreated: null,
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
                updatedAt: new Date('2026-03-01T00:00:00.000Z'),
                updatedBy: 'user-halcyon',
                deletedAt: null,
                deletedBy: null,
            };
            userVerificationService.markVerifiedBySocial.mockResolvedValue(
                writtenRow
            );

            await expect(service.verifyEmailBySocial(user)).resolves.toEqual({
                ...writtenRow,
                role: user.role,
                twoFactor: user.twoFactor,
            });
            expect(
                userVerificationService.markVerifiedBySocial
            ).toHaveBeenCalledWith(user.id);
        });
    });

    describe('assertVerified', () => {
        it('passes for a verified user', () => {
            expect(() => service.assertVerified(baseUser)).not.toThrow();
        });

        it('throws UserEmailNotVerifiedException for an unverified user', () => {
            expect(() =>
                service.assertVerified({ ...baseUser, isVerified: false })
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
        const acceptedTermPolicyTypes = [
            EnumTermPolicyType.termsOfService,
            EnumTermPolicyType.privacy,
            EnumTermPolicyType.cookies,
            EnumTermPolicyType.marketing,
        ];

        beforeEach(() => {
            databaseUtil.createId.mockReturnValue('user-id-halcyon');
            authPasswordUtil.createPassword.mockResolvedValue({
                passwordHash: 'hashed',
                passwordExpired: new Date('2026-06-01T00:00:00.000Z'),
                passwordCreated: new Date('2026-01-01T00:00:00.000Z'),
                passwordPeriodExpired: new Date('2026-04-01T00:00:00.000Z'),
            });
            userVerificationUtil.createEmail.mockReturnValue(emailVerification);
            userCreateUtil.buildAcceptedTermPolicyTypes.mockReturnValue(
                acceptedTermPolicyTypes
            );
        });

        it('prepares the sign-up input and the email verification', async () => {
            const result = await service.prepareSignUp(signUpInput, resolved);

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
                verifiedAt: null,
                acceptedTermPolicyTypes,
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
            expect(
                userCreateUtil.buildAcceptedTermPolicyTypes
            ).toHaveBeenCalledWith(true, true);
        });

        it('defaults name to null and skips cookies and marketing when neither is accepted', async () => {
            const result = await service.prepareSignUp(
                {
                    ...signUpInput,
                    name: null,
                    cookies: false,
                    marketing: false,
                },
                resolved
            );

            expect(result.input.name).toBeNull();
            expect(
                userCreateUtil.buildAcceptedTermPolicyTypes
            ).toHaveBeenCalledWith(false, false);
            expect(result.input).not.toHaveProperty('termPolicy');
        });
    });
});
