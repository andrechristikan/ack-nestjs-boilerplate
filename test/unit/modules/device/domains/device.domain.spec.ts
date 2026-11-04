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
    EnumDeviceNotificationProvider,
    EnumDevicePlatform,
} from '@generated/prisma-client/client';
import type {
    Device,
    DeviceOwnership,
    Prisma,
} from '@generated/prisma-client/client';
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

describe('DeviceDomain', () => {
    const deviceOwnershipRepository: MockProxy<DeviceOwnershipRepository> =
        mock<DeviceOwnershipRepository>();
    const deviceRepository: MockProxy<DeviceRepository> =
        mock<DeviceRepository>();
    const deviceUtil: MockProxy<DeviceUtil> = mock<DeviceUtil>();
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
                { provide: DeviceUtil, useValue: deviceUtil },
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
            const pagination = {
                limit: 20,
                orderBy: [],
                firstPageAt: new Date('2026-01-01T00:00:00.000Z'),
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

    describe('getNotificationTokens', () => {
        it('getNotificationTokens returns the notification token of each ownership that has one', async () => {
            deviceOwnershipRepository.findTokensByUserId.mockResolvedValue([
                'a',
                'b',
            ]);

            const result = await domain.getNotificationTokens('user-1');

            expect(result).toEqual(['a', 'b']);
            expect(
                deviceOwnershipRepository.findTokensByUserId
            ).toHaveBeenCalledWith('user-1');
        });
    });

    describe('cleanupNotificationTokens', () => {
        it('clears the given tokens on the ownership rows of the user', async () => {
            deviceOwnershipRepository.clearTokens.mockResolvedValue({
                count: 2,
            });

            const result = await domain.cleanupNotificationTokens('user-1', [
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

            const result = await domain.cleanupStaleNotificationTokens(1000);

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
            platform: null,
            notificationToken: 'token-1',
        };

        it('creates or updates the device by fingerprint without token fields then the ownership with the token and reports newness', async () => {
            deviceRepository.upsertByFingerprintInTx.mockResolvedValue(device);
            deviceOwnershipRepository.upsertActiveInTx.mockResolvedValue({
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

            await domain.upsertForLoginInTx(
                tx,
                'user-1',
                identity,
                EnumDeviceNotificationProvider.apns,
                now
            );

            expect(
                deviceOwnershipRepository.clearTokenFromOtherUsersInTx
            ).toHaveBeenCalledWith(tx, 'token-1', 'user-1');
            expect(
                deviceOwnershipRepository.upsertActiveInTx
            ).toHaveBeenCalledBefore(
                deviceOwnershipRepository.clearTokenFromOtherUsersInTx
            );
        });

        it('clears no other row when the login carries no token', async () => {
            deviceRepository.upsertByFingerprintInTx.mockResolvedValue(device);
            deviceOwnershipRepository.upsertActiveInTx.mockResolvedValue({
                deviceOwnership,
                isNewOwnership: false,
            });

            await domain.upsertForLoginInTx(
                tx,
                'user-1',
                { ...identity, notificationToken: null },
                null,
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

            const result = await domain.upsertForLoginInTx(
                tx,
                'user-1',
                identity,
                EnumDeviceNotificationProvider.apns,
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

            const first = await domain.upsertForLoginInTx(
                tx,
                'user-1',
                identity,
                EnumDeviceNotificationProvider.apns,
                now
            );
            const second = await domain.upsertForLoginInTx(
                tx,
                'user-2',
                otherIdentity,
                EnumDeviceNotificationProvider.fcm,
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

            await domain.clearNotificationInTx(
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
                domain.clearNotificationInTx(
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
            await domain.revokeAllByUserInTx(tx, 'user-1', 'admin-1', now);

            expect(
                deviceOwnershipRepository.revokeAllByUserInTx
            ).toHaveBeenCalledWith(tx, 'user-1', 'admin-1', now);
        });
    });

    describe('refresh', () => {
        const data: IDeviceRefresh = {
            name: null,
            platform: EnumDevicePlatform.android,
            notificationToken: null,
        };

        it('throws DeviceNotFoundException when the guarded refresh matches no live ownership, writing no device row', async () => {
            deviceUtil.resolveNotificationProvider.mockReturnValue(null);
            helperDateService.create.mockReturnValue(now);
            deviceOwnershipRepository.refreshInTx.mockResolvedValue(null);
            databaseService.withTransaction.mockImplementation(
                async fn => fn(tx) as never
            );

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
            expect(deviceRepository.refreshInTx).not.toHaveBeenCalled();
            expect(
                deviceOwnershipRepository.clearTokenFromOtherUsersInTx
            ).not.toHaveBeenCalled();
        });

        it('refreshes the ownership token and the device on success', async () => {
            deviceUtil.resolveNotificationProvider.mockReturnValue(
                EnumDeviceNotificationProvider.fcm
            );
            helperDateService.create.mockReturnValue(now);
            deviceOwnershipRepository.refreshInTx.mockResolvedValue('device-1');
            databaseService.withTransaction.mockImplementation(
                async fn => fn(tx) as never
            );

            await domain.refresh('user-1', 'device-ownership-1', data);

            expect(deviceOwnershipRepository.refreshInTx).toHaveBeenCalledWith(
                tx,
                'user-1',
                'device-ownership-1',
                data,
                EnumDeviceNotificationProvider.fcm,
                now
            );
            expect(deviceRepository.refreshInTx).toHaveBeenCalledWith(
                tx,
                'device-1',
                data,
                now
            );
        });

        it('clears the refreshed token from every other user ownership row in the same transaction', async () => {
            deviceUtil.resolveNotificationProvider.mockReturnValue(
                EnumDeviceNotificationProvider.fcm
            );
            helperDateService.create.mockReturnValue(now);
            deviceOwnershipRepository.refreshInTx.mockResolvedValue('device-1');
            databaseService.withTransaction.mockImplementation(
                async fn => fn(tx) as never
            );

            await domain.refresh('user-1', 'device-ownership-1', {
                ...data,
                notificationToken: 'token-9',
            });

            expect(
                deviceOwnershipRepository.clearTokenFromOtherUsersInTx
            ).toHaveBeenCalledWith(tx, 'token-9', 'user-1');
        });

        it('clears no other row when the refresh carries no token', async () => {
            deviceUtil.resolveNotificationProvider.mockReturnValue(null);
            helperDateService.create.mockReturnValue(now);
            deviceOwnershipRepository.refreshInTx.mockResolvedValue('device-1');
            databaseService.withTransaction.mockImplementation(
                async fn => fn(tx) as never
            );

            await domain.refresh('user-1', 'device-ownership-1', data);

            expect(
                deviceOwnershipRepository.clearTokenFromOtherUsersInTx
            ).not.toHaveBeenCalled();
        });

        it('resolves the notification provider from a null platform when none is given', async () => {
            deviceUtil.resolveNotificationProvider.mockReturnValue(null);
            helperDateService.create.mockReturnValue(now);
            deviceOwnershipRepository.refreshInTx.mockResolvedValue('device-1');
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
            deviceUtil.resolveNotificationProvider.mockReturnValue(null);
            helperDateService.create.mockReturnValue(now);
            deviceOwnershipRepository.refreshInTx.mockResolvedValue('device-1');
            databaseService.withTransaction.mockImplementation(
                async fn => fn(tx) as never
            );

            await domain.refresh(
                'user-1',
                'device-ownership-1',
                omittedPlatform
            );

            expect(deviceOwnershipRepository.refreshInTx).toHaveBeenCalledWith(
                tx,
                'user-1',
                'device-ownership-1',
                { name: null, platform: null, notificationToken: null },
                null,
                now
            );
            expect(deviceRepository.refreshInTx).toHaveBeenCalledWith(
                tx,
                'device-1',
                { name: null, platform: null, notificationToken: null },
                now
            );
        });

        it('rethrows an AppBaseException raised inside the transaction unchanged', async () => {
            deviceUtil.resolveNotificationProvider.mockReturnValue(null);
            helperDateService.create.mockReturnValue(now);
            const notFound = new DeviceNotFoundException();
            databaseService.withTransaction.mockRejectedValue(notFound);

            await expect(
                domain.refresh('user-1', 'device-ownership-1', data)
            ).rejects.toBe(notFound);
        });

        it('wraps a non-application error raised inside the transaction', async () => {
            deviceUtil.resolveNotificationProvider.mockReturnValue(null);
            helperDateService.create.mockReturnValue(now);
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

    describe('removeOwnershipInTx', () => {
        it('revokes the ownership on the given transaction and returns the row', async () => {
            deviceOwnershipRepository.removeOwnershipInTx.mockResolvedValue(
                deviceOwnershipDetail
            );

            const result = await domain.removeOwnershipInTx(
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
                now
            );
        });

        it('throws DeviceNotFoundException when the guarded revoke matches no live ownership, as on a second removal', async () => {
            deviceOwnershipRepository.removeOwnershipInTx.mockResolvedValue(
                null
            );

            await expect(
                domain.removeOwnershipInTx(
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
                statusCodeKey:
                    EnumDeviceStatusCodeError[
                        EnumDeviceStatusCodeError.notFound
                    ],
                messagePath: 'device.error.notFound',
            });
        });
    });
});
