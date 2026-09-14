import { describe, expect, it } from 'vitest';

import { EnumDevicePlatform } from '@generated/prisma-client';
import { DeviceOwnershipResponseSchema } from '@modules/device/dtos/response/device.ownership.response.dto';

describe('DeviceOwnershipResponseSchema', () => {
    it('strips fingerprint, notification token, biometrics, sessions, and internal counts', () => {
        const now = new Date('2026-01-01T00:00:00.000Z');
        const serialized = DeviceOwnershipResponseSchema.parse({
            id: 'ownership-id',
            deviceId: 'device-id',
            userId: 'user-id',
            revokedAt: null,
            isRevoked: false,
            revokedById: null,
            revokedBy: null,
            activeSessionCount: 2,
            isCurrentDevice: true,
            biometricEnabled: true,
            biometricToken: 'private-biometric-token',
            sessions: [{ id: 'session-id', jti: 'private-jti' }],
            _count: { sessions: 2 },
            device: {
                id: 'device-id',
                fingerprint: 'private-fingerprint',
                notificationToken: 'private-push-token',
                name: 'Browser',
                platform: EnumDevicePlatform.web,
                lastActiveAt: now,
                notificationProvider: null,
                createdAt: now,
                createdBy: null,
                updatedAt: now,
                updatedBy: null,
            },
            createdAt: now,
            createdBy: null,
            updatedAt: now,
            updatedBy: null,
        });

        expect(serialized).not.toHaveProperty('biometricEnabled');
        expect(serialized).not.toHaveProperty('biometricToken');
        expect(serialized).not.toHaveProperty('sessions');
        expect(serialized).not.toHaveProperty('_count');
        expect(serialized.device).not.toHaveProperty('fingerprint');
        expect(serialized.device).not.toHaveProperty('notificationToken');
    });
});
