import type {
    ISession,
    ISessionPurgeLoginsPayload,
    ISessionRef,
    ISessionUserRef,
} from '@modules/session/interfaces/session.interface';
import { Injectable } from '@nestjs/common';
import type { IActivityLogMetadata } from '@modules/activity-log/interfaces/activity-log.interface';

@Injectable()
export class SessionUtil {
    mapActivityLogActorMetadata(
        session: ISession,
        timestamp: Date
    ): IActivityLogMetadata {
        return {
            targetUserId: session.userId,
            targetUsername: session.user.username,
            sessionId: session.id,
            timestamp,
        };
    }

    mapActivityLogTargetMetadata(
        session: ISession,
        actorUserId: string,
        timestamp: Date
    ): IActivityLogMetadata {
        return {
            actorUserId,
            sessionId: session.id,
            timestamp,
        };
    }

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

    groupRefsByUser(sessions: ISessionUserRef[]): ISessionPurgeLoginsPayload[] {
        const grouped = new Map<string, ISessionRef[]>();
        for (const { id, userId } of sessions) {
            const refs = grouped.get(userId) ?? [];
            refs.push({ id });
            grouped.set(userId, refs);
        }

        return Array.from(grouped, ([userId, refs]) => ({
            userId,
            sessions: refs,
        }));
    }
}
