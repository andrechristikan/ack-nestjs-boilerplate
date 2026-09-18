import type {
    GeoLocation,
    Prisma,
    Session,
    UserAgent,
} from '@generated/prisma-client/client';
import type { SessionListSelect } from '@modules/session/constants/session.constant';
import type { IUserRef } from '@modules/user/interfaces/user.interface';

export interface ISession extends Session {
    user: IUserRef;
    revokedBy: IUserRef | null;
}

export type ISessionList = Prisma.SessionGetPayload<{
    select: typeof SessionListSelect;
}>;

export type ISessionRef = Pick<Session, 'id'>;

export interface ISessionCache {
    userId: string;
    sessionId: string;
    expiredAt: Date;
    jti: string;
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
