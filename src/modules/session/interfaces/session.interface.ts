import type { IQueueResponse } from '@common/queue/interfaces/queue.interface';
import type {
    EnumSessionProcess,
    EnumSessionQueue,
} from '@modules/session/enums/session.enum';
import type { IOutboxEffect } from '@common/outbox/interfaces/outbox.interface';
import type { Prisma, Session } from '@generated/prisma-client/client';
import type {
    SessionListSelect,
    SessionLoginSelect,
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

export type ISessionLogin = Prisma.SessionGetPayload<{
    select: typeof SessionLoginSelect;
}>;

export interface ISessionPurgeLoginsEffect extends IOutboxEffect {
    queue: EnumSessionQueue.session;
    name: EnumSessionProcess.purgeLogins;
    data: ISessionPurgeLoginsPayload;
}

export interface ISessionPurgeLoginsQueueResponse extends IQueueResponse {
    countSessions: number;
}
