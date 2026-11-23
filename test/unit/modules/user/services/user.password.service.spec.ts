import { buildActivityLogCreateManyEffect } from '@test/unit/helpers/test.unit.activity-log-effect.helper';
import type { IActivityLogCreateManyEffect } from '@modules/activity-log/interfaces/activity-log.interface';
import type { INotificationNotifyEffect } from '@modules/notification/interfaces/notification.interface';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { MessageService } from '@common/message/services/message.service';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumActivityLogAction,
    EnumUserLoginFrom,
    EnumUserLoginWith,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
    EnumRoleScope,
} from '@generated/prisma-client/client';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseUnavailableException } from '@common/database/exceptions/database.unavailable.exception';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import {
    buildRequestContext,
    buildApiKeyContext,
} from '@test/unit/helpers/test.unit.request.helper';
import type { IAuthPassword } from '@modules/auth/interfaces/auth.interface';
import { AuthPasswordUtil } from '@modules/auth/utils/auth.password.util';
import {
    EnumFeatureFlagKey,
    EnumFeatureFlagMetadataKey,
} from '@modules/feature-flag/enums/feature-flag.enum';
import { FeatureFlagNotConfiguredException } from '@modules/feature-flag/exceptions/feature-flag.not-configured.exception';
import { FeatureFlagService } from '@modules/feature-flag/services/feature-flag.service';
import { stubPasswordMetadataNumbers } from '@test/unit/helpers/test.unit.feature-flag.helper';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import type {
    IUser,
    IUserForgotPassword,
    IUserForgotPasswordCreate,
} from '@modules/user/interfaces/user.interface';
import { UserForgotPasswordRepository } from '@modules/user/repositories/user.forgot-password.repository';
import { UserRepository } from '@modules/user/repositories/user.repository';
import { UserService } from '@modules/user/services/user.service';
import { UserPasswordService } from '@modules/user/services/user.password.service';
import { UserUtil } from '@modules/user/utils/user.util';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import {
    EnumActivityLogProcess,
    EnumActivityLogQueue,
} from '@modules/activity-log/enums/activity-log.enum';
import { OutboxService } from '@common/outbox/services/outbox.service';
import {
    EnumNotificationKind,
    EnumNotificationLoginLockedMethod,
    EnumNotificationProcess,
    EnumNotificationQueue,
} from '@modules/notification/enums/notification.enum';
import { NotificationService } from '@modules/notification/services/notification.service';
import { Duration } from 'luxon';

describe('UserPasswordService', () => {
    const userForgotPasswordRepository: MockProxy<UserForgotPasswordRepository> =
        mock<UserForgotPasswordRepository>();
    const userRepository: MockProxy<UserRepository> = mock<UserRepository>();
    const userUtil: MockProxy<UserUtil> = mock<UserUtil>();
    const helperHashService: MockProxy<HelperHashService> =
        mock<HelperHashService>();
    const helperStringService: MockProxy<HelperStringService> =
        mock<HelperStringService>();
    const messageService: MockProxy<MessageService> = mock<MessageService>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const userService: MockProxy<UserService> = mock<UserService>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();
    const notificationService: MockProxy<NotificationService> =
        mock<NotificationService>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();
    const authPasswordUtil: MockProxy<AuthPasswordUtil> =
        mock<AuthPasswordUtil>();
    const featureFlagService: MockProxy<FeatureFlagService> =
        mock<FeatureFlagService>();
    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();
    const configGet =
        vi.fn<(key: string) => boolean | number | string | undefined>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });

    let service: UserPasswordService;

    const tx = {} as IDatabaseTransactionClient;
    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    const usedAt = new Date('2026-03-01T00:00:00.000Z');
    const now = new Date('2026-03-01T00:00:00.000Z');

    const configValues: Record<string, boolean | number | string> = {
        'frontend.baseUrl': 'https://example.com',
        'forgotPassword.reference.prefix': 'FGT',
        'forgotPassword.reference.length': 8,
        'forgotPassword.expiresInMinutes': 15,
        'forgotPassword.tokenLength': 32,
        'forgotPassword.resendInMinutes': 5,
        'forgotPassword.retentionInMs': 7776000000,
        'forgotPassword.linkPattern': '{frontendBaseUrl}/reset?token={token}',
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
        passwordLockedUntil: null,
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
            scope: EnumRoleScope.platform,
            key: 'user',
            name: 'user',
            policyRevision: 0,
        },
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
                    provide: UserForgotPasswordRepository,
                    useValue: userForgotPasswordRepository,
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
                { provide: OutboxService, useValue: outboxService },
                {
                    provide: NotificationService,
                    useValue: notificationService,
                },
                { provide: DatabaseUtil, useValue: databaseUtil },
                { provide: AuthPasswordUtil, useValue: authPasswordUtil },
                { provide: FeatureFlagService, useValue: featureFlagService },
                {
                    provide: ActivityLogService,
                    useValue: activityLogService,
                },
                { provide: MessageService, useValue: messageService },
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();
        service = module.get(UserPasswordService);
    });

    describe('assertPasswordAttemptAvailable', () => {
        it('throws UserPasswordAttemptMaxException when the lock ends later than now', () => {
            expect(() =>
                service.assertPasswordAttemptAvailable({
                    ...baseUser,
                    passwordLockedUntil: new Date('2026-03-01T00:10:00.000Z'),
                })
            ).toThrow(
                expect.objectContaining({
                    module: 'user',
                    statusCode: EnumUserStatusCodeError.passwordAttemptMax,
                    statusCodeKey: 'passwordAttemptMax',
                    messagePath: 'user.error.passwordAttemptMax',
                })
            );
        });

        it('returns when the lock ended before now', () => {
            expect(() =>
                service.assertPasswordAttemptAvailable({
                    ...baseUser,
                    passwordLockedUntil: new Date('2026-02-28T23:50:00.000Z'),
                })
            ).not.toThrow();
        });

        it('returns when the user holds no lock', () => {
            expect(() =>
                service.assertPasswordAttemptAvailable(baseUser)
            ).not.toThrow();
        });
    });

    describe('assertPasswordNotLocked', () => {
        it('throws UserPasswordAttemptMaxException when the counted failure locked sign-in', () => {
            expect(() => service.assertPasswordNotLocked(true)).toThrow(
                expect.objectContaining({
                    module: 'user',
                    statusCode: EnumUserStatusCodeError.passwordAttemptMax,
                    messagePath: 'user.error.passwordAttemptMax',
                })
            );
        });

        it('returns when the counted failure did not lock', () => {
            expect(() => service.assertPasswordNotLocked(false)).not.toThrow();
        });
    });

    describe('getCredential', () => {
        it('returns the user with its password hash', () => {
            expect(service.getCredential(baseUser)).toEqual({
                user: baseUser,
                hashedPassword: 'hashed-password',
            });
        });

        it('returns null for a passwordless user', () => {
            expect(
                service.getCredential({ ...baseUser, password: null })
            ).toBeNull();
        });
    });

    describe('resetPasswordAttemptInTx', () => {
        it('resets the counter and lock of the user on the given transaction', async () => {
            userService.resetPasswordAttemptInTx.mockResolvedValue();

            await expect(
                service.resetPasswordAttemptInTx(tx, 'user-hollow')
            ).resolves.toBeUndefined();

            expect(userService.resetPasswordAttemptInTx).toHaveBeenCalledWith(
                tx,
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

    describe('countFailedPasswordAttempt', () => {
        const lockedUntil = new Date('2026-03-01T00:15:00.000Z');
        const entryEffect: IActivityLogCreateManyEffect = {
            queue: EnumActivityLogQueue.activityLog,
            name: EnumActivityLogProcess.createMany,
            data: { rows: [] },
            priority: EnumQueuePriority.low,
            idempotencyKey: null,
        };
        const notifyEffect: INotificationNotifyEffect = {
            queue: EnumNotificationQueue.notification,
            name: EnumNotificationProcess.notify,
            data: {
                kind: EnumNotificationKind.loginLocked,
                context: {
                    userId: 'user-hollow',
                    proceedBy: 'user-hollow',
                    method: EnumNotificationLoginLockedMethod.password,
                    methodLabel: 'Label',
                    lockedUntil: '2026-03-01T00:15:00.000Z',
                    snapshot: null,
                    verificationId: null,
                },
                recipient: null,
                notificationId: null,
            },
            priority: EnumQueuePriority.high,
            idempotencyKey: null,
        };

        beforeEach(() => {
            stubPasswordMetadataNumbers(featureFlagService, 5, 15);
            outboxService.withTransaction.mockImplementation(
                async fn => fn(tx) as never
            );
        });

        it.each([
            { maxAttempts: 3, minutes: 5, end: '2026-03-01T00:05:00.000Z' },
            { maxAttempts: 8, minutes: 30, end: '2026-03-01T00:30:00.000Z' },
        ])(
            'passes $maxAttempts attempts and a $minutes minute lock from the loginWithCredential flag to the counter',
            async ({ maxAttempts, minutes, end }) => {
                stubPasswordMetadataNumbers(
                    featureFlagService,
                    maxAttempts,
                    minutes
                );
                userRepository.incrementPasswordAttemptInTx.mockResolvedValue(
                    false
                );

                await service.countFailedPasswordAttempt(
                    requestContext,
                    apiKeyContext,
                    baseUser
                );

                expect(
                    featureFlagService.getMetadataNumber
                ).toHaveBeenCalledWith(
                    EnumFeatureFlagKey.loginWithCredential,
                    EnumFeatureFlagMetadataKey.passwordMaxAttempts
                );
                expect(
                    featureFlagService.getMetadataNumber
                ).toHaveBeenCalledWith(
                    EnumFeatureFlagKey.loginWithCredential,
                    EnumFeatureFlagMetadataKey.passwordLockDurationInMinutes
                );
                expect(
                    userRepository.incrementPasswordAttemptInTx
                ).toHaveBeenCalledWith(
                    tx,
                    'user-hollow',
                    maxAttempts,
                    new Date(end)
                );
            }
        );

        it.each([
            EnumFeatureFlagMetadataKey.passwordMaxAttempts,
            EnumFeatureFlagMetadataKey.passwordLockDurationInMinutes,
        ])(
            'propagates FeatureFlagNotConfiguredException from the %s read and writes nothing',
            async failing => {
                const failure = new FeatureFlagNotConfiguredException(
                    EnumFeatureFlagKey.loginWithCredential,
                    failing
                );
                featureFlagService.getMetadataNumber.mockImplementation(
                    async (_key, metadataKey) => {
                        if (metadataKey === failing) {
                            throw failure;
                        }

                        return 5;
                    }
                );

                await expect(
                    service.countFailedPasswordAttempt(
                        requestContext,
                        apiKeyContext,
                        baseUser
                    )
                ).rejects.toBe(failure);
                expect(outboxService.withTransaction).not.toHaveBeenCalled();
                expect(
                    userRepository.incrementPasswordAttemptInTx
                ).not.toHaveBeenCalled();
            }
        );

        it('counts the failure on the outbox tx and adds no row below the budget', async () => {
            userRepository.incrementPasswordAttemptInTx.mockResolvedValue(
                false
            );

            await expect(
                service.countFailedPasswordAttempt(
                    requestContext,
                    apiKeyContext,
                    baseUser
                )
            ).resolves.toBe(false);
            expect(outboxService.withTransaction).toHaveBeenCalledTimes(1);
            expect(
                userRepository.incrementPasswordAttemptInTx
            ).toHaveBeenCalledWith(tx, 'user-hollow', 5, lockedUntil);
            expect(outboxService.addInTx).not.toHaveBeenCalled();
            expect(outboxService.addManyInTx).not.toHaveBeenCalled();
            expect(activityLogService.recordEffect).not.toHaveBeenCalled();
            expect(notificationService.notify).not.toHaveBeenCalled();
        });

        it('adds the reach-max entry and the loginLocked effect on the counting tx when the failure locked, and no lockout effect', async () => {
            userRepository.incrementPasswordAttemptInTx.mockResolvedValue(true);
            helperDateService.formatToIso.mockReturnValue(
                '2026-03-01T00:15:00.000Z'
            );
            activityLogService.recordEffect.mockReturnValue(entryEffect);
            notificationService.notify.mockReturnValue(notifyEffect);
            messageService.setMessage.mockReturnValue('Label');

            await expect(
                service.countFailedPasswordAttempt(
                    requestContext,
                    apiKeyContext,
                    baseUser
                )
            ).resolves.toBe(true);
            expect(
                userRepository.incrementPasswordAttemptInTx
            ).toHaveBeenCalledWith(tx, 'user-hollow', 5, lockedUntil);
            expect(helperDateService.formatToIso).toHaveBeenCalledWith(
                lockedUntil
            );
            expect(activityLogService.recordEffect).toHaveBeenCalledTimes(1);
            expect(activityLogService.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                null,
                null,
                {
                    action: EnumActivityLogAction.userReachMaxPasswordAttempt,
                    userId: 'user-hollow',
                    createdBy: 'user-hollow',
                }
            );
            expect(notificationService.notify).toHaveBeenCalledWith(
                EnumNotificationKind.loginLocked,
                {
                    userId: 'user-hollow',
                    proceedBy: 'user-hollow',
                    method: EnumNotificationLoginLockedMethod.password,
                    methodLabel: 'Label',
                    lockedUntil: '2026-03-01T00:15:00.000Z',
                }
            );
            expect(messageService.setMessage).toHaveBeenCalledWith(
                'notification.loginLockedMethod.password'
            );
            expect(outboxService.addManyInTx).toHaveBeenCalledTimes(1);
            expect(outboxService.addManyInTx).toHaveBeenCalledWith(tx, [
                entryEffect,
                notifyEffect,
            ]);
        });

        it('throws the max-attempt exception with no row on a write conflict', async () => {
            const conflict = new Error('write conflict');
            outboxService.withTransaction.mockRejectedValue(conflict);
            databaseUtil.toException.mockReturnValue(
                new DatabaseWriteConflictException()
            );

            await expect(
                service.countFailedPasswordAttempt(
                    requestContext,
                    apiKeyContext,
                    baseUser
                )
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

            await expect(
                service.countFailedPasswordAttempt(
                    requestContext,
                    apiKeyContext,
                    baseUser
                )
            ).rejects.toBe(failure);
            expect(databaseUtil.toException).not.toHaveBeenCalled();
        });

        it('wraps any other error in AppUnknownException', async () => {
            const cause = new Error('database exploded');
            outboxService.withTransaction.mockRejectedValue(cause);
            databaseUtil.toException.mockReturnValue(null);

            await expect(
                service.countFailedPasswordAttempt(
                    requestContext,
                    apiKeyContext,
                    baseUser
                )
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: cause,
            });
        });
    });

    describe('prepareForgotPassword', () => {
        const lastForgot = {
            createdAt: new Date('2026-03-01T00:00:00.000Z'),
        } as Awaited<
            ReturnType<
                UserForgotPasswordRepository['findOneLatestByForgotPassword']
            >
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
            userForgotPasswordRepository.findOneLatestByForgotPassword.mockResolvedValue(
                null
            );

            await expect(
                service.prepareForgotPassword('hollow@example.com')
            ).resolves.toEqual({ user: baseUser, forgot });

            expect(userUtil.isInsideResendWindow).not.toHaveBeenCalled();
        });

        it('returns the payload when the previous request is past its resend window', async () => {
            userRepository.findOneActiveByEmail.mockResolvedValue(baseUser);
            userForgotPasswordRepository.findOneLatestByForgotPassword.mockResolvedValue(
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
                userForgotPasswordRepository.findOneLatestByForgotPassword
            ).not.toHaveBeenCalled();
            expect(helperStringService.random).not.toHaveBeenCalled();
        });

        it('returns null inside the resend window', async () => {
            userRepository.findOneActiveByEmail.mockResolvedValue(baseUser);
            userForgotPasswordRepository.findOneLatestByForgotPassword.mockResolvedValue(
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
        const forgotEffect: INotificationNotifyEffect = {
            queue: EnumNotificationQueue.notification,
            name: EnumNotificationProcess.notify,
            data: {
                kind: EnumNotificationKind.forgotPassword,
                context: {
                    userId: 'user-hollow',
                    proceedBy: 'user-hollow',
                    snapshot: null,
                    verificationId: null,
                },
                recipient: null,
                notificationId: null,
            },
            priority: EnumQueuePriority.medium,
            idempotencyKey: 'forgotPassword-FGT-hollow',
        };

        const forgotEntry = buildActivityLogCreateManyEffect('activityLog');

        beforeEach(() => {
            outboxService.withTransaction.mockImplementation(
                async fn => fn(tx) as never
            );
            helperDateService.formatToIso.mockReturnValue(
                '2026-03-05T00:00:00.000Z'
            );
            notificationService.notify.mockReturnValue(forgotEffect);
            activityLogService.recordEffect.mockReturnValue(forgotEntry);
        });

        it('replaces the unused requests and adds the forgotPassword effect and entry on one transaction', async () => {
            await service.createForgotPassword(
                requestContext,
                apiKeyContext,
                'user-hollow',
                'hollow@example.com',
                forgot
            );

            expect(
                userForgotPasswordRepository.createReplacingUnusedInTx
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
            expect(activityLogService.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                null,
                null,
                {
                    action: EnumActivityLogAction.userForgotPassword,
                    userId: 'user-hollow',
                    createdBy: 'user-hollow',
                }
            );
            expect(outboxService.addManyInTx).toHaveBeenCalledWith(tx, [
                forgotEntry,
                forgotEffect,
            ]);
            expect(
                userForgotPasswordRepository.createReplacingUnusedInTx
            ).toHaveBeenCalledBefore(outboxService.addManyInTx);
        });

        it('adds no effect when the replace rejects', async () => {
            const cause = new Error('write');
            userForgotPasswordRepository.createReplacingUnusedInTx.mockRejectedValue(
                cause
            );

            await expect(
                service.createForgotPassword(
                    requestContext,
                    apiKeyContext,
                    'user-hollow',
                    'hollow@example.com',
                    forgot
                )
            ).rejects.toBe(cause);
            expect(outboxService.addManyInTx).not.toHaveBeenCalled();
        });
    });

    describe('getOneActiveReset', () => {
        const reset = {
            id: 'forgot-hollow',
            userId: 'user-hollow',
            user: baseUser,
        } as IUserForgotPassword;

        it('validates changePassword.forgotAllowed before the read', async () => {
            userForgotPasswordRepository.findOneActiveByForgotPasswordToken.mockResolvedValue(
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
                userForgotPasswordRepository.findOneActiveByForgotPasswordToken
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
                userForgotPasswordRepository.findOneActiveByForgotPasswordToken
            ).not.toHaveBeenCalled();
        });

        it('hashes the token and returns the active request', async () => {
            helperHashService.sha256Hash.mockReturnValue('hashed-token');
            userForgotPasswordRepository.findOneActiveByForgotPasswordToken.mockResolvedValue(
                reset
            );

            await expect(service.getOneActiveReset('raw-token')).resolves.toBe(
                reset
            );

            expect(helperHashService.sha256Hash).toHaveBeenCalledWith(
                'raw-token'
            );
            expect(
                userForgotPasswordRepository.findOneActiveByForgotPasswordToken
            ).toHaveBeenCalledWith('hashed-token');
        });

        it('throws UserTokenInvalidException when no active request matches', async () => {
            userForgotPasswordRepository.findOneActiveByForgotPasswordToken.mockResolvedValue(
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
            userForgotPasswordRepository.markUsedInTx.mockResolvedValue(true);

            await expect(
                service.markResetUsedInTx(
                    tx,
                    'forgot-hollow',
                    usedAt,
                    'user-hollow'
                )
            ).resolves.toBeUndefined();

            expect(
                userForgotPasswordRepository.markUsedInTx
            ).toHaveBeenCalledWith(tx, 'forgot-hollow', usedAt, 'user-hollow');
        });

        it('throws UserTokenInvalidException when the request was already used', async () => {
            userForgotPasswordRepository.markUsedInTx.mockResolvedValue(false);

            await expect(
                service.markResetUsedInTx(
                    tx,
                    'forgot-hollow',
                    usedAt,
                    'user-hollow'
                )
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
                service.markUnusedResetsUsedInTx(
                    tx,
                    'user-hollow',
                    'user-hollow'
                )
            ).resolves.toBeUndefined();

            expect(
                userForgotPasswordRepository.markUnusedUsedByUserInTx
            ).toHaveBeenCalledWith(tx, 'user-hollow', 'user-hollow');
        });
    });

    describe('purgeExpired', () => {
        it('deletes the reset rows expired before now minus the retention and returns the count', async () => {
            const retention = Duration.fromObject({
                milliseconds: 7776000000,
            });
            const threshold = new Date('2025-12-01T00:00:00.000Z');
            helperDateService.createDuration.mockReturnValue(retention);
            helperDateService.backward.mockReturnValue(threshold);
            userForgotPasswordRepository.deleteExpiredBefore.mockResolvedValue(
                2
            );

            await expect(service.purgeExpired()).resolves.toBe(2);

            expect(helperDateService.createDuration).toHaveBeenCalledWith({
                milliseconds: 7776000000,
            });
            expect(helperDateService.backward).toHaveBeenCalledWith(
                now,
                retention
            );
            expect(
                userForgotPasswordRepository.deleteExpiredBefore
            ).toHaveBeenCalledWith(threshold);
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
                '{frontendBaseUrl}/reset?token={token}',
                {
                    frontendBaseUrl: 'https://example.com',
                    token: 'random-token',
                }
            );
        });
    });
});
