import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumActivityLogAction,
    EnumPasswordHistoryType,
    EnumRoleType,
    EnumUserLoginFrom,
    EnumUserLoginWith,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
} from '@generated/prisma-client/client';
import type { PasswordHistory, User } from '@generated/prisma-client/client';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import type { IActivityLogStaged } from '@modules/activity-log/interfaces/activity-log.interface';
import type { IAuthPassword } from '@modules/auth/interfaces/auth.interface';
import { NotificationService } from '@modules/notification/services/notification.service';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import type { INotificationRecipient } from '@modules/notification/interfaces/notification.interface';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { PasswordHistoryService } from '@modules/password-history/services/password-history.service';
import { RoleService } from '@modules/role/services/role.service';
import { SessionService } from '@modules/session/services/session.service';
import { SessionQueue } from '@modules/session/queues/session.queue';
import type { ISessionRef } from '@modules/session/interfaces/session.interface';
import { UserService } from '@modules/user/services/user.service';
import { UserPasswordService } from '@modules/user/services/user.password.service';
import { UserUtil } from '@modules/user/utils/user.util';
import type { IUser } from '@modules/user/interfaces/user.interface';
import { TestRecipient } from '@test/unit/helpers/test.unit.notification-push.helper';
import { UserUpdatePasswordByAdminUseCase } from '@modules/user/use-cases/user.update-password-by-admin.use-case';

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
    const sessionQueue: MockProxy<SessionQueue> = mock<SessionQueue>();
    const notificationQueue: MockProxy<NotificationQueue> =
        mock<NotificationQueue>();
    const userUtil: MockProxy<UserUtil> = mock<UserUtil>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();

    let useCase: UserUpdatePasswordByAdminUseCase;

    const user: IUser = {
        id: 'user-linden',
        name: 'Linden Frost',
        username: 'lindenFrost',
        isVerified: true,
        verifiedAt: new Date('2026-01-01T00:00:00.000Z'),
        email: 'linden@example.com',
        roleId: 'role-linden',
        password: 'hashed-password',
        passwordExpired: new Date('2026-06-01T00:00:00.000Z'),
        passwordCreated: new Date('2026-01-01T00:00:00.000Z'),
        passwordAttempt: 0,
        signUpAt: new Date('2026-01-01T00:00:00.000Z'),
        signUpFrom: EnumUserSignUpFrom.website,
        signUpWith: EnumUserSignUpWith.credential,
        status: EnumUserStatus.active,
        gender: null,
        countryId: 'country-linden',
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
            id: 'role-linden',
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
        twoFactor: null,
    };
    const admin: IUser = {
        ...user,
        id: 'admin-linden',
        role: { ...user.role, type: EnumRoleType.admin },
    };
    const password: IAuthPassword = {
        passwordHash: 'hashed',
        passwordExpired: new Date('2026-06-01T00:00:00.000Z'),
        passwordCreated: new Date('2026-01-01T00:00:00.000Z'),
        passwordPeriodExpired: new Date('2026-04-01T00:00:00.000Z'),
    };
    const activityLog: IActivityLogStaged = {
        action: EnumActivityLogAction.userChangePassword,
        metadata: {},
        userId: null,
        createdBy: null,
        workspaceId: null,
    };
    const recipient: INotificationRecipient = {
        ...TestRecipient,
        userId: user.id,
    };
    const revoked: ISessionRef[] = [{ id: 'session-one' }];
    const tx = {} as IDatabaseTransactionClient;
    const now = new Date('2026-03-05T00:00:00.000Z');
    const passwordHistory = { id: 'history-linden' } as PasswordHistory;
    const updatedRow = {
        id: 'user-linden',
        updatedAt: new Date('2026-03-01T00:00:00.000Z'),
    } as User;

    beforeEach(async () => {
        vi.resetAllMocks();
        activityLogService.prepare.mockReturnValue(activityLog);
        helperDateService.create.mockReturnValue(now);
        helperDateService.formatToIso.mockReturnValue(
            '2026-03-01T00:00:00.000Z'
        );
        databaseService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );
        notificationService.getRecipient.mockResolvedValue(recipient);
        userUtil.requiresTwoFactorVerification.mockReturnValue(false);

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
                { provide: SessionQueue, useValue: sessionQueue },
                { provide: NotificationQueue, useValue: notificationQueue },
                { provide: UserUtil, useValue: userUtil },
                { provide: DatabaseService, useValue: databaseService },
                { provide: HelperDateService, useValue: helperDateService },
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
            userUtil.mapActivityLogActorMetadata.mockReturnValue({
                targetUserId: 'user-linden',
            });
            userUtil.mapActivityLogTargetMetadata.mockReturnValue({
                actorUserId: 'admin-linden',
            });
        });

        it('gates the actor rank, writes the password, history, and revoke on one transaction, purges after commit, notifies, and stages both rows', async () => {
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
                useCase.execute('user-linden', admin)
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
            expect(notificationService.getRecipient).toHaveBeenCalledWith(
                user,
                EnumNotificationKind.temporaryPasswordByAdmin
            );
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
            ).toHaveBeenCalledWith(tx, 'user-linden');
            expect(sessionService.revokeActiveByUserInTx).toHaveBeenCalledWith(
                tx,
                'user-linden',
                'admin-linden',
                password.passwordCreated
            );
            expect(calls).toEqual([
                'begin',
                'updatePassword',
                'createHistory',
                'markUnusedResetsUsed',
                'revokeSessions',
                'commit',
                'purge',
            ]);
            expect(sessionQueue.purgeLogins).toHaveBeenCalledWith(
                'user-linden',
                revoked
            );
            expect(
                notificationQueue.sendTemporaryPasswordByAdmin
            ).toHaveBeenCalledWith(
                recipient,
                {
                    password: 'temp-password',
                    passwordCreatedAt: '2026-03-01T00:00:00.000Z',
                    passwordExpiredAt: '2026-03-01T00:00:00.000Z',
                },
                'admin-linden',
                'history-linden'
            );
            expect(activityLogService.prepare).toHaveBeenNthCalledWith(1, {
                action: EnumActivityLogAction.adminUserUpdatePassword,
                metadata: { targetUserId: 'user-linden' },
            });
            expect(activityLogService.prepare).toHaveBeenNthCalledWith(2, {
                action: EnumActivityLogAction.userUpdatePasswordByAdmin,
                userId: 'user-linden',
                createdBy: 'admin-linden',
                metadata: { actorUserId: 'admin-linden' },
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

            await expect(useCase.execute('user-linden', admin)).rejects.toThrow(
                'rank'
            );
            expect(userService.assertUnblocked).not.toHaveBeenCalled();
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('writes nothing when the recipient read rejects', async () => {
            notificationService.getRecipient.mockRejectedValue(
                new Error('read')
            );

            await expect(useCase.execute('user-linden', admin)).rejects.toThrow(
                'read'
            );
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
            expect(sessionQueue.purgeLogins).not.toHaveBeenCalled();
            expect(activityLogService.stagePrepared).not.toHaveBeenCalled();
        });

        it('purges, notifies, and stages nothing when the transaction fails', async () => {
            const cause = new Error('database exploded');
            databaseService.withTransaction.mockRejectedValue(cause);

            await expect(useCase.execute('user-linden', admin)).rejects.toBe(
                cause
            );
            expect(sessionQueue.purgeLogins).not.toHaveBeenCalled();
            expect(
                notificationQueue.sendTemporaryPasswordByAdmin
            ).not.toHaveBeenCalled();
            expect(activityLogService.stagePrepared).not.toHaveBeenCalled();
        });
    });
});
