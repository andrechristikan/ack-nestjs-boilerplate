import type {
    IRequestGeoLocation,
    IRequestUserAgent,
} from '@common/request/interfaces/request.interface';
import type { Prisma, Session } from '@generated/prisma-client/client';
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
    geoLocation: IRequestGeoLocation | null;
    userAgent: IRequestUserAgent;
}

export interface ISessionAnalyticUserCount {
    userId: string;
    count: number;
}
