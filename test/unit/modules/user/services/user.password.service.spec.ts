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
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseUnavailableException } from '@common/database/exceptions/database.unavailable.exception';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import type { IActivityLogStageInput } from '@modules/activity-log/interfaces/activity-log.interface';
import type { IAuthPassword } from '@modules/auth/interfaces/auth.interface';
import { AuthPasswordUtil } from '@modules/auth/utils/auth.password.util';
import {
    EnumFeatureFlagKey,
    EnumFeatureFlagMetadataKey,
} from '@modules/feature-flag/enums/feature-flag.enum';
import { FeatureFlagService } from '@modules/feature-flag/services/feature-flag.service';
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
import { UserTwoFactorService } from '@modules/user/services/user.two-factor.service';
import { UserUtil } from '@modules/user/utils/user.util';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { EnumUserProcess, EnumUserQueue } from '@modules/user/enums/user.enum';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import type { IOutboxEffect } from '@modules/outbox/interfaces/outbox.interface';
import { OutboxService } from '@modules/outbox/services/outbox.service';
import {
    EnumNotificationKind,
    EnumNotificationProcess,
    EnumNotificationQueue,
} from '@modules/notification/enums/notification.enum';
import { NotificationService } from '@modules/notification/services/notification.service';
import { Duration } from 'luxon';

describe('UserPasswordService', () => {
    const userPasswordRepository: MockProxy<UserPasswordRepository> =
        mock<UserPasswordRepository>();
    const userRepository: MockProxy<UserRepository> = mock<UserRepository>();
    const userUtil: MockProxy<UserUtil> = mock<UserUtil>();
    const helperHashService: MockProxy<HelperHashService> =
        mock<HelperHashService>();
    const helperStringService: MockProxy<HelperStringService> =
        mock<HelperStringService>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const userService: MockProxy<UserService> = mock<UserService>();
    const userTwoFactorService: MockProxy<UserTwoFactorService> =
        mock<UserTwoFactorService>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();
    const notificationService: MockProxy<NotificationService> =
        mock<NotificationService>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();
    const authPasswordUtil: MockProxy<AuthPasswordUtil> =
        mock<AuthPasswordUtil>();
    const featureFlagService: MockProxy<FeatureFlagService> =
        mock<FeatureFlagService>();
    const configGet =
        vi.fn<(key: string) => boolean | number | string | undefined>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });

    let service: UserPasswordService;

    const tx = {} as IDatabaseTransactionClient;
    const lockoutEffect: IOutboxEffect = {
        queue: EnumUserQueue.user,
        name: EnumUserProcess.lockout,
        data: { userId: 'user-hollow' },
        priority: EnumQueuePriority.high,
        idempotencyKey: null,
    };
    const usedAt = new Date('2026-03-01T00:00:00.000Z');
    const now = new Date('2026-03-01T00:00:00.000Z');

    const configValues: Record<string, boolean | number | string> = {
        'auth.password.attempt': true,
        'auth.password.maxAttempt': 5,
        'home.url': 'https://example.com',
        'forgotPassword.reference.prefix': 'FGT',
        'forgotPassword.reference.length': 8,
        'forgotPassword.expiredInMinutes': 15,
        'forgotPassword.tokenLength': 32,
        'forgotPassword.resendInMinutes': 5,
        'forgotPassword.linkPattern': '{homeUrl}/reset?token={token}',
    };

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
        configGet.mockImplementation(key => configValues[key]);
        helperDateService.create.mockReturnValue(now);
        helperDateService.forward.mockImplementation(
            (date, duration: Duration) =>
                new Date(date.getTime() + duration.as('milliseconds'))
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
                { provide: HelperHashService, useValue: helperHashService },
                {
                    provide: HelperStringService,
                    useValue: helperStringService,
                },
                { provide: HelperDateService, useValue: helperDateService },
                { provide: UserService, useValue: userService },
                {
                    provide: UserTwoFactorService,
                    useValue: userTwoFactorService,
                },
                { provide: OutboxService, useValue: outboxService },
                {
                    provide: NotificationService,
                    useValue: notificationService,
                },
                { provide: DatabaseUtil, useValue: databaseUtil },
                { provide: AuthPasswordUtil, useValue: authPasswordUtil },
                { provide: FeatureFlagService, useValue: featureFlagService },
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

    describe('countPasswordAttempt', () => {
        beforeEach(() => {
            outboxService.withTransaction.mockImplementation(
                async fn => fn(tx) as never
            );
        });

        it('returns null without counting when the user has no password', async () => {
            const passwordless: IUser = { ...baseUser, password: null };

            await expect(
                service.countPasswordAttempt(passwordless)
            ).resolves.toBeNull();
            expect(outboxService.withTransaction).not.toHaveBeenCalled();
            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });

        it('counts the attempt on the outbox tx and adds no row within the budget', async () => {
            userRepository.incrementPasswordAttemptInTx.mockResolvedValue(true);

            await expect(
                service.countPasswordAttempt(baseUser)
            ).resolves.toEqual({
                user: baseUser,
                hashedPassword: 'hashed-password',
                isAttemptCounted: true,
                lockoutStages: [],
            });
            expect(
                userRepository.incrementPasswordAttemptInTx
            ).toHaveBeenCalledWith(tx, 'user-hollow', 5);
            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });

        it('returns a counted attempt without opening a transaction when attempt tracking is off', async () => {
            configGet.mockImplementation(key =>
                key === 'auth.password.attempt' ? false : configValues[key]
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
                    { provide: HelperHashService, useValue: helperHashService },
                    {
                        provide: HelperStringService,
                        useValue: helperStringService,
                    },
                    {
                        provide: HelperDateService,
                        useValue: helperDateService,
                    },
                    { provide: UserService, useValue: userService },
                    {
                        provide: UserTwoFactorService,
                        useValue: userTwoFactorService,
                    },
                    { provide: OutboxService, useValue: outboxService },
                    {
                        provide: NotificationService,
                        useValue: notificationService,
                    },
                    { provide: DatabaseUtil, useValue: databaseUtil },
                    { provide: AuthPasswordUtil, useValue: authPasswordUtil },
                    {
                        provide: FeatureFlagService,
                        useValue: featureFlagService,
                    },
                    { provide: ConfigService, useValue: configService },
                ],
            }).compile();
            const untracked = module.get(UserPasswordService);

            await expect(
                untracked.countPasswordAttempt(baseUser)
            ).resolves.toEqual({
                user: baseUser,
                hashedPassword: 'hashed-password',
                isAttemptCounted: true,
                lockoutStages: [],
            });
            expect(outboxService.withTransaction).not.toHaveBeenCalled();
            expect(
                userRepository.incrementPasswordAttemptInTx
            ).not.toHaveBeenCalled();
        });

        it('throws the max-attempt exception with no row on a write conflict', async () => {
            const conflict = new Error('write conflict');
            outboxService.withTransaction.mockRejectedValue(conflict);
            databaseUtil.toException.mockReturnValue(
                new DatabaseWriteConflictException()
            );

            await expect(
                service.countPasswordAttempt(baseUser)
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.passwordAttemptMax,
                statusCodeKey: 'passwordAttemptMax',
                messagePath: 'user.error.passwordAttemptMax',
            });
            expect(databaseUtil.toException).toHaveBeenCalledWith(conflict);
            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });

        it('rethrows an AppBaseException unchanged', async () => {
            const failure = new DatabaseUnavailableException();
            outboxService.withTransaction.mockRejectedValue(failure);

            await expect(service.countPasswordAttempt(baseUser)).rejects.toBe(
                failure
            );
            expect(databaseUtil.toException).not.toHaveBeenCalled();
        });

        it('wraps any other error in AppUnknownException', async () => {
            const cause = new Error('database exploded');
            outboxService.withTransaction.mockRejectedValue(cause);
            databaseUtil.toException.mockReturnValue(null);

            await expect(
                service.countPasswordAttempt(baseUser)
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: cause,
            });
        });

        it('adds the lockout row on the outbox tx and returns an uncounted attempt with the lockout stages when the budget is spent', async () => {
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
            userRepository.incrementPasswordAttemptInTx.mockResolvedValue(
                false
            );
            userTwoFactorService.lockoutEffect.mockReturnValue(lockoutEffect);

            await expect(
                service.countPasswordAttempt(baseUser)
            ).resolves.toEqual({
                user: baseUser,
                hashedPassword: 'hashed-password',
                isAttemptCounted: false,
                lockoutStages,
            });
            expect(outboxService.withTransaction).toHaveBeenCalledTimes(1);
            expect(
                userRepository.incrementPasswordAttemptInTx
            ).toHaveBeenCalledWith(tx, 'user-hollow', 5);
            expect(userTwoFactorService.lockoutEffect).toHaveBeenCalledWith(
                'user-hollow'
            );
            expect(outboxService.addInTx).toHaveBeenCalledTimes(1);
            expect(outboxService.addInTx).toHaveBeenCalledWith(
                tx,
                lockoutEffect
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

        beforeEach(() => {
            helperStringService.random
                .mockReturnValueOnce('raw-token')
                .mockReturnValueOnce('hollow');
            helperHashService.sha256Hash.mockReturnValue('hashed-token');
            helperStringService.fillPattern.mockReturnValue(forgot.link);
            helperDateService.forward.mockReturnValue(forgot.expiredAt);
        });

        it('validates changePassword.forgotAllowed before the read', async () => {
            userRepository.findOneActiveByEmail.mockResolvedValue(null);

            await service.prepareForgotPassword('hollow@example.com');

            expect(
                featureFlagService.validateFeatureFlagMetadata
            ).toHaveBeenCalledWith(
                EnumFeatureFlagKey.changePassword,
                EnumFeatureFlagMetadataKey.forgotAllowed
            );
            expect(
                featureFlagService.validateFeatureFlagMetadata
            ).toHaveBeenCalledBefore(userRepository.findOneActiveByEmail);
        });

        it('throws the flag exception and reads nothing when the gate rejects', async () => {
            featureFlagService.validateFeatureFlagMetadata.mockRejectedValue(
                new Error('flag')
            );

            await expect(
                service.prepareForgotPassword('hollow@example.com')
            ).rejects.toThrow('flag');

            expect(userRepository.findOneActiveByEmail).not.toHaveBeenCalled();
        });

        it('returns the active user and a fresh reset payload when there is no previous request', async () => {
            userRepository.findOneActiveByEmail.mockResolvedValue(baseUser);
            userPasswordRepository.findOneLatestByForgotPassword.mockResolvedValue(
                null
            );

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

            await expect(
                service.prepareForgotPassword('hollow@example.com')
            ).resolves.toEqual({ user: baseUser, forgot });

            expect(userUtil.isInsideResendWindow).toHaveBeenCalledWith(
                lastForgot!.createdAt,
                5
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
            expect(helperStringService.random).not.toHaveBeenCalled();
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
                5
            );
            expect(helperStringService.random).not.toHaveBeenCalled();
        });
    });

    describe('createForgotPassword', () => {
        const forgotEffect: IOutboxEffect = {
            queue: EnumNotificationQueue.notification,
            name: EnumNotificationProcess.notify,
            data: {
                kind: EnumNotificationKind.forgotPassword,
                context: { userId: 'user-hollow', proceedBy: 'user-hollow' },
                recipient: null,
                notificationId: null,
            },
            priority: EnumQueuePriority.medium,
            idempotencyKey: 'forgotPassword-FGT-hollow',
        };

        beforeEach(() => {
            outboxService.withTransaction.mockImplementation(
                async fn => fn(tx) as never
            );
            helperDateService.formatToIso.mockReturnValue(
                '2026-03-05T00:00:00.000Z'
            );
            notificationService.notify.mockReturnValue(forgotEffect);
        });

        it('replaces the unused requests and adds the forgotPassword effect on one transaction', async () => {
            await service.createForgotPassword(
                'user-hollow',
                'hollow@example.com',
                forgot
            );

            expect(
                userPasswordRepository.createReplacingUnusedInTx
            ).toHaveBeenCalledWith(
                tx,
                'user-hollow',
                'hollow@example.com',
                forgot
            );
            expect(notificationService.notify).toHaveBeenCalledWith(
                EnumNotificationKind.forgotPassword,
                {
                    userId: 'user-hollow',
                    proceedBy: 'user-hollow',
                    link: 'https://example.com/reset?token=raw-token',
                    reference: 'FGT-hollow',
                    expiredAt: '2026-03-05T00:00:00.000Z',
                    expiredInMinutes: 15,
                }
            );
            expect(outboxService.addInTx).toHaveBeenCalledWith(
                tx,
                forgotEffect
            );
            expect(
                userPasswordRepository.createReplacingUnusedInTx
            ).toHaveBeenCalledBefore(outboxService.addInTx);
        });

        it('adds no effect when the replace rejects', async () => {
            const cause = new Error('write');
            userPasswordRepository.createReplacingUnusedInTx.mockRejectedValue(
                cause
            );

            await expect(
                service.createForgotPassword(
                    'user-hollow',
                    'hollow@example.com',
                    forgot
                )
            ).rejects.toBe(cause);
            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });
    });

    describe('getOneActiveReset', () => {
        const reset = {
            id: 'forgot-hollow',
            userId: 'user-hollow',
            user: baseUser,
        } as IUserForgotPassword;

        it('validates changePassword.forgotAllowed before the read', async () => {
            userPasswordRepository.findOneActiveByForgotPasswordToken.mockResolvedValue(
                reset
            );

            await service.getOneActiveReset('raw-token');

            expect(
                featureFlagService.validateFeatureFlagMetadata
            ).toHaveBeenCalledWith(
                EnumFeatureFlagKey.changePassword,
                EnumFeatureFlagMetadataKey.forgotAllowed
            );
            expect(
                featureFlagService.validateFeatureFlagMetadata
            ).toHaveBeenCalledBefore(
                userPasswordRepository.findOneActiveByForgotPasswordToken
            );
        });

        it('throws the flag exception and reads nothing when the gate rejects', async () => {
            featureFlagService.validateFeatureFlagMetadata.mockRejectedValue(
                new Error('flag')
            );

            await expect(
                service.getOneActiveReset('raw-token')
            ).rejects.toThrow('flag');

            expect(helperHashService.sha256Hash).not.toHaveBeenCalled();
            expect(
                userPasswordRepository.findOneActiveByForgotPasswordToken
            ).not.toHaveBeenCalled();
        });

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

    describe('hasPassword', () => {
        it('returns true when the user holds a password hash', () => {
            expect(
                service['hasPassword']({ ...baseUser, password: 'hash' })
            ).toBe(true);
        });

        it('returns false when the user has no password', () => {
            expect(
                service['hasPassword']({ ...baseUser, password: null })
            ).toBe(false);
        });
    });

    describe('buildPasswordLockoutStages', () => {
        it('returns the revoke-all-sessions and max-password-attempt stages owned by the user', () => {
            expect(service['buildPasswordLockoutStages']('user-1')).toEqual([
                {
                    action: EnumActivityLogAction.userRevokeAllSessions,
                    userId: 'user-1',
                    createdBy: 'user-1',
                },
                {
                    action: EnumActivityLogAction.userReachMaxPasswordAttempt,
                    userId: 'user-1',
                    createdBy: 'user-1',
                },
            ]);
        });
    });

    describe('createReference', () => {
        it('builds a prefixed random reference', () => {
            helperStringService.random.mockReturnValue('random-ref');

            expect(service['createReference']()).toBe('FGT-random-ref');
            expect(helperStringService.random).toHaveBeenCalledWith(8);
        });
    });

    describe('createToken', () => {
        it('builds a random token of the configured length', () => {
            helperStringService.random.mockReturnValue('random-token');

            expect(service['createToken']()).toBe('random-token');
            expect(helperStringService.random).toHaveBeenCalledWith(32);
        });
    });

    describe('createExpiredAt', () => {
        it('forwards now by the configured expiry', () => {
            expect(service['createExpiredAt']()).toEqual(
                new Date(now.getTime() + 15 * 60 * 1000)
            );
        });
    });

    describe('createForgot', () => {
        it('builds the reset link, hashed token, reference, and windows', () => {
            helperStringService.random
                .mockReturnValueOnce('random-token')
                .mockReturnValueOnce('random-ref');
            helperHashService.sha256Hash.mockReturnValue('hashed-token');
            helperStringService.fillPattern.mockReturnValue(
                'https://example.com/reset?token=random-token'
            );

            expect(service['createForgot']()).toEqual({
                reference: 'FGT-random-ref',
                expiredAt: new Date(now.getTime() + 15 * 60 * 1000),
                token: 'random-token',
                hashedToken: 'hashed-token',
                expiredInMinutes: 15,
                resendInMinutes: 5,
                link: 'https://example.com/reset?token=random-token',
            });
            expect(helperHashService.sha256Hash).toHaveBeenCalledWith(
                'random-token'
            );
            expect(helperStringService.fillPattern).toHaveBeenCalledWith(
                '{homeUrl}/reset?token={token}',
                { homeUrl: 'https://example.com', token: 'random-token' }
            );
        });
    });
});
