import type { IActivityLogCreateManyEffect } from '@modules/activity-log/interfaces/activity-log.interface';
import type { Duration } from 'luxon';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { MessageService } from '@common/message/services/message.service';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumActivityLogAction,
    EnumDevicePlatform,
    EnumRoleType,
    EnumUserLoginFrom,
    EnumUserLoginWith,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
} from '@generated/prisma-client/client';
import type { TwoFactor } from '@generated/prisma-client/client';
import { EnumAppStatusCodeError } from '@app/enums/app.status-code.enum';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseUnavailableException } from '@common/database/exceptions/database.unavailable.exception';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { EnumAuthTwoFactorMethod } from '@modules/auth/enums/auth.enum';
import { EnumAuthStatusCodeError } from '@modules/auth/enums/auth.status-code.enum';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperEncryptionService } from '@common/helper/services/helper.encryption.service';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import type { IDeviceIdentity } from '@modules/device/interfaces/device.interface';
import { UserTwoFactorChallengeEncryptionPurpose } from '@modules/user/constants/user.constant';
import { AuthTwoFactorSecretUnavailableException } from '@modules/auth/exceptions/auth.two-factor-secret-unavailable.exception';
import { AuthTwoFactorUtil } from '@modules/auth/utils/auth.two-factor.util';
import { SentryService } from '@common/sentry/services/sentry.service';
import { HelperDecryptFailedException } from '@common/helper/exceptions/helper.decrypt-failed.exception';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import {
    buildUser,
    buildRequestContext,
    buildApiKeyContext,
    buildUserContext,
    buildAuthJwtAccessContext,
} from '@test/unit/helpers/test.unit.request.helper';
import { UserUtil } from '@modules/user/utils/user.util';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import type {
    IUser,
    IUserTwoFactorChallengeRow,
    IUserTwoFactorVerifyResult,
} from '@modules/user/interfaces/user.interface';
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
import type { INotificationNotifyEffect } from '@modules/notification/interfaces/notification.interface';
import { NotificationService } from '@modules/notification/services/notification.service';
import { UserRepository } from '@modules/user/repositories/user.repository';
import { UserTwoFactorRepository } from '@modules/user/repositories/user.two-factor.repository';
import { UserTwoFactorService } from '@modules/user/services/user.two-factor.service';

describe('UserTwoFactorService', () => {
    const userTwoFactorRepository: MockProxy<UserTwoFactorRepository> =
        mock<UserTwoFactorRepository>();
    const userRepository: MockProxy<UserRepository> = mock<UserRepository>();
    const authTwoFactorUtil: MockProxy<AuthTwoFactorUtil> =
        mock<AuthTwoFactorUtil>();
    const sentryService: MockProxy<SentryService> = mock<SentryService>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();
    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();
    const userUtil: MockProxy<UserUtil> = mock<UserUtil>();
    const notificationService: MockProxy<NotificationService> =
        mock<NotificationService>();
    const helperStringService: MockProxy<HelperStringService> =
        mock<HelperStringService>();
    const helperHashService: MockProxy<HelperHashService> =
        mock<HelperHashService>();
    const helperEncryptionService: MockProxy<HelperEncryptionService> =
        mock<HelperEncryptionService>();
    const messageService: MockProxy<MessageService> = mock<MessageService>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const configGet = vi.fn<(key: string) => string | number | undefined>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });

    let service: UserTwoFactorService;

    const tx = {} as IDatabaseTransactionClient;
    const now = new Date('2026-03-01T00:00:00.000Z');
    const lockedUntil = new Date('2026-03-01T00:15:00.000Z');
    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    const userContext = buildUserContext(
        buildUser('user-quartz', 'user-quartz@example.com')
    );
    const authContext = buildAuthJwtAccessContext(userContext.user.id);
    const entryEffect: IActivityLogCreateManyEffect = {
        queue: EnumActivityLogQueue.activityLog,
        name: EnumActivityLogProcess.createMany,
        data: { rows: [] },
        priority: EnumQueuePriority.low,
        idempotencyKey: null,
    };

    const baseTwoFactor: TwoFactor = {
        id: 'two-factor-quartz',
        userId: 'user-quartz',
        secret: 'encrypted-secret',
        pendingSecret: null,
        backupCodes: ['hash-one', 'hash-two'],
        enabled: true,
        requiredSetup: false,
        confirmedAt: new Date('2026-01-05T00:00:00.000Z'),
        lastUsedAt: null,
        lastUsedStep: null,
        attempt: 0,
        lockedUntil: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
    };

    const baseUser: IUser = {
        id: 'user-quartz',
        name: 'Quartz Cole',
        username: 'quartzCole',
        isVerified: true,
        verifiedAt: new Date('2026-01-01T00:00:00.000Z'),
        email: 'quartz@example.com',
        roleId: 'role-quartz',
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
        countryId: 'country-quartz',
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
            id: 'role-quartz',
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

    const verifiedResult: IUserTwoFactorVerifyResult = {
        method: EnumAuthTwoFactorMethod.code,
        newBackupCodes: null,
    };
    beforeEach(async () => {
        vi.resetAllMocks();
        helperDateService.create.mockReturnValue(now);
        helperDateService.forward.mockImplementation(
            (date, duration: Duration) =>
                new Date(date.getTime() + duration.as('milliseconds'))
        );

        configGet.mockImplementation((key: string) => {
            const values: Record<string, string | number> = {
                'auth.twoFactor.maxAttempt': 5,
                'auth.twoFactor.lockDurationInMs': 900000,
                'auth.twoFactor.challengeTtlInMs': 300000,
                'app.encryptionSecretKey': 'app-root-secret',
            };
            return values[key];
        });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserTwoFactorService,
                {
                    provide: UserTwoFactorRepository,
                    useValue: userTwoFactorRepository,
                },
                { provide: UserRepository, useValue: userRepository },
                { provide: AuthTwoFactorUtil, useValue: authTwoFactorUtil },
                { provide: SentryService, useValue: sentryService },
                { provide: DatabaseUtil, useValue: databaseUtil },
                { provide: OutboxService, useValue: outboxService },
                {
                    provide: ActivityLogService,
                    useValue: activityLogService,
                },
                { provide: UserUtil, useValue: userUtil },
                {
                    provide: NotificationService,
                    useValue: notificationService,
                },
                { provide: MessageService, useValue: messageService },
                { provide: ConfigService, useValue: configService },
                { provide: HelperStringService, useValue: helperStringService },
                { provide: HelperHashService, useValue: helperHashService },
                {
                    provide: HelperEncryptionService,
                    useValue: helperEncryptionService,
                },
                { provide: HelperDateService, useValue: helperDateService },
            ],
        }).compile();
        service = module.get(UserTwoFactorService);
    });

    describe('getOneForLoginVerify', () => {
        it('returns the active verified user with two-factor ready to verify', async () => {
            userRepository.findOneWithRoleById.mockResolvedValue(baseUser);

            await expect(
                service.getOneForLoginVerify('user-quartz')
            ).resolves.toBe(baseUser);
            expect(userRepository.findOneWithRoleById).toHaveBeenCalledWith(
                'user-quartz'
            );
        });

        it('throws UserNotFoundException when the user no longer exists', async () => {
            userRepository.findOneWithRoleById.mockResolvedValue(null);

            await expect(
                service.getOneForLoginVerify('user-quartz')
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.notFound,
                messagePath: 'user.error.notFound',
            });
        });

        it('throws UserInactiveForbiddenException when the user is not active', async () => {
            userRepository.findOneWithRoleById.mockResolvedValue({
                ...baseUser,
                status: EnumUserStatus.inactive,
            });

            await expect(
                service.getOneForLoginVerify('user-quartz')
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.inactiveForbidden,
                messagePath: 'user.error.inactive',
            });
        });

        it('throws UserEmailNotVerifiedException when the user is not verified', async () => {
            userRepository.findOneWithRoleById.mockResolvedValue({
                ...baseUser,
                isVerified: false,
            });

            await expect(
                service.getOneForLoginVerify('user-quartz')
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.emailNotVerified,
                messagePath: 'user.error.emailNotVerified',
            });
        });

        it('throws AuthTwoFactorNotEnabledException when two-factor is not enabled', async () => {
            userRepository.findOneWithRoleById.mockResolvedValue({
                ...baseUser,
                twoFactor: { ...baseTwoFactor, enabled: false },
            });

            await expect(
                service.getOneForLoginVerify('user-quartz')
            ).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.twoFactorNotEnabled,
                messagePath: 'auth.error.twoFactorNotEnabled',
            });
        });

        it('throws AuthTwoFactorRequiredSetupException when setup is still pending', async () => {
            userRepository.findOneWithRoleById.mockResolvedValue({
                ...baseUser,
                twoFactor: { ...baseTwoFactor, requiredSetup: true },
            });

            await expect(
                service.getOneForLoginVerify('user-quartz')
            ).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.twoFactorRequiredSetup,
                messagePath: 'auth.error.twoFactorRequiredSetup',
            });
        });
    });

    describe('getOneForLoginSetup', () => {
        const pendingUser: IUser = {
            ...baseUser,
            twoFactor: {
                ...baseTwoFactor,
                requiredSetup: true,
                pendingSecret: 'pending-secret',
            },
        };

        it('returns the user and its pending secret when setup was required', async () => {
            userRepository.findOneWithRoleById.mockResolvedValue(pendingUser);

            await expect(
                service.getOneForLoginSetup('user-quartz')
            ).resolves.toEqual({
                user: pendingUser,
                pendingSecret: 'pending-secret',
            });
        });

        it('throws UserNotFoundException when the user no longer exists', async () => {
            userRepository.findOneWithRoleById.mockResolvedValue(null);

            await expect(
                service.getOneForLoginSetup('user-quartz')
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.notFound,
            });
        });

        it('throws UserInactiveForbiddenException when the user is not active', async () => {
            userRepository.findOneWithRoleById.mockResolvedValue({
                ...pendingUser,
                status: EnumUserStatus.inactive,
            });

            await expect(
                service.getOneForLoginSetup('user-quartz')
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.inactiveForbidden,
            });
        });

        it('throws UserEmailNotVerifiedException when the user is not verified', async () => {
            userRepository.findOneWithRoleById.mockResolvedValue({
                ...pendingUser,
                isVerified: false,
            });

            await expect(
                service.getOneForLoginSetup('user-quartz')
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.emailNotVerified,
            });
        });

        it('throws AuthTwoFactorNotEnabledException when two-factor is not enabled', async () => {
            userRepository.findOneWithRoleById.mockResolvedValue({
                ...pendingUser,
                twoFactor: { ...baseTwoFactor, enabled: false },
            });

            await expect(
                service.getOneForLoginSetup('user-quartz')
            ).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.twoFactorNotEnabled,
            });
        });

        it('throws AuthTwoFactorNotRequiredSetupException when setup was not required', async () => {
            userRepository.findOneWithRoleById.mockResolvedValue(baseUser);

            await expect(
                service.getOneForLoginSetup('user-quartz')
            ).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.twoFactorNotRequiredSetup,
                messagePath: 'auth.error.twoFactorNotRequiredSetup',
            });
        });

        it('throws AuthTwoFactorSetupRequiredException when there is no pending secret', async () => {
            userRepository.findOneWithRoleById.mockResolvedValue({
                ...pendingUser,
                twoFactor: {
                    ...baseTwoFactor,
                    requiredSetup: true,
                    pendingSecret: null,
                },
            });

            await expect(
                service.getOneForLoginSetup('user-quartz')
            ).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.twoFactorSetupRequired,
                messagePath: 'auth.error.twoFactorSetupRequired',
            });
        });
    });

    describe('assertAttemptAvailable', () => {
        it('throws AuthTwoFactorAttemptMaxException when the lock ends later than now', () => {
            const user = {
                ...baseUser,
                twoFactor: {
                    ...baseTwoFactor,
                    lockedUntil: new Date('2026-03-01T00:10:00.000Z'),
                },
            };

            expect(() => service.assertAttemptAvailable(user)).toThrow(
                expect.objectContaining({
                    module: 'auth',
                    statusCode: EnumAuthStatusCodeError.twoFactorAttemptMax,
                    statusCodeKey: 'twoFactorAttemptMax',
                    messagePath: 'auth.error.twoFactorAttemptMax',
                })
            );
        });

        it('returns when the lock ended before now', () => {
            const user = {
                ...baseUser,
                twoFactor: {
                    ...baseTwoFactor,
                    lockedUntil: new Date('2026-02-28T23:50:00.000Z'),
                },
            };

            expect(() => service.assertAttemptAvailable(user)).not.toThrow();
        });

        it('returns when the user holds no lock', () => {
            expect(() =>
                service.assertAttemptAvailable(baseUser)
            ).not.toThrow();
        });

        it('returns when the user carries no two-factor row', () => {
            expect(() =>
                service.assertAttemptAvailable({ ...baseUser, twoFactor: null })
            ).not.toThrow();
        });
    });

    describe('countFailedAttempt', () => {
        const notifyEffect: INotificationNotifyEffect = {
            queue: EnumNotificationQueue.notification,
            name: EnumNotificationProcess.notify,
            data: {
                kind: EnumNotificationKind.loginLocked,
                context: {
                    userId: 'user-quartz',
                    proceedBy: 'user-quartz',
                    method: EnumNotificationLoginLockedMethod.twoFactor,
                    methodLabel: 'Label',
                    lockedUntil: '2026-03-01T00:15:00.000Z',
                },
                recipient: null,
                notificationId: null,
            },
            priority: EnumQueuePriority.high,
            idempotencyKey: null,
        };

        beforeEach(() => {
            outboxService.withTransaction.mockImplementation(
                async fn => fn(tx) as never
            );
        });

        it('counts the failure on the outbox tx and adds no row below the budget', async () => {
            userTwoFactorRepository.incrementAttemptInTx.mockResolvedValue(
                false
            );

            await expect(
                service.countFailedAttempt(
                    requestContext,
                    apiKeyContext,
                    baseUser
                )
            ).resolves.toBe(false);
            expect(outboxService.withTransaction).toHaveBeenCalledTimes(1);
            expect(
                userTwoFactorRepository.incrementAttemptInTx
            ).toHaveBeenCalledWith(tx, 'user-quartz', 5, lockedUntil);
            expect(outboxService.addManyInTx).not.toHaveBeenCalled();
            expect(activityLogService.recordEffect).not.toHaveBeenCalled();
            expect(notificationService.notify).not.toHaveBeenCalled();
        });

        it('adds the reach-max entry and the loginLocked effect on the counting tx when the failure locked, and no lockout effect', async () => {
            userTwoFactorRepository.incrementAttemptInTx.mockResolvedValue(
                true
            );
            helperDateService.formatToIso.mockReturnValue(
                '2026-03-01T00:15:00.000Z'
            );
            activityLogService.recordEffect.mockReturnValue(entryEffect);
            notificationService.notify.mockReturnValue(notifyEffect);
            messageService.setMessage.mockReturnValue('Label');

            await expect(
                service.countFailedAttempt(
                    requestContext,
                    apiKeyContext,
                    baseUser
                )
            ).resolves.toBe(true);
            expect(
                userTwoFactorRepository.incrementAttemptInTx
            ).toHaveBeenCalledWith(tx, 'user-quartz', 5, lockedUntil);
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
                    action: EnumActivityLogAction.userReachMaxTwoFactorAttempt,
                    userId: 'user-quartz',
                    createdBy: 'user-quartz',
                }
            );
            expect(notificationService.notify).toHaveBeenCalledWith(
                EnumNotificationKind.loginLocked,
                {
                    userId: 'user-quartz',
                    proceedBy: 'user-quartz',
                    method: EnumNotificationLoginLockedMethod.twoFactor,
                    methodLabel: 'Label',
                    lockedUntil: '2026-03-01T00:15:00.000Z',
                }
            );
            expect(messageService.setMessage).toHaveBeenCalledWith(
                'notification.loginLockedMethod.twoFactor'
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
                service.countFailedAttempt(
                    requestContext,
                    apiKeyContext,
                    baseUser
                )
            ).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.twoFactorAttemptMax,
                statusCodeKey: 'twoFactorAttemptMax',
                messagePath: 'auth.error.twoFactorAttemptMax',
            });
            expect(databaseUtil.toException).toHaveBeenCalledWith(conflict);
            expect(outboxService.addManyInTx).not.toHaveBeenCalled();
        });

        it('rethrows an AppBaseException unchanged', async () => {
            const failure = new DatabaseUnavailableException();
            outboxService.withTransaction.mockRejectedValue(failure);

            await expect(
                service.countFailedAttempt(
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
                service.countFailedAttempt(
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

    describe('check', () => {
        const codeInput = {
            method: EnumAuthTwoFactorMethod.code,
            code: ' 123456 ',
            backupCode: null,
        };
        const backupInput = {
            method: EnumAuthTwoFactorMethod.backupCodes,
            code: null,
            backupCode: ' backup-one ',
        };

        it('answers the step of a correct code and makes no repository or outbox call', async () => {
            authTwoFactorUtil.decryptSecret.mockReturnValue('plain-secret');
            authTwoFactorUtil.verifyCode.mockReturnValue(58123456);

            await expect(
                service.check(
                    requestContext,
                    apiKeyContext,
                    baseUser,
                    codeInput
                )
            ).resolves.toEqual({
                verified: verifiedResult,
                totpStep: 58123456,
            });
            expect(authTwoFactorUtil.decryptSecret).toHaveBeenCalledWith(
                'encrypted-secret',
                'user-quartz'
            );
            expect(authTwoFactorUtil.verifyCode).toHaveBeenCalledWith(
                'plain-secret',
                '123456'
            );
            expect(
                userTwoFactorRepository.incrementAttemptInTx
            ).not.toHaveBeenCalled();
            expect(outboxService.withTransaction).not.toHaveBeenCalled();
            expect(outboxService.addManyInTx).not.toHaveBeenCalled();
        });

        it('throws the method-required exception uncounted when no method is given', async () => {
            await expect(
                service.check(requestContext, apiKeyContext, baseUser, {
                    ...codeInput,
                    method: null,
                })
            ).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.twoFactorMethodRequired,
            });
            expect(outboxService.withTransaction).not.toHaveBeenCalled();
        });

        it('throws the max-attempt exception before checking the code while locked', async () => {
            const user = {
                ...baseUser,
                twoFactor: {
                    ...baseTwoFactor,
                    lockedUntil: new Date('2026-03-01T00:10:00.000Z'),
                },
            };

            await expect(
                service.check(requestContext, apiKeyContext, user, codeInput)
            ).rejects.toMatchObject({
                statusCode: EnumAuthStatusCodeError.twoFactorAttemptMax,
            });
            expect(authTwoFactorUtil.verifyCode).not.toHaveBeenCalled();
            expect(outboxService.withTransaction).not.toHaveBeenCalled();
        });

        it('throws AuthTwoFactorNotEnabledException uncounted when two-factor is not enabled', async () => {
            await expect(
                service.check(
                    requestContext,
                    apiKeyContext,
                    { ...baseUser, twoFactor: null },
                    codeInput
                )
            ).rejects.toMatchObject({
                statusCode: EnumAuthStatusCodeError.twoFactorNotEnabled,
            });
            expect(outboxService.withTransaction).not.toHaveBeenCalled();
        });

        describe('on a mismatch', () => {
            beforeEach(() => {
                outboxService.withTransaction.mockImplementation(
                    async fn => fn(tx) as never
                );
                authTwoFactorUtil.decryptSecret.mockReturnValue('plain-secret');
                authTwoFactorUtil.verifyCode.mockReturnValue(null);
            });

            it('counts the failure with the contexts and throws AuthTwoFactorInvalidException below the budget', async () => {
                userTwoFactorRepository.incrementAttemptInTx.mockResolvedValue(
                    false
                );

                await expect(
                    service.check(
                        requestContext,
                        apiKeyContext,
                        baseUser,
                        codeInput
                    )
                ).rejects.toMatchObject({
                    module: 'auth',
                    statusCode: EnumAuthStatusCodeError.twoFactorInvalid,
                });
                expect(
                    userTwoFactorRepository.incrementAttemptInTx
                ).toHaveBeenCalledWith(tx, 'user-quartz', 5, lockedUntil);
            });

            it('throws AuthTwoFactorAttemptMaxException when the failure locked', async () => {
                userTwoFactorRepository.incrementAttemptInTx.mockResolvedValue(
                    true
                );
                activityLogService.recordEffect.mockReturnValue(entryEffect);

                await expect(
                    service.check(
                        requestContext,
                        apiKeyContext,
                        baseUser,
                        codeInput
                    )
                ).rejects.toMatchObject({
                    statusCode: EnumAuthStatusCodeError.twoFactorAttemptMax,
                });
            });

            it('counts a blank credential as a failure', async () => {
                userTwoFactorRepository.incrementAttemptInTx.mockResolvedValue(
                    false
                );

                await expect(
                    service.check(requestContext, apiKeyContext, baseUser, {
                        ...codeInput,
                        code: '   ',
                    })
                ).rejects.toMatchObject({
                    statusCode: EnumAuthStatusCodeError.twoFactorInvalid,
                });
                expect(authTwoFactorUtil.verifyCode).not.toHaveBeenCalled();
                expect(
                    userTwoFactorRepository.incrementAttemptInTx
                ).toHaveBeenCalledTimes(1);
            });

            it('counts a backup code the user has none left of as a failure', async () => {
                userTwoFactorRepository.incrementAttemptInTx.mockResolvedValue(
                    false
                );
                const user = {
                    ...baseUser,
                    twoFactor: { ...baseTwoFactor, backupCodes: [] },
                };

                await expect(
                    service.check(
                        requestContext,
                        apiKeyContext,
                        user,
                        backupInput
                    )
                ).rejects.toMatchObject({
                    statusCode: EnumAuthStatusCodeError.twoFactorInvalid,
                });
                expect(
                    authTwoFactorUtil.verifyBackupCode
                ).not.toHaveBeenCalled();
            });

            it('counts a backup code matching none as a failure', async () => {
                userTwoFactorRepository.incrementAttemptInTx.mockResolvedValue(
                    false
                );
                authTwoFactorUtil.verifyBackupCode.mockReturnValue({
                    isValid: false,
                    index: -1,
                });

                await expect(
                    service.check(
                        requestContext,
                        apiKeyContext,
                        baseUser,
                        backupInput
                    )
                ).rejects.toMatchObject({
                    statusCode: EnumAuthStatusCodeError.twoFactorInvalid,
                });
                expect(
                    userTwoFactorRepository.incrementAttemptInTx
                ).toHaveBeenCalledTimes(1);
            });
        });

        it('answers the stored backup codes without the matched one for a backup code and no step', async () => {
            authTwoFactorUtil.verifyBackupCode.mockReturnValue({
                isValid: true,
                index: 0,
            });

            await expect(
                service.check(
                    requestContext,
                    apiKeyContext,
                    baseUser,
                    backupInput
                )
            ).resolves.toEqual({
                verified: {
                    method: EnumAuthTwoFactorMethod.backupCodes,
                    newBackupCodes: ['hash-two'],
                },
                totpStep: null,
            });
            expect(authTwoFactorUtil.verifyBackupCode).toHaveBeenCalledWith(
                ['hash-one', 'hash-two'],
                'backup-one'
            );
        });

        it('throws AuthTwoFactorSecretUnavailableException uncounted when the user has no confirmed secret', async () => {
            const user = {
                ...baseUser,
                twoFactor: { ...baseTwoFactor, secret: null },
            };

            await expect(
                service.check(requestContext, apiKeyContext, user, codeInput)
            ).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.twoFactorSecretUnavailable,
            });
            expect(sentryService.captureException).not.toHaveBeenCalled();
            expect(outboxService.withTransaction).not.toHaveBeenCalled();
        });

        it('reports a secret that fails to decrypt and throws AuthTwoFactorSecretUnavailableException', async () => {
            const failure = new HelperDecryptFailedException();
            const mapped = new AuthTwoFactorSecretUnavailableException();
            authTwoFactorUtil.decryptSecret.mockImplementation(() => {
                throw failure;
            });
            authTwoFactorUtil.toDecryptException.mockReturnValue(mapped);

            await expect(
                service.check(
                    requestContext,
                    apiKeyContext,
                    baseUser,
                    codeInput
                )
            ).rejects.toBe(mapped);
            expect(authTwoFactorUtil.toDecryptException).toHaveBeenCalledWith(
                failure
            );
            expect(sentryService.captureException).toHaveBeenCalledWith(
                failure
            );
        });

        it('wraps an unmapped decrypt error in AppUnknownException', async () => {
            const failure = new Error('boom');
            authTwoFactorUtil.decryptSecret.mockImplementation(() => {
                throw failure;
            });
            authTwoFactorUtil.toDecryptException.mockReturnValue(null);

            await expect(
                service.check(
                    requestContext,
                    apiKeyContext,
                    baseUser,
                    codeInput
                )
            ).rejects.toMatchObject({
                statusCode: EnumAppStatusCodeError.unknown,
                rawError: failure,
            });
            expect(sentryService.captureException).not.toHaveBeenCalled();
        });
    });

    describe('getProvidedMethod', () => {
        it('returns the given method', () => {
            expect(
                service.getProvidedMethod(EnumAuthTwoFactorMethod.backupCodes)
            ).toBe(EnumAuthTwoFactorMethod.backupCodes);
        });

        it('throws AuthTwoFactorMethodRequiredException for a null method', () => {
            expect(() => service.getProvidedMethod(null)).toThrow(
                expect.objectContaining({
                    module: 'auth',
                    statusCode: EnumAuthStatusCodeError.twoFactorMethodRequired,
                    statusCodeKey:
                        EnumAuthStatusCodeError[
                            EnumAuthStatusCodeError.twoFactorMethodRequired
                        ],
                    messagePath: 'auth.error.twoFactorMethodRequired',
                })
            );
        });
    });

    describe('checkIfRequired', () => {
        const input = {
            code: '123456',
            backupCode: null,
            method: EnumAuthTwoFactorMethod.code,
        };

        it('returns null without checking when the user needs no verification', async () => {
            userUtil.requiresTwoFactorVerification.mockReturnValue(false);

            await expect(
                service.checkIfRequired(
                    requestContext,
                    apiKeyContext,
                    baseUser,
                    input
                )
            ).resolves.toBeNull();
            expect(authTwoFactorUtil.verifyCode).not.toHaveBeenCalled();
            expect(outboxService.withTransaction).not.toHaveBeenCalled();
        });

        it('answers the check of the code when verification is required', async () => {
            userUtil.requiresTwoFactorVerification.mockReturnValue(true);
            authTwoFactorUtil.decryptSecret.mockReturnValue('plain-secret');
            authTwoFactorUtil.verifyCode.mockReturnValue(7);

            await expect(
                service.checkIfRequired(
                    requestContext,
                    apiKeyContext,
                    baseUser,
                    input
                )
            ).resolves.toEqual({ verified: verifiedResult, totpStep: 7 });
        });

        it('throws the method-required exception when verification is required and no method is given', async () => {
            userUtil.requiresTwoFactorVerification.mockReturnValue(true);

            await expect(
                service.checkIfRequired(
                    requestContext,
                    apiKeyContext,
                    baseUser,
                    {
                        ...input,
                        method: null,
                    }
                )
            ).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.twoFactorMethodRequired,
            });
        });
    });

    describe('checkSetupCode', () => {
        beforeEach(() => {
            authTwoFactorUtil.decryptSecret.mockReturnValue('plain-pending');
            authTwoFactorUtil.verifyCode.mockReturnValue(58123456);
        });

        it('answers the step of the trimmed code checked against the decrypted pending secret and writes nothing', async () => {
            await expect(
                service.checkSetupCode(
                    requestContext,
                    apiKeyContext,
                    baseUser,
                    'encrypted-pending',
                    ' 654321 '
                )
            ).resolves.toBe(58123456);

            expect(authTwoFactorUtil.decryptSecret).toHaveBeenCalledWith(
                'encrypted-pending',
                'user-quartz'
            );
            expect(authTwoFactorUtil.verifyCode).toHaveBeenCalledWith(
                'plain-pending',
                '654321'
            );
            expect(outboxService.withTransaction).not.toHaveBeenCalled();
            expect(
                userTwoFactorRepository.incrementAttemptInTx
            ).not.toHaveBeenCalled();
        });

        it('throws the max-attempt exception before checking the code while locked', async () => {
            const user = {
                ...baseUser,
                twoFactor: {
                    ...baseTwoFactor,
                    lockedUntil: new Date('2026-03-01T00:10:00.000Z'),
                },
            };

            await expect(
                service.checkSetupCode(
                    requestContext,
                    apiKeyContext,
                    user,
                    'encrypted-pending',
                    '654321'
                )
            ).rejects.toMatchObject({
                statusCode: EnumAuthStatusCodeError.twoFactorAttemptMax,
            });
            expect(authTwoFactorUtil.verifyCode).not.toHaveBeenCalled();
        });

        it('counts the failure and throws AuthTwoFactorInvalidException on a mismatch below the budget', async () => {
            outboxService.withTransaction.mockImplementation(
                async fn => fn(tx) as never
            );
            authTwoFactorUtil.verifyCode.mockReturnValue(null);
            userTwoFactorRepository.incrementAttemptInTx.mockResolvedValue(
                false
            );

            await expect(
                service.checkSetupCode(
                    requestContext,
                    apiKeyContext,
                    baseUser,
                    'encrypted-pending',
                    '654321'
                )
            ).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.twoFactorInvalid,
            });
            expect(
                userTwoFactorRepository.incrementAttemptInTx
            ).toHaveBeenCalledWith(tx, 'user-quartz', 5, lockedUntil);
        });

        it('throws AuthTwoFactorAttemptMaxException when the failure locked', async () => {
            outboxService.withTransaction.mockImplementation(
                async fn => fn(tx) as never
            );
            authTwoFactorUtil.verifyCode.mockReturnValue(null);
            userTwoFactorRepository.incrementAttemptInTx.mockResolvedValue(
                true
            );
            activityLogService.recordEffect.mockReturnValue(entryEffect);

            await expect(
                service.checkSetupCode(
                    requestContext,
                    apiKeyContext,
                    baseUser,
                    'encrypted-pending',
                    '654321'
                )
            ).rejects.toMatchObject({
                statusCode: EnumAuthStatusCodeError.twoFactorAttemptMax,
            });
        });

        it('reports a pending secret that fails to decrypt and throws AuthTwoFactorSecretUnavailableException uncounted', async () => {
            const failure = new HelperDecryptFailedException();
            const mapped = new AuthTwoFactorSecretUnavailableException();
            authTwoFactorUtil.decryptSecret.mockImplementation(() => {
                throw failure;
            });
            authTwoFactorUtil.toDecryptException.mockReturnValue(mapped);

            await expect(
                service.checkSetupCode(
                    requestContext,
                    apiKeyContext,
                    baseUser,
                    'encrypted-pending',
                    '654321'
                )
            ).rejects.toBe(mapped);
            expect(sentryService.captureException).toHaveBeenCalledWith(
                failure
            );
            expect(outboxService.withTransaction).not.toHaveBeenCalled();
        });
    });

    describe('verifyInTx', () => {
        it('marks the TOTP step on the given tx, then resets the counter', async () => {
            userTwoFactorRepository.markTotpUsedInTx.mockResolvedValue(true);

            await expect(
                service.verifyInTx(tx, 'user-quartz', {
                    verified: verifiedResult,
                    totpStep: 58123456,
                })
            ).resolves.toBeUndefined();

            expect(
                userTwoFactorRepository.markTotpUsedInTx
            ).toHaveBeenCalledWith(tx, 'user-quartz', 58123456);
            expect(
                userTwoFactorRepository.resetTwoFactorAttemptInTx
            ).toHaveBeenCalledWith(tx, 'user-quartz');
            expect(
                userTwoFactorRepository.markTotpUsedInTx
            ).toHaveBeenCalledBefore(
                userTwoFactorRepository.resetTwoFactorAttemptInTx
            );
        });

        it('throws AuthTwoFactorInvalidException without a reset when the step was already used', async () => {
            userTwoFactorRepository.markTotpUsedInTx.mockResolvedValue(false);

            await expect(
                service.verifyInTx(tx, 'user-quartz', {
                    verified: verifiedResult,
                    totpStep: 58123456,
                })
            ).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.twoFactorInvalid,
            });
            expect(
                userTwoFactorRepository.resetTwoFactorAttemptInTx
            ).not.toHaveBeenCalled();
        });

        it('marks no step for a backup code and still resets the counter', async () => {
            await service.verifyInTx(tx, 'user-quartz', {
                verified: {
                    method: EnumAuthTwoFactorMethod.backupCodes,
                    newBackupCodes: ['hash-two'],
                },
                totpStep: null,
            });

            expect(
                userTwoFactorRepository.markTotpUsedInTx
            ).not.toHaveBeenCalled();
            expect(
                userTwoFactorRepository.resetTwoFactorAttemptInTx
            ).toHaveBeenCalledWith(tx, 'user-quartz');
        });
    });

    describe('verifySetupCodeInTx', () => {
        it('marks the TOTP step on the given tx, then resets the counter', async () => {
            userTwoFactorRepository.markTotpUsedInTx.mockResolvedValue(true);

            await expect(
                service.verifySetupCodeInTx(tx, 'user-quartz', 58123456)
            ).resolves.toBeUndefined();

            expect(
                userTwoFactorRepository.markTotpUsedInTx
            ).toHaveBeenCalledWith(tx, 'user-quartz', 58123456);
            expect(
                userTwoFactorRepository.resetTwoFactorAttemptInTx
            ).toHaveBeenCalledWith(tx, 'user-quartz');
            expect(
                userTwoFactorRepository.markTotpUsedInTx
            ).toHaveBeenCalledBefore(
                userTwoFactorRepository.resetTwoFactorAttemptInTx
            );
        });

        it('throws AuthTwoFactorInvalidException without a reset when the step was already used', async () => {
            userTwoFactorRepository.markTotpUsedInTx.mockResolvedValue(false);

            await expect(
                service.verifySetupCodeInTx(tx, 'user-quartz', 58123456)
            ).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.twoFactorInvalid,
            });
            expect(
                userTwoFactorRepository.resetTwoFactorAttemptInTx
            ).not.toHaveBeenCalled();
        });
    });

    describe('setup', () => {
        it('generates a secret and answers it with its encrypted form and key URI', async () => {
            authTwoFactorUtil.generateSecret.mockReturnValue('plain-secret');
            authTwoFactorUtil.encryptSecret.mockReturnValue('encrypted-secret');
            authTwoFactorUtil.createKeyUri.mockReturnValue('otpauth://totp/x');

            await expect(service.setup(baseUser)).resolves.toEqual({
                secret: 'plain-secret',
                encryptedSecret: 'encrypted-secret',
                otpauthUrl: 'otpauth://totp/x',
            });
            expect(authTwoFactorUtil.encryptSecret).toHaveBeenCalledWith(
                'plain-secret',
                'user-quartz'
            );
            expect(authTwoFactorUtil.createKeyUri).toHaveBeenCalledWith(
                'quartz@example.com',
                'plain-secret'
            );
        });
    });

    describe('saveSetupInTx', () => {
        beforeEach(() => {
            activityLogService.recordEffect.mockReturnValue(entryEffect);
        });

        it('stores the encrypted pending secret and adds the setup entry from the passed context on the given tx', async () => {
            await service.saveSetupInTx(
                tx,
                requestContext,
                apiKeyContext,
                'user-quartz',
                'encrypted-secret'
            );

            expect(outboxService.withTransaction).not.toHaveBeenCalled();
            expect(
                userTwoFactorRepository.setupTwoFactorInTx
            ).toHaveBeenCalledWith(tx, 'user-quartz', 'encrypted-secret');
            expect(activityLogService.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                null,
                null,
                {
                    action: EnumActivityLogAction.userSetupTwoFactor,
                    userId: 'user-quartz',
                    createdBy: 'user-quartz',
                }
            );
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, entryEffect);
        });
    });

    describe('saveSetupConsumingBackupCodeInTx', () => {
        beforeEach(() => {
            activityLogService.recordEffect.mockReturnValue(entryEffect);
        });

        it('stores the pending secret, consumes the verified backup code, and adds the setup entry on the given tx without opening one', async () => {
            userTwoFactorRepository.setupTwoFactorConsumingBackupCodeInTx.mockResolvedValue(
                true
            );

            await service.saveSetupConsumingBackupCodeInTx(
                tx,
                requestContext,
                apiKeyContext,
                baseUser,
                'encrypted-secret',
                verifiedResult
            );

            expect(
                userTwoFactorRepository.setupTwoFactorConsumingBackupCodeInTx
            ).toHaveBeenCalledWith(
                tx,
                'user-quartz',
                'encrypted-secret',
                verifiedResult,
                baseTwoFactor.backupCodes
            );
            expect(activityLogService.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                null,
                null,
                {
                    action: EnumActivityLogAction.userSetupTwoFactor,
                    userId: 'user-quartz',
                    createdBy: 'user-quartz',
                }
            );
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, entryEffect);
            expect(outboxService.withTransaction).not.toHaveBeenCalled();
        });

        it('throws AuthTwoFactorInvalidException and adds no entry when the backup code was already consumed', async () => {
            userTwoFactorRepository.setupTwoFactorConsumingBackupCodeInTx.mockResolvedValue(
                false
            );

            await expect(
                service.saveSetupConsumingBackupCodeInTx(
                    tx,
                    requestContext,
                    apiKeyContext,
                    baseUser,
                    'encrypted-secret',
                    verifiedResult
                )
            ).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.twoFactorInvalid,
                messagePath: 'auth.error.twoFactorInvalid',
            });
            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });

        it('falls back to an empty backup-code list when the user carries no two-factor row', async () => {
            userTwoFactorRepository.setupTwoFactorConsumingBackupCodeInTx.mockResolvedValue(
                true
            );

            await service.saveSetupConsumingBackupCodeInTx(
                tx,
                requestContext,
                apiKeyContext,
                { ...baseUser, twoFactor: null },
                'encrypted-secret',
                verifiedResult
            );

            expect(
                userTwoFactorRepository.setupTwoFactorConsumingBackupCodeInTx
            ).toHaveBeenCalledWith(
                tx,
                'user-quartz',
                'encrypted-secret',
                verifiedResult,
                []
            );
        });
    });

    describe('getPendingSecret', () => {
        it('returns the pending secret', () => {
            const user = {
                ...baseUser,
                twoFactor: {
                    ...baseTwoFactor,
                    enabled: false,
                    pendingSecret: 'pending-secret',
                },
            };

            expect(service.getPendingSecret(user)).toBe('pending-secret');
        });

        it('throws AuthTwoFactorAlreadyEnabledException when already enabled with no pending secret', () => {
            expect(() => service.getPendingSecret(baseUser)).toThrow(
                expect.objectContaining({
                    module: 'auth',
                    statusCode: EnumAuthStatusCodeError.twoFactorAlreadyEnabled,
                    messagePath: 'auth.error.twoFactorAlreadyEnabled',
                })
            );
        });

        it('throws AuthTwoFactorSetupRequiredException when there is no pending secret and it is not enabled', () => {
            const user = {
                ...baseUser,
                twoFactor: { ...baseTwoFactor, enabled: false },
            };

            expect(() => service.getPendingSecret(user)).toThrow(
                expect.objectContaining({
                    module: 'auth',
                    statusCode: EnumAuthStatusCodeError.twoFactorSetupRequired,
                    messagePath: 'auth.error.twoFactorSetupRequired',
                })
            );
        });

        it('throws AuthTwoFactorSetupRequiredException when the user has no two-factor row', () => {
            expect(() =>
                service.getPendingSecret({ ...baseUser, twoFactor: null })
            ).toThrow(
                expect.objectContaining({
                    statusCode: EnumAuthStatusCodeError.twoFactorSetupRequired,
                })
            );
        });
    });

    describe('enableTwoFactorInTx', () => {
        beforeEach(() => {
            activityLogService.recordEffect.mockReturnValue(entryEffect);
            authTwoFactorUtil.generateBackupCodes.mockReturnValue({
                codes: ['CODE1'],
                hashes: ['hash1'],
            });
        });

        it('confirms the pending authenticator, adds the enable entry on the given tx without opening one, and returns the plain backup codes', async () => {
            userTwoFactorRepository.enableTwoFactorInTx.mockResolvedValue(true);

            await expect(
                service.enableTwoFactorInTx(
                    tx,
                    requestContext,
                    apiKeyContext,
                    'user-quartz',
                    'pending-secret'
                )
            ).resolves.toEqual(['CODE1']);
            expect(
                userTwoFactorRepository.enableTwoFactorInTx
            ).toHaveBeenCalledWith(tx, 'user-quartz', 'pending-secret', [
                'hash1',
            ]);
            expect(activityLogService.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                null,
                null,
                {
                    action: EnumActivityLogAction.userEnableTwoFactor,
                    userId: 'user-quartz',
                    createdBy: 'user-quartz',
                }
            );
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, entryEffect);
            expect(outboxService.withTransaction).not.toHaveBeenCalled();
        });

        it('throws AuthTwoFactorSetupRequiredException and adds no entry when the guarded write misses', async () => {
            userTwoFactorRepository.enableTwoFactorInTx.mockResolvedValue(
                false
            );

            await expect(
                service.enableTwoFactorInTx(
                    tx,
                    requestContext,
                    apiKeyContext,
                    'user-quartz',
                    'pending-secret'
                )
            ).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.twoFactorSetupRequired,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.twoFactorSetupRequired
                    ],
                messagePath: 'auth.error.twoFactorSetupRequired',
            });
            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });
    });

    describe('regenerateTwoFactorBackupCodesInTx', () => {
        beforeEach(() => {
            activityLogService.recordEffect.mockReturnValue(entryEffect);
        });

        it('replaces the backup codes, adds the regenerate entry on the given tx without opening one, and returns the plain ones', async () => {
            authTwoFactorUtil.generateBackupCodes.mockReturnValue({
                codes: ['CODE1', 'CODE2'],
                hashes: ['hash1', 'hash2'],
            });
            userTwoFactorRepository.regenerateTwoFactorBackupCodesInTx.mockResolvedValue(
                true
            );

            await expect(
                service.regenerateTwoFactorBackupCodesInTx(
                    tx,
                    requestContext,
                    apiKeyContext,
                    authContext
                )
            ).resolves.toEqual(['CODE1', 'CODE2']);
            expect(
                userTwoFactorRepository.regenerateTwoFactorBackupCodesInTx
            ).toHaveBeenCalledWith(tx, 'user-quartz', ['hash1', 'hash2']);
            expect(activityLogService.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                null,
                {
                    action: EnumActivityLogAction.userRegenerateTwoFactorBackupCodes,
                }
            );
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, entryEffect);
            expect(outboxService.withTransaction).not.toHaveBeenCalled();
        });

        it('throws AuthTwoFactorNotEnabledException and adds no entry when the guarded write misses', async () => {
            authTwoFactorUtil.generateBackupCodes.mockReturnValue({
                codes: ['CODE1'],
                hashes: ['hash1'],
            });
            userTwoFactorRepository.regenerateTwoFactorBackupCodesInTx.mockResolvedValue(
                false
            );

            await expect(
                service.regenerateTwoFactorBackupCodesInTx(
                    tx,
                    requestContext,
                    apiKeyContext,
                    authContext
                )
            ).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.twoFactorNotEnabled,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.twoFactorNotEnabled
                    ],
                messagePath: 'auth.error.twoFactorNotEnabled',
            });
            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });
    });

    describe('challenge', () => {
        const challengeToken = 'c'.repeat(48);
        const tokenHash = 'hash-of-challenge-token';
        const now = new Date('2026-02-01T00:00:00.000Z');
        const expiredAt = new Date('2026-02-01T00:05:00.000Z');
        const device: IDeviceIdentity = {
            fingerprint: 'device-quartz',
            name: 'Quartz Phone',
            platform: EnumDevicePlatform.android,
            notificationToken: 'push-token-quartz',
        };

        beforeEach(() => {
            helperStringService.random.mockReturnValue(challengeToken);
            helperHashService.sha256Hash.mockReturnValue(tokenHash);
            helperDateService.create.mockReturnValue(now);
            helperDateService.forward.mockReturnValue(expiredAt);
        });

        describe('createChallengeInTx', () => {
            it('stores the hash of the token and the encrypted push token, and answers the raw token with the ttl', async () => {
                helperEncryptionService.aes256Encrypt.mockReturnValue(
                    'sealed-push-token'
                );

                const result = await service.createChallengeInTx(
                    tx,
                    'user-quartz',
                    device,
                    EnumUserLoginFrom.website,
                    EnumUserLoginWith.credential
                );

                expect(helperStringService.random).toHaveBeenCalledWith(48);
                expect(helperHashService.sha256Hash).toHaveBeenCalledWith(
                    challengeToken
                );
                expect(
                    helperEncryptionService.aes256Encrypt
                ).toHaveBeenCalledWith(
                    'push-token-quartz',
                    'app-root-secret',
                    UserTwoFactorChallengeEncryptionPurpose,
                    'user-quartz'
                );
                expect(
                    userTwoFactorRepository.createChallengeInTx
                ).toHaveBeenCalledWith(tx, {
                    userId: 'user-quartz',
                    tokenHash,
                    device: {
                        fingerprint: 'device-quartz',
                        name: 'Quartz Phone',
                        platform: EnumDevicePlatform.android,
                        encryptedNotificationToken: 'sealed-push-token',
                    },
                    loginFrom: EnumUserLoginFrom.website,
                    loginWith: EnumUserLoginWith.credential,
                    expiredAt,
                });
                expect(result).toEqual({ challengeToken, expiresInMs: 300000 });
            });

            it('stores a null push token as null and encrypts nothing', async () => {
                await service.createChallengeInTx(
                    tx,
                    'user-quartz',
                    { ...device, notificationToken: null },
                    EnumUserLoginFrom.website,
                    EnumUserLoginWith.credential
                );

                expect(
                    helperEncryptionService.aes256Encrypt
                ).not.toHaveBeenCalled();
                expect(
                    userTwoFactorRepository.createChallengeInTx
                ).toHaveBeenCalledWith(
                    tx,
                    expect.objectContaining({
                        device: expect.objectContaining({
                            encryptedNotificationToken: null,
                        }),
                    })
                );
            });
        });

        describe('getChallenge', () => {
            const row: IUserTwoFactorChallengeRow = {
                id: 'challenge-quartz',
                userId: 'user-quartz',
                tokenHash,
                device: {
                    fingerprint: 'device-quartz',
                    name: 'Quartz Phone',
                    platform: EnumDevicePlatform.android,
                    encryptedNotificationToken: 'sealed-push-token',
                },
                loginFrom: EnumUserLoginFrom.website,
                loginWith: EnumUserLoginWith.credential,
                expiredAt,
                consumedAt: null,
                createdAt: now,
                createdBy: null,
            };

            it('reads the live row by the token hash and decrypts the push token', async () => {
                userTwoFactorRepository.findActiveChallengeByTokenHash.mockResolvedValue(
                    row
                );
                helperEncryptionService.aes256Decrypt.mockReturnValue(
                    'push-token-quartz'
                );

                const result = await service.getChallenge(challengeToken);

                expect(
                    userTwoFactorRepository.findActiveChallengeByTokenHash
                ).toHaveBeenCalledWith(tokenHash, now);
                expect(
                    helperEncryptionService.aes256Decrypt
                ).toHaveBeenCalledWith(
                    'sealed-push-token',
                    'app-root-secret',
                    UserTwoFactorChallengeEncryptionPurpose,
                    'user-quartz'
                );
                expect(result).toEqual({
                    userId: 'user-quartz',
                    device,
                    loginFrom: EnumUserLoginFrom.website,
                    loginWith: EnumUserLoginWith.credential,
                });
            });

            it('answers a null push token as null', async () => {
                userTwoFactorRepository.findActiveChallengeByTokenHash.mockResolvedValue(
                    {
                        ...row,
                        device: {
                            ...row.device,
                            encryptedNotificationToken: null,
                        },
                    }
                );

                const result = await service.getChallenge(challengeToken);

                expect(
                    helperEncryptionService.aes256Decrypt
                ).not.toHaveBeenCalled();
                expect(result.device.notificationToken).toBeNull();
            });

            it('throws AuthTwoFactorChallengeInvalidException when no live row matches', async () => {
                userTwoFactorRepository.findActiveChallengeByTokenHash.mockResolvedValue(
                    null
                );

                await expect(
                    service.getChallenge(challengeToken)
                ).rejects.toMatchObject({
                    module: 'auth',
                    statusCode:
                        EnumAuthStatusCodeError.twoFactorChallengeInvalid,
                });
            });
        });

        describe('consumeChallengeInTx', () => {
            it('claims the row by the token hash on the given tx', async () => {
                userTwoFactorRepository.consumeChallengeInTx.mockResolvedValue(
                    true
                );

                await service.consumeChallengeInTx(tx, challengeToken);

                expect(
                    userTwoFactorRepository.consumeChallengeInTx
                ).toHaveBeenCalledWith(tx, tokenHash, now);
            });

            it('throws AuthTwoFactorChallengeInvalidException on a lost claim', async () => {
                userTwoFactorRepository.consumeChallengeInTx.mockResolvedValue(
                    false
                );

                await expect(
                    service.consumeChallengeInTx(tx, challengeToken)
                ).rejects.toMatchObject({
                    module: 'auth',
                    statusCode:
                        EnumAuthStatusCodeError.twoFactorChallengeInvalid,
                });
            });
        });
    });

    describe('assertEnabled', () => {
        it('passes when two-factor is enabled', () => {
            expect(() => service.assertEnabled(baseUser)).not.toThrow();
        });

        it('throws AuthTwoFactorNotEnabledException when two-factor is not enabled', () => {
            const user = {
                ...baseUser,
                twoFactor: { ...baseTwoFactor, enabled: false },
            };

            expect(() => service.assertEnabled(user)).toThrow(
                expect.objectContaining({
                    module: 'auth',
                    statusCode: EnumAuthStatusCodeError.twoFactorNotEnabled,
                    messagePath: 'auth.error.twoFactorNotEnabled',
                })
            );
        });

        it('throws AuthTwoFactorNotEnabledException when the user has no two-factor row', () => {
            expect(() =>
                service.assertEnabled({ ...baseUser, twoFactor: null })
            ).toThrow(
                expect.objectContaining({
                    statusCode: EnumAuthStatusCodeError.twoFactorNotEnabled,
                })
            );
        });
    });

    describe('getBackupCodeForSetup', () => {
        it('returns null when two-factor is not enabled', () => {
            expect(
                service.getBackupCodeForSetup(
                    { ...baseUser, twoFactor: null },
                    'backup-code'
                )
            ).toBeNull();
        });

        it('returns the backup code when two-factor is enabled', () => {
            expect(service.getBackupCodeForSetup(baseUser, 'backup-code')).toBe(
                'backup-code'
            );
        });

        it('throws AuthTwoFactorBackupCodeRequiredException when two-factor is enabled and no backup code is given', () => {
            expect(() => service.getBackupCodeForSetup(baseUser, null)).toThrow(
                expect.objectContaining({
                    module: 'auth',
                    statusCode:
                        EnumAuthStatusCodeError.twoFactorBackupCodeRequired,
                    messagePath: 'auth.error.twoFactorBackupCodeRequired',
                })
            );
        });

        it('throws AuthTwoFactorBackupCodeRequiredException when the backup code is blank', () => {
            expect(() => service.getBackupCodeForSetup(baseUser, '')).toThrow(
                expect.objectContaining({
                    statusCode:
                        EnumAuthStatusCodeError.twoFactorBackupCodeRequired,
                })
            );
        });
    });

    describe('disableInTx', () => {
        it('disables two-factor on the given transaction', async () => {
            userTwoFactorRepository.disableTwoFactorInTx.mockResolvedValue(
                true
            );

            await service.disableInTx(tx, 'user-quartz');

            expect(
                userTwoFactorRepository.disableTwoFactorInTx
            ).toHaveBeenCalledWith(tx, 'user-quartz');
        });

        it('throws AuthTwoFactorNotEnabledException when the guarded write misses', async () => {
            userTwoFactorRepository.disableTwoFactorInTx.mockResolvedValue(
                false
            );

            await expect(
                service.disableInTx(tx, 'user-quartz')
            ).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.twoFactorNotEnabled,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.twoFactorNotEnabled
                    ],
                messagePath: 'auth.error.twoFactorNotEnabled',
            });
        });
    });

    describe('removeInTx', () => {
        it('deletes the two-factor row of the user on the given transaction', async () => {
            await service.removeInTx(tx, 'user-quartz');

            expect(
                userTwoFactorRepository.deleteByUserInTx
            ).toHaveBeenCalledWith(tx, 'user-quartz');
        });
    });

    describe('resetByAdminInTx', () => {
        it('resets two-factor on the given transaction', async () => {
            await service.resetByAdminInTx(tx, 'user-quartz');

            expect(
                userTwoFactorRepository.resetTwoFactorByAdminInTx
            ).toHaveBeenCalledWith(tx, 'user-quartz');
        });
    });

    describe('resetAttemptInTx', () => {
        it('resets the counter through the repository on the given transaction', async () => {
            await service.resetAttemptInTx(tx, 'user-quartz');

            expect(
                userTwoFactorRepository.resetTwoFactorAttemptInTx
            ).toHaveBeenCalledWith(tx, 'user-quartz');
        });
    });

    describe('recordVerificationInTx', () => {
        it('records the verified check on the given transaction', async () => {
            userTwoFactorRepository.verifyTwoFactorInTx.mockResolvedValue(true);

            await expect(
                service.recordVerificationInTx(tx, baseUser, verifiedResult)
            ).resolves.toBeUndefined();
            expect(
                userTwoFactorRepository.verifyTwoFactorInTx
            ).toHaveBeenCalledWith(
                tx,
                'user-quartz',
                verifiedResult,
                baseTwoFactor.backupCodes
            );
        });

        it('throws AuthTwoFactorInvalidException when the stored codes moved on', async () => {
            userTwoFactorRepository.verifyTwoFactorInTx.mockResolvedValue(
                false
            );

            await expect(
                service.recordVerificationInTx(tx, baseUser, verifiedResult)
            ).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.twoFactorInvalid,
                messagePath: 'auth.error.twoFactorInvalid',
            });
        });

        it('falls back to an empty backup-code list when the user carries no two-factor row', async () => {
            userTwoFactorRepository.verifyTwoFactorInTx.mockResolvedValue(true);

            await service.recordVerificationInTx(
                tx,
                { ...baseUser, twoFactor: null },
                verifiedResult
            );

            expect(
                userTwoFactorRepository.verifyTwoFactorInTx
            ).toHaveBeenCalledWith(tx, 'user-quartz', verifiedResult, []);
        });
    });

    describe('createDisabledInTx', () => {
        it('delegates to the repository', async () => {
            const disabled = { ...baseTwoFactor, enabled: false };
            userTwoFactorRepository.createDisabledInTx.mockResolvedValue(
                disabled
            );

            await expect(
                service.createDisabledInTx(tx, 'user-quartz', 'admin-quartz')
            ).resolves.toBe(disabled);
            expect(
                userTwoFactorRepository.createDisabledInTx
            ).toHaveBeenCalledWith(tx, 'user-quartz', 'admin-quartz');
        });
    });

    describe('getEnabledTwoFactor', () => {
        it('returns the two-factor row when two-factor is enabled', () => {
            expect(service['getEnabledTwoFactor'](baseUser)).toBe(
                baseTwoFactor
            );
        });

        it('throws AuthTwoFactorNotEnabledException when two-factor is not enabled', () => {
            const user = {
                ...baseUser,
                twoFactor: { ...baseTwoFactor, enabled: false },
            };

            expect(() => service['getEnabledTwoFactor'](user)).toThrow(
                expect.objectContaining({
                    statusCode: EnumAuthStatusCodeError.twoFactorNotEnabled,
                })
            );
        });

        it('throws AuthTwoFactorNotEnabledException when the user has no two-factor row', () => {
            expect(() =>
                service['getEnabledTwoFactor']({ ...baseUser, twoFactor: null })
            ).toThrow(
                expect.objectContaining({
                    statusCode: EnumAuthStatusCodeError.twoFactorNotEnabled,
                })
            );
        });
    });
});
