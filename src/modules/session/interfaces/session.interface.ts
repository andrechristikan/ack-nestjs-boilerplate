import type { Session } from '@generated/prisma-client/client';
import type { IUserRef } from '@modules/user/interfaces/user.interface';

export interface ISession extends Session {
    user: IUserRef;
    revokedBy: IUserRef | null;
}

export type ISessionRef = Pick<Session, 'id'>;

export interface ISessionCache {
    userId: string;
    sessionId: string;
    expiredAt: Date;
    jti: string;
}
