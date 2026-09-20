import { describe, expect, it } from 'vitest';

import type { ISession } from '@modules/session/interfaces/session.interface';
import { SessionUtil } from '@modules/session/utils/session.util';

describe('SessionUtil', () => {
    const util = new SessionUtil();
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    const updatedAt = new Date('2026-02-01T00:00:00.000Z');

    it('maps session audit metadata using the update time', () => {
        const session = {
            id: 'session-id',
            userId: 'user-id',
            deviceOwnershipId: 'ownership-id',
            jti: 'jti',
            ipAddress: null,
            userAgent: {},
            geoLocation: null,
            expiredAt: updatedAt,
            revokedAt: null,
            isRevoked: false,
            revokedById: null,
            createdAt,
            createdBy: null,
            updatedAt,
            updatedBy: null,
            user: {
                id: 'user-id',
                name: null,
                username: 'jane',
                photo: null,
                deletedAt: null,
                deletedBy: null,
                createdAt,
                createdBy: null,
                updatedAt: createdAt,
                updatedBy: null,
            },
            revokedBy: null,
        } satisfies ISession;

        expect(util.mapActivityLogActorMetadata(session, updatedAt)).toEqual({
            sessionId: 'session-id',
            targetUserId: 'user-id',
            targetUsername: 'jane',
            timestamp: updatedAt,
        });
    });
});
