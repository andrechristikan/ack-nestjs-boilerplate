import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumRoleType,
    EnumUserLoginFrom,
    EnumUserLoginWith,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
} from '@generated/prisma-client/client';
import type { TwoFactor } from '@generated/prisma-client/client';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import type { IAuthPassword } from '@modules/auth/interfaces/auth.interface';
import { AuthPasswordUtil } from '@modules/auth/utils/auth.password.util';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import type {
    IUser,
    IUserPasswordSet,
    IUserForgotPassword,
    IUserForgotPasswordCreate,
} from '@modules/user/interfaces/user.interface';
import { UserPasswordRepository } from '@modules/user/repositories/user.password.repository';
import { UserRepository } from '@modules/user/repositories/user.repository';
import { UserDomain } from '@modules/user/domains/user.domain';
import { UserPasswordDomain } from '@modules/user/domains/user.password.domain';
import { UserPasswordUtil } from '@modules/user/utils/user.password.util';
import { UserUtil } from '@modules/user/utils/user.util';

describe('UserPasswordDomain', () => {
    const userPasswordRepository: MockProxy<UserPasswordRepository> =
        mock<UserPasswordRepository>();
    const userRepository: MockProxy<UserRepository> = mock<UserRepository>();
    const userUtil: MockProxy<UserUtil> = mock<UserUtil>();
    const userPasswordUtil: MockProxy<UserPasswordUtil> =
        mock<UserPasswordUtil>();
    const helperHashService: MockProxy<HelperHashService> =
        mock<HelperHashService>();
    const userDomain: MockProxy<UserDomain> = mock<UserDomain>();
    const authPasswordUtil: MockProxy<AuthPasswordUtil> =
        mock<AuthPasswordUtil>();
    const configGet = vi.fn<(key: string) => boolean | number | undefined>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });

    let domain: UserPasswordDomain;

    const tx = {} as IDatabaseTransactionClient;
    const usedAt = new Date('2026-03-01T00:00:00.000Z');

    const baseTwoFactor: TwoFactor = {
        id: 'two-factor-hollow',
        userId: 'user-hollow',
        secret: 'encrypted-secret',
        pendingSecret: null,
        backupCodes: ['hash-one'],
        enabled: false,
        requiredSetup: false,
        confirmedAt: null,
        lastUsedAt: null,
        lastUsedStep: null,
        attempt: 0,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
    };

    const baseUser: IUser = {
        id: 'user-hollow',
        name: 'Hollow Pike',
        username: 'hollowPike',
        isVerified: true,
        verifiedAt: new Date('2026-01-01T00:00:00.000Z'),
        email: 'hollow@example.com',
        roleId: 'role-hollow',
        password: 'hashed-password',
        passwordExpired: new Date('2026-06-01T00:00:00.000Z'),
        passwordCreated: new Date('2026-01-01T00:00:00.000Z'),
        passwordAttempt: 0,
        signUpAt: new Date('2026-01-01T00:00:00.000Z'),
        signUpFrom: EnumUserSignUpFrom.website,
        signUpWith: EnumUserSignUpWith.credential,
        status: EnumUserStatus.active,
        gender: null,
        countryId: 'country-hollow',
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
            id: 'role-hollow',
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
        twoFactor: baseTwoFactor,
    };

    const password: IAuthPassword = {
        passwordHash: 'hashed',
        passwordExpired: new Date('2026-06-01T00:00:00.000Z'),
        passwordCreated: new Date('2026-01-01T00:00:00.000Z'),
        passwordPeriodExpired: new Date('2026-04-01T00:00:00.000Z'),
    };

    const forgot: IUserForgotPasswordCreate = {
        reference: 'FGT-hollow',
        expiredAt: new Date('2026-03-05T00:00:00.000Z'),
        token: 'raw-token',
        hashedToken: 'hashed-token',
        expiredInMinutes: 15,
        resendInMinutes: 5,
        link: 'https://example.com/reset?token=raw-token',
    };

    beforeEach(async () => {
        vi.resetAllMocks();
        configGet.mockImplementation(key => {
            const values: Record<string, boolean | number> = {
                'forgotPassword.resendInMs': 5 * 60 * 1000,
                'auth.password.attempt': true,
                'auth.password.maxAttempt': 5,
            };

            return values[key];
        });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserPasswordDomain,
                {
                    provide: UserPasswordRepository,
                    useValue: userPasswordRepository,
                },
                { provide: UserRepository, useValue: userRepository },
                { provide: UserUtil, useValue: userUtil },
                { provide: UserPasswordUtil, useValue: userPasswordUtil },
                { provide: HelperHashService, useValue: helperHashService },
                { provide: UserDomain, useValue: userDomain },
                { provide: AuthPasswordUtil, useValue: authPasswordUtil },
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();
        domain = module.get(UserPasswordDomain);
    });

    describe('resetPasswordAttempt', () => {
        it('delegates to the user domain', async () => {
            userDomain.resetPasswordAttempt.mockResolvedValue(baseUser);

            await expect(
                domain.resetPasswordAttempt('user-hollow')
            ).resolves.toBe(baseUser);

            expect(userDomain.resetPasswordAttempt).toHaveBeenCalledWith(
                'user-hollow'
            );
        });
    });

    describe('createTemporaryPassword', () => {
        it('draws a random password and hashes it as a temporary one', async () => {
            authPasswordUtil.createPasswordRandom.mockReturnValue(
                'random-password'
            );
            authPasswordUtil.createPassword.mockResolvedValue(password);

            await expect(domain.createTemporaryPassword()).resolves.toEqual({
                password,
                passwordString: 'random-password',
            });

            expect(authPasswordUtil.createPassword).toHaveBeenCalledWith(
                'random-password',
                { temporary: true }
            );
        });
    });

    describe('incrementPasswordAttempt', () => {
        it('returns true when the repository counts the attempt within the max', async () => {
            userRepository.incrementPasswordAttempt.mockResolvedValue(3);

            await expect(
                domain.incrementPasswordAttempt('user-hollow')
            ).resolves.toBe(true);
            expect(
                userRepository.incrementPasswordAttempt
            ).toHaveBeenCalledWith('user-hollow', 5);
        });

        it('returns false when the repository refuses the attempt at the max', async () => {
            userRepository.incrementPasswordAttempt.mockResolvedValue(null);

            await expect(
                domain.incrementPasswordAttempt('user-hollow')
            ).resolves.toBe(false);
        });

        it('returns true without counting when attempt tracking is off', async () => {
            configGet.mockImplementation(key =>
                key === 'auth.password.attempt' ? false : 5
            );
            const module: TestingModule = await Test.createTestingModule({
                providers: [
                    UserPasswordDomain,
                    {
                        provide: UserPasswordRepository,
                        useValue: userPasswordRepository,
                    },
                    { provide: UserRepository, useValue: userRepository },
                    { provide: UserUtil, useValue: userUtil },
                    { provide: UserPasswordUtil, useValue: userPasswordUtil },
                    { provide: HelperHashService, useValue: helperHashService },
                    { provide: UserDomain, useValue: userDomain },
                    { provide: AuthPasswordUtil, useValue: authPasswordUtil },
                    { provide: ConfigService, useValue: configService },
                ],
            }).compile();
            const untracked = module.get(UserPasswordDomain);

            await expect(
                untracked.incrementPasswordAttempt('user-hollow')
            ).resolves.toBe(true);
            expect(
                userRepository.incrementPasswordAttempt
            ).not.toHaveBeenCalled();
        });
    });

    describe('assertAttemptCounted', () => {
        it('returns when the attempt was counted', () => {
            expect(() => domain.assertAttemptCounted(true)).not.toThrow();
        });

        it('throws UserPasswordAttemptMaxException when the attempt budget is spent', () => {
            expect(() => domain.assertAttemptCounted(false)).toThrow(
                expect.objectContaining({
                    module: 'user',
                    statusCode: EnumUserStatusCodeError.passwordAttemptMax,
                    messagePath: 'user.error.passwordAttemptMax',
                })
            );
        });
    });

    describe('assertOldPasswordMatch', () => {
        const userWithPassword: IUserPasswordSet = {
            ...baseUser,
            password: 'hashed-password',
        };

        it('compares the old password against the stored hash and leaves the counter to the caller', async () => {
            authPasswordUtil.validatePassword.mockResolvedValue(true);

            await domain.assertOldPasswordMatch(
                userWithPassword,
                'old-password'
            );

            expect(authPasswordUtil.validatePassword).toHaveBeenCalledWith(
                'old-password',
                'hashed-password'
            );
            expect(
                userRepository.incrementPasswordAttempt
            ).not.toHaveBeenCalled();
            expect(userDomain.resetPasswordAttempt).not.toHaveBeenCalled();
        });

        it('throws UserPasswordNotMatchException on a wrong old password', async () => {
            authPasswordUtil.validatePassword.mockResolvedValue(false);

            await expect(
                domain.assertOldPasswordMatch(
                    userWithPassword,
                    'wrong-password'
                )
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.passwordNotMatch,
                messagePath: 'user.error.passwordNotMatch',
            });
            expect(userDomain.resetPasswordAttempt).not.toHaveBeenCalled();
        });
    });

    describe('prepareForgotPassword', () => {
        const lastForgot = {
            createdAt: new Date('2026-03-01T00:00:00.000Z'),
        } as Awaited<
            ReturnType<UserPasswordRepository['findOneLatestByForgotPassword']>
        >;

        it('returns the active user and a fresh reset payload when there is no previous request', async () => {
            userRepository.findOneActiveByEmail.mockResolvedValue(baseUser);
            userPasswordRepository.findOneLatestByForgotPassword.mockResolvedValue(
                null
            );
            userPasswordUtil.createForgot.mockReturnValue(forgot);

            await expect(
                domain.prepareForgotPassword('hollow@example.com')
            ).resolves.toEqual({ user: baseUser, forgot });

            expect(userUtil.getResendWaitInMinutes).not.toHaveBeenCalled();
        });

        it('returns the payload when the previous request is past its resend window', async () => {
            userRepository.findOneActiveByEmail.mockResolvedValue(baseUser);
            userPasswordRepository.findOneLatestByForgotPassword.mockResolvedValue(
                lastForgot
            );
            userUtil.getResendWaitInMinutes.mockReturnValue(null);
            userPasswordUtil.createForgot.mockReturnValue(forgot);

            await expect(
                domain.prepareForgotPassword('hollow@example.com')
            ).resolves.toEqual({ user: baseUser, forgot });

            expect(userUtil.getResendWaitInMinutes).toHaveBeenCalledWith(
                lastForgot!.createdAt,
                5
            );
        });

        it('returns null without a reset payload when no active user holds the email', async () => {
            userRepository.findOneActiveByEmail.mockResolvedValue(null);

            await expect(
                domain.prepareForgotPassword('hollow@example.com')
            ).resolves.toBeNull();

            expect(
                userPasswordRepository.findOneLatestByForgotPassword
            ).not.toHaveBeenCalled();
            expect(userPasswordUtil.createForgot).not.toHaveBeenCalled();
        });

        it('throws UserForgotPasswordRequestLimitExceededException with the minutes left when resent too soon', async () => {
            userRepository.findOneActiveByEmail.mockResolvedValue(baseUser);
            userPasswordRepository.findOneLatestByForgotPassword.mockResolvedValue(
                lastForgot
            );
            userUtil.getResendWaitInMinutes.mockReturnValue(4);

            await expect(
                domain.prepareForgotPassword('hollow@example.com')
            ).rejects.toMatchObject({
                module: 'user',
                statusCode:
                    EnumUserStatusCodeError.forgotPasswordRequestLimitExceeded,
                messagePath: 'user.error.forgotPasswordRequestLimitExceeded',
                messageProperties: { minutes: 4 },
            });
            expect(userPasswordUtil.createForgot).not.toHaveBeenCalled();
        });
    });

    describe('createForgotPassword', () => {
        it('replaces the unused requests with the new one', async () => {
            await domain.createForgotPassword(
                'user-hollow',
                'hollow@example.com',
                forgot
            );

            expect(
                userPasswordRepository.createReplacingUnused
            ).toHaveBeenCalledWith('user-hollow', 'hollow@example.com', forgot);
        });
    });

    describe('getOneActiveReset', () => {
        const reset = {
            id: 'forgot-hollow',
            userId: 'user-hollow',
            user: baseUser,
        } as IUserForgotPassword;

        it('hashes the token and returns the active request', async () => {
            helperHashService.sha256Hash.mockReturnValue('hashed-token');
            userPasswordRepository.findOneActiveByForgotPasswordToken.mockResolvedValue(
                reset
            );

            await expect(domain.getOneActiveReset('raw-token')).resolves.toBe(
                reset
            );

            expect(helperHashService.sha256Hash).toHaveBeenCalledWith(
                'raw-token'
            );
            expect(
                userPasswordRepository.findOneActiveByForgotPasswordToken
            ).toHaveBeenCalledWith('hashed-token');
        });

        it('throws UserTokenInvalidException when no active request matches', async () => {
            userPasswordRepository.findOneActiveByForgotPasswordToken.mockResolvedValue(
                null
            );

            await expect(
                domain.getOneActiveReset('raw-token')
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.tokenInvalid,
                messagePath: 'user.error.verificationTokenInvalid',
            });
        });
    });

    describe('markResetUsedInTx', () => {
        it('marks the request used on the given transaction', async () => {
            userPasswordRepository.markUsedInTx.mockResolvedValue(true);

            await expect(
                domain.markResetUsedInTx(tx, 'forgot-hollow', usedAt)
            ).resolves.toBeUndefined();

            expect(userPasswordRepository.markUsedInTx).toHaveBeenCalledWith(
                tx,
                'forgot-hollow',
                usedAt
            );
        });

        it('throws UserTokenInvalidException when the request was already used', async () => {
            userPasswordRepository.markUsedInTx.mockResolvedValue(false);

            await expect(
                domain.markResetUsedInTx(tx, 'forgot-hollow', usedAt)
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.tokenInvalid,
                messagePath: 'user.error.verificationTokenInvalid',
            });
        });
    });
});
