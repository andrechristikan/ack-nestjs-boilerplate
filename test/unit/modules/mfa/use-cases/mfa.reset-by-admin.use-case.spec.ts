import {
    buildPolicyAbility,
    buildPolicyContext,
} from '@test/unit/helpers/test.unit.policy.helper';
import { PolicyAbilityService } from '@modules/policy/services/policy.ability.service';
import { EnumRolePlatformKey } from '@modules/role/enums/role.enum';
import { buildActivityLogCreateManyEffect } from '@test/unit/helpers/test.unit.activity-log-effect.helper';
import type { INotificationNotifyEffect } from '@modules/notification/interfaces/notification.interface';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumActivityLogAction,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
    EnumRoleScope,
} from '@generated/prisma-client/client';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { NotificationService } from '@modules/notification/services/notification.service';
import { SessionService } from '@modules/session/services/session.service';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
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
import { MfaService } from '@modules/mfa/services/mfa.service';
import { MfaResetByAdminUseCase } from '@modules/mfa/use-cases/mfa.reset-by-admin.use-case';
import {
    buildRequestContext,
    buildApiKeyContext,
    buildUserContext,
    buildAuthJwtAccessContext,
} from '@test/unit/helpers/test.unit.request.helper';
import type { IPolicyWhereInput } from '@modules/policy/interfaces/policy.interface';

describe('MfaResetByAdminUseCase', () => {
    const policyContext = buildPolicyContext(buildPolicyAbility([]));
    const policyAbilityService: MockProxy<PolicyAbilityService> =
        mock<PolicyAbilityService>();
    const scoped: IPolicyWhereInput<'User'> = { id: 'scoped-1' };
    const userUtil: MockProxy<UserUtil> = mock<UserUtil>();
    const userService: MockProxy<UserService> = mock<UserService>();
    const sessionService: MockProxy<SessionService> = mock<SessionService>();
    const notificationService: MockProxy<NotificationService> =
        mock<NotificationService>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const roleService: MockProxy<RoleService> = mock<RoleService>();
    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();
    const mfaService: MockProxy<MfaService> = mock<MfaService>();

    let useCase: MfaResetByAdminUseCase;

    const user: IUser = {
        id: 'user-marten',
        name: 'Marten Cole',
        username: 'martenCole',
        isVerified: true,
        verifiedAt: new Date('2026-01-01T00:00:00.000Z'),
        email: 'marten@example.com',
        roleId: 'role-marten',
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
        countryId: 'country-marten',
        lastLoginAt: null,
        lastIPAddress: null,
        lastLoginFrom: null,
        lastLoginWith: null,
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
            id: 'role-marten',
            scope: EnumRoleScope.platform,
            key: 'user',
            name: 'user',
            policyRevision: 0,
        },
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

    beforeEach(async () => {
        vi.resetAllMocks();
        policyAbilityService.scope.mockReturnValue(scoped);
        activityLogService.recordEffect.mockImplementation(
            (
                _requestContext,
                _apiKeyContext,
                _authContext,
                _workspaceContext,
                input
            ) =>
                input.action === EnumActivityLogAction.adminUserResetMfa
                    ? adminEntry
                    : targetEntry
        );
        helperDateService.create.mockReturnValue(now);
        outboxService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );
        notificationService.getSnapshot.mockResolvedValue(snapshot);
        notificationService.notify.mockReturnValue(notifyEffect);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                {
                    provide: PolicyAbilityService,
                    useValue: policyAbilityService,
                },
                MfaResetByAdminUseCase,
                { provide: MfaService, useValue: mfaService },
                { provide: UserUtil, useValue: userUtil },
                { provide: UserService, useValue: userService },
                { provide: SessionService, useValue: sessionService },
                {
                    provide: NotificationService,
                    useValue: notificationService,
                },
                { provide: OutboxService, useValue: outboxService },
                { provide: HelperDateService, useValue: helperDateService },
                { provide: RoleService, useValue: roleService },
                { provide: ActivityLogService, useValue: activityLogService },
            ],
        }).compile();
        useCase = module.get(MfaResetByAdminUseCase);
    });

    describe('execute', () => {
        const admin: IUser = {
            ...user,
            id: 'admin-marten',
            role: { ...user.role, key: EnumRolePlatformKey.admin },
        };
        const requestContext = buildRequestContext();
        const apiKeyContext = buildApiKeyContext();
        const userContext = buildUserContext(admin);
        const authContext = buildAuthJwtAccessContext(admin.id);

        beforeEach(() => {
            mfaService.assertHasFactor.mockResolvedValue();
            userService.getOneWithRole.mockResolvedValue(user);
            userUtil.mapActivityLogActorMetadata.mockReturnValue({
                targetUserId: 'user-marten',
            });
            userUtil.mapActivityLogTargetMetadata.mockReturnValue({
                actorUserId: 'admin-marten',
            });
        });

        it('gates the rank, resets and revokes on one transaction, and adds both entries and the notification on it', async () => {
            const calls: string[] = [];
            outboxService.withTransaction.mockImplementation(async fn => {
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
                    policyContext,
                    'user-marten'
                )
            ).resolves.toEqual({});

            expect(userService.assertNotSelf).toHaveBeenCalledWith(
                'user-marten',
                'admin-marten'
            );
            expect(roleService.assertActorOutranks).toHaveBeenCalledWith(
                EnumRolePlatformKey.admin,
                expect.objectContaining({
                    scope: EnumRoleScope.platform,
                    key: EnumRolePlatformKey.user,
                })
            );
            expect(userService.getOneWithRole).toHaveBeenCalledWith(
                'user-marten',
                scoped
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
                'begin',
                'snapshot',
                'resetInTx',
                'revokeSessions',
                'addEffects',
                'commit',
            ]);
            expect(notificationService.notify).toHaveBeenCalledWith(
                EnumNotificationKind.resetMfaByAdmin,
                { userId: 'user-marten', proceedBy: 'admin-marten', snapshot }
            );
            expect(activityLogService.recordEffect).toHaveBeenNthCalledWith(
                1,
                requestContext,
                apiKeyContext,
                authContext,
                null,
                {
                    action: EnumActivityLogAction.adminUserResetMfa,
                    metadata: { targetUserId: 'user-marten' },
                }
            );
            expect(activityLogService.recordEffect).toHaveBeenNthCalledWith(
                2,
                requestContext,
                apiKeyContext,
                authContext,
                null,
                {
                    action: EnumActivityLogAction.userResetMfaByAdmin,
                    userId: 'user-marten',
                    createdBy: 'admin-marten',
                    metadata: { actorUserId: 'admin-marten' },
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
            mfaService.resetByAdminInTx.mockImplementation(async () => {
                await Promise.resolve();
                startedWhenFirstSettles = snapshotStarted;
            });

            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                policyContext,
                'user-marten'
            );

            expect(startedWhenFirstSettles).toBe(true);
            expect(notificationService.getSnapshot).toHaveBeenCalledBefore(
                sessionService.revokeActiveByUserInTx
            );
        });

        it('reads the actor id from the context actorUserId', async () => {
            await useCase.execute(
                requestContext,
                apiKeyContext,
                { ...authContext, userId: 'admin-other' },
                userContext,
                policyContext,
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
            expect(notificationService.notify).toHaveBeenCalledWith(
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
                    policyContext,
                    'user-marten'
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
                    policyContext,
                    'user-marten'
                )
            ).rejects.toThrow('read');
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
                    policyContext,
                    'user-marten'
                )
            ).rejects.toBeInstanceOf(MfaNotEnabledException);
            expect(userService.assertUnblocked).toHaveBeenCalledBefore(
                mfaService.assertHasFactor
            );
            expect(outboxService.withTransaction).not.toHaveBeenCalled();
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
                    policyContext,
                    'user-marten'
                )
            ).rejects.toBe(cause);
            expect(outboxService.addManyInTx).not.toHaveBeenCalled();
        });
    });
});
