import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { SessionUtil } from '@modules/session/utils/session.util';

describe('SessionUtil', () => {
    let util: SessionUtil;

    beforeEach(async () => {
        vi.resetAllMocks();
        const module: TestingModule = await Test.createTestingModule({
            providers: [SessionUtil],
        }).compile();
        util = module.get(SessionUtil);
    });

    describe('mapActivityLogRevokeAllActorMetadata', () => {
        it('maps the target user and revoked count to the actor metadata shape', () => {
            const result = util.mapActivityLogRevokeAllActorMetadata(
                'user-1',
                3
            );

            expect(result).toEqual({ targetUserId: 'user-1', sessionCount: 3 });
        });
    });

    describe('mapActivityLogRevokeAllTargetMetadata', () => {
        it('maps the actor and revoked count to the target metadata shape', () => {
            const result = util.mapActivityLogRevokeAllTargetMetadata(
                'actor-1',
                3
            );

            expect(result).toEqual({ actorUserId: 'actor-1', sessionCount: 3 });
        });
    });
});
