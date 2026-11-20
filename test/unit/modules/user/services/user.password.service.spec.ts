import { buildActivityLogCreateManyEffect } from '@test/unit/helpers/test.unit.activity-log-effect.helper';
import type { IActivityLogCreateManyEffect } from '@modules/activity-log/interfaces/activity-log.interface';
import type { INotificationNotifyEffect } from '@modules/notification/interfaces/notification.interface';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { MessageService } from '@common/message/services/message.service';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseUnavailableException } from '@common/database/exceptions/database.unavailable.exception';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import {
    buildApiKeyContext,
    buildRequestContext,
    buildUser,
} from '@test/unit/helpers/test.unit.request.helper';
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
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import { TestUnitUserConfigValues } from '@test/unit/helpers/test.unit.user.helper';
import { buildPrismaKnownRequestError } from '@test/unit/helpers/test.unit.database.helper';

describe('UserPasswordService', () => {
    const userForgotPasswordRepository: MockProxy<UserForgotPasswordRepository> =
        mock<UserForgotPasswordRepository>();
    const userRepository: MockProxy<UserRepository> = mock<UserRepository>();
    const messageService: MockProxy<MessageService> = mock<MessageService>();
    const userService: MockProxy<UserService> = mock<UserService>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();
    const notificationService: MockProxy<NotificationService> =
        mock<NotificationService>();
    const featureFlagService: MockProxy<FeatureFlagService> =
        mock<FeatureFlagService>();
    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();

    let service: UserPasswordService;
    let helperStringService: HelperStringService;
    let helperHashService: HelperHashService;

    const tx = {} as IDatabaseTransactionClient;
    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    const usedAt = new Date('2026-03-01T00:00:00.000Z');
    const now = new Date('2026-03-01T00:00:00.000Z');

    const configValues: Record<string, unknown> = {
        ...TestUnitUserConfigValues,
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
        ...buildUser('user-hollow', 'hollow@example.com'),
        password: 'hashed-password',
    };

    const forgot: IUserForgotPasswordCreate = {
        reference: 'FGT-hollow',
        expiredAt: new Date('2026-03-01T00:15:00.000Z'),
        token: 'raw-token',
        hashedToken:
            '34d328009b123fbbb0dc93f18b3e6de1ecf7b1a5783c33dff7ffe1926f09e943',
        expiredInMinutes: 15,
        resendInMinutes: 5,
        link: 'https://example.com/reset?token=raw-token',
    };

    beforeAll(() => {
        vi.useFakeTimers();
    });

    afterAll(() => {
        vi.useRealTimers();
    });

    beforeEach(async () => {
        vi.setSystemTime(now);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserPasswordService,
                {
                    provide: UserForgotPasswordRepository,
                    useValue: userForgotPasswordRepository,
                },
                { provide: UserRepository, useValue: userRepository },
                UserUtil,
                HelperHashService,
                HelperStringService,
                HelperDateService,
                { provide: UserService, useValue: userService },
                { provide: OutboxService, useValue: outboxService },
                {
                    provide: NotificationService,
                    useValue: notificationService,
                },
                DatabaseUtil,
                AuthPasswordUtil,
                { provide: FeatureFlagService, useValue: featureFlagService },
                {
                    provide: ActivityLogService,
                    useValue: activityLogService,
                },
                { provide: MessageService, useValue: messageService },
                {
                    provide: ConfigService,
                    useValue: buildConfigService(configValues),
                },
            ],
        }).compile();
        service = module.get(UserPasswordService);
        helperStringService = module.get(HelperStringService);
        helperHashService = module.get(HelperHashService);
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
            const random = vi
                .spyOn(helperStringService, 'random')
                .mockReturnValue('random-password');
            const argon2Hash = vi
                .spyOn(helperHashService, 'argon2Hash')
                .mockResolvedValue('hashed');

            await expect(service.createTemporaryPassword()).resolves.toEqual({
                password: {
                    passwordHash: 'hashed',
                    passwordExpired: new Date('2026-03-01T01:00:00.000Z'),
                    passwordCreated: now,
                    passwordPeriodExpired: new Date('2026-05-30T00:00:00.000Z'),
                },
                passwordString: 'random-password',
            });

            expect(random).toHaveBeenCalledWith(14);
            expect(argon2Hash).toHaveBeenCalledWith('random-password');
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
            const conflict = buildPrismaKnownRequestError('P2034');
            outboxService.withTransaction.mockRejectedValue(conflict);

            await expect(
                service.countFailedPasswordAttempt(
                    requestContext,
                    apiKeyContext,
                    baseUser
                )
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.passwordAttemptMax,
            });
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
        });

        it('wraps any other error in AppUnknownException', async () => {
            const cause = new Error('database exploded');
            outboxService.withTransaction.mockRejectedValue(cause);

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
            vi.spyOn(helperStringService, 'random')
                .mockReturnValueOnce('raw-token')
                .mockReturnValueOnce('hollow');
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
        });

        it('returns the payload when the previous request is past its resend window', async () => {
            userRepository.findOneActiveByEmail.mockResolvedValue(baseUser);
            userForgotPasswordRepository.findOneLatestByForgotPassword.mockResolvedValue(
                {
                    ...lastForgot,
                    createdAt: new Date('2026-02-28T00:00:00.000Z'),
                } as typeof lastForgot
            );

            await expect(
                service.prepareForgotPassword('hollow@example.com')
            ).resolves.toEqual({ user: baseUser, forgot });
        });

        it('returns null without a reset payload when no active user holds the email', async () => {
            userRepository.findOneActiveByEmail.mockResolvedValue(null);

            await expect(
                service.prepareForgotPassword('hollow@example.com')
            ).resolves.toBeNull();

            expect(
                userForgotPasswordRepository.findOneLatestByForgotPassword
            ).not.toHaveBeenCalled();
        });

        it('returns null inside the resend window', async () => {
            userRepository.findOneActiveByEmail.mockResolvedValue(baseUser);
            userForgotPasswordRepository.findOneLatestByForgotPassword.mockResolvedValue(
                lastForgot
            );

            await expect(
                service.prepareForgotPassword('hollow@example.com')
            ).resolves.toBeNull();

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
                    expiredAt: '2026-03-01T00:15:00.000Z',
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

            expect(
                userForgotPasswordRepository.findOneActiveByForgotPasswordToken
            ).not.toHaveBeenCalled();
        });

        it('hashes the token and returns the active request', async () => {
            userForgotPasswordRepository.findOneActiveByForgotPasswordToken.mockResolvedValue(
                reset
            );

            await expect(service.getOneActiveReset('raw-token')).resolves.toBe(
                reset
            );

            expect(
                userForgotPasswordRepository.findOneActiveByForgotPasswordToken
            ).toHaveBeenCalledWith(
                '34d328009b123fbbb0dc93f18b3e6de1ecf7b1a5783c33dff7ffe1926f09e943'
            );
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
            const threshold = new Date('2025-12-01T00:00:00.000Z');
            userForgotPasswordRepository.deleteExpiredBefore.mockResolvedValue(
                2
            );

            await expect(service.purgeExpired()).resolves.toBe(2);

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
            const random = vi
                .spyOn(helperStringService, 'random')
                .mockReturnValue('random-ref');

            expect(service['createReference']()).toBe('FGT-random-ref');
            expect(random).toHaveBeenCalledWith(8);
        });
    });

    describe('createToken', () => {
        it('builds a random token of the configured length', () => {
            const random = vi
                .spyOn(helperStringService, 'random')
                .mockReturnValue('random-token');

            expect(service['createToken']()).toBe('random-token');
            expect(random).toHaveBeenCalledWith(32);
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
            vi.spyOn(helperStringService, 'random')
                .mockReturnValueOnce('raw-token')
                .mockReturnValueOnce('random-ref');

            expect(service['createForgot']()).toEqual({
                reference: 'FGT-random-ref',
                expiredAt: new Date(now.getTime() + 15 * 60 * 1000),
                token: 'raw-token',
                hashedToken:
                    '34d328009b123fbbb0dc93f18b3e6de1ecf7b1a5783c33dff7ffe1926f09e943',
                expiredInMinutes: 15,
                resendInMinutes: 5,
                link: 'https://example.com/reset?token=raw-token',
            });
        });
    });
});
