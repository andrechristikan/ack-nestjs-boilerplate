import type { IActivityLogCreateManyEffect } from '@modules/activity-log/interfaces/activity-log.interface';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import { buildDeferred } from '@test/unit/helpers/test.unit.deferred.helper';
import {
    TestUnitKitConfigValues,
    TestUnitKitProviders,
} from '@test/unit/helpers/test.unit.kit.helper';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
import {
    EnumActivityLogProcess,
    EnumActivityLogQueue,
} from '@modules/activity-log/enums/activity-log.enum';
import { OutboxService } from '@common/outbox/services/outbox.service';
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
    const activityLogQueue: MockProxy<ActivityLogQueue> =
        mock<ActivityLogQueue>();
    const idleTimeoutInMs = 604800000;

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

    beforeAll(() => {
        vi.useFakeTimers();
        vi.setSystemTime(now);
    });

    afterAll(() => {
        vi.useRealTimers();
    });

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                DeviceService,
                {
                    provide: ConfigService,
                    useValue: buildConfigService({
                        ...TestUnitKitConfigValues,
                        'session.idleTimeoutInMs': idleTimeoutInMs,
                    }),
                },
                {
                    provide: DeviceOwnershipRepository,
                    useValue: deviceOwnershipRepository,
                },
                { provide: DeviceRepository, useValue: deviceRepository },
                { provide: OutboxService, useValue: outboxService },
                { provide: ActivityLogQueue, useValue: activityLogQueue },
                ...TestUnitKitProviders,
            ],
        }).compile();

        service = module.get(DeviceService);
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

            const result = await service.getListOffsetByAdmin(
                'user-1',
                pagination,
                { isRevoked: { equals: true } }
            );

            expect(result).toBe(page);
            expect(
                deviceOwnershipRepository.findWithPaginationOffsetByAdmin
            ).toHaveBeenCalledWith(
                'user-1',
                pagination,
                { isRevoked: { equals: true } },
                idleSince
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
                pagination
            );

            expect(result).toBe(page);
            expect(
                deviceOwnershipRepository.findWithPaginationOffsetByAdmin
            ).toHaveBeenCalledWith('user-1', pagination, null, idleSince);
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
        });
    });

    describe('getNotificationTokens', () => {
        it('returns the notification token of each ownership that has one', async () => {
            deviceOwnershipRepository.findTokensByUserId.mockResolvedValue([
                'a',
                'b',
            ]);

            const result = await service.getNotificationTokens('user-1');

            expect(result).toEqual(['a', 'b']);
            expect(
                deviceOwnershipRepository.findTokensByUserId
            ).toHaveBeenCalledWith('user-1', now, idleSince);
        });
    });

    describe('cleanupNotificationTokensInTx', () => {
        it('clears the given tokens on the ownership rows of the user on the given tx', async () => {
            deviceOwnershipRepository.clearTokensInTx.mockResolvedValue();

            await service.cleanupNotificationTokensInTx(tx, 'user-1', [
                'token-1',
            ]);

            expect(
                deviceOwnershipRepository.clearTokensInTx
            ).toHaveBeenCalledWith(tx, 'user-1', ['token-1']);
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

        it('creates or updates the device by fingerprint without token fields then the ownership with the token and reports newness and the other users ownership ids', async () => {
            deviceRepository.upsertByFingerprintInTx.mockResolvedValue(device);
            deviceOwnershipRepository.upsertActiveInTx.mockResolvedValue({
                deviceOwnership,
                isNewOwnership: true,
            });
            deviceOwnershipRepository.findOtherIdsByDeviceInTx.mockResolvedValue(
                ['device-ownership-2', 'device-ownership-3']
            );

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
                otherOwnershipIds: ['device-ownership-2', 'device-ownership-3'],
            });
            expect(
                deviceOwnershipRepository.findOtherIdsByDeviceInTx
            ).toHaveBeenCalledWith(tx, device.id, 'user-1');
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

        it('clears the pushed token from every other user ownership row', async () => {
            deviceRepository.upsertByFingerprintInTx.mockResolvedValue(device);
            deviceOwnershipRepository.upsertActiveInTx.mockResolvedValue({
                deviceOwnership,
                isNewOwnership: false,
            });

            await service.upsertForLoginInTx(tx, 'user-1', identity, now);

            expect(
                deviceOwnershipRepository.clearTokenFromOtherUsersInTx
            ).toHaveBeenCalledWith(tx, 'token-1', 'user-1');
        });

        it('clears the pushed token from other users while the device upsert is still pending', async () => {
            const upsert = buildDeferred<Device>();
            deviceRepository.upsertByFingerprintInTx.mockReturnValue(
                upsert.promise
            );
            deviceOwnershipRepository.upsertActiveInTx.mockResolvedValue({
                deviceOwnership,
                isNewOwnership: false,
            });

            const pending = service.upsertForLoginInTx(
                tx,
                'user-1',
                identity,
                now
            );

            expect(
                deviceOwnershipRepository.clearTokenFromOtherUsersInTx
            ).toHaveBeenCalledWith(tx, 'token-1', 'user-1');
            expect(
                deviceOwnershipRepository.upsertActiveInTx
            ).not.toHaveBeenCalled();

            upsert.resolve(device);
            await pending;

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

    describe('refreshInTx', () => {
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
            deviceOwnershipRepository.refreshInTx.mockResolvedValue(null);

            await expect(
                service.refreshInTx(
                    tx,
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
            });
            expect(deviceRepository.refreshInTx).not.toHaveBeenCalled();
            expect(
                deviceOwnershipRepository.clearTokenFromOtherUsersInTx
            ).not.toHaveBeenCalled();
        });

        it('adds the userDeviceRefreshed entry from the passed context on the same tx after the writes', async () => {
            deviceOwnershipRepository.refreshInTx.mockResolvedValue('device-1');
            activityLogQueue.recordEffect.mockReturnValue(entry);

            await service.refreshInTx(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                'device-ownership-1',
                data
            );

            expect(activityLogQueue.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                null,
                { action: EnumActivityLogAction.userDeviceRefreshed }
            );
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, entry);
        });

        it('adds no entry when the guarded refresh matches no live ownership', async () => {
            deviceOwnershipRepository.refreshInTx.mockResolvedValue(null);

            await expect(
                service.refreshInTx(
                    tx,
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'device-ownership-1',
                    data
                )
            ).rejects.toMatchObject({
                module: 'device',
                statusCode: EnumDeviceStatusCodeError.notFound,
            });
            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });

        it('refreshes the ownership token and the device on success', async () => {
            deviceOwnershipRepository.refreshInTx.mockResolvedValue('device-1');

            const refreshed: IDeviceRefresh = {
                ...data,
                notificationToken: 'token-9',
            };

            await service.refreshInTx(
                tx,
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
            deviceOwnershipRepository.refreshInTx.mockResolvedValue('device-1');

            await service.refreshInTx(
                tx,
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

        it('clears the refreshed token from other users while the device refresh is still pending', async () => {
            const started = buildDeferred<void>();
            const release = buildDeferred<void>();
            deviceOwnershipRepository.refreshInTx.mockResolvedValue('device-1');
            deviceRepository.refreshInTx.mockImplementation(() => {
                started.resolve();

                return release.promise;
            });

            const pending = service.refreshInTx(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                'device-ownership-1',
                { ...data, notificationToken: 'token-9' }
            );
            await started.promise;

            expect(
                deviceOwnershipRepository.clearTokenFromOtherUsersInTx
            ).toHaveBeenCalledWith(tx, 'token-9', 'user-1');
            expect(outboxService.addInTx).not.toHaveBeenCalled();

            release.resolve();
            await pending;

            expect(outboxService.addInTx).toHaveBeenCalledTimes(1);
        });

        it('clears no other row when the refresh carries no token', async () => {
            deviceOwnershipRepository.refreshInTx.mockResolvedValue('device-1');

            await service.refreshInTx(
                tx,
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
            deviceOwnershipRepository.refreshInTx.mockResolvedValue('device-1');

            await service.refreshInTx(
                tx,
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
            deviceOwnershipRepository.refreshInTx.mockResolvedValue('device-1');

            await service.refreshInTx(
                tx,
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
    });

    describe('removeOwnershipInTx', () => {
        it('revokes the ownership on the given transaction and returns the row', async () => {
            deviceOwnershipRepository.removeOwnershipInTx.mockResolvedValue(
                deviceOwnershipDetail
            );

            const result = await service.removeOwnershipInTx(
                tx,
                'user-1',
                'device-ownership-1',
                'admin-1',
                now
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
                idleSince
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
                    now
                )
            ).rejects.toMatchObject({
                constructor: DeviceNotFoundException,
                module: 'device',
                statusCode: EnumDeviceStatusCodeError.notFound,
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
