import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { RequestStoreService } from '@common/request/services/request.store.service';
import {
    EnumActivityLogAction,
    EnumDevicePlatform,
    EnumRoleType,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
    Prisma,
} from '@generated/prisma-client/client';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import type { IActivityLogStaged } from '@modules/activity-log/interfaces/activity-log.interface';
import { DeviceDomain } from '@modules/device/domains/device.domain';
import { DeviceNotFoundException } from '@modules/device/exceptions/device.not-found.exception';
import { DeviceUtil } from '@modules/device/utils/device.util';
import { RoleDomain } from '@modules/role/domains/role.domain';
import { RoleRankForbiddenException } from '@modules/role/exceptions/role.rank-forbidden.exception';
import type { IRole } from '@modules/role/interfaces/role.interface';
import { SessionDomain } from '@modules/session/domains/session.domain';
import { SessionQueue } from '@modules/session/queues/session.queue';
import type { DeviceAdminListRequestDto } from '@modules/device/dtos/request/device.admin-list.request.dto';
import type { DeviceRefreshRequestDto } from '@modules/device/dtos/request/device.refresh.request.dto';
import type { DeviceSharedListRequestDto } from '@modules/device/dtos/request/device.shared-list.request.dto';
import type {
    IDeviceOwnership,
    IDeviceOwnershipWithSession,
} from '@modules/device/interfaces/device.interface';
import type { IUser } from '@modules/user/interfaces/user.interface';
import { DeviceHttpService } from '@modules/device/services/device.http.service';
import {
    DeviceCursorAvailableOrderBy,
    DeviceDefaultAvailableOrderBy,
} from '@modules/device/constants/device.list.constant';

describe('DeviceHttpService', () => {
    const deviceDomain: MockProxy<DeviceDomain> = mock<DeviceDomain>();
    const sessionDomain: MockProxy<SessionDomain> = mock<SessionDomain>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const activityLogDomain: MockProxy<ActivityLogDomain> =
        mock<ActivityLogDomain>();
    const roleDomain: MockProxy<RoleDomain> = mock<RoleDomain>();
    const sessionQueue: MockProxy<SessionQueue> = mock<SessionQueue>();
    const deviceUtil: MockProxy<DeviceUtil> = mock<DeviceUtil>();
    const paginationQueryUtil: MockProxy<PaginationQueryUtil> =
        mock<PaginationQueryUtil>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();

    const updatedAt: Date = new Date('2026-01-01T00:00:00.000Z');
    const tx: IDatabaseTransactionClient = mock<IDatabaseTransactionClient>();
    const params = { skip: 0, limit: 20, orderBy: [] };
    const storePatch = { perPage: 20 };
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
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            createdBy: null,
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedBy: null,
            policies: [],
        },
        twoFactor: null,
    };

    let service: DeviceHttpService;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                DeviceHttpService,
                { provide: DeviceDomain, useValue: deviceDomain },
                { provide: SessionDomain, useValue: sessionDomain },
                { provide: DatabaseService, useValue: databaseService },
                { provide: HelperDateService, useValue: helperDateService },
                { provide: ActivityLogDomain, useValue: activityLogDomain },
                { provide: RoleDomain, useValue: roleDomain },
                { provide: SessionQueue, useValue: sessionQueue },
                { provide: DeviceUtil, useValue: deviceUtil },
                {
                    provide: PaginationQueryUtil,
                    useValue: paginationQueryUtil,
                },
                {
                    provide: RequestStoreService,
                    useValue: requestStoreService,
                },
            ],
        }).compile();

        service = module.get(DeviceHttpService);
    });

    describe('getListOffsetByAdmin', () => {
        it('enriches each row with a resting isCurrentDevice and merges the isRevoked filter', async () => {
            const query: DeviceAdminListRequestDto = { isRevoked: true };
            paginationQueryUtil.offset.mockReturnValue({ params, storePatch });
            paginationQueryUtil.equalBoolean.mockReturnValue({
                where: { isRevoked: { equals: true } },
                storeFilter: { isRevoked: true },
            });
            deviceDomain.getListOffsetByAdmin.mockResolvedValue({
                type: EnumPaginationType.offset,
                count: 1,
                perPage: 20,
                hasNext: false,
                hasPrevious: false,
                page: 1,
                totalPage: 1,
                data: [deviceOwnership],
            });

            const result = await service.getListOffsetByAdmin('user-1', query);

            expect(result.data).toEqual([
                {
                    ...deviceOwnership,
                    activeSessionCount: 2,
                    isCurrentDevice: false,
                },
            ]);
            expect(paginationQueryUtil.offset).toHaveBeenCalledWith(query, {
                availableOrderBy: DeviceDefaultAvailableOrderBy,
            });
            expect(paginationQueryUtil.equalBoolean).toHaveBeenCalledWith(
                Prisma.DeviceOwnershipScalarFieldEnum.isRevoked,
                true
            );
            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                { ...storePatch, filters: { isRevoked: true } }
            );
            expect(deviceDomain.getListOffsetByAdmin).toHaveBeenCalledWith(
                'user-1',
                params,
                { isRevoked: { equals: true } }
            );
        });

        it('merges an empty filter object when isRevoked is not given', async () => {
            const query: DeviceAdminListRequestDto = {};
            paginationQueryUtil.offset.mockReturnValue({ params, storePatch });
            paginationQueryUtil.equalBoolean.mockReturnValue(null);
            deviceDomain.getListOffsetByAdmin.mockResolvedValue({
                type: EnumPaginationType.offset,
                count: 0,
                perPage: 20,
                hasNext: false,
                hasPrevious: false,
                page: 1,
                totalPage: 1,
                data: [],
            });

            await service.getListOffsetByAdmin('user-1', query);

            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                { ...storePatch, filters: {} }
            );
            expect(deviceDomain.getListOffsetByAdmin).toHaveBeenCalledWith(
                'user-1',
                params,
                undefined
            );
        });
    });

    describe('getListCursor', () => {
        it('marks isCurrentDevice true when the row carries a live session', async () => {
            const query: DeviceSharedListRequestDto = {};
            const withSession: IDeviceOwnershipWithSession = {
                ...deviceOwnership,
                sessions: [{ id: 'session-1' }],
            };
            paginationQueryUtil.cursor.mockReturnValue({ params, storePatch });
            deviceDomain.getListCursor.mockResolvedValue({
                type: EnumPaginationType.cursor,
                perPage: 20,
                hasNext: false,
                data: [withSession],
            });

            const result = await service.getListCursor(
                'user-1',
                'session-1',
                query
            );

            expect(result.data).toEqual([
                {
                    ...withSession,
                    activeSessionCount: 2,
                    isCurrentDevice: true,
                },
            ]);
            expect(paginationQueryUtil.cursor).toHaveBeenCalledWith(query, {
                availableOrderBy: DeviceCursorAvailableOrderBy,
            });
            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                storePatch
            );
            expect(deviceDomain.getListCursor).toHaveBeenCalledWith(
                'user-1',
                'session-1',
                params
            );
        });

        it('marks isCurrentDevice false when the row carries no live session', async () => {
            const query: DeviceSharedListRequestDto = {};
            const withoutSession: IDeviceOwnershipWithSession = {
                ...deviceOwnership,
                sessions: [],
            };
            paginationQueryUtil.cursor.mockReturnValue({ params, storePatch });
            deviceDomain.getListCursor.mockResolvedValue({
                type: EnumPaginationType.cursor,
                perPage: 20,
                hasNext: false,
                data: [withoutSession],
            });

            const result = await service.getListCursor(
                'user-1',
                'session-1',
                query
            );

            expect(result.data).toEqual([
                {
                    ...withoutSession,
                    activeSessionCount: 2,
                    isCurrentDevice: false,
                },
            ]);
        });
    });

    describe('refresh', () => {
        const refreshActivityLog: IActivityLogStaged = {
            action: EnumActivityLogAction.userDeviceRefresh,
            metadata: {},
            userId: null,
            createdBy: null,
            workspaceId: null,
        };

        it('forwards the refresh body to the domain, stages the refresh activity after it, and returns an empty response', async () => {
            const body: DeviceRefreshRequestDto = { name: 'iPhone 13' };
            const calls: string[] = [];
            activityLogDomain.prepare.mockReturnValue(refreshActivityLog);
            deviceDomain.refresh.mockImplementation(async () => {
                calls.push('refresh');
            });
            activityLogDomain.stagePrepared.mockImplementation(() => {
                calls.push('stage');
            });

            const result = await service.refresh(
                'user-1',
                'device-ownership-1',
                body
            );

            expect(result).toEqual({});
            expect(deviceDomain.refresh).toHaveBeenCalledWith(
                'user-1',
                'device-ownership-1',
                { name: 'iPhone 13', platform: null, notificationToken: null }
            );
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userDeviceRefresh,
            });
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                refreshActivityLog,
            ]);
            expect(calls).toEqual(['refresh', 'stage']);
        });

        it('passes null for the name when the body omits it', async () => {
            const body: DeviceRefreshRequestDto = {
                platform: EnumDevicePlatform.ios,
                notificationToken: 'token-1',
            };
            activityLogDomain.prepare.mockReturnValue(refreshActivityLog);
            deviceDomain.refresh.mockResolvedValue(undefined);

            await service.refresh('user-1', 'device-ownership-1', body);

            expect(deviceDomain.refresh).toHaveBeenCalledWith(
                'user-1',
                'device-ownership-1',
                {
                    name: null,
                    platform: EnumDevicePlatform.ios,
                    notificationToken: 'token-1',
                }
            );
        });

        it('stages nothing when the domain refresh throws', async () => {
            const notFound = new DeviceNotFoundException();
            activityLogDomain.prepare.mockReturnValue(refreshActivityLog);
            deviceDomain.refresh.mockRejectedValue(notFound);

            await expect(
                service.refresh('user-1', 'device-ownership-1', {})
            ).rejects.toBe(notFound);
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
        });
    });

    describe('remove', () => {
        const revokedSessions = [{ id: 'session-1' }];
        const metadata = {
            deviceOwnershipId: 'device-ownership-1',
            deviceId: 'device-1',
            sessionCount: 1,
        };
        const activityLog: IActivityLogStaged = {
            action: EnumActivityLogAction.userRemoveDevice,
            metadata,
            userId: 'user-1',
            createdBy: 'user-1',
            workspaceId: null,
        };

        it('revokes the sessions then removes the ownership on one transaction attributed to the owner, purges after commit, and stages the owner activity', async () => {
            const calls: string[] = [];
            deviceDomain.assertActive.mockResolvedValue(undefined);
            helperDateService.create.mockReturnValue(updatedAt);
            sessionDomain.revokeByDeviceOwnershipInTx.mockImplementation(
                async () => {
                    calls.push('revokeSessions');

                    return revokedSessions;
                }
            );
            deviceDomain.removeOwnershipInTx.mockImplementation(async () => {
                calls.push('removeOwnership');

                return deviceOwnership;
            });
            databaseService.withTransaction.mockImplementation(async fn => {
                calls.push('begin');
                const value = await fn(tx);
                calls.push('commit');

                return value as never;
            });
            sessionQueue.purgeLogins.mockImplementation(async () => {
                calls.push('purge');
            });
            deviceUtil.mapActivityLogMetadata.mockReturnValue(metadata);
            activityLogDomain.prepare.mockReturnValue(activityLog);

            const result = await service.remove('user-1', 'device-ownership-1');

            expect(result).toEqual({});
            expect(deviceDomain.assertActive).toHaveBeenCalledWith(
                'user-1',
                'device-ownership-1'
            );
            expect(
                sessionDomain.revokeByDeviceOwnershipInTx
            ).toHaveBeenCalledWith(
                tx,
                'user-1',
                'device-ownership-1',
                'user-1',
                updatedAt
            );
            expect(deviceDomain.removeOwnershipInTx).toHaveBeenCalledWith(
                tx,
                'user-1',
                'device-ownership-1',
                'user-1',
                updatedAt
            );
            expect(calls).toEqual([
                'begin',
                'revokeSessions',
                'removeOwnership',
                'commit',
                'purge',
            ]);
            expect(deviceUtil.mapActivityLogMetadata).toHaveBeenCalledWith(
                deviceOwnership,
                1
            );
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userRemoveDevice,
                userId: 'user-1',
                createdBy: 'user-1',
                metadata,
            });
            expect(sessionQueue.purgeLogins).toHaveBeenCalledWith(
                'user-1',
                revokedSessions
            );
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                activityLog,
            ]);
        });

        it('opens no transaction when the ownership is not active', async () => {
            const notFound = new DeviceNotFoundException();
            deviceDomain.assertActive.mockRejectedValue(notFound);

            await expect(
                service.remove('user-1', 'device-ownership-1')
            ).rejects.toBe(notFound);
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
            expect(sessionQueue.purgeLogins).not.toHaveBeenCalled();
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
        });

        it('purges and stages nothing when the transaction fails', async () => {
            const cause = new Error('database exploded');
            deviceDomain.assertActive.mockResolvedValue(undefined);
            helperDateService.create.mockReturnValue(updatedAt);
            databaseService.withTransaction.mockRejectedValue(cause);

            await expect(
                service.remove('user-1', 'device-ownership-1')
            ).rejects.toBe(cause);
            expect(sessionQueue.purgeLogins).not.toHaveBeenCalled();
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
        });
    });

    describe('removeByAdmin', () => {
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
        };

        beforeEach(() => {
            deviceDomain.assertActive.mockResolvedValue(undefined);
            helperDateService.create.mockReturnValue(updatedAt);
            sessionDomain.revokeByDeviceOwnershipInTx.mockResolvedValue(
                revokedSessions
            );
            deviceDomain.removeOwnershipInTx.mockResolvedValue(deviceOwnership);
            databaseService.withTransaction.mockImplementation(
                async fn => fn(tx) as never
            );
        });

        it('checks the rank, removes on one transaction attributed to the admin, purges, and stages the actor and target rows', async () => {
            roleDomain.getOneByUserId.mockResolvedValue(userRole);
            deviceUtil.mapActivityLogActorMetadata.mockReturnValue(
                actorMetadata
            );
            deviceUtil.mapActivityLogTargetMetadata.mockReturnValue(
                targetMetadata
            );
            activityLogDomain.prepare
                .mockReturnValueOnce(actorActivityLog)
                .mockReturnValueOnce(targetActivityLog);

            const result = await service.removeByAdmin(
                'user-1',
                'device-ownership-1',
                admin
            );

            expect(result).toEqual({});
            expect(roleDomain.getOneByUserId).toHaveBeenCalledWith('user-1');
            expect(roleDomain.assertActorOutranks).toHaveBeenCalledWith(
                EnumRoleType.admin,
                EnumRoleType.user
            );
            expect(deviceDomain.assertActive).toHaveBeenCalledWith(
                'user-1',
                'device-ownership-1'
            );
            expect(
                sessionDomain.revokeByDeviceOwnershipInTx
            ).toHaveBeenCalledWith(
                tx,
                'user-1',
                'device-ownership-1',
                'admin-1',
                updatedAt
            );
            expect(deviceDomain.removeOwnershipInTx).toHaveBeenCalledWith(
                tx,
                'user-1',
                'device-ownership-1',
                'admin-1',
                updatedAt
            );
            expect(
                deviceUtil.mapActivityLogTargetMetadata
            ).toHaveBeenCalledWith(deviceOwnership, 'admin-1', 1);
            expect(activityLogDomain.prepare).toHaveBeenNthCalledWith(1, {
                action: EnumActivityLogAction.adminDeviceRemove,
                metadata: actorMetadata,
            });
            expect(activityLogDomain.prepare).toHaveBeenNthCalledWith(2, {
                action: EnumActivityLogAction.userRemoveDeviceByAdmin,
                userId: 'user-1',
                createdBy: 'admin-1',
                metadata: targetMetadata,
            });
            expect(sessionQueue.purgeLogins).toHaveBeenCalledWith(
                'user-1',
                revokedSessions
            );
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                actorActivityLog,
                targetActivityLog,
            ]);
        });

        it('stages only the actor row when the admin removes their own device', async () => {
            roleDomain.getOneByUserId.mockResolvedValue({
                ...userRole,
                type: EnumRoleType.admin,
            });
            deviceUtil.mapActivityLogActorMetadata.mockReturnValue(
                actorMetadata
            );
            activityLogDomain.prepare.mockReturnValue(actorActivityLog);

            await service.removeByAdmin('admin-1', 'device-ownership-1', admin);

            expect(activityLogDomain.prepare).toHaveBeenCalledTimes(1);
            expect(
                deviceUtil.mapActivityLogTargetMetadata
            ).not.toHaveBeenCalled();
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                actorActivityLog,
            ]);
        });

        it('opens no transaction when the ownership is not active', async () => {
            const notFound = new DeviceNotFoundException();
            roleDomain.getOneByUserId.mockResolvedValue(userRole);
            deviceDomain.assertActive.mockRejectedValue(notFound);

            await expect(
                service.removeByAdmin('user-1', 'device-ownership-1', admin)
            ).rejects.toBe(notFound);
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
            expect(sessionQueue.purgeLogins).not.toHaveBeenCalled();
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
        });

        it('removes nothing when the actor does not outrank the target', async () => {
            const rankForbidden = new RoleRankForbiddenException();
            roleDomain.getOneByUserId.mockResolvedValue({
                ...userRole,
                type: EnumRoleType.superAdmin,
            });
            roleDomain.assertActorOutranks.mockImplementation(() => {
                throw rankForbidden;
            });

            await expect(
                service.removeByAdmin('user-1', 'device-ownership-1', admin)
            ).rejects.toBe(rankForbidden);
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
            expect(sessionQueue.purgeLogins).not.toHaveBeenCalled();
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
        });
    });
});
