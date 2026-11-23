import type { IActivityLogCreateManyEffect } from '@modules/activity-log/interfaces/activity-log.interface';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { Duration } from 'luxon';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumAppStatusCodeError } from '@app/enums/app.status-code.enum';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import {
    EnumActivityLogProcess,
    EnumActivityLogQueue,
} from '@modules/activity-log/enums/activity-log.enum';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import type { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import {
    EnumActivityLogAction,
    EnumDeviceNotificationProvider,
    EnumDevicePlatform,
} from '@generated/prisma-client/client';
import type { Device, DeviceOwnership } from '@generated/prisma-client/client';
import { DeviceService } from '@modules/device/services/device.service';
import { EnumDeviceStatusCodeError } from '@modules/device/enums/device.status-code.enum';
import { DeviceNotFoundException } from '@modules/device/exceptions/device.not-found.exception';
import type {
    IDeviceIdentity,
    IDeviceOwnership,
    IDeviceRefresh,
} from '@modules/device/interfaces/device.interface';
import { DeviceOwnershipRepository } from '@modules/device/repositories/device.ownership.repository';
import { DeviceRepository } from '@modules/device/repositories/device.repository';
import {
    buildApiKeyContext,
    buildAuthJwtAccessContext,
} from '@test/unit/helpers/test.unit.request.helper';

describe('DeviceService', () => {
    const deviceOwnershipRepository: MockProxy<DeviceOwnershipRepository> =
        mock<DeviceOwnershipRepository>();
    const deviceRepository: MockProxy<DeviceRepository> =
        mock<DeviceRepository>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();
    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();

    const configGet = vi.fn<(key: string) => number | undefined>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });
    const idleTimeoutInMs = 604800000;
    const idleDuration = Duration.fromObject({ milliseconds: idleTimeoutInMs });

    const now: Date = new Date('2026-01-01T00:00:00.000Z');
    const idleSince: Date = new Date('2025-12-25T00:00:00.000Z');
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
        notificationToken: null,
        notificationProvider: null,
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

    let service: DeviceService;

    beforeEach(async () => {
        vi.resetAllMocks();
        configGet.mockReturnValue(idleTimeoutInMs);
        helperDateService.backward.mockReturnValue(idleSince);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                DeviceService,
                { provide: ConfigService, useValue: configService },
                {
                    provide: DeviceOwnershipRepository,
                    useValue: deviceOwnershipRepository,
                },
                { provide: DeviceRepository, useValue: deviceRepository },
                { provide: OutboxService, useValue: outboxService },
                { provide: ActivityLogService, useValue: activityLogService },
                { provide: DatabaseUtil, useValue: databaseUtil },
                { provide: HelperDateService, useValue: helperDateService },
            ],
        }).compile();

        service = module.get(DeviceService);
    });

    describe('getListOffsetByAdmin', () => {
        it('delegates to the ownership repository with the revoked filter and the scope predicate', async () => {
            const additionalWhere = { userId: 'user-1' };
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
            helperDateService.create.mockReturnValue(now);
            deviceOwnershipRepository.findWithPaginationOffsetByAdmin.mockResolvedValue(
                page
            );

            const result = await service.getListOffsetByAdmin(
                'user-1',
                pagination,
                { isRevoked: { equals: true } },
                additionalWhere
            );

            expect(result).toBe(page);
            expect(
                deviceOwnershipRepository.findWithPaginationOffsetByAdmin
            ).toHaveBeenCalledWith(
                'user-1',
                pagination,
                { isRevoked: { equals: true } },
                idleSince,
                additionalWhere
            );
            expect(helperDateService.backward).toHaveBeenCalledWith(
                now,
                idleDuration
            );
        });

        it('passes a null revoked filter when none is given', async () => {
            const pagination: IPaginationQueryOffsetParams = {
                skip: 0,
                limit: 20,
                orderBy: [],
            };
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

            const result = await service.getListOffsetByAdmin(
                'user-1',
                pagination,
                null,
                null
            );

            expect(result).toBe(page);
            expect(
                deviceOwnershipRepository.findWithPaginationOffsetByAdmin
            ).toHaveBeenCalledWith('user-1', pagination, null, idleSince, null);
        });
    });

    describe('getListCursor', () => {
        it('delegates to the ownership repository', async () => {
            const pagination = {
                limit: 20,
                orderBy: [],
                fingerprint: 'aaaaaaaaaaaaaaaa',
            };
            const page = {
                type: EnumPaginationType.cursor as const,
                perPage: 20,
                hasNext: false,
                data: [{ ...deviceOwnershipDetail, sessions: [] }],
            };
            helperDateService.create.mockReturnValue(now);
            deviceOwnershipRepository.findActiveWithPaginationCursor.mockResolvedValue(
                page
            );

            const result = await service.getListCursor(
                'user-1',
                'session-1',
                pagination
            );

            expect(result).toBe(page);
            expect(
                deviceOwnershipRepository.findActiveWithPaginationCursor
            ).toHaveBeenCalledWith(
                'user-1',
                'session-1',
                pagination,
                idleSince
            );
            expect(helperDateService.backward).toHaveBeenCalledWith(
                now,
                idleDuration
            );
        });
    });

    describe('getNotificationTokens', () => {
        it('returns the notification token of each ownership that has one', async () => {
            deviceOwnershipRepository.findTokensByUserId.mockResolvedValue([
                'a',
                'b',
            ]);

            helperDateService.create.mockReturnValue(now);

            const result = await service.getNotificationTokens('user-1');

            expect(result).toEqual(['a', 'b']);
            expect(
                deviceOwnershipRepository.findTokensByUserId
            ).toHaveBeenCalledWith('user-1', now, idleSince);
        });
    });

    describe('clearNotificationsWithoutLiveSession', () => {
        it('clears the tokens of the user devices left without a live session', async () => {
            deviceOwnershipRepository.clearTokensWithoutLiveSession.mockResolvedValue(
                { count: 1 }
            );

            await service.clearNotificationsWithoutLiveSession('user-1', now);

            expect(
                deviceOwnershipRepository.clearTokensWithoutLiveSession
            ).toHaveBeenCalledWith('user-1', now, idleSince);
            expect(helperDateService.backward).toHaveBeenCalledWith(
                now,
                idleDuration
            );
        });
    });

    describe('cleanupNotificationTokens', () => {
        it('clears the given tokens on the ownership rows of the user', async () => {
            deviceOwnershipRepository.clearTokens.mockResolvedValue({
                count: 2,
            });

            const result = await service.cleanupNotificationTokens('user-1', [
                'token-1',
            ]);

            expect(result).toBe(2);
            expect(deviceOwnershipRepository.clearTokens).toHaveBeenCalledWith(
                'user-1',
                ['token-1']
            );
        });
    });

    describe('cleanupStaleNotificationTokens', () => {
        it('clears ownership tokens stale beyond the given threshold', async () => {
            deviceOwnershipRepository.clearStaleTokens.mockResolvedValue({
                count: 5,
            });

            const result = await service.cleanupStaleNotificationTokens(1000);

            expect(result).toBe(5);
            expect(
                deviceOwnershipRepository.clearStaleTokens
            ).toHaveBeenCalledWith(1000);
        });
    });

    describe('upsertForLoginInTx', () => {
        const identity: IDeviceIdentity = {
            fingerprint: 'abc123def456ghi789jkl012mno345pq',
            name: null,
            platform: EnumDevicePlatform.ios,
            notificationToken: 'token-1',
        };

        it('creates or updates the device by fingerprint without token fields then the ownership with the token and reports newness', async () => {
            deviceRepository.upsertByFingerprintInTx.mockResolvedValue(device);
            deviceOwnershipRepository.upsertActiveInTx.mockResolvedValue({
                deviceOwnership,
                isNewOwnership: true,
            });

            const result = await service.upsertForLoginInTx(
                tx,
                'user-1',
                identity,
                now
            );

            expect(result).toEqual({
                device,
                deviceOwnership,
                isNewDevice: true,
            });
            expect(
                deviceRepository.upsertByFingerprintInTx
            ).toHaveBeenCalledWith(tx, 'user-1', identity, now);
            expect(
                deviceOwnershipRepository.upsertActiveInTx
            ).toHaveBeenCalledWith(
                tx,
                device.id,
                'user-1',
                'token-1',
                EnumDeviceNotificationProvider.apns,
                now
            );
        });

        it('clears the pushed token from every other user ownership row after writing it', async () => {
            deviceRepository.upsertByFingerprintInTx.mockResolvedValue(device);
            deviceOwnershipRepository.upsertActiveInTx.mockResolvedValue({
                deviceOwnership,
                isNewOwnership: false,
            });

            await service.upsertForLoginInTx(tx, 'user-1', identity, now);

            expect(
                deviceOwnershipRepository.clearTokenFromOtherUsersInTx
            ).toHaveBeenCalledWith(tx, 'token-1', 'user-1');
            expect(
                deviceOwnershipRepository.upsertActiveInTx
            ).toHaveBeenCalledBefore(
                deviceOwnershipRepository.clearTokenFromOtherUsersInTx
            );
        });

        it('passes a null token and a null provider to the ownership upsert when the login carries no token', async () => {
            deviceRepository.upsertByFingerprintInTx.mockResolvedValue(device);
            deviceOwnershipRepository.upsertActiveInTx.mockResolvedValue({
                deviceOwnership,
                isNewOwnership: false,
            });

            await service.upsertForLoginInTx(
                tx,
                'user-1',
                { ...identity, notificationToken: null },
                now
            );

            expect(
                deviceOwnershipRepository.upsertActiveInTx
            ).toHaveBeenCalledWith(tx, device.id, 'user-1', null, null, now);
        });

        it('clears no other row when the login carries no token', async () => {
            deviceRepository.upsertByFingerprintInTx.mockResolvedValue(device);
            deviceOwnershipRepository.upsertActiveInTx.mockResolvedValue({
                deviceOwnership,
                isNewOwnership: false,
            });

            await service.upsertForLoginInTx(
                tx,
                'user-1',
                { ...identity, notificationToken: null },
                now
            );

            expect(
                deviceOwnershipRepository.clearTokenFromOtherUsersInTx
            ).not.toHaveBeenCalled();
        });

        it('reports a known ownership as not a new device', async () => {
            deviceRepository.upsertByFingerprintInTx.mockResolvedValue(device);
            deviceOwnershipRepository.upsertActiveInTx.mockResolvedValue({
                deviceOwnership,
                isNewOwnership: false,
            });

            const result = await service.upsertForLoginInTx(
                tx,
                'user-1',
                identity,
                now
            );

            expect(result.isNewDevice).toBe(false);
        });

        it('writes one device and an ownership row per user with that user own token when two users share a fingerprint', async () => {
            const otherOwnership: DeviceOwnership = {
                ...deviceOwnership,
                id: 'device-ownership-2',
                userId: 'user-2',
            };
            const otherIdentity: IDeviceIdentity = {
                ...identity,
                platform: EnumDevicePlatform.android,
                notificationToken: 'token-2',
            };
            deviceRepository.upsertByFingerprintInTx.mockResolvedValue(device);
            deviceOwnershipRepository.upsertActiveInTx
                .mockResolvedValueOnce({
                    deviceOwnership,
                    isNewOwnership: true,
                })
                .mockResolvedValueOnce({
                    deviceOwnership: otherOwnership,
                    isNewOwnership: true,
                });

            const first = await service.upsertForLoginInTx(
                tx,
                'user-1',
                identity,
                now
            );
            const second = await service.upsertForLoginInTx(
                tx,
                'user-2',
                otherIdentity,
                now
            );

            expect(first.device.id).toBe(second.device.id);
            expect(first.deviceOwnership.id).not.toBe(
                second.deviceOwnership.id
            );
            expect(
                deviceOwnershipRepository.upsertActiveInTx
            ).toHaveBeenNthCalledWith(
                1,
                tx,
                'device-1',
                'user-1',
                'token-1',
                EnumDeviceNotificationProvider.apns,
                now
            );
            expect(
                deviceOwnershipRepository.upsertActiveInTx
            ).toHaveBeenNthCalledWith(
                2,
                tx,
                'device-1',
                'user-2',
                'token-2',
                EnumDeviceNotificationProvider.fcm,
                now
            );
        });
    });

    describe('getOtherOwnershipIdsByDeviceInTx', () => {
        it("reads the other users' ownership ids of the device on the caller transaction", async () => {
            const ids = ['device-ownership-2', 'device-ownership-3'];
            deviceOwnershipRepository.findOtherIdsByDeviceInTx.mockResolvedValue(
                ids
            );

            const result = await service.getOtherOwnershipIdsByDeviceInTx(
                tx,
                'device-1',
                'user-1'
            );

            expect(
                deviceOwnershipRepository.findOtherIdsByDeviceInTx
            ).toHaveBeenCalledWith(tx, 'device-1', 'user-1');
            expect(result).toEqual(ids);
        });
    });

    describe('clearNotificationInTx', () => {
        it('clears the notification token on the live ownership', async () => {
            deviceOwnershipRepository.clearNotificationInTx.mockResolvedValue(
                true
            );

            await service.clearNotificationInTx(
                tx,
                'user-1',
                'device-ownership-1',
                'admin-1',
                now
            );

            expect(
                deviceOwnershipRepository.clearNotificationInTx
            ).toHaveBeenCalledWith(
                tx,
                'user-1',
                'device-ownership-1',
                'admin-1',
                now
            );
        });

        it('resolves when the ownership is not live', async () => {
            deviceOwnershipRepository.clearNotificationInTx.mockResolvedValue(
                false
            );

            await expect(
                service.clearNotificationInTx(
                    tx,
                    'user-1',
                    'device-ownership-1',
                    'admin-1',
                    now
                )
            ).resolves.toBeUndefined();
        });
    });

    describe('revokeAllByUserInTx', () => {
        it('revokes every live ownership of the user', async () => {
            await service.revokeAllByUserInTx(tx, 'user-1', 'admin-1', now);

            expect(
                deviceOwnershipRepository.revokeAllByUserInTx
            ).toHaveBeenCalledWith(tx, 'user-1', 'admin-1', now);
        });
    });

    describe('touchOwnershipInTx', () => {
        it('stamps the ownership, then its device, on the given tx', async () => {
            deviceOwnershipRepository.touchInTx.mockResolvedValue('device-1');

            await service.touchOwnershipInTx(tx, 'user-1', 'ownership-1', now);

            expect(deviceOwnershipRepository.touchInTx).toHaveBeenCalledWith(
                tx,
                'user-1',
                'ownership-1',
                now
            );
            expect(deviceRepository.touchInTx).toHaveBeenCalledWith(
                tx,
                'device-1',
                now
            );
        });

        it('stamps no device and throws nothing when the ownership touch matches no live ownership', async () => {
            deviceOwnershipRepository.touchInTx.mockResolvedValue(null);

            await expect(
                service.touchOwnershipInTx(tx, 'user-1', 'ownership-1', now)
            ).resolves.toBeUndefined();

            expect(deviceRepository.touchInTx).not.toHaveBeenCalled();
        });
    });

    describe('refresh', () => {
        const requestContext: IRequestContext = {
            requestLog: {
                userAgent: {
                    ua: null,
                    browser: null,
                    cpu: null,
                    device: null,
                    engine: null,
                    os: null,
                },
                ipAddress: '127.0.0.1',
                geoLocation: null,
            },
            language: 'en',
        };
        const apiKeyContext = buildApiKeyContext();
        const authContext = buildAuthJwtAccessContext('user-1');
        const entry: IActivityLogCreateManyEffect = {
            queue: EnumActivityLogQueue.activityLog,
            name: EnumActivityLogProcess.createMany,
            data: { rows: [] },
            priority: EnumQueuePriority.low,
            idempotencyKey: null,
        };

        const data: IDeviceRefresh = {
            name: null,
            platform: EnumDevicePlatform.android,
            notificationToken: null,
        };

        it('throws DeviceNotFoundException when the guarded refresh matches no live ownership, writing no device row', async () => {
            helperDateService.create.mockReturnValue(now);
            deviceOwnershipRepository.refreshInTx.mockResolvedValue(null);
            outboxService.withTransaction.mockImplementation(
                async fn => fn(tx) as never
            );

            await expect(
                service.refresh(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'device-ownership-1',
                    data
                )
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
            expect(deviceRepository.refreshInTx).not.toHaveBeenCalled();
            expect(
                deviceOwnershipRepository.clearTokenFromOtherUsersInTx
            ).not.toHaveBeenCalled();
        });

        it('adds the userDeviceRefresh entry from the passed context on the same tx after the writes', async () => {
            helperDateService.create.mockReturnValue(now);
            deviceOwnershipRepository.refreshInTx.mockResolvedValue('device-1');
            activityLogService.recordEffect.mockReturnValue(entry);
            outboxService.withTransaction.mockImplementation(
                async fn => fn(tx) as never
            );

            await service.refresh(
                requestContext,
                apiKeyContext,
                authContext,
                'device-ownership-1',
                data
            );

            expect(activityLogService.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                null,
                { action: EnumActivityLogAction.userDeviceRefresh }
            );
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, entry);
        });

        it('adds no entry when the guarded refresh matches no live ownership', async () => {
            helperDateService.create.mockReturnValue(now);
            deviceOwnershipRepository.refreshInTx.mockResolvedValue(null);
            outboxService.withTransaction.mockImplementation(
                async fn => fn(tx) as never
            );

            await expect(
                service.refresh(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'device-ownership-1',
                    data
                )
            ).rejects.toBeInstanceOf(DeviceNotFoundException);
            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });

        it('refreshes the ownership token and the device on success', async () => {
            helperDateService.create.mockReturnValue(now);
            deviceOwnershipRepository.refreshInTx.mockResolvedValue('device-1');
            outboxService.withTransaction.mockImplementation(
                async fn => fn(tx) as never
            );

            const refreshed: IDeviceRefresh = {
                ...data,
                notificationToken: 'token-9',
            };

            await service.refresh(
                requestContext,
                apiKeyContext,
                authContext,
                'device-ownership-1',
                refreshed
            );

            expect(deviceOwnershipRepository.refreshInTx).toHaveBeenCalledWith(
                tx,
                'user-1',
                'device-ownership-1',
                refreshed,
                EnumDeviceNotificationProvider.fcm,
                now
            );
            expect(deviceRepository.refreshInTx).toHaveBeenCalledWith(
                tx,
                'device-1',
                refreshed,
                now
            );
        });

        it('clears the refreshed token from every other user ownership row in the same transaction', async () => {
            helperDateService.create.mockReturnValue(now);
            deviceOwnershipRepository.refreshInTx.mockResolvedValue('device-1');
            outboxService.withTransaction.mockImplementation(
                async fn => fn(tx) as never
            );

            await service.refresh(
                requestContext,
                apiKeyContext,
                authContext,
                'device-ownership-1',
                {
                    ...data,
                    notificationToken: 'token-9',
                }
            );

            expect(
                deviceOwnershipRepository.clearTokenFromOtherUsersInTx
            ).toHaveBeenCalledWith(tx, 'token-9', 'user-1');
        });

        it('clears no other row when the refresh carries no token', async () => {
            helperDateService.create.mockReturnValue(now);
            deviceOwnershipRepository.refreshInTx.mockResolvedValue('device-1');
            outboxService.withTransaction.mockImplementation(
                async fn => fn(tx) as never
            );

            await service.refresh(
                requestContext,
                apiKeyContext,
                authContext,
                'device-ownership-1',
                data
            );

            expect(
                deviceOwnershipRepository.clearTokenFromOtherUsersInTx
            ).not.toHaveBeenCalled();
        });

        it('resolves the notification provider from the platform and the token', async () => {
            helperDateService.create.mockReturnValue(now);
            deviceOwnershipRepository.refreshInTx.mockResolvedValue('device-1');
            outboxService.withTransaction.mockImplementation(
                async fn => fn(tx) as never
            );

            await service.refresh(
                requestContext,
                apiKeyContext,
                authContext,
                'device-ownership-1',
                {
                    ...data,
                    notificationToken: 'token-9',
                }
            );

            expect(deviceOwnershipRepository.refreshInTx).toHaveBeenCalledWith(
                tx,
                'user-1',
                'device-ownership-1',
                { ...data, notificationToken: 'token-9' },
                EnumDeviceNotificationProvider.fcm,
                now
            );
        });

        it('writes a null name, a null token, and a null provider as given when the refresh clears them', async () => {
            helperDateService.create.mockReturnValue(now);
            deviceOwnershipRepository.refreshInTx.mockResolvedValue('device-1');
            outboxService.withTransaction.mockImplementation(
                async fn => fn(tx) as never
            );

            await service.refresh(
                requestContext,
                apiKeyContext,
                authContext,
                'device-ownership-1',
                data
            );

            expect(deviceOwnershipRepository.refreshInTx).toHaveBeenCalledWith(
                tx,
                'user-1',
                'device-ownership-1',
                {
                    name: null,
                    platform: EnumDevicePlatform.android,
                    notificationToken: null,
                },
                null,
                now
            );
            expect(deviceRepository.refreshInTx).toHaveBeenCalledWith(
                tx,
                'device-1',
                {
                    name: null,
                    platform: EnumDevicePlatform.android,
                    notificationToken: null,
                },
                now
            );
        });

        it('rethrows an AppBaseException raised inside the transaction unchanged', async () => {
            helperDateService.create.mockReturnValue(now);
            const notFound = new DeviceNotFoundException();
            outboxService.withTransaction.mockRejectedValue(notFound);

            await expect(
                service.refresh(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'device-ownership-1',
                    data
                )
            ).rejects.toBe(notFound);
        });

        it('answers DeviceNotFoundException on a write conflict', async () => {
            helperDateService.create.mockReturnValue(now);
            const conflict = new Error('conflict');
            outboxService.withTransaction.mockRejectedValue(conflict);
            databaseUtil.toException.mockReturnValue(
                new DatabaseWriteConflictException()
            );

            await expect(
                service.refresh(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'device-ownership-1',
                    data
                )
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
            expect(databaseUtil.toException).toHaveBeenCalledWith(conflict);
        });

        it('wraps a non-application error raised inside the transaction', async () => {
            helperDateService.create.mockReturnValue(now);
            const cause = new Error('database exploded');
            outboxService.withTransaction.mockRejectedValue(cause);
            databaseUtil.toException.mockReturnValue(null);

            await expect(
                service.refresh(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'device-ownership-1',
                    data
                )
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

    describe('removeOwnershipInTx', () => {
        it('revokes the ownership on the given transaction and returns the row', async () => {
            deviceOwnershipRepository.removeOwnershipInTx.mockResolvedValue(
                deviceOwnershipDetail
            );

            const additionalWhere = { userId: 'user-1' };

            const result = await service.removeOwnershipInTx(
                tx,
                'user-1',
                'device-ownership-1',
                'admin-1',
                now,
                additionalWhere
            );

            expect(result).toBe(deviceOwnershipDetail);
            expect(
                deviceOwnershipRepository.removeOwnershipInTx
            ).toHaveBeenCalledWith(
                tx,
                'user-1',
                'device-ownership-1',
                'admin-1',
                now,
                idleSince,
                additionalWhere
            );
            expect(helperDateService.backward).toHaveBeenCalledWith(
                now,
                idleDuration
            );
        });

        it('throws DeviceNotFoundException when the guarded revoke matches no live ownership, as on a second removal', async () => {
            deviceOwnershipRepository.removeOwnershipInTx.mockResolvedValue(
                null
            );

            await expect(
                service.removeOwnershipInTx(
                    tx,
                    'user-1',
                    'device-ownership-1',
                    'admin-1',
                    now,
                    null
                )
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
    });

    describe('resolveNotificationProvider', () => {
        it('maps android to fcm', () => {
            expect(
                service['resolveNotificationProvider'](
                    EnumDevicePlatform.android,
                    'token-1'
                )
            ).toBe(EnumDeviceNotificationProvider.fcm);
        });

        it('maps ios to apns', () => {
            expect(
                service['resolveNotificationProvider'](
                    EnumDevicePlatform.ios,
                    'token-1'
                )
            ).toBe(EnumDeviceNotificationProvider.apns);
        });

        it('maps web to null', () => {
            expect(
                service['resolveNotificationProvider'](
                    EnumDevicePlatform.web,
                    'token-1'
                )
            ).toBeNull();
        });

        it.each([
            EnumDevicePlatform.android,
            EnumDevicePlatform.ios,
            EnumDevicePlatform.web,
        ])('maps a null token on platform %s to null', platform => {
            expect(
                service['resolveNotificationProvider'](platform, null)
            ).toBeNull();
        });
    });
});
