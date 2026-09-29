import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { SessionUtil } from '@modules/session/utils/session.util';
import type { ISession } from '@modules/session/interfaces/session.interface';

describe('SessionUtil', () => {
    let util: SessionUtil;

    const session: ISession = {
        id: 'session-1',
        userId: 'user-1',
        deviceOwnershipId: 'device-ownership-1',
        jti: 'jti-value',
        ipAddress: '127.0.0.1',
        userAgent: {
            ua: 'Mozilla/5.0',
            browser: null,
            cpu: null,
            device: null,
            engine: null,
            os: null,
        },
        geoLocation: null,
        expiredAt: new Date('2026-02-01T00:00:00.000Z'),
        revokedAt: null,
        isRevoked: false,
        revokedById: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
        user: {
            id: 'user-1',
            name: 'Jane Doe',
            username: 'jane',
            photo: null,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            createdBy: null,
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedBy: null,
            deletedAt: null,
            deletedBy: null,
        },
        revokedBy: null,
    };

    beforeEach(async () => {
        vi.resetAllMocks();
        const module: TestingModule = await Test.createTestingModule({
            providers: [SessionUtil],
        }).compile();
        util = module.get(SessionUtil);
    });

    describe('mapActivityLogActorMetadata', () => {
        it('maps the session to the actor metadata shape', () => {
            const timestamp = new Date('2026-01-05T00:00:00.000Z');

            const result = util.mapActivityLogActorMetadata(session, timestamp);

            expect(result).toEqual({
                targetUserId: 'user-1',
                targetUsername: 'jane',
                sessionId: 'session-1',
                timestamp,
            });
        });
    });

    describe('mapActivityLogTargetMetadata', () => {
        it('maps the session to the target metadata shape', () => {
            const timestamp = new Date('2026-01-05T00:00:00.000Z');

            const result = util.mapActivityLogTargetMetadata(
                session,
                'actor-1',
                timestamp
            );

            expect(result).toEqual({
                actorUserId: 'actor-1',
                sessionId: 'session-1',
                timestamp,
            });
        });
    });
});
