import { describe, expect, it } from 'vitest';

import {
    EnumDeviceNotificationProvider,
    EnumDevicePlatform,
} from '@generated/prisma-client';
import type { IDeviceOwnership } from '@modules/device/interfaces/device.interface';
import { DeviceUtil } from '@modules/device/utils/device.util';

describe('DeviceUtil', () => {
    const util = new DeviceUtil();
    const now = new Date('2026-01-01T00:00:00.000Z');

    describe('resolveNotificationProvider', () => {
        it.each([
            [EnumDevicePlatform.android, EnumDeviceNotificationProvider.fcm],
            [EnumDevicePlatform.ios, EnumDeviceNotificationProvider.apns],
            [EnumDevicePlatform.web, null],
            [null, null],
        ])('maps platform %s to provider %s', (platform, provider) => {
            expect(util.resolveNotificationProvider(platform)).toBe(provider);
        });
    });

    describe('mapActivityLogMetadata', () => {
        it('projects ownership, device, user, update time and session count', () => {
            const userRef = {
                id: 'user-id',
                name: null,
                username: 'jane',
                photo: null,
                deletedAt: null,
                deletedBy: null,
                createdAt: now,
                createdBy: null,
                updatedAt: now,
                updatedBy: null,
            };
            const updatedAt = new Date('2026-03-01T00:00:00.000Z');
            const ownership = {
                id: 'ownership-id',
                deviceId: 'device-id',
                userId: 'user-id',
                revokedAt: null,
                isRevoked: false,
                revokedById: null,
                lastActiveAt: now,
                biometricEnabled: false,
                biometricToken: null,
                biometricType: null,
                biometricEnabledAt: null,
                createdAt: now,
                createdBy: null,
                updatedAt,
                updatedBy: null,
                device: {
                    id: 'device-id',
                    fingerprint: 'fp',
                    name: null,
                    platform: EnumDevicePlatform.ios,
                    lastActiveAt: now,
                    notificationToken: null,
                    notificationProvider: null,
                    createdAt: now,
                    createdBy: null,
                    updatedAt: now,
                    updatedBy: null,
                },
                user: userRef,
                revokedBy: null,
                _count: { sessions: 3 },
            } satisfies IDeviceOwnership;

            expect(util.mapActivityLogMetadata(ownership, 3)).toEqual({
                deviceOwnershipId: 'ownership-id',
                deviceId: 'device-id',
                sessionCount: 3,
            });
        });
    });
});
