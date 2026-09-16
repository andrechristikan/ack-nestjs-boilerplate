import { ISession } from '@modules/session/interfaces/session.interface';
import { Injectable } from '@nestjs/common';
import { IActivityLogMetadata } from '@modules/activity-log/interfaces/activity-log.interface';

/** Maps session entities for audit. */
@Injectable()
export class SessionUtil {
    mapActivityLogMetadata(session: ISession): IActivityLogMetadata {
        return {
            sessionId: session.id,
            userId: session.userId,
            userUsername: session.user.username,
            timestamp: session.updatedAt ?? session.createdAt,
        };
    }
}
