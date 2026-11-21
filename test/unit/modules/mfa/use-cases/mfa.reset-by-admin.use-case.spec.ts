import { buildActivityLogCreateManyEffect } from '@test/unit/helpers/test.unit.activity-log-effect.helper';
import type { INotificationNotifyEffect } from '@modules/notification/interfaces/notification.interface';
import { ConfigService } from '@nestjs/config';
import { buildDeferred } from '@test/unit/helpers/test.unit.deferred.helper';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import {
    TestUnitKitConfigValues,
    TestUnitKitProviders,
} from '@test/unit/helpers/test.unit.kit.helper';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumActivityLogAction,
    EnumRoleType,
} from '@generated/prisma-client/client';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { NotificationService } from '@modules/notification/services/notification.service';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { SessionService } from '@modules/session/services/session.service';
import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
import {
    EnumNotificationKind,
    EnumNotificationProcess,
    EnumNotificationQueue,
} from '@modules/notification/enums/notification.enum';
import type { INotificationSnapshot } from '@modules/notification/interfaces/notification.interface';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import { RoleService } from '@modules/role/services/role.service';
import type { ISessionRef } from '@modules/session/interfaces/session.interface';
import { UserService } from '@modules/user/services/user.service';
import { UserUtil } from '@modules/user/utils/user.util';
import type { IUser } from '@modules/user/interfaces/user.interface';
import { MfaNotEnabledException } from '@modules/mfa/exceptions/mfa.not-enabled.exception';
import { EnumMfaStatusCodeError } from '@modules/mfa/enums/mfa.status-code.enum';
import { MfaService } from '@modules/mfa/services/mfa.service';
import { MfaResetByAdminUseCase } from '@modules/mfa/use-cases/mfa.reset-by-admin.use-case';
import {
    buildApiKeyContext,
    buildAuthJwtAccessContext,
    buildRequestContext,
    buildUser,
    buildUserContext,
} from '@test/unit/helpers/test.unit.request.helper';

describe('MfaResetByAdminUseCase', () => {
    const userService: MockProxy<UserService> = mock<UserService>();
    const sessionService: MockProxy<SessionService> = mock<SessionService>();
    const notificationService: MockProxy<NotificationService> =
        mock<NotificationService>();
    const notificationQueue: MockProxy<NotificationQueue> =
        mock<NotificationQueue>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();
    const roleService: MockProxy<RoleService> = mock<RoleService>();
    const activityLogQueue: MockProxy<ActivityLogQueue> =
        mock<ActivityLogQueue>();
    const mfaService: MockProxy<MfaService> = mock<MfaService>();

    let useCase: MfaResetByAdminUseCase;

    const user: IUser = {
        ...buildUser('user-marten', 'marten@example.com'),
        username: 'martenCole',
    };
    const adminEntry = buildActivityLogCreateManyEffect('admin-entry');
    const targetEntry = buildActivityLogCreateManyEffect('target-entry');
    const snapshot: INotificationSnapshot = {
        username: 'martenFrost',
        encryptedEmail: 'cipher(marten@example.com)',
        encryptedTokens: ['cipher(token-one)'],
    };
    const notifyEffect: INotificationNotifyEffect = {
        queue: EnumNotificationQueue.notification,
        name: EnumNotificationProcess.notify,
        data: {
            kind: EnumNotificationKind.resetMfaByAdmin,
            context: {
                userId: 'user-marten',
                proceedBy: 'admin-marten',
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

    beforeAll(() => {
        vi.useFakeTimers();
        vi.setSystemTime(now);
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
                input.action === EnumActivityLogAction.adminUserMfaReset
                    ? adminEntry
                    : targetEntry
        );
        databaseService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );
        notificationService.getSnapshot.mockResolvedValue(snapshot);
        notificationQueue.notify.mockReturnValue(notifyEffect);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MfaResetByAdminUseCase,
                { provide: MfaService, useValue: mfaService },
                UserUtil,
                { provide: UserService, useValue: userService },
                { provide: SessionService, useValue: sessionService },
                {
                    provide: NotificationService,
                    useValue: notificationService,
                },
                { provide: NotificationQueue, useValue: notificationQueue },
                { provide: DatabaseService, useValue: databaseService },
                { provide: OutboxService, useValue: outboxService },
                ...TestUnitKitProviders,
                {
                    provide: ConfigService,
                    useValue: buildConfigService({
                        ...TestUnitKitConfigValues,
                        'message.availableLanguages': ['en'],
                    }),
                },
                { provide: RoleService, useValue: roleService },
                { provide: ActivityLogQueue, useValue: activityLogQueue },
            ],
        }).compile();
        useCase = module.get(MfaResetByAdminUseCase);
    });

    describe('execute', () => {
        const admin: IUser = {
            ...user,
            id: 'admin-marten',
            role: { ...user.role, type: EnumRoleType.admin },
        };
        const requestContext = buildRequestContext();
        const apiKeyContext = buildApiKeyContext();
        const userContext = buildUserContext(admin);
        const authContext = buildAuthJwtAccessContext(admin.id);

        beforeEach(() => {
            mfaService.assertHasFactor.mockResolvedValue();
            userService.getOneWithRole.mockResolvedValue(user);
        });

        it('gates the rank, resets and revokes on one transaction, and adds both entries and the notification on it', async () => {
            const calls: string[] = [];
            databaseService.withTransaction.mockImplementation(async fn => {
                calls.push('begin');
                const value = await fn(tx);
                calls.push('commit');

                return value as never;
            });
            mfaService.resetByAdminInTx.mockImplementation(async () => {
                calls.push('resetInTx');
            });
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
                    'user-marten'
                )
            ).resolves.toEqual({});

            expect(userService.assertNotSelf).toHaveBeenCalledWith(
                'user-marten',
                'admin-marten'
            );
            expect(roleService.assertActorOutranks).toHaveBeenCalledWith(
                EnumRoleType.admin,
                EnumRoleType.user
            );
            expect(userService.getOneWithRole).toHaveBeenCalledWith(
                'user-marten'
            );
            expect(mfaService.assertHasFactor).toHaveBeenCalledWith(
                'user-marten'
            );
            expect(mfaService.isEnabled).not.toHaveBeenCalled();
            expect(notificationService.getSnapshot).toHaveBeenCalledWith(user);
            expect(mfaService.resetByAdminInTx).toHaveBeenCalledWith(
                tx,
                'user-marten'
            );
            expect(sessionService.revokeActiveByUserInTx).toHaveBeenCalledWith(
                tx,
                'user-marten',
                'admin-marten',
                now
            );
            expect(calls).toEqual([
                'snapshot',
                'begin',
                'resetInTx',
                'revokeSessions',
                'addEffects',
                'commit',
            ]);
            expect(notificationQueue.notify).toHaveBeenCalledWith(
                EnumNotificationKind.resetMfaByAdmin,
                { userId: 'user-marten', proceedBy: 'admin-marten', snapshot }
            );
            expect(activityLogQueue.recordEffect).toHaveBeenNthCalledWith(
                1,
                requestContext,
                apiKeyContext,
                authContext,
                null,
                {
                    action: EnumActivityLogAction.adminUserMfaReset,
                    metadata: {
                        targetUserId: 'user-marten',
                        targetUsername: 'martenCole',
                        timestamp: user.updatedAt,
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
                    action: EnumActivityLogAction.userMfaResetByAdmin,
                    userId: 'user-marten',
                    createdBy: 'admin-marten',
                    metadata: {
                        actorUserId: 'admin-marten',
                        timestamp: user.updatedAt,
                    },
                }
            );
            expect(outboxService.addManyInTx).toHaveBeenCalledWith(tx, [
                adminEntry,
                targetEntry,
                notifyEffect,
            ]);
        });

        it('revokes the sessions while the factor reset is still pending', async () => {
            const reset = buildDeferred<void>();
            mfaService.resetByAdminInTx.mockReturnValue(reset.promise);
            sessionService.revokeActiveByUserInTx.mockResolvedValue(revoked);

            const running = useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                'user-marten'
            );
            await vi.advanceTimersByTimeAsync(0);

            expect(mfaService.resetByAdminInTx).toHaveBeenCalledWith(
                tx,
                'user-marten'
            );
            expect(sessionService.revokeActiveByUserInTx).toHaveBeenCalledWith(
                tx,
                'user-marten',
                authContext.userId,
                expect.any(Date)
            );
            expect(outboxService.addManyInTx).not.toHaveBeenCalled();

            reset.resolve();
            await running;

            expect(outboxService.addManyInTx).toHaveBeenCalledTimes(1);
        });

        it('reads the snapshot before the transaction opens and hands it to the notification effect', async () => {
            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                'user-marten'
            );

            expect(notificationService.getSnapshot).toHaveBeenCalledBefore(
                databaseService.withTransaction
            );
            expect(notificationQueue.notify).toHaveBeenCalledWith(
                EnumNotificationKind.resetMfaByAdmin,
                expect.objectContaining({ snapshot })
            );
        });

        it('reads the actor id from the context actorUserId', async () => {
            await useCase.execute(
                requestContext,
                apiKeyContext,
                { ...authContext, userId: 'admin-other' },
                userContext,
                'user-marten'
            );

            expect(userService.assertNotSelf).toHaveBeenCalledWith(
                'user-marten',
                'admin-other'
            );
            expect(sessionService.revokeActiveByUserInTx).toHaveBeenCalledWith(
                tx,
                'user-marten',
                'admin-other',
                expect.anything()
            );
            expect(notificationQueue.notify).toHaveBeenCalledWith(
                EnumNotificationKind.resetMfaByAdmin,
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
                    'user-marten'
                )
            ).rejects.toThrow('rank');
            expect(userService.assertUnblocked).not.toHaveBeenCalled();
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
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
                    'user-marten'
                )
            ).rejects.toThrow('read');
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
            expect(
                sessionService.revokeActiveByUserInTx
            ).not.toHaveBeenCalled();
            expect(outboxService.addManyInTx).not.toHaveBeenCalled();
        });

        it('throws MfaNotEnabledException before the transaction when the target stores no factor', async () => {
            mfaService.assertHasFactor.mockRejectedValue(
                new MfaNotEnabledException()
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    'user-marten'
                )
            ).rejects.toMatchObject({
                module: 'mfa',
                statusCode: EnumMfaStatusCodeError.notEnabled,
            });
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('reads the target and asserts the stored factor together', async () => {
            const target = buildDeferred<IUser>();
            userService.getOneWithRole.mockReturnValue(target.promise);
            mfaService.assertHasFactor.mockImplementation(async () => {
                target.resolve(user);
            });

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    'user-marten'
                )
            ).resolves.toEqual({});
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
                    'user-marten'
                )
            ).rejects.toBe(cause);
            expect(outboxService.addManyInTx).not.toHaveBeenCalled();
        });
    });
});
