import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumActivityLogAction,
    EnumRoleType,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
} from '@generated/prisma-client/client';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { NotificationService } from '@modules/notification/services/notification.service';
import { SessionService } from '@modules/session/services/session.service';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import type { IActivityLogStaged } from '@modules/activity-log/interfaces/activity-log.interface';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import type { INotificationRecipient } from '@modules/notification/interfaces/notification.interface';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { RoleService } from '@modules/role/services/role.service';
import { SessionQueue } from '@modules/session/queues/session.queue';
import type { ISessionRef } from '@modules/session/interfaces/session.interface';
import { UserService } from '@modules/user/services/user.service';
import { TestRecipient } from '@test/unit/helpers/test.unit.notification-push.helper';
import { EnumAuthTwoFactorMethod } from '@modules/auth/enums/auth.enum';
import { UserTwoFactorService } from '@modules/user/services/user.two-factor.service';
import { UserUtil } from '@modules/user/utils/user.util';
import type {
    IUser,
    IUserTwoFactorAttempt,
    IUserTwoFactorVerifyResult,
} from '@modules/user/interfaces/user.interface';
import type { TwoFactor } from '@generated/prisma-client/client';
import { UserResetTwoFactorByAdminUseCase } from '@modules/user/use-cases/user.reset-two-factor-by-admin.use-case';

describe('UserResetTwoFactorByAdminUseCase', () => {
    const userTwoFactorService: MockProxy<UserTwoFactorService> =
        mock<UserTwoFactorService>();
    const userUtil: MockProxy<UserUtil> = mock<UserUtil>();
    const userService: MockProxy<UserService> = mock<UserService>();
    const sessionService: MockProxy<SessionService> = mock<SessionService>();
    const notificationService: MockProxy<NotificationService> =
        mock<NotificationService>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const roleService: MockProxy<RoleService> = mock<RoleService>();
    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();
    const sessionQueue: MockProxy<SessionQueue> = mock<SessionQueue>();
    const notificationQueue: MockProxy<NotificationQueue> =
        mock<NotificationQueue>();

    let useCase: UserResetTwoFactorByAdminUseCase;

    const twoFactor: TwoFactor = {
        id: 'two-factor-marten',
        userId: 'user-marten',
        secret: 'encrypted-secret',
        pendingSecret: null,
        backupCodes: ['hash-one'],
        enabled: true,
        requiredSetup: false,
        confirmedAt: new Date('2026-01-05T00:00:00.000Z'),
        lastUsedAt: null,
        lastUsedStep: null,
        attempt: 0,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
    };
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
        twoFactor,
    };
    const activityLog: IActivityLogStaged = {
        action: EnumActivityLogAction.userDisableTwoFactor,
        metadata: {},
        userId: null,
        createdBy: null,
        workspaceId: null,
    };
    const recipient: INotificationRecipient = {
        ...TestRecipient,
        userId: user.id,
    };
    const twoFactorAttempt: IUserTwoFactorAttempt = {
        isAttemptCounted: true,
        lockoutStages: [],
    };
    const revoked: ISessionRef[] = [{ id: 'session-one' }];
    const tx = {} as IDatabaseTransactionClient;
    const now = new Date('2026-03-05T00:00:00.000Z');
    const verified: IUserTwoFactorVerifyResult = {
        method: EnumAuthTwoFactorMethod.code,
        newBackupCodes: null,
    };

    beforeEach(async () => {
        vi.resetAllMocks();
        activityLogService.prepare.mockReturnValue(activityLog);
        helperDateService.create.mockReturnValue(now);
        databaseService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );
        userTwoFactorService.countAttempt.mockResolvedValue(twoFactorAttempt);
        userTwoFactorService.verify.mockResolvedValue(verified);
        notificationService.getRecipient.mockResolvedValue(recipient);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserResetTwoFactorByAdminUseCase,
                {
                    provide: UserTwoFactorService,
                    useValue: userTwoFactorService,
                },
                { provide: UserUtil, useValue: userUtil },
                { provide: UserService, useValue: userService },
                { provide: SessionService, useValue: sessionService },
                {
                    provide: NotificationService,
                    useValue: notificationService,
                },
                { provide: DatabaseService, useValue: databaseService },
                { provide: HelperDateService, useValue: helperDateService },
                { provide: RoleService, useValue: roleService },
                { provide: ActivityLogService, useValue: activityLogService },
                { provide: SessionQueue, useValue: sessionQueue },
                { provide: NotificationQueue, useValue: notificationQueue },
            ],
        }).compile();
        useCase = module.get(UserResetTwoFactorByAdminUseCase);
    });

    describe('execute', () => {
        const admin: IUser = {
            ...user,
            id: 'admin-marten',
            role: { ...user.role, type: EnumRoleType.admin },
        };

        beforeEach(() => {
            userService.getOneWithRole.mockResolvedValue(user);
            userUtil.mapActivityLogActorMetadata.mockReturnValue({
                targetUserId: 'user-marten',
            });
            userUtil.mapActivityLogTargetMetadata.mockReturnValue({
                actorUserId: 'admin-marten',
            });
        });

        it('gates the rank, resets and revokes on one transaction, purges, notifies, and stages both rows', async () => {
            const calls: string[] = [];
            databaseService.withTransaction.mockImplementation(async fn => {
                calls.push('begin');
                const value = await fn(tx);
                calls.push('commit');

                return value as never;
            });
            userTwoFactorService.resetByAdminInTx.mockImplementation(
                async () => {
                    calls.push('resetInTx');
                }
            );
            sessionService.revokeActiveByUserInTx.mockImplementation(
                async () => {
                    calls.push('revokeSessions');

                    return revoked;
                }
            );
            sessionQueue.purgeLogins.mockImplementation(async () => {
                calls.push('purge');
            });

            await expect(
                useCase.execute('user-marten', admin)
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
            expect(userTwoFactorService.assertEnabled).toHaveBeenCalledWith(
                user
            );
            expect(notificationService.getRecipient).toHaveBeenCalledWith(
                user,
                EnumNotificationKind.resetTwoFactorByAdmin
            );
            expect(userTwoFactorService.resetByAdminInTx).toHaveBeenCalledWith(
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
                'resetInTx',
                'revokeSessions',
                'commit',
                'purge',
            ]);
            expect(sessionQueue.purgeLogins).toHaveBeenCalledWith(
                'user-marten',
                revoked
            );
            expect(
                notificationQueue.sendResetTwoFactorByAdmin
            ).toHaveBeenCalledWith(recipient, 'admin-marten');
            expect(activityLogService.prepare).toHaveBeenNthCalledWith(1, {
                action: EnumActivityLogAction.adminUserResetTwoFactor,
                metadata: { targetUserId: 'user-marten' },
            });
            expect(activityLogService.prepare).toHaveBeenNthCalledWith(2, {
                action: EnumActivityLogAction.userResetTwoFactorByAdmin,
                userId: 'user-marten',
                createdBy: 'admin-marten',
                metadata: { actorUserId: 'admin-marten' },
            });
            expect(activityLogService.stagePrepared).toHaveBeenCalledWith([
                activityLog,
                activityLog,
            ]);
        });

        it('stops at the rank gate before the blocked gate', async () => {
            roleService.assertActorOutranks.mockImplementation(() => {
                throw new Error('rank');
            });

            await expect(useCase.execute('user-marten', admin)).rejects.toThrow(
                'rank'
            );
            expect(userService.assertUnblocked).not.toHaveBeenCalled();
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('resets nothing when the recipient read rejects', async () => {
            notificationService.getRecipient.mockRejectedValue(
                new Error('read')
            );

            await expect(useCase.execute('user-marten', admin)).rejects.toThrow(
                'read'
            );
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
            expect(activityLogService.stagePrepared).not.toHaveBeenCalled();
        });

        it('purges, notifies, and stages nothing when the transaction fails', async () => {
            const cause = new Error('database exploded');
            databaseService.withTransaction.mockRejectedValue(cause);

            await expect(useCase.execute('user-marten', admin)).rejects.toBe(
                cause
            );
            expect(sessionQueue.purgeLogins).not.toHaveBeenCalled();
            expect(
                notificationQueue.sendResetTwoFactorByAdmin
            ).not.toHaveBeenCalled();
            expect(activityLogService.stagePrepared).not.toHaveBeenCalled();
        });
    });
});
