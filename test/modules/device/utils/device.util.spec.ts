import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import {
    EnumDeviceNotificationProvider,
    EnumDevicePlatform,
} from '@generated/prisma-client/client';
import type { IDeviceOwnership } from '@modules/device/interfaces/device.interface';
import { DeviceUtil } from '@modules/device/utils/device.util';

describe('DeviceUtil', () => {
    const updatedAt: Date = new Date('2026-01-01T00:00:00.000Z');
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
            notificationToken: null,
            notificationProvider: EnumDeviceNotificationProvider.apns,
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

    let util: DeviceUtil;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [DeviceUtil],
        }).compile();

        util = module.get(DeviceUtil);
    });

    describe('resolveNotificationProvider', () => {
        it('maps android to fcm', () => {
            expect(
                util.resolveNotificationProvider(EnumDevicePlatform.android)
            ).toBe(EnumDeviceNotificationProvider.fcm);
        });

        it('maps ios to apns', () => {
            expect(
                util.resolveNotificationProvider(EnumDevicePlatform.ios)
            ).toBe(EnumDeviceNotificationProvider.apns);
        });

        it('maps web to null', () => {
            expect(
                util.resolveNotificationProvider(EnumDevicePlatform.web)
            ).toBeNull();
        });

        it('maps a null platform to null', () => {
            expect(util.resolveNotificationProvider(null)).toBeNull();
        });
    });

    describe('mapActivityLogMetadata', () => {
        it('projects the ownership id, device id, and session count', () => {
            const result = util.mapActivityLogMetadata(deviceOwnership, 3);

            expect(result).toEqual({
                deviceOwnershipId: 'device-ownership-1',
                deviceId: 'device-1',
                sessionCount: 3,
            });
        });
    });

    describe('mapActivityLogActorMetadata', () => {
        it('extends the base metadata with the target user and timestamp', () => {
            const result = util.mapActivityLogActorMetadata(deviceOwnership, 3);

            expect(result).toEqual({
                deviceOwnershipId: 'device-ownership-1',
                deviceId: 'device-1',
                sessionCount: 3,
                targetUserId: 'user-1',
                targetUsername: 'jane',
                timestamp: updatedAt,
            });
        });
    });

    describe('mapActivityLogTargetMetadata', () => {
        it('extends the base metadata with the actor user and timestamp', () => {
            const result = util.mapActivityLogTargetMetadata(
                deviceOwnership,
                'admin-1',
                3
            );

            expect(result).toEqual({
                deviceOwnershipId: 'device-ownership-1',
                deviceId: 'device-1',
                sessionCount: 3,
                actorUserId: 'admin-1',
                timestamp: updatedAt,
            });
        });
    });
});
