import { Injectable } from '@nestjs/common';
import type { IActivityLogMetadata } from '@modules/activity-log/interfaces/activity-log.interface';

@Injectable()
export class SessionUtil {
    mapActivityLogRevokeAllActorMetadata(
        targetUserId: string,
        sessionCount: number
    ): IActivityLogMetadata {
        return { targetUserId, sessionCount };
    }

    mapActivityLogRevokeAllTargetMetadata(
        actorUserId: string,
        sessionCount: number
    ): IActivityLogMetadata {
        return { actorUserId, sessionCount };
    }
}
