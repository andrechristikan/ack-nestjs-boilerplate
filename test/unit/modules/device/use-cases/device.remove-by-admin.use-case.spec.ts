import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import {
    EnumActivityLogAction,
    EnumDevicePlatform,
    EnumRoleType,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
} from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import type { IActivityLogStaged } from '@modules/activity-log/interfaces/activity-log.interface';
import { DeviceService } from '@modules/device/services/device.service';
import { DeviceNotFoundException } from '@modules/device/exceptions/device.not-found.exception';
import { DeviceUtil } from '@modules/device/utils/device.util';
import { RoleService } from '@modules/role/services/role.service';
import { RoleRankForbiddenException } from '@modules/role/exceptions/role.rank-forbidden.exception';
import type { IRole } from '@modules/role/interfaces/role.interface';
import { SessionService } from '@modules/session/services/session.service';
import { SessionQueue } from '@modules/session/queues/session.queue';
import type { IDeviceOwnership } from '@modules/device/interfaces/device.interface';
import type { IUser } from '@modules/user/interfaces/user.interface';
import { DeviceRemoveByAdminUseCase } from '@modules/device/use-cases/device.remove-by-admin.use-case';

describe('DeviceRemoveByAdminUseCase', () => {
    const deviceService: MockProxy<DeviceService> = mock<DeviceService>();
    const sessionService: MockProxy<SessionService> = mock<SessionService>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();
    const roleService: MockProxy<RoleService> = mock<RoleService>();
    const sessionQueue: MockProxy<SessionQueue> = mock<SessionQueue>();
    const deviceUtil: MockProxy<DeviceUtil> = mock<DeviceUtil>();
    const updatedAt: Date = new Date('2026-01-01T00:00:00.000Z');
    const tx: IDatabaseTransactionClient = mock<IDatabaseTransactionClient>();
    const deviceOwnership: IDeviceOwnership = {
        id: 'device-ownership-1',
        createdAt: updatedAt,
        createdBy: 'user-1',
        updatedAt,
        updatedBy: 'user-1',
        deviceId: 'device-1',
        userId: 'user-1',
        revokedAt: null,
        isRevoked: false,
        revokedById: null,
        lastActiveAt: updatedAt,
        notificationToken: null,
        notificationProvider: null,
        biometricEnabled: false,
        biometricToken: null,
        biometricType: null,
        biometricEnabledAt: null,
        device: {
            id: 'device-1',
            createdAt: updatedAt,
            createdBy: 'user-1',
            updatedAt,
            updatedBy: 'user-1',
            fingerprint: 'abc123def456ghi789jkl012mno345pq',
            name: 'iPhone 12',
            platform: EnumDevicePlatform.ios,
            lastActiveAt: updatedAt,
        },
        user: {
            id: 'user-1',
            createdAt: updatedAt,
            createdBy: 'user-1',
            updatedAt,
            updatedBy: 'user-1',
            deletedAt: null,
            deletedBy: null,
            name: 'Jane Doe',
            username: 'jane',
            photo: null,
        },
        revokedBy: null,
        _count: { sessions: 2 },
    };
    const admin: IUser = {
        id: 'admin-1',
        name: 'Admin One',
        username: 'admin.main',
        isVerified: true,
        verifiedAt: new Date('2026-01-01T00:00:00.000Z'),
        email: 'admin@example.com',
        roleId: 'role-admin',
        password: 'hashed-password',
        passwordExpired: new Date('2026-06-01T00:00:00.000Z'),
        passwordCreated: new Date('2026-01-01T00:00:00.000Z'),
        passwordAttempt: 0,
        signUpAt: new Date('2026-01-01T00:00:00.000Z'),
        signUpFrom: EnumUserSignUpFrom.website,
        signUpWith: EnumUserSignUpWith.credential,
        status: EnumUserStatus.active,
        gender: null,
        countryId: 'country-1',
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
            id: 'role-admin',
            name: 'admin',
            description: null,
            type: EnumRoleType.admin,
            isImmutable: false,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            createdBy: null,
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedBy: null,
            policies: [],
        },
        twoFactor: null,
    };
    let useCase: DeviceRemoveByAdminUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                DeviceRemoveByAdminUseCase,
                { provide: DeviceService, useValue: deviceService },
                { provide: SessionService, useValue: sessionService },
                { provide: DatabaseService, useValue: databaseService },
                { provide: DatabaseUtil, useValue: databaseUtil },
                { provide: HelperDateService, useValue: helperDateService },
                { provide: ActivityLogService, useValue: activityLogService },
                { provide: RoleService, useValue: roleService },
                { provide: SessionQueue, useValue: sessionQueue },
                { provide: DeviceUtil, useValue: deviceUtil },
            ],
        }).compile();

        useCase = module.get(DeviceRemoveByAdminUseCase);
    });

    describe('execute', () => {
        const revokedSessions = [{ id: 'session-1' }];
        const actorMetadata = {
            deviceOwnershipId: 'device-ownership-1',
            deviceId: 'device-1',
            sessionCount: 1,
            targetUserId: 'user-1',
            targetUsername: 'jane',
            timestamp: updatedAt,
        };
        const targetMetadata = {
            deviceOwnershipId: 'device-ownership-1',
            deviceId: 'device-1',
            sessionCount: 1,
            actorUserId: 'admin-1',
            timestamp: updatedAt,
        };
        const actorActivityLog: IActivityLogStaged = {
            action: EnumActivityLogAction.adminDeviceRemove,
            metadata: actorMetadata,
            userId: null,
            createdBy: null,
            workspaceId: null,
        };
        const targetActivityLog: IActivityLogStaged = {
            action: EnumActivityLogAction.userRemoveDeviceByAdmin,
            metadata: targetMetadata,
            userId: 'user-1',
            createdBy: 'admin-1',
            workspaceId: null,
        };
        const userRole: IRole = {
            id: 'role-user',
            name: 'user',
            type: EnumRoleType.user,
            isImmutable: false,
        };

        beforeEach(() => {
            helperDateService.create.mockReturnValue(updatedAt);
            sessionService.revokeByDeviceOwnershipInTx.mockResolvedValue(
                revokedSessions
            );
            deviceService.removeOwnershipInTx.mockResolvedValue(
                deviceOwnership
            );
            databaseService.withTransaction.mockImplementation(
                async fn => fn(tx) as never
            );
        });

        it('checks the rank, removes on one transaction attributed to the admin, purges, and stages the actor and target rows', async () => {
            roleService.getOneByUserId.mockResolvedValue(userRole);
            deviceUtil.mapActivityLogActorMetadata.mockReturnValue(
                actorMetadata
            );
            deviceUtil.mapActivityLogTargetMetadata.mockReturnValue(
                targetMetadata
            );
            activityLogService.prepare
                .mockReturnValueOnce(actorActivityLog)
                .mockReturnValueOnce(targetActivityLog);

            const result = await useCase.execute(
                'user-1',
                'device-ownership-1',
                admin
            );

            expect(result).toEqual({});
            expect(roleService.getOneByUserId).toHaveBeenCalledWith('user-1');
            expect(roleService.assertActorOutranks).toHaveBeenCalledWith(
                EnumRoleType.admin,
                EnumRoleType.user
            );
            expect(
                sessionService.revokeByDeviceOwnershipInTx
            ).toHaveBeenCalledWith(
                tx,
                'user-1',
                'device-ownership-1',
                'admin-1',
                updatedAt
            );
            expect(deviceService.removeOwnershipInTx).toHaveBeenCalledWith(
                tx,
                'user-1',
                'device-ownership-1',
                'admin-1',
                updatedAt
            );
            expect(
                deviceUtil.mapActivityLogTargetMetadata
            ).toHaveBeenCalledWith(deviceOwnership, 'admin-1', 1);
            expect(activityLogService.prepare).toHaveBeenNthCalledWith(1, {
                action: EnumActivityLogAction.adminDeviceRemove,
                metadata: actorMetadata,
            });
            expect(activityLogService.prepare).toHaveBeenNthCalledWith(2, {
                action: EnumActivityLogAction.userRemoveDeviceByAdmin,
                userId: 'user-1',
                createdBy: 'admin-1',
                metadata: targetMetadata,
            });
            expect(sessionQueue.purgeLogins).toHaveBeenCalledWith(
                'user-1',
                revokedSessions
            );
            expect(activityLogService.stagePrepared).toHaveBeenCalledWith([
                actorActivityLog,
                targetActivityLog,
            ]);
        });

        it('stages only the actor row when the admin removes their own device', async () => {
            roleService.getOneByUserId.mockResolvedValue({
                ...userRole,
                type: EnumRoleType.admin,
            });
            deviceUtil.mapActivityLogActorMetadata.mockReturnValue(
                actorMetadata
            );
            activityLogService.prepare.mockReturnValue(actorActivityLog);

            await useCase.execute('admin-1', 'device-ownership-1', admin);

            expect(activityLogService.prepare).toHaveBeenCalledTimes(1);
            expect(
                deviceUtil.mapActivityLogTargetMetadata
            ).not.toHaveBeenCalled();
            expect(activityLogService.stagePrepared).toHaveBeenCalledWith([
                actorActivityLog,
            ]);
        });

        it('answers DeviceNotFoundException from the guarded removal, purging and staging nothing', async () => {
            const notFound = new DeviceNotFoundException();
            roleService.getOneByUserId.mockResolvedValue(userRole);
            deviceService.removeOwnershipInTx.mockRejectedValue(notFound);

            await expect(
                useCase.execute('user-1', 'device-ownership-1', admin)
            ).rejects.toBe(notFound);
            expect(sessionQueue.purgeLogins).not.toHaveBeenCalled();
            expect(activityLogService.stagePrepared).not.toHaveBeenCalled();
        });

        it('answers DeviceNotFoundException when a concurrent removal wins the write', async () => {
            const conflict = new Error('write conflict');
            roleService.getOneByUserId.mockResolvedValue(userRole);
            databaseService.withTransaction.mockRejectedValue(conflict);
            databaseUtil.toException.mockReturnValue(
                new DatabaseWriteConflictException()
            );

            await expect(
                useCase.execute('user-1', 'device-ownership-1', admin)
            ).rejects.toMatchObject({
                constructor: DeviceNotFoundException,
                module: 'device',
                messagePath: 'device.error.notFound',
            });
            expect(databaseUtil.toException).toHaveBeenCalledWith(conflict);
            expect(sessionQueue.purgeLogins).not.toHaveBeenCalled();
            expect(activityLogService.stagePrepared).not.toHaveBeenCalled();
        });

        it('purges and stages nothing when the transaction fails', async () => {
            const cause = new Error('database exploded');
            roleService.getOneByUserId.mockResolvedValue(userRole);
            databaseService.withTransaction.mockRejectedValue(cause);
            databaseUtil.toException.mockReturnValue(null);

            await expect(
                useCase.execute('user-1', 'device-ownership-1', admin)
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: cause,
            });
            expect(sessionQueue.purgeLogins).not.toHaveBeenCalled();
            expect(activityLogService.stagePrepared).not.toHaveBeenCalled();
        });

        it('removes nothing when the actor does not outrank the target', async () => {
            const rankForbidden = new RoleRankForbiddenException();
            roleService.getOneByUserId.mockResolvedValue({
                ...userRole,
                type: EnumRoleType.superAdmin,
            });
            roleService.assertActorOutranks.mockImplementation(() => {
                throw rankForbidden;
            });

            await expect(
                useCase.execute('user-1', 'device-ownership-1', admin)
            ).rejects.toBe(rankForbidden);
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
            expect(sessionQueue.purgeLogins).not.toHaveBeenCalled();
            expect(activityLogService.stagePrepared).not.toHaveBeenCalled();
        });
    });
});
