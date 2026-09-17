import type { ISession } from '@modules/session/interfaces/session.interface';
import { Injectable } from '@nestjs/common';
import type { IActivityLogMetadata } from '@modules/activity-log/interfaces/activity-log.interface';

/** Maps session entities for audit. */
@Injectable()
export class SessionUtil {
    mapActivityLogActorMetadata(session: ISession): IActivityLogMetadata {
        return {
            targetUserId: session.userId,
            targetUsername: session.user.username,
            sessionId: session.id,
            timestamp: session.updatedAt ?? session.createdAt,
        };
    }

    mapActivityLogTargetMetadata(
        session: ISession,
        actorUserId: string
    ): IActivityLogMetadata {
        return {
            actorUserId,
            sessionId: session.id,
            timestamp: session.updatedAt ?? session.createdAt,
        };
    }
}
