import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumAppStatusCodeError } from '@app/enums/app.status-code.enum';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import type { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import {
    EnumActivityLogAction,
    EnumDeviceNotificationProvider,
    EnumDevicePlatform,
} from '@generated/prisma-client/client';
import type {
    Device,
    DeviceOwnership,
    Prisma,
} from '@generated/prisma-client/client';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import type { IActivityLogStagedEvent } from '@modules/activity-log/interfaces/activity-log.interface';
import { DeviceDomain } from '@modules/device/domains/device.domain';
import { EnumDeviceStatusCodeError } from '@modules/device/enums/device.status-code.enum';
import { DeviceNotFoundException } from '@modules/device/exceptions/device.not-found.exception';
import type {
    IDeviceIdentity,
    IDeviceOwnership,
    IDeviceRefresh,
} from '@modules/device/interfaces/device.interface';
import { DeviceOwnershipRepository } from '@modules/device/repositories/device.ownership.repository';
import { DeviceRepository } from '@modules/device/repositories/device.repository';
import { DeviceUtil } from '@modules/device/utils/device.util';
import { SessionDomain } from '@modules/session/domains/session.domain';

describe('DeviceDomain', () => {
    const deviceOwnershipRepository: MockProxy<DeviceOwnershipRepository> =
        mock<DeviceOwnershipRepository>();
    const deviceRepository: MockProxy<DeviceRepository> =
        mock<DeviceRepository>();
    const sessionDomain: MockProxy<SessionDomain> = mock<SessionDomain>();
    const deviceUtil: MockProxy<DeviceUtil> = mock<DeviceUtil>();
    const activityLogDomain: MockProxy<ActivityLogDomain> =
        mock<ActivityLogDomain>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();

    const now: Date = new Date('2026-01-01T00:00:00.000Z');
    const tx: IDatabaseTransactionClient = mock<IDatabaseTransactionClient>();
    const device: Device = {
        id: 'device-1',
        createdAt: now,
        createdBy: 'user-1',
        updatedAt: now,
        updatedBy: 'user-1',
        fingerprint: 'abc123def456ghi789jkl012mno345pq',
        name: 'iPhone 12',
        platform: EnumDevicePlatform.ios,
        lastActiveAt: now,
        notificationToken: null,
        notificationProvider: EnumDeviceNotificationProvider.apns,
    };
    const deviceOwnership: DeviceOwnership = {
        id: 'device-ownership-1',
        createdAt: now,
        createdBy: 'user-1',
        updatedAt: now,
        updatedBy: 'user-1',
        deviceId: 'device-1',
        userId: 'user-1',
        revokedAt: null,
        isRevoked: false,
        revokedById: null,
        lastActiveAt: now,
        biometricEnabled: false,
        biometricToken: null,
        biometricType: null,
        biometricEnabledAt: null,
    };
    const deviceOwnershipDetail: IDeviceOwnership = {
        ...deviceOwnership,
        device,
        user: {
            id: 'user-1',
            createdAt: now,
            createdBy: 'user-1',
            updatedAt: now,
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

    let domain: DeviceDomain;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                DeviceDomain,
                {
                    provide: DeviceOwnershipRepository,
                    useValue: deviceOwnershipRepository,
                },
                { provide: DeviceRepository, useValue: deviceRepository },
                { provide: SessionDomain, useValue: sessionDomain },
                { provide: DeviceUtil, useValue: deviceUtil },
                { provide: ActivityLogDomain, useValue: activityLogDomain },
                { provide: DatabaseService, useValue: databaseService },
                { provide: HelperDateService, useValue: helperDateService },
            ],
        }).compile();

        domain = module.get(DeviceDomain);
    });

    describe('getListOffsetByAdmin', () => {
        it('delegates to the ownership repository with the revoked filter', async () => {
            const pagination = { skip: 0, limit: 20, orderBy: [] };
            const page = {
                type: EnumPaginationType.offset as const,
                count: 1,
                perPage: 20,
                hasNext: false,
                hasPrevious: false,
                page: 1,
                totalPage: 1,
                data: [deviceOwnershipDetail],
            };
            deviceOwnershipRepository.findWithPaginationOffsetByAdmin.mockResolvedValue(
                page
            );

            const result = await domain.getListOffsetByAdmin(
                'user-1',
                pagination,
                { isRevoked: { equals: true } }
            );

            expect(result).toBe(page);
            expect(
                deviceOwnershipRepository.findWithPaginationOffsetByAdmin
            ).toHaveBeenCalledWith('user-1', pagination, {
                isRevoked: { equals: true },
            });
        });

        it('passes a null revoked filter when none is given', async () => {
            const pagination: IPaginationQueryOffsetParams<Prisma.DeviceOwnershipWhereInput> =
                { skip: 0, limit: 20, orderBy: [] };
            const page: IResponsePaginationReturn<IDeviceOwnership> = {
                type: EnumPaginationType.offset,
                count: 0,
                perPage: 20,
                page: 1,
                totalPage: 0,
                hasNext: false,
                hasPrevious: false,
                data: [],
            };
            deviceOwnershipRepository.findWithPaginationOffsetByAdmin.mockResolvedValue(
                page
            );

            const result = await domain.getListOffsetByAdmin(
                'user-1',
                pagination
            );

            expect(result).toBe(page);
            expect(
                deviceOwnershipRepository.findWithPaginationOffsetByAdmin
            ).toHaveBeenCalledWith('user-1', pagination, null);
        });
    });

    describe('getListCursor', () => {
        it('delegates to the ownership repository', async () => {
            const pagination = { limit: 20, orderBy: [] };
            const page = {
                type: EnumPaginationType.cursor as const,
                perPage: 20,
                hasNext: false,
                data: [{ ...deviceOwnershipDetail, sessions: [] }],
            };
            deviceOwnershipRepository.findActiveWithPaginationCursor.mockResolvedValue(
                page
            );

            const result = await domain.getListCursor(
                'user-1',
                'session-1',
                pagination
            );

            expect(result).toBe(page);
            expect(
                deviceOwnershipRepository.findActiveWithPaginationCursor
            ).toHaveBeenCalledWith('user-1', 'session-1', pagination);
        });
    });

    describe('getOwnershipsWithNotificationToken', () => {
        it('delegates to the ownership repository', async () => {
            const rows = [{ ...deviceOwnership, device }];
            deviceOwnershipRepository.findTokensByUserId.mockResolvedValue(
                rows
            );

            const result =
                await domain.getOwnershipsWithNotificationToken('user-1');

            expect(result).toBe(rows);
            expect(
                deviceOwnershipRepository.findTokensByUserId
            ).toHaveBeenCalledWith('user-1');
        });
    });

    describe('cleanupNotificationTokens', () => {
        it('clears tokens for the devices found by user and tokens', async () => {
            deviceOwnershipRepository.findDeviceIdsByUserAndTokens.mockResolvedValue(
                ['device-1', 'device-2']
            );
            deviceRepository.clearTokens.mockResolvedValue({ count: 2 });

            const result = await domain.cleanupNotificationTokens('user-1', [
                'token-1',
            ]);

            expect(result).toBe(2);
            expect(
                deviceOwnershipRepository.findDeviceIdsByUserAndTokens
            ).toHaveBeenCalledWith('user-1', ['token-1']);
            expect(deviceRepository.clearTokens).toHaveBeenCalledWith(
                ['device-1', 'device-2'],
                'user-1'
            );
        });
    });

    describe('cleanupStaleNotificationTokens', () => {
        it('clears tokens stale beyond the given threshold', async () => {
            deviceRepository.clearStaleTokens.mockResolvedValue({ count: 5 });

            const result = await domain.cleanupStaleNotificationTokens(1000);

            expect(result).toBe(5);
            expect(deviceRepository.clearStaleTokens).toHaveBeenCalledWith(
                1000
            );
        });
    });

    describe('upsertForLoginInTx', () => {
        it('creates or updates the device then its ownership and reports device newness', async () => {
            const identity: IDeviceIdentity = {
                fingerprint: 'abc123def456ghi789jkl012mno345pq',
                name: null,
                platform: null,
                notificationToken: null,
            };
            deviceRepository.upsertByFingerprintInTx.mockResolvedValue(device);
            deviceOwnershipRepository.upsertForLoginInTx.mockResolvedValue({
                deviceOwnership,
                isNewOwnership: true,
            });

            const result = await domain.upsertForLoginInTx(
                tx,
                'user-1',
                identity,
                EnumDeviceNotificationProvider.apns,
                now
            );

            expect(result).toEqual({
                device,
                deviceOwnership,
                isNewDevice: true,
            });
            expect(
                deviceRepository.upsertByFingerprintInTx
            ).toHaveBeenCalledWith(
                tx,
                'user-1',
                identity,
                EnumDeviceNotificationProvider.apns,
                now
            );
            expect(
                deviceOwnershipRepository.upsertForLoginInTx
            ).toHaveBeenCalledWith(tx, 'user-1', device.id, now);
        });
    });

    describe('clearNotificationInTx', () => {
        it('clears the notification of the live device', async () => {
            deviceOwnershipRepository.findLiveDeviceIdInTx.mockResolvedValue(
                'device-1'
            );

            await domain.clearNotificationInTx(
                tx,
                'user-1',
                'device-ownership-1',
                'admin-1',
                now
            );

            expect(
                deviceRepository.clearNotificationByIdsInTx
            ).toHaveBeenCalledWith(tx, ['device-1'], 'admin-1', now);
        });

        it('skips the clear when the ownership carries no live device', async () => {
            deviceOwnershipRepository.findLiveDeviceIdInTx.mockResolvedValue(
                null
            );

            await expect(
                domain.clearNotificationInTx(
                    tx,
                    'user-1',
                    'device-ownership-1',
                    'admin-1',
                    now
                )
            ).resolves.toBeUndefined();

            expect(
                deviceRepository.clearNotificationByIdsInTx
            ).not.toHaveBeenCalled();
        });
    });

    describe('revokeAllByUserInTx', () => {
        it('clears notification for every revoked device', async () => {
            deviceOwnershipRepository.revokeAllByUserInTx.mockResolvedValue([
                'device-1',
                'device-2',
            ]);

            await domain.revokeAllByUserInTx(tx, 'user-1', 'admin-1', now);

            expect(
                deviceOwnershipRepository.revokeAllByUserInTx
            ).toHaveBeenCalledWith(tx, 'user-1', 'admin-1', now);
            expect(
                deviceRepository.clearNotificationByIdsInTx
            ).toHaveBeenCalledWith(
                tx,
                ['device-1', 'device-2'],
                'admin-1',
                now
            );
        });

        it('skips clearing notifications when no device was revoked', async () => {
            deviceOwnershipRepository.revokeAllByUserInTx.mockResolvedValue([]);

            await domain.revokeAllByUserInTx(tx, 'user-1', 'admin-1', now);

            expect(
                deviceRepository.clearNotificationByIdsInTx
            ).not.toHaveBeenCalled();
        });
    });

    describe('refresh', () => {
        const data: IDeviceRefresh = {
            name: null,
            platform: EnumDevicePlatform.android,
            notificationToken: null,
        };

        it('throws when the ownership does not exist or is inactive', async () => {
            deviceOwnershipRepository.existsActive.mockResolvedValue(false);

            await expect(
                domain.refresh('user-1', 'device-ownership-1', data)
            ).rejects.toMatchObject({
                constructor: DeviceNotFoundException,
                module: 'device',
                statusCode: EnumDeviceStatusCodeError.notFound,
                statusCodeKey:
                    EnumDeviceStatusCodeError[
                        EnumDeviceStatusCodeError.notFound
                    ],
                messagePath: 'device.error.notFound',
            });
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('refreshes the device and stages the refresh activity on success', async () => {
            deviceOwnershipRepository.existsActive.mockResolvedValue(true);
            deviceUtil.resolveNotificationProvider.mockReturnValue(
                EnumDeviceNotificationProvider.fcm
            );
            helperDateService.create.mockReturnValue(now);
            deviceOwnershipRepository.touchInTx.mockResolvedValue('device-1');
            const event: IActivityLogStagedEvent = {
                action: EnumActivityLogAction.userDeviceRefresh,
                metadata: {},
                onError: false,
                userId: null,
                createdBy: null,
                workspaceId: null,
            };
            activityLogDomain.prepare.mockReturnValue(event);
            databaseService.withTransaction.mockImplementation(
                async fn => fn(tx) as never
            );

            await domain.refresh('user-1', 'device-ownership-1', data);

            expect(deviceOwnershipRepository.touchInTx).toHaveBeenCalledWith(
                tx,
                'user-1',
                'device-ownership-1',
                now
            );
            expect(deviceRepository.refreshInTx).toHaveBeenCalledWith(
                tx,
                'device-1',
                data,
                EnumDeviceNotificationProvider.fcm,
                now
            );
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userDeviceRefresh,
            });
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                event,
            ]);
        });

        it('resolves the notification provider from a null platform when none is given', async () => {
            deviceOwnershipRepository.existsActive.mockResolvedValue(true);
            deviceUtil.resolveNotificationProvider.mockReturnValue(null);
            helperDateService.create.mockReturnValue(now);
            deviceOwnershipRepository.touchInTx.mockResolvedValue('device-1');
            activityLogDomain.prepare.mockReturnValue({
                action: EnumActivityLogAction.userDeviceRefresh,
                metadata: {},
                onError: false,
                userId: null,
                createdBy: null,
                workspaceId: null,
            });
            databaseService.withTransaction.mockImplementation(
                async fn => fn(tx) as never
            );

            await domain.refresh('user-1', 'device-ownership-1', {
                name: null,
                platform: null,
                notificationToken: null,
            });

            expect(deviceUtil.resolveNotificationProvider).toHaveBeenCalledWith(
                null
            );
        });

        it('refreshes the device with a null platform and a null notification provider when no platform is given', async () => {
            const omittedPlatform: IDeviceRefresh = {
                name: null,
                platform: null,
                notificationToken: null,
            };
            deviceOwnershipRepository.existsActive.mockResolvedValue(true);
            deviceUtil.resolveNotificationProvider.mockReturnValue(null);
            helperDateService.create.mockReturnValue(now);
            deviceOwnershipRepository.touchInTx.mockResolvedValue('device-1');
            activityLogDomain.prepare.mockReturnValue({
                action: EnumActivityLogAction.userDeviceRefresh,
                metadata: {},
                onError: false,
                userId: null,
                createdBy: null,
                workspaceId: null,
            });
            databaseService.withTransaction.mockImplementation(
                async fn => fn(tx) as never
            );

            await domain.refresh(
                'user-1',
                'device-ownership-1',
                omittedPlatform
            );

            expect(deviceRepository.refreshInTx).toHaveBeenCalledWith(
                tx,
                'device-1',
                { name: null, platform: null, notificationToken: null },
                null,
                now
            );
        });

        it('rethrows an AppBaseException raised inside the transaction unchanged', async () => {
            deviceOwnershipRepository.existsActive.mockResolvedValue(true);
            deviceUtil.resolveNotificationProvider.mockReturnValue(null);
            helperDateService.create.mockReturnValue(now);
            activityLogDomain.prepare.mockReturnValue({
                action: EnumActivityLogAction.userDeviceRefresh,
                metadata: {},
                onError: false,
                userId: null,
                createdBy: null,
                workspaceId: null,
            });
            const notFound = new DeviceNotFoundException();
            databaseService.withTransaction.mockRejectedValue(notFound);

            await expect(
                domain.refresh('user-1', 'device-ownership-1', data)
            ).rejects.toBe(notFound);
        });

        it('wraps a non-application error raised inside the transaction', async () => {
            deviceOwnershipRepository.existsActive.mockResolvedValue(true);
            deviceUtil.resolveNotificationProvider.mockReturnValue(null);
            helperDateService.create.mockReturnValue(now);
            activityLogDomain.prepare.mockReturnValue({
                action: EnumActivityLogAction.userDeviceRefresh,
                metadata: {},
                onError: false,
                userId: null,
                createdBy: null,
                workspaceId: null,
            });
            const cause = new Error('database exploded');
            databaseService.withTransaction.mockRejectedValue(cause);

            await expect(
                domain.refresh('user-1', 'device-ownership-1', data)
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                module: 'app',
                statusCode: EnumAppStatusCodeError.unknown,
                statusCodeKey:
                    EnumAppStatusCodeError[EnumAppStatusCodeError.unknown],
                messagePath: 'http.serverError.internalServerError',
                rawError: cause,
            });
        });
    });

    describe('remove', () => {
        it('throws when the ownership does not exist or is inactive', async () => {
            deviceOwnershipRepository.existsActive.mockResolvedValue(false);

            await expect(
                domain.remove('user-1', 'device-ownership-1')
            ).rejects.toMatchObject({
                constructor: DeviceNotFoundException,
                module: 'device',
                statusCode: EnumDeviceStatusCodeError.notFound,
                statusCodeKey:
                    EnumDeviceStatusCodeError[
                        EnumDeviceStatusCodeError.notFound
                    ],
                messagePath: 'device.error.notFound',
            });
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('revokes sessions, removes the ownership, purges logins, and stages the activity', async () => {
            deviceOwnershipRepository.existsActive.mockResolvedValue(true);
            helperDateService.create.mockReturnValue(now);
            const revokedSessions = [{ id: 'session-1' }];
            const event: IActivityLogStagedEvent = {
                action: EnumActivityLogAction.userRemoveDevice,
                metadata: {},
                onError: false,
                userId: null,
                createdBy: null,
                workspaceId: null,
            };
            sessionDomain.revokeByDeviceOwnershipInTx.mockResolvedValue(
                revokedSessions
            );
            deviceOwnershipRepository.removeOwnershipInTx.mockResolvedValue(
                deviceOwnershipDetail
            );
            deviceUtil.mapActivityLogMetadata.mockReturnValue({
                deviceOwnershipId: 'device-ownership-1',
                deviceId: 'device-1',
                sessionCount: 1,
            });
            activityLogDomain.prepare.mockReturnValue(event);
            databaseService.withTransaction.mockImplementation(
                async fn => fn(tx) as never
            );

            await domain.remove('user-1', 'device-ownership-1');

            expect(
                sessionDomain.revokeByDeviceOwnershipInTx
            ).toHaveBeenCalledWith(
                tx,
                'user-1',
                'device-ownership-1',
                'user-1',
                now
            );
            expect(
                deviceOwnershipRepository.removeOwnershipInTx
            ).toHaveBeenCalledWith(
                tx,
                'user-1',
                'device-ownership-1',
                'user-1',
                now
            );
            expect(
                deviceRepository.clearNotificationByIdsInTx
            ).toHaveBeenCalledWith(tx, ['device-1'], 'user-1', now);
            expect(deviceUtil.mapActivityLogMetadata).toHaveBeenCalledWith(
                deviceOwnershipDetail,
                1
            );
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userRemoveDevice,
                userId: 'user-1',
                createdBy: 'user-1',
                metadata: {
                    deviceOwnershipId: 'device-ownership-1',
                    deviceId: 'device-1',
                    sessionCount: 1,
                },
            });
            expect(sessionDomain.purgeRevokedLogins).toHaveBeenCalledWith(
                'user-1',
                revokedSessions
            );
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                event,
            ]);
        });

        it('rethrows an AppBaseException raised inside the transaction unchanged', async () => {
            deviceOwnershipRepository.existsActive.mockResolvedValue(true);
            helperDateService.create.mockReturnValue(now);
            const notFound = new DeviceNotFoundException();
            databaseService.withTransaction.mockRejectedValue(notFound);

            await expect(
                domain.remove('user-1', 'device-ownership-1')
            ).rejects.toBe(notFound);
        });

        it('wraps a non-application error raised inside the transaction', async () => {
            deviceOwnershipRepository.existsActive.mockResolvedValue(true);
            helperDateService.create.mockReturnValue(now);
            const cause = new Error('database exploded');
            databaseService.withTransaction.mockRejectedValue(cause);

            await expect(
                domain.remove('user-1', 'device-ownership-1')
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                module: 'app',
                statusCode: EnumAppStatusCodeError.unknown,
                statusCodeKey:
                    EnumAppStatusCodeError[EnumAppStatusCodeError.unknown],
                messagePath: 'http.serverError.internalServerError',
                rawError: cause,
            });
        });
    });

    describe('removeByAdmin', () => {
        it('throws when the ownership does not exist or is inactive', async () => {
            deviceOwnershipRepository.existsActive.mockResolvedValue(false);

            await expect(
                domain.removeByAdmin('user-1', 'device-ownership-1', 'admin-1')
            ).rejects.toMatchObject({
                constructor: DeviceNotFoundException,
                module: 'device',
                statusCode: EnumDeviceStatusCodeError.notFound,
                statusCodeKey:
                    EnumDeviceStatusCodeError[
                        EnumDeviceStatusCodeError.notFound
                    ],
                messagePath: 'device.error.notFound',
            });
        });

        it('stages only the admin actor event when the admin removes their own device', async () => {
            deviceOwnershipRepository.existsActive.mockResolvedValue(true);
            helperDateService.create.mockReturnValue(now);
            const revokedSessions = [{ id: 'session-1' }];
            const actorEvent: IActivityLogStagedEvent = {
                action: EnumActivityLogAction.adminDeviceRemove,
                metadata: {},
                onError: false,
                userId: null,
                createdBy: null,
                workspaceId: null,
            };
            sessionDomain.revokeByDeviceOwnershipInTx.mockResolvedValue(
                revokedSessions
            );
            deviceOwnershipRepository.removeOwnershipInTx.mockResolvedValue(
                deviceOwnershipDetail
            );
            deviceUtil.mapActivityLogActorMetadata.mockReturnValue({
                deviceOwnershipId: 'device-ownership-1',
                deviceId: 'device-1',
                sessionCount: 1,
                targetUserId: 'user-1',
                targetUsername: 'jane',
                timestamp: now,
            });
            activityLogDomain.prepare.mockReturnValue(actorEvent);
            databaseService.withTransaction.mockImplementation(
                async fn => fn(tx) as never
            );

            await domain.removeByAdmin(
                'user-1',
                'device-ownership-1',
                'user-1'
            );

            expect(activityLogDomain.prepare).toHaveBeenCalledTimes(1);
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.adminDeviceRemove,
                metadata: {
                    deviceOwnershipId: 'device-ownership-1',
                    deviceId: 'device-1',
                    sessionCount: 1,
                    targetUserId: 'user-1',
                    targetUsername: 'jane',
                    timestamp: now,
                },
            });
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                actorEvent,
            ]);
            expect(
                deviceUtil.mapActivityLogTargetMetadata
            ).not.toHaveBeenCalled();
        });

        it('stages both the actor and the target-user events when an admin removes another user device', async () => {
            deviceOwnershipRepository.existsActive.mockResolvedValue(true);
            helperDateService.create.mockReturnValue(now);
            const revokedSessions = [{ id: 'session-1' }];
            const actorEvent: IActivityLogStagedEvent = {
                action: EnumActivityLogAction.adminDeviceRemove,
                metadata: {},
                onError: false,
                userId: null,
                createdBy: null,
                workspaceId: null,
            };
            const targetEvent: IActivityLogStagedEvent = {
                action: EnumActivityLogAction.userRemoveDeviceByAdmin,
                metadata: {},
                onError: false,
                userId: 'user-1',
                createdBy: 'admin-1',
                workspaceId: null,
            };
            sessionDomain.revokeByDeviceOwnershipInTx.mockResolvedValue(
                revokedSessions
            );
            deviceOwnershipRepository.removeOwnershipInTx.mockResolvedValue(
                deviceOwnershipDetail
            );
            deviceUtil.mapActivityLogActorMetadata.mockReturnValue({
                deviceOwnershipId: 'device-ownership-1',
                deviceId: 'device-1',
                sessionCount: 1,
                targetUserId: 'user-1',
                targetUsername: 'jane',
                timestamp: now,
            });
            deviceUtil.mapActivityLogTargetMetadata.mockReturnValue({
                deviceOwnershipId: 'device-ownership-1',
                deviceId: 'device-1',
                sessionCount: 1,
                actorUserId: 'admin-1',
                timestamp: now,
            });
            activityLogDomain.prepare
                .mockReturnValueOnce(actorEvent)
                .mockReturnValueOnce(targetEvent);
            databaseService.withTransaction.mockImplementation(
                async fn => fn(tx) as never
            );

            await domain.removeByAdmin(
                'user-1',
                'device-ownership-1',
                'admin-1'
            );

            expect(
                sessionDomain.revokeByDeviceOwnershipInTx
            ).toHaveBeenCalledWith(
                tx,
                'user-1',
                'device-ownership-1',
                'admin-1',
                now
            );
            expect(
                deviceRepository.clearNotificationByIdsInTx
            ).toHaveBeenCalledWith(tx, ['device-1'], 'admin-1', now);
            expect(activityLogDomain.prepare).toHaveBeenNthCalledWith(1, {
                action: EnumActivityLogAction.adminDeviceRemove,
                metadata: {
                    deviceOwnershipId: 'device-ownership-1',
                    deviceId: 'device-1',
                    sessionCount: 1,
                    targetUserId: 'user-1',
                    targetUsername: 'jane',
                    timestamp: now,
                },
            });
            expect(activityLogDomain.prepare).toHaveBeenNthCalledWith(2, {
                action: EnumActivityLogAction.userRemoveDeviceByAdmin,
                userId: 'user-1',
                createdBy: 'admin-1',
                metadata: {
                    deviceOwnershipId: 'device-ownership-1',
                    deviceId: 'device-1',
                    sessionCount: 1,
                    actorUserId: 'admin-1',
                    timestamp: now,
                },
            });
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                actorEvent,
                targetEvent,
            ]);
            expect(sessionDomain.purgeRevokedLogins).toHaveBeenCalledWith(
                'user-1',
                revokedSessions
            );
        });

        it('rethrows an AppBaseException raised inside the transaction unchanged', async () => {
            deviceOwnershipRepository.existsActive.mockResolvedValue(true);
            helperDateService.create.mockReturnValue(now);
            const notFound = new DeviceNotFoundException();
            databaseService.withTransaction.mockRejectedValue(notFound);

            await expect(
                domain.removeByAdmin('user-1', 'device-ownership-1', 'admin-1')
            ).rejects.toBe(notFound);
        });

        it('wraps a non-application error raised inside the transaction', async () => {
            deviceOwnershipRepository.existsActive.mockResolvedValue(true);
            helperDateService.create.mockReturnValue(now);
            const cause = new Error('database exploded');
            databaseService.withTransaction.mockRejectedValue(cause);

            await expect(
                domain.removeByAdmin('user-1', 'device-ownership-1', 'admin-1')
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                module: 'app',
                statusCode: EnumAppStatusCodeError.unknown,
                statusCodeKey:
                    EnumAppStatusCodeError[EnumAppStatusCodeError.unknown],
                messagePath: 'http.serverError.internalServerError',
                rawError: cause,
            });
        });
    });
});
