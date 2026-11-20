import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { EnumDevicePlatform } from '@generated/prisma-client/client';
import type { IDeviceOwnership } from '@modules/device/interfaces/device.interface';
import { DeviceUtil } from '@modules/device/utils/device.util';

describe('DeviceUtil', () => {
    const now = new Date('2026-01-01T00:00:00.000Z');
    const deviceOwnershipDetail: IDeviceOwnership = {
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
        device: {
            id: 'device-1',
            createdAt: now,
            createdBy: 'user-1',
            updatedAt: now,
            updatedBy: 'user-1',
            fingerprint: 'abc123def456ghi789jkl012mno345pq',
            name: 'iPhone 12',
            platform: EnumDevicePlatform.ios,
            lastActiveAt: now,
        },
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

    let util: DeviceUtil;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [DeviceUtil],
        }).compile();

        util = module.get(DeviceUtil);
    });

    describe('toIdentity', () => {
        it('maps every absent optional field to null', () => {
            expect(
                util.toIdentity({
                    fingerprint: 'abc123def456ghi789jkl012mno345pq',
                    platform: EnumDevicePlatform.web,
                })
            ).toEqual({
                fingerprint: 'abc123def456ghi789jkl012mno345pq',
                name: null,
                platform: EnumDevicePlatform.web,
                notificationToken: null,
            });
        });

        it('forwards the optional device fields when present', () => {
            expect(
                util.toIdentity({
                    fingerprint: 'abc123def456ghi789jkl012mno345pq',
                    name: 'iPhone 12',
                    platform: EnumDevicePlatform.ios,
                    notificationToken: 'token-1',
                })
            ).toEqual({
                fingerprint: 'abc123def456ghi789jkl012mno345pq',
                name: 'iPhone 12',
                platform: EnumDevicePlatform.ios,
                notificationToken: 'token-1',
            });
        });
    });

    describe('mapActivityLogMetadata', () => {
        it('projects the ownership id, device id, and session count', () => {
            const result = util.mapActivityLogMetadata(
                deviceOwnershipDetail,
                3
            );

            expect(result).toEqual({
                deviceOwnershipId: 'device-ownership-1',
                deviceId: 'device-1',
                sessionCount: 3,
            });
        });
    });

    describe('mapActivityLogActorMetadata', () => {
        it('extends the base metadata with the target user and timestamp', () => {
            const result = util.mapActivityLogActorMetadata(
                deviceOwnershipDetail,
                3
            );

            expect(result).toEqual({
                deviceOwnershipId: 'device-ownership-1',
                deviceId: 'device-1',
                sessionCount: 3,
                targetUserId: 'user-1',
                targetUsername: 'jane',
                timestamp: now,
            });
        });
    });

    describe('mapActivityLogTargetMetadata', () => {
        it('extends the base metadata with the actor user and timestamp', () => {
            const result = util.mapActivityLogTargetMetadata(
                deviceOwnershipDetail,
                'admin-1',
                3
            );

            expect(result).toEqual({
                deviceOwnershipId: 'device-ownership-1',
                deviceId: 'device-1',
                sessionCount: 3,
                actorUserId: 'admin-1',
                timestamp: now,
            });
        });
    });
});
