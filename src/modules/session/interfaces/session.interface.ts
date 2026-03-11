import { Session, User } from '@generated/prisma-client';

export interface ISession extends Session {
    user: User;
}

export interface ISessionCache {
    userId: string;
    sessionId: string;
    expiredAt: Date;
    jti: string;
}
