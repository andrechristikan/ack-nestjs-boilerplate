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
import { UserService } from '@modules/user/services/user.service';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { SessionService } from '@modules/session/services/session.service';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import type { IActivityLogStaged } from '@modules/activity-log/interfaces/activity-log.interface';
import { RoleService } from '@modules/role/services/role.service';
import { SessionQueue } from '@modules/session/queues/session.queue';
import { SessionUtil } from '@modules/session/utils/session.util';
import type { ISessionRef } from '@modules/session/interfaces/session.interface';
import { UserUtil } from '@modules/user/utils/user.util';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { UserStatusInvalidException } from '@modules/user/exceptions/user.status-invalid.exception';
import type { UserUpdateStatusRequestDto } from '@modules/user/dtos/request/user.update-status.request.dto';
import type { IUser } from '@modules/user/interfaces/user.interface';
import { UserUpdateStatusByAdminUseCase } from '@modules/user/use-cases/user.update-status-by-admin.use-case';

describe('UserUpdateStatusByAdminUseCase', () => {
    const userService: MockProxy<UserService> = mock<UserService>();
    const sessionService: MockProxy<SessionService> = mock<SessionService>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const roleService: MockProxy<RoleService> = mock<RoleService>();
    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();
    const sessionQueue: MockProxy<SessionQueue> = mock<SessionQueue>();
    const sessionUtil: MockProxy<SessionUtil> = mock<SessionUtil>();
    const userUtil: MockProxy<UserUtil> = mock<UserUtil>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();

    let useCase: UserUpdateStatusByAdminUseCase;

    const tx = {} as IDatabaseTransactionClient;
    const now = new Date('2026-03-05T00:00:00.000Z');
    const baseUser: IUser = {
        id: 'user-cinder',
        name: 'Cinder Wolfe',
        username: 'cinder2wolfe',
        isVerified: true,
        verifiedAt: new Date('2026-01-01T00:00:00.000Z'),
        email: 'cinder@example.com',
        roleId: 'role-cinder',
        password: 'hashed-password',
        passwordExpired: new Date('2026-06-01T00:00:00.000Z'),
        passwordCreated: new Date('2026-01-01T00:00:00.000Z'),
        passwordAttempt: 0,
        signUpAt: new Date('2026-01-01T00:00:00.000Z'),
        signUpFrom: EnumUserSignUpFrom.website,
        signUpWith: EnumUserSignUpWith.credential,
        status: EnumUserStatus.active,
        gender: null,
        countryId: 'country-cinder',
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
            id: 'role-cinder',
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

    beforeEach(async () => {
        vi.resetAllMocks();
        helperDateService.create.mockReturnValue(now);
        databaseService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserUpdateStatusByAdminUseCase,
                { provide: UserService, useValue: userService },
                { provide: SessionService, useValue: sessionService },
                { provide: DatabaseService, useValue: databaseService },
                { provide: HelperDateService, useValue: helperDateService },
                { provide: RoleService, useValue: roleService },
                { provide: ActivityLogService, useValue: activityLogService },
                { provide: SessionQueue, useValue: sessionQueue },
                { provide: SessionUtil, useValue: sessionUtil },
                { provide: UserUtil, useValue: userUtil },
                { provide: DatabaseUtil, useValue: databaseUtil },
            ],
        }).compile();
        useCase = module.get(UserUpdateStatusByAdminUseCase);
    });

    describe('execute', () => {
        const activityLog: IActivityLogStaged = {
            action: EnumActivityLogAction.userUpdateStatus,
            metadata: {},
            userId: null,
            createdBy: null,
            workspaceId: null,
        };

        const revoked: ISessionRef[] = [{ id: 'session-one' }];

        const row = {
            ...baseUser,
            status: EnumUserStatus.inactive,
        };

        const admin: IUser = {
            ...baseUser,
            id: 'admin-cinder',
            role: { ...baseUser.role, type: EnumRoleType.admin },
        };

        beforeEach(() => {
            activityLogService.prepare.mockReturnValue(activityLog);
            userService.getOneWithRole.mockResolvedValue({
                ...baseUser,
                passwordAttempt: 3,
            });
            userUtil.revokesSessionsOn.mockReturnValue(true);
            userUtil.resolveStatusActivityLogAction.mockReturnValue(
                EnumActivityLogAction.userUpdateStatus
            );
            userUtil.mapActivityLogActorMetadata.mockReturnValue({
                targetUserId: 'user-cinder',
            });
            userUtil.mapActivityLogTargetMetadata.mockReturnValue({
                actorUserId: 'admin-cinder',
            });
            sessionUtil.mapActivityLogRevokeAllActorMetadata.mockReturnValue({
                targetUserId: 'user-cinder',
                sessionCount: 1,
            });
            sessionUtil.mapActivityLogRevokeAllTargetMetadata.mockReturnValue({
                actorUserId: 'admin-cinder',
                sessionCount: 1,
            });
        });

        it('gates the rank, writes the status and the revoke on one transaction, purges after commit, and stages the revoke-all rows before the status rows', async () => {
            const calls: string[] = [];
            databaseService.withTransaction.mockImplementation(async fn => {
                calls.push('begin');
                const value = await fn(tx);
                calls.push('commit');

                return value as never;
            });
            userService.updateStatusByAdminInTx.mockImplementation(async () => {
                calls.push('updateStatus');

                return row;
            });
            sessionService.revokeActiveByUserInTx.mockImplementation(
                async () => {
                    calls.push('revokeSessions');

                    return revoked;
                }
            );
            sessionQueue.purgeLogins.mockImplementation(async () => {
                calls.push('purge');
            });
            userUtil.resolveStatusActivityLogAction.mockReturnValue(
                EnumActivityLogAction.userBlocked
            );
            const dto: UserUpdateStatusRequestDto = {
                status: EnumUserStatus.blocked,
            };

            await expect(
                useCase.execute('user-cinder', dto, admin)
            ).resolves.toEqual({});

            expect(userService.assertNotSelf).toHaveBeenCalledWith(
                'user-cinder',
                'admin-cinder'
            );
            expect(roleService.assertActorOutranks).toHaveBeenCalledWith(
                EnumRoleType.admin,
                EnumRoleType.user
            );
            expect(userService.updateStatusByAdminInTx).toHaveBeenCalledWith(
                tx,
                { ...baseUser, passwordAttempt: 3 },
                EnumUserStatus.blocked
            );
            expect(sessionService.revokeActiveByUserInTx).toHaveBeenCalledWith(
                tx,
                'user-cinder',
                'admin-cinder',
                now
            );
            expect(calls).toEqual([
                'begin',
                'updateStatus',
                'revokeSessions',
                'commit',
                'purge',
            ]);
            expect(sessionQueue.purgeLogins).toHaveBeenCalledWith(
                'user-cinder',
                revoked
            );
            expect(activityLogService.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.adminSessionRevokeAll,
                metadata: { targetUserId: 'user-cinder', sessionCount: 1 },
            });
            expect(activityLogService.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userRevokeAllSessionsByAdmin,
                userId: 'user-cinder',
                createdBy: 'admin-cinder',
                metadata: { actorUserId: 'admin-cinder', sessionCount: 1 },
            });
            expect(activityLogService.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.adminUserUpdateStatus,
                metadata: { targetUserId: 'user-cinder' },
            });
            expect(activityLogService.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userBlocked,
                userId: 'user-cinder',
                createdBy: 'admin-cinder',
                metadata: { actorUserId: 'admin-cinder' },
            });
            expect(activityLogService.stagePrepared).toHaveBeenCalledTimes(2);
            expect(activityLogService.stagePrepared).toHaveBeenNthCalledWith(
                1,
                [activityLog, activityLog]
            );
            expect(activityLogService.stagePrepared).toHaveBeenNthCalledWith(
                2,
                [activityLog, activityLog]
            );
        });

        it('records the plain status action for a status other than blocked', async () => {
            userService.updateStatusByAdminInTx.mockResolvedValue(row);
            sessionService.revokeActiveByUserInTx.mockResolvedValue(revoked);

            await useCase.execute(
                'user-cinder',
                { status: EnumUserStatus.inactive },
                admin
            );

            expect(activityLogService.prepare).toHaveBeenCalledWith(
                expect.objectContaining({
                    action: EnumActivityLogAction.userUpdateStatus,
                })
            );
        });

        it('purges an empty list and stages no revoke-all row when no session was open', async () => {
            userService.updateStatusByAdminInTx.mockResolvedValue(row);
            sessionService.revokeActiveByUserInTx.mockResolvedValue([]);

            await useCase.execute(
                'user-cinder',
                { status: EnumUserStatus.inactive },
                admin
            );

            expect(sessionQueue.purgeLogins).toHaveBeenCalledWith(
                'user-cinder',
                []
            );
            expect(activityLogService.stagePrepared).toHaveBeenCalledTimes(1);
        });

        it('updateStatusByAdmin to active revokes no session', async () => {
            userUtil.revokesSessionsOn.mockReturnValue(false);
            userService.updateStatusByAdminInTx.mockResolvedValue(row);

            await useCase.execute(
                'user-cinder',
                { status: EnumUserStatus.active },
                admin
            );

            expect(userUtil.revokesSessionsOn).toHaveBeenCalledWith(
                EnumUserStatus.active
            );
            expect(
                sessionService.revokeActiveByUserInTx
            ).not.toHaveBeenCalled();
            expect(sessionQueue.purgeLogins).not.toHaveBeenCalled();
            expect(activityLogService.stagePrepared).toHaveBeenCalledTimes(1);
        });

        it('updateStatusByAdmin to blocked revokes sessions and stages userBlocked', async () => {
            userUtil.resolveStatusActivityLogAction.mockReturnValue(
                EnumActivityLogAction.userBlocked
            );
            userService.updateStatusByAdminInTx.mockResolvedValue(row);
            sessionService.revokeActiveByUserInTx.mockResolvedValue(revoked);

            await useCase.execute(
                'user-cinder',
                { status: EnumUserStatus.blocked },
                admin
            );

            expect(userUtil.revokesSessionsOn).toHaveBeenCalledWith(
                EnumUserStatus.blocked
            );
            expect(
                userUtil.resolveStatusActivityLogAction
            ).toHaveBeenCalledWith(EnumUserStatus.blocked);
            expect(sessionService.revokeActiveByUserInTx).toHaveBeenCalledTimes(
                1
            );
            expect(sessionQueue.purgeLogins).toHaveBeenCalledWith(
                'user-cinder',
                revoked
            );
            expect(activityLogService.prepare).toHaveBeenCalledWith(
                expect.objectContaining({
                    action: EnumActivityLogAction.userBlocked,
                })
            );
        });

        it('purges and stages nothing and wraps the failure when the transaction fails', async () => {
            const cause = new Error('database exploded');
            databaseService.withTransaction.mockRejectedValue(cause);
            databaseUtil.toException.mockReturnValue(null);

            await expect(
                useCase.execute(
                    'user-cinder',
                    { status: EnumUserStatus.blocked },
                    admin
                )
            ).rejects.toMatchObject({ rawError: cause });
            expect(sessionQueue.purgeLogins).not.toHaveBeenCalled();
            expect(activityLogService.stagePrepared).not.toHaveBeenCalled();
        });

        it('rethrows the status exception of the guarded write unchanged', async () => {
            const failure = new UserStatusInvalidException();
            databaseService.withTransaction.mockRejectedValue(failure);

            await expect(
                useCase.execute(
                    'user-cinder',
                    { status: EnumUserStatus.blocked },
                    admin
                )
            ).rejects.toBe(failure);
            expect(databaseUtil.toException).not.toHaveBeenCalled();
        });

        it('answers UserStatusInvalidException when the guarded write conflicts', async () => {
            const conflict = new Error('write-conflict');
            databaseService.withTransaction.mockRejectedValue(conflict);
            databaseUtil.toException.mockReturnValue(
                new DatabaseWriteConflictException()
            );

            await expect(
                useCase.execute(
                    'user-cinder',
                    { status: EnumUserStatus.blocked },
                    admin
                )
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.statusInvalid,
                messagePath: 'user.error.statusInvalid',
            });
            expect(databaseUtil.toException).toHaveBeenCalledWith(conflict);
            expect(sessionQueue.purgeLogins).not.toHaveBeenCalled();
            expect(activityLogService.stagePrepared).not.toHaveBeenCalled();
        });

        it('stops at the rank gate before the blocked gate', async () => {
            roleService.assertActorOutranks.mockImplementation(() => {
                throw new Error('rank');
            });

            await expect(
                useCase.execute(
                    'user-cinder',
                    { status: EnumUserStatus.blocked },
                    admin
                )
            ).rejects.toThrow('rank');
            expect(userService.assertUnblocked).not.toHaveBeenCalled();
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });
    });
});
