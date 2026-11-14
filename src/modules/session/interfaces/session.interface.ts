import type {
    EnumSessionProcess,
    EnumSessionQueue,
} from '@modules/session/enums/session.enum';
import type { IOutboxEffect } from '@common/outbox/interfaces/outbox.interface';
import type {
    GeoLocation,
    Prisma,
    Session,
    UserAgent,
} from '@generated/prisma-client/client';
import type {
    SessionListSelect,
    SessionUserRefSelect,
} from '@modules/session/constants/session.constant';
import type { IUserRef } from '@modules/user/interfaces/user.interface';

export interface ISession extends Session {
    user: IUserRef;
    revokedBy: IUserRef | null;
}

export type ISessionList = Prisma.SessionGetPayload<{
    select: typeof SessionListSelect;
}>;

export type ISessionRef = Pick<Session, 'id'>;

export type ISessionUserRef = Prisma.SessionGetPayload<{
    select: typeof SessionUserRefSelect;
}>;

export interface ISessionPurgeLoginsPayload {
    userId: string;
    sessions: ISessionRef[];
}

export interface ISessionCache {
    userId: string;
    sessionId: string;
    jtiDigest: string;
}

export interface ISessionAnalyticSession {
    id: string;
    userId: string;
    ipAddress: string | null;
    createdAt: Date;
    geoLocation: GeoLocation | null;
    userAgent: UserAgent;
}

export interface ISessionAnalyticUserCount {
    userId: string;
    count: number;
}

export interface ISessionPurgeLoginsEffect extends IOutboxEffect {
    queue: EnumSessionQueue.session;
    name: EnumSessionProcess.purgeLogins;
    data: ISessionPurgeLoginsPayload;
}
