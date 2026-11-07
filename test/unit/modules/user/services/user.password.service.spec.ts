import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumActivityLogAction,
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
import type { IActivityLogStageInput } from '@modules/activity-log/interfaces/activity-log.interface';
import type { IAuthPassword } from '@modules/auth/interfaces/auth.interface';
import { AuthPasswordUtil } from '@modules/auth/utils/auth.password.util';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import type {
    IUser,
    IUserForgotPassword,
    IUserForgotPasswordCreate,
} from '@modules/user/interfaces/user.interface';
import { UserPasswordRepository } from '@modules/user/repositories/user.password.repository';
import { UserRepository } from '@modules/user/repositories/user.repository';
import { UserService } from '@modules/user/services/user.service';
import { UserPasswordService } from '@modules/user/services/user.password.service';
import { UserQueue } from '@modules/user/queues/user.queue';
import { UserPasswordUtil } from '@modules/user/utils/user.password.util';
import { UserUtil } from '@modules/user/utils/user.util';

describe('UserPasswordService', () => {
    const userPasswordRepository: MockProxy<UserPasswordRepository> =
        mock<UserPasswordRepository>();
    const userRepository: MockProxy<UserRepository> = mock<UserRepository>();
    const userUtil: MockProxy<UserUtil> = mock<UserUtil>();
    const userPasswordUtil: MockProxy<UserPasswordUtil> =
        mock<UserPasswordUtil>({ forgotResendInMinutes: 7 });
    const helperHashService: MockProxy<HelperHashService> =
        mock<HelperHashService>();
    const userService: MockProxy<UserService> = mock<UserService>();
    const userQueue: MockProxy<UserQueue> = mock<UserQueue>();
    const authPasswordUtil: MockProxy<AuthPasswordUtil> =
        mock<AuthPasswordUtil>();
    const configGet = vi.fn<(key: string) => boolean | number | undefined>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });

    let service: UserPasswordService;

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
                'auth.password.attempt': true,
                'auth.password.maxAttempt': 5,
            };

            return values[key];
        });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserPasswordService,
                {
                    provide: UserPasswordRepository,
                    useValue: userPasswordRepository,
                },
                { provide: UserRepository, useValue: userRepository },
                { provide: UserUtil, useValue: userUtil },
                { provide: UserPasswordUtil, useValue: userPasswordUtil },
                { provide: HelperHashService, useValue: helperHashService },
                { provide: UserService, useValue: userService },
                { provide: UserQueue, useValue: userQueue },
                { provide: AuthPasswordUtil, useValue: authPasswordUtil },
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();
        service = module.get(UserPasswordService);
    });

    describe('resetPasswordAttempt', () => {
        it('delegates to the user domain', async () => {
            userService.resetPasswordAttempt.mockResolvedValue(baseUser);

            await expect(
                service.resetPasswordAttempt('user-hollow')
            ).resolves.toBe(baseUser);

            expect(userService.resetPasswordAttempt).toHaveBeenCalledWith(
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

            await expect(service.createTemporaryPassword()).resolves.toEqual({
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
                service.incrementPasswordAttempt('user-hollow')
            ).resolves.toBe(true);
            expect(
                userRepository.incrementPasswordAttempt
            ).toHaveBeenCalledWith('user-hollow', 5);
        });

        it('returns false when the repository refuses the attempt at the max', async () => {
            userRepository.incrementPasswordAttempt.mockResolvedValue(null);

            await expect(
                service.incrementPasswordAttempt('user-hollow')
            ).resolves.toBe(false);
        });

        it('returns true without counting when attempt tracking is off', async () => {
            configGet.mockImplementation(key =>
                key === 'auth.password.attempt' ? false : 5
            );
            const module: TestingModule = await Test.createTestingModule({
                providers: [
                    UserPasswordService,
                    {
                        provide: UserPasswordRepository,
                        useValue: userPasswordRepository,
                    },
                    { provide: UserRepository, useValue: userRepository },
                    { provide: UserUtil, useValue: userUtil },
                    { provide: UserPasswordUtil, useValue: userPasswordUtil },
                    { provide: HelperHashService, useValue: helperHashService },
                    { provide: UserService, useValue: userService },
                    { provide: UserQueue, useValue: userQueue },
                    { provide: AuthPasswordUtil, useValue: authPasswordUtil },
                    { provide: ConfigService, useValue: configService },
                ],
            }).compile();
            const untracked = module.get(UserPasswordService);

            await expect(
                untracked.incrementPasswordAttempt('user-hollow')
            ).resolves.toBe(true);
            expect(
                userRepository.incrementPasswordAttempt
            ).not.toHaveBeenCalled();
        });
    });

    describe('countPasswordAttempt', () => {
        it('returns null without counting when the user has no password', async () => {
            userUtil.hasPassword.mockReturnValue(false);
            const passwordless: IUser = { ...baseUser, password: null };

            await expect(
                service.countPasswordAttempt(passwordless)
            ).resolves.toBeNull();
            expect(
                userRepository.incrementPasswordAttempt
            ).not.toHaveBeenCalled();
            expect(userQueue.lockout).not.toHaveBeenCalled();
        });

        it('returns the counted attempt without enqueueing a lockout within the budget', async () => {
            userUtil.hasPassword.mockReturnValue(true);
            userRepository.incrementPasswordAttempt.mockResolvedValue(1);

            await expect(
                service.countPasswordAttempt(baseUser)
            ).resolves.toEqual({
                user: baseUser,
                hashedPassword: 'hashed-password',
                isAttemptCounted: true,
                lockoutStages: [],
            });
            expect(userUtil.hasPassword).toHaveBeenCalledWith(baseUser);
            expect(userUtil.buildPasswordLockoutStages).not.toHaveBeenCalled();
            expect(
                userRepository.incrementPasswordAttempt
            ).toHaveBeenCalledWith('user-hollow', 5);
            expect(userQueue.lockout).not.toHaveBeenCalled();
        });

        it('returns an uncounted attempt with the lockout stages and enqueues one lockout when the budget is spent', async () => {
            const lockoutStages: IActivityLogStageInput<EnumActivityLogAction>[] =
                [
                    {
                        action: EnumActivityLogAction.userRevokeAllSessions,
                        userId: 'user-hollow',
                        createdBy: 'user-hollow',
                    },
                    {
                        action: EnumActivityLogAction.userReachMaxPasswordAttempt,
                        userId: 'user-hollow',
                        createdBy: 'user-hollow',
                    },
                ];
            userUtil.hasPassword.mockReturnValue(true);
            userRepository.incrementPasswordAttempt.mockResolvedValue(null);
            userUtil.buildPasswordLockoutStages.mockReturnValue(lockoutStages);

            await expect(
                service.countPasswordAttempt(baseUser)
            ).resolves.toEqual({
                user: baseUser,
                hashedPassword: 'hashed-password',
                isAttemptCounted: false,
                lockoutStages,
            });
            expect(userQueue.lockout).toHaveBeenCalledTimes(1);
            expect(userQueue.lockout).toHaveBeenCalledWith('user-hollow');
            expect(userUtil.buildPasswordLockoutStages).toHaveBeenCalledWith(
                'user-hollow'
            );
        });
    });

    describe('assertAttemptCounted', () => {
        it('returns when the attempt was counted', () => {
            expect(() => service.assertAttemptCounted(true)).not.toThrow();
        });

        it('throws UserPasswordAttemptMaxException when the attempt budget is spent', () => {
            expect(() => service.assertAttemptCounted(false)).toThrow(
                expect.objectContaining({
                    module: 'user',
                    statusCode: EnumUserStatusCodeError.passwordAttemptMax,
                    messagePath: 'user.error.passwordAttemptMax',
                })
            );
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
                service.prepareForgotPassword('hollow@example.com')
            ).resolves.toEqual({ user: baseUser, forgot });

            expect(userUtil.isInsideResendWindow).not.toHaveBeenCalled();
        });

        it('returns the payload when the previous request is past its resend window', async () => {
            userRepository.findOneActiveByEmail.mockResolvedValue(baseUser);
            userPasswordRepository.findOneLatestByForgotPassword.mockResolvedValue(
                lastForgot
            );
            userUtil.isInsideResendWindow.mockReturnValue(false);
            userPasswordUtil.createForgot.mockReturnValue(forgot);

            await expect(
                service.prepareForgotPassword('hollow@example.com')
            ).resolves.toEqual({ user: baseUser, forgot });

            expect(userUtil.isInsideResendWindow).toHaveBeenCalledWith(
                lastForgot!.createdAt,
                7
            );
        });

        it('returns null without a reset payload when no active user holds the email', async () => {
            userRepository.findOneActiveByEmail.mockResolvedValue(null);

            await expect(
                service.prepareForgotPassword('hollow@example.com')
            ).resolves.toBeNull();

            expect(
                userPasswordRepository.findOneLatestByForgotPassword
            ).not.toHaveBeenCalled();
            expect(userPasswordUtil.createForgot).not.toHaveBeenCalled();
        });

        it('returns null inside the resend window', async () => {
            userRepository.findOneActiveByEmail.mockResolvedValue(baseUser);
            userPasswordRepository.findOneLatestByForgotPassword.mockResolvedValue(
                lastForgot
            );
            userUtil.isInsideResendWindow.mockReturnValue(true);

            await expect(
                service.prepareForgotPassword('hollow@example.com')
            ).resolves.toBeNull();

            expect(userUtil.isInsideResendWindow).toHaveBeenCalledWith(
                lastForgot!.createdAt,
                7
            );
            expect(userPasswordUtil.createForgot).not.toHaveBeenCalled();
        });
    });

    describe('createForgotPassword', () => {
        it('replaces the unused requests with the new one', async () => {
            await service.createForgotPassword(
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

            await expect(service.getOneActiveReset('raw-token')).resolves.toBe(
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
                service.getOneActiveReset('raw-token')
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
                service.markResetUsedInTx(tx, 'forgot-hollow', usedAt)
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
                service.markResetUsedInTx(tx, 'forgot-hollow', usedAt)
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.tokenInvalid,
                messagePath: 'user.error.verificationTokenInvalid',
            });
        });
    });

    describe('markUnusedResetsUsedInTx', () => {
        it("marks the user's unused resets used on the given transaction", async () => {
            await expect(
                service.markUnusedResetsUsedInTx(tx, 'user-hollow')
            ).resolves.toBeUndefined();

            expect(
                userPasswordRepository.markUnusedUsedByUserInTx
            ).toHaveBeenCalledWith(tx, 'user-hollow');
        });
    });
});
