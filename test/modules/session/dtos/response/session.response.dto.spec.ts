import { describe, expect, it } from 'vitest';

import { SessionResponseSchema } from '@modules/session/dtos/response/session.response.dto';

describe('SessionResponseSchema', () => {
    it('serializes session context without exposing the token jti', () => {
        const now = new Date('2026-01-01T00:00:00.000Z');
        const user = {
            id: 'user-id',
            name: 'User',
            username: 'user',
            photo: null,
            createdAt: now,
            createdBy: null,
            updatedAt: now,
            updatedBy: null,
            deletedAt: null,
            deletedBy: null,
        };
        const serialized = SessionResponseSchema.parse({
            id: 'session-id',
            userId: 'user-id',
            user,
            deviceOwnershipId: 'ownership-id',
            jti: 'private-session-jti',
            ipAddress: '127.0.0.1',
            userAgent: {
                ua: 'browser',
                browser: {
                    name: 'Chrome',
                    version: '1',
                    major: '1',
                    type: null,
                },
                cpu: { architecture: 'arm64' },
                device: { type: null, vendor: null, model: null },
                engine: { name: 'WebKit', version: '1' },
                os: { name: 'macOS', version: '1' },
            },
            geoLocation: null,
            expiredAt: new Date('2026-02-01T00:00:00.000Z'),
            revokedAt: null,
            isRevoked: false,
            revokedById: null,
            revokedBy: null,
            createdAt: now,
            createdBy: null,
            updatedAt: now,
            updatedBy: null,
        });

        expect(serialized).not.toHaveProperty('jti');
        expect(serialized.user).toEqual(user);
    });
});
