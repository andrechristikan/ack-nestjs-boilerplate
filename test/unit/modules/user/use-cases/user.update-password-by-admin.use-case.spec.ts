import { buildDeferred } from '@test/unit/helpers/test.unit.deferred.helper';
import { buildActivityLogCreateManyEffect } from '@test/unit/helpers/test.unit.activity-log-effect.helper';
import type { INotificationNotifyEffect } from '@modules/notification/interfaces/notification.interface';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumActivityLogAction,
    EnumPasswordHistoryType,
    EnumRoleType,
} from '@generated/prisma-client/client';
import type { PasswordHistory, User } from '@generated/prisma-client/client';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
import type { IAuthPasswordTemporary } from '@modules/auth/interfaces/auth.interface';
import { DeviceService } from '@modules/device/services/device.service';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import { HelperEncryptionService } from '@common/helper/services/helper.encryption.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { buildUnsealedNotificationPayloads } from '@test/unit/helpers/test.unit.notification-push.helper';
import type { MockInstance } from 'vitest';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import {
    EnumNotificationKind,
    EnumNotificationProcess,
    EnumNotificationQueue,
} from '@modules/notification/enums/notification.enum';
import type { INotificationSnapshot } from '@modules/notification/interfaces/notification.interface';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import { PasswordHistoryService } from '@modules/password-history/services/password-history.service';
import { RoleService } from '@modules/role/services/role.service';
import { SessionService } from '@modules/session/services/session.service';
import type { ISessionRef } from '@modules/session/interfaces/session.interface';
import { EnumAwsStatusCodeError } from '@common/aws/enums/aws.status-code.enum';
import { AwsSesNotConfiguredException } from '@common/aws/exceptions/aws.ses-not-configured.exception';
import { UserService } from '@modules/user/services/user.service';
import { UserPasswordService } from '@modules/user/services/user.password.service';
import { UserUtil } from '@modules/user/utils/user.util';
import type { IUser } from '@modules/user/interfaces/user.interface';
import { UserUpdatePasswordByAdminUseCase } from '@modules/user/use-cases/user.update-password-by-admin.use-case';
import {
    buildApiKeyContext,
    buildAuthJwtAccessContext,
    buildRequestContext,
    buildUser,
    buildUserContext,
} from '@test/unit/helpers/test.unit.request.helper';
import { ConfigService } from '@nestjs/config';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import { TestUnitUserConfigValues } from '@test/unit/helpers/test.unit.user.helper';

describe('UserUpdatePasswordByAdminUseCase', () => {
    const userService: MockProxy<UserService> = mock<UserService>();
    const userPasswordService: MockProxy<UserPasswordService> =
        mock<UserPasswordService>();
    const passwordHistoryService: MockProxy<PasswordHistoryService> =
        mock<PasswordHistoryService>();
    const sessionService: MockProxy<SessionService> = mock<SessionService>();
    const deviceService: MockProxy<DeviceService> = mock<DeviceService>();
    const notificationQueue: MockProxy<NotificationQueue> =
        mock<NotificationQueue>();
    const roleService: MockProxy<RoleService> = mock<RoleService>();
    const activityLogQueue: MockProxy<ActivityLogQueue> =
        mock<ActivityLogQueue>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();

    let notificationUtil: NotificationUtil;
    let sealSnapshot: MockInstance<NotificationUtil['sealSnapshot']>;
    let useCase: UserUpdatePasswordByAdminUseCase;

    const user: IUser = buildUser('user-linden', 'linden@example.com');
    const admin: IUser = {
        ...user,
        id: 'admin-linden',
        role: { ...user.role, type: EnumRoleType.admin },
    };
    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    const userContext = buildUserContext(admin);
    const authContext = buildAuthJwtAccessContext(admin.id);
    const password: IAuthPasswordTemporary = {
        passwordHash: 'hashed',
        passwordExpired: new Date('2026-06-01T00:00:00.000Z'),
        passwordCreated: new Date('2026-01-01T00:00:00.000Z'),
        passwordPeriodExpired: new Date('2026-04-01T00:00:00.000Z'),
    };
    const adminEntry = buildActivityLogCreateManyEffect('admin-entry');
    const targetEntry = buildActivityLogCreateManyEffect('target-entry');
    const snapshot: INotificationSnapshot = {
        username: 'lindenFrost',
        encryptedEmail: 'cipher(linden@example.com)',
        encryptedTokens: ['cipher(token-one)'],
    };
    const notifyEffect: INotificationNotifyEffect = {
        queue: EnumNotificationQueue.notification,
        name: EnumNotificationProcess.notify,
        data: {
            kind: EnumNotificationKind.temporaryPasswordByAdmin,
            context: {
                userId: 'user-linden',
                proceedBy: 'admin-linden',
                snapshot: null,
                verificationId: null,
            },
            recipient: null,
            notificationId: null,
        },
        priority: EnumQueuePriority.high,
        idempotencyKey: null,
    };
    const revoked: ISessionRef[] = [{ id: 'session-one' }];
    const tx = {} as IDatabaseTransactionClient;
    const now = new Date('2026-03-05T00:00:00.000Z');
    const passwordHistory = { id: 'history-linden' } as PasswordHistory;
    const updatedRow = {
        id: 'user-linden',
        username: 'lindenFrost',
        updatedAt: new Date('2026-03-01T00:00:00.000Z'),
    } as User;

    beforeAll(() => {
        vi.useFakeTimers();
    });

    afterAll(() => {
        vi.useRealTimers();
    });

    beforeEach(async () => {
        activityLogQueue.recordEffect.mockImplementation(
            (
                _requestContext,
                _apiKeyContext,
                _authContext,
                _workspaceContext,
                input
            ) =>
                input.action === EnumActivityLogAction.adminUserPasswordUpdated
                    ? adminEntry
                    : targetEntry
        );
        vi.setSystemTime(now);
        databaseService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );
        deviceService.getNotificationTokens.mockResolvedValue(['token-one']);
        notificationQueue.notify.mockReturnValue(notifyEffect);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserUpdatePasswordByAdminUseCase,
                { provide: UserService, useValue: userService },
                { provide: UserPasswordService, useValue: userPasswordService },
                {
                    provide: PasswordHistoryService,
                    useValue: passwordHistoryService,
                },
                { provide: SessionService, useValue: sessionService },
                { provide: DeviceService, useValue: deviceService },
                NotificationUtil,
                HelperEncryptionService,
                HelperStringService,
                { provide: NotificationQueue, useValue: notificationQueue },
                { provide: RoleService, useValue: roleService },
                { provide: ActivityLogQueue, useValue: activityLogQueue },
                UserUtil,
                { provide: DatabaseService, useValue: databaseService },
                { provide: OutboxService, useValue: outboxService },
                HelperDateService,
                {
                    provide: ConfigService,
                    useValue: buildConfigService(TestUnitUserConfigValues),
                },
            ],
        }).compile();
        notificationUtil = module.get(NotificationUtil);
        sealSnapshot = vi
            .spyOn(notificationUtil, 'sealSnapshot')
            .mockReturnValue(snapshot);
        useCase = module.get(UserUpdatePasswordByAdminUseCase);
    });

    describe('execute', () => {
        beforeEach(() => {
            userService.getOneWithRole.mockResolvedValue(user);
            userPasswordService.createTemporaryPassword.mockResolvedValue({
                password,
                passwordString: 'temp-password',
            });
        });

        it('answers AwsSesNotConfiguredException before the self check and any read when SES is unset', async () => {
            userService.assertEmailDeliverable.mockImplementation(() => {
                throw new AwsSesNotConfiguredException();
            });

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    'user-linden'
                )
            ).rejects.toMatchObject({
                module: 'aws',
                statusCode: EnumAwsStatusCodeError.sesNotConfigured,
            });
            expect(userService.assertNotSelf).not.toHaveBeenCalled();
            expect(userService.getOneWithRole).not.toHaveBeenCalled();
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('gates the actor rank, writes the password, history, and revoke on one transaction, and adds both entries and the notification on it', async () => {
            const calls: string[] = [];
            databaseService.withTransaction.mockImplementation(async fn => {
                calls.push('begin');
                const value = await fn(tx);
                calls.push('commit');

                return value as never;
            });
            userService.updatePasswordInTx.mockImplementation(async () => {
                calls.push('updatePassword');

                return updatedRow;
            });
            passwordHistoryService.createInTx.mockImplementation(async () => {
                calls.push('createHistory');

                return passwordHistory;
            });
            userPasswordService.markUnusedResetsUsedInTx.mockImplementation(
                async () => {
                    calls.push('markUnusedResetsUsed');
                }
            );
            deviceService.getNotificationTokens.mockImplementation(async () => {
                calls.push('readTokens');

                return ['token-one'];
            });
            sessionService.revokeActiveByUserInTx.mockImplementation(
                async () => {
                    calls.push('revokeSessions');

                    return revoked;
                }
            );
            outboxService.addManyInTx.mockImplementation(async () => {
                calls.push('addEffects');

                return ['outbox-id'];
            });

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    'user-linden'
                )
            ).resolves.toEqual({});

            expect(userService.assertNotSelf).toHaveBeenCalledWith(
                'user-linden',
                'admin-linden'
            );
            expect(userService.getOneWithRole).toHaveBeenCalledWith(
                'user-linden'
            );
            expect(roleService.assertActorOutranks).toHaveBeenCalledWith(
                EnumRoleType.admin,
                EnumRoleType.user
            );
            expect(deviceService.getNotificationTokens).toHaveBeenCalledWith(
                'user-linden'
            );
            expect(sealSnapshot).toHaveBeenCalledWith(user, ['token-one']);
            expect(userService.updatePasswordInTx).toHaveBeenCalledWith(
                tx,
                'user-linden',
                password,
                'admin-linden'
            );
            expect(passwordHistoryService.createInTx).toHaveBeenCalledWith(
                tx,
                'user-linden',
                'hashed',
                EnumPasswordHistoryType.admin,
                password.passwordPeriodExpired,
                password.passwordCreated,
                'admin-linden'
            );
            expect(
                userPasswordService.markUnusedResetsUsedInTx
            ).toHaveBeenCalledWith(tx, 'user-linden', 'admin-linden');
            expect(sessionService.revokeActiveByUserInTx).toHaveBeenCalledWith(
                tx,
                'user-linden',
                'admin-linden',
                password.passwordCreated
            );
            expect(calls).toEqual([
                'readTokens',
                'begin',
                'updatePassword',
                'createHistory',
                'markUnusedResetsUsed',
                'revokeSessions',
                'addEffects',
                'commit',
            ]);
            expect(notificationQueue.notify).toHaveBeenCalledWith(
                EnumNotificationKind.temporaryPasswordByAdmin,
                {
                    userId: 'user-linden',
                    proceedBy: 'admin-linden',
                    password: 'temp-password',
                    passwordCreatedAt: '2026-01-01T00:00:00.000Z',
                    passwordExpiredAt: '2026-06-01T00:00:00.000Z',
                    snapshot,
                }
            );
            expect(activityLogQueue.recordEffect).toHaveBeenNthCalledWith(
                1,
                requestContext,
                apiKeyContext,
                authContext,
                null,
                {
                    action: EnumActivityLogAction.adminUserPasswordUpdated,
                    metadata: {
                        targetUserId: 'user-linden',
                        targetUsername: 'lindenFrost',
                        timestamp: updatedRow.updatedAt,
                    },
                }
            );
            expect(activityLogQueue.recordEffect).toHaveBeenNthCalledWith(
                2,
                requestContext,
                apiKeyContext,
                authContext,
                null,
                {
                    action: EnumActivityLogAction.userPasswordUpdatedByAdmin,
                    userId: 'user-linden',
                    createdBy: 'admin-linden',
                    metadata: {
                        actorUserId: 'admin-linden',
                        timestamp: updatedRow.updatedAt,
                    },
                }
            );
            expect(outboxService.addManyInTx).toHaveBeenCalledWith(tx, [
                adminEntry,
                targetEntry,
                notifyEffect,
            ]);
        });

        it('starts the history, the unused-reset mark, and the session revoke while the password update is pending', async () => {
            const update = buildDeferred<User>();
            userService.updatePasswordInTx.mockReturnValue(update.promise);

            const running = useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                'user-linden'
            );
            await vi.advanceTimersByTimeAsync(0);

            expect(passwordHistoryService.createInTx).toHaveBeenCalledWith(
                tx,
                'user-linden',
                'hashed',
                EnumPasswordHistoryType.admin,
                password.passwordPeriodExpired,
                password.passwordCreated,
                'admin-linden'
            );
            expect(
                userPasswordService.markUnusedResetsUsedInTx
            ).toHaveBeenCalledWith(tx, 'user-linden', 'admin-linden');
            expect(sessionService.revokeActiveByUserInTx).toHaveBeenCalledWith(
                tx,
                'user-linden',
                'admin-linden',
                password.passwordCreated
            );
            expect(outboxService.addManyInTx).not.toHaveBeenCalled();

            update.resolve(updatedRow);
            await running;

            expect(outboxService.addManyInTx).toHaveBeenCalledTimes(1);
        });

        it('reads the device tokens before it opens the transaction and hands the sealed tokens to the notification effect', async () => {
            sealSnapshot.mockRestore();
            deviceService.getNotificationTokens.mockResolvedValue([
                'a',
                'a',
                'b',
            ]);
            userService.updatePasswordInTx.mockResolvedValue(updatedRow);
            let encryptedTokens: string[] = [];
            notificationQueue.notify.mockImplementation((_kind, context) => {
                if ('snapshot' in context) {
                    encryptedTokens = context.snapshot.encryptedTokens;
                }

                return notifyEffect;
            });

            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                'user-linden'
            );

            expect(deviceService.getNotificationTokens).toHaveBeenCalledBefore(
                databaseService.withTransaction
            );
            expect(
                buildUnsealedNotificationPayloads(
                    encryptedTokens,
                    'user-linden'
                )
            ).toEqual(['a', 'b']);
        });

        it('reads the actor id from the context actorUserId', async () => {
            userService.updatePasswordInTx.mockResolvedValue(updatedRow);

            await useCase.execute(
                requestContext,
                apiKeyContext,
                { ...authContext, userId: 'admin-other' },
                userContext,
                'user-linden'
            );

            expect(userService.assertNotSelf).toHaveBeenCalledWith(
                'user-linden',
                'admin-other'
            );
            expect(userService.updatePasswordInTx).toHaveBeenCalledWith(
                tx,
                'user-linden',
                password,
                'admin-other'
            );
            expect(sessionService.revokeActiveByUserInTx).toHaveBeenCalledWith(
                tx,
                'user-linden',
                'admin-other',
                password.passwordCreated
            );
            expect(notificationQueue.notify).toHaveBeenCalledWith(
                EnumNotificationKind.temporaryPasswordByAdmin,
                expect.objectContaining({ proceedBy: 'admin-other' })
            );
        });

        it('stops at the rank gate before the blocked gate', async () => {
            roleService.assertActorOutranks.mockImplementation(() => {
                throw new Error('rank');
            });

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    'user-linden'
                )
            ).rejects.toThrow('rank');
            expect(userService.assertUnblocked).not.toHaveBeenCalled();
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('revokes nothing and adds no effect when the token read rejects', async () => {
            deviceService.getNotificationTokens.mockRejectedValue(
                new Error('read')
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    'user-linden'
                )
            ).rejects.toThrow('read');
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
            expect(
                sessionService.revokeActiveByUserInTx
            ).not.toHaveBeenCalled();
            expect(outboxService.addManyInTx).not.toHaveBeenCalled();
        });

        it('adds nothing when the transaction fails', async () => {
            const cause = new Error('database exploded');
            databaseService.withTransaction.mockRejectedValue(cause);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    'user-linden'
                )
            ).rejects.toBe(cause);
            expect(outboxService.addManyInTx).not.toHaveBeenCalled();
        });
    });
});
