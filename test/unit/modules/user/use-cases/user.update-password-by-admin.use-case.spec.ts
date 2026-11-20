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
import { OutboxService } from '@common/outbox/services/outbox.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import type { IAuthPasswordTemporary } from '@modules/auth/interfaces/auth.interface';
import { NotificationService } from '@modules/notification/services/notification.service';
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
    const notificationService: MockProxy<NotificationService> =
        mock<NotificationService>();
    const roleService: MockProxy<RoleService> = mock<RoleService>();
    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();

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
        activityLogService.recordEffect.mockImplementation(
            (
                _requestContext,
                _apiKeyContext,
                _authContext,
                _workspaceContext,
                input
            ) =>
                input.action === EnumActivityLogAction.adminUserUpdatePassword
                    ? adminEntry
                    : targetEntry
        );
        vi.setSystemTime(now);
        outboxService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );
        notificationService.getSnapshot.mockResolvedValue(snapshot);
        notificationService.notify.mockReturnValue(notifyEffect);

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
                {
                    provide: NotificationService,
                    useValue: notificationService,
                },
                { provide: RoleService, useValue: roleService },
                { provide: ActivityLogService, useValue: activityLogService },
                UserUtil,
                { provide: OutboxService, useValue: outboxService },
                HelperDateService,
                {
                    provide: ConfigService,
                    useValue: buildConfigService(TestUnitUserConfigValues),
                },
            ],
        }).compile();
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

        it('gates the actor rank, writes the password, history, and revoke on one transaction, and adds both entries and the notification on it', async () => {
            const calls: string[] = [];
            outboxService.withTransaction.mockImplementation(async fn => {
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
            notificationService.getSnapshot.mockImplementation(async () => {
                calls.push('snapshot');

                return snapshot;
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
            expect(notificationService.getSnapshot).toHaveBeenCalledWith(user);
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
                'begin',
                'updatePassword',
                'snapshot',
                'createHistory',
                'markUnusedResetsUsed',
                'revokeSessions',
                'addEffects',
                'commit',
            ]);
            expect(notificationService.notify).toHaveBeenCalledWith(
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
            expect(activityLogService.recordEffect).toHaveBeenNthCalledWith(
                1,
                requestContext,
                apiKeyContext,
                authContext,
                null,
                {
                    action: EnumActivityLogAction.adminUserUpdatePassword,
                    metadata: {
                        targetUserId: 'user-linden',
                        targetUsername: 'lindenFrost',
                        timestamp: updatedRow.updatedAt,
                    },
                }
            );
            expect(activityLogService.recordEffect).toHaveBeenNthCalledWith(
                2,
                requestContext,
                apiKeyContext,
                authContext,
                null,
                {
                    action: EnumActivityLogAction.userUpdatePasswordByAdmin,
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

        it('starts the snapshot read while the first statement is pending and reads it before the revoke', async () => {
            let snapshotStarted = false;
            let startedWhenFirstSettles = false;
            notificationService.getSnapshot.mockImplementation(async () => {
                snapshotStarted = true;

                return snapshot;
            });
            outboxService.withTransaction.mockImplementation(
                async fn => fn(tx) as never
            );
            userService.updatePasswordInTx.mockImplementation(async () => {
                await Promise.resolve();
                startedWhenFirstSettles = snapshotStarted;

                return updatedRow;
            });

            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                'user-linden'
            );

            expect(startedWhenFirstSettles).toBe(true);
            expect(notificationService.getSnapshot).toHaveBeenCalledBefore(
                sessionService.revokeActiveByUserInTx
            );
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
            expect(notificationService.notify).toHaveBeenCalledWith(
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
            expect(outboxService.withTransaction).not.toHaveBeenCalled();
        });

        it('revokes nothing and adds no effect when the snapshot read rejects', async () => {
            notificationService.getSnapshot.mockRejectedValue(
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
            expect(
                sessionService.revokeActiveByUserInTx
            ).not.toHaveBeenCalled();
            expect(outboxService.addManyInTx).not.toHaveBeenCalled();
        });

        it('adds nothing when the transaction fails', async () => {
            const cause = new Error('database exploded');
            outboxService.withTransaction.mockRejectedValue(cause);

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
