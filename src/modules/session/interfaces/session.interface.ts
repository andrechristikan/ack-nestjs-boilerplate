import type { IOutboxEffect } from '@common/outbox/interfaces/outbox.interface';
import type { IQueueResponse } from '@common/queue/interfaces/queue.interface';
import type { Prisma, Session } from '@generated/prisma-client/client';
import type {
    SessionListSelect,
    SessionRefSelect,
} from '@modules/session/constants/session.constant';
import type {
    EnumSessionProcess,
    EnumSessionQueue,
} from '@modules/session/enums/session.enum';

export type ISessionList = Prisma.SessionGetPayload<{
    select: typeof SessionListSelect;
}>;

export type ISessionRef = Prisma.SessionGetPayload<{
    select: typeof SessionRefSelect;
}>;

export type ISessionLogin = Pick<Session, 'jtiDigest'>;

export interface ISessionPurgeLoginsPayload {
    userId: string;
    sessions: ISessionRef[];
}

export interface ISessionPurgeLoginsEffect extends IOutboxEffect {
    queue: EnumSessionQueue.session;
    name: EnumSessionProcess.purgeLogins;
    data: ISessionPurgeLoginsPayload;
}

export interface ISessionPurgeExpiredQueueResponse extends IQueueResponse {
    sessions: number;
}

export interface ISessionPurgeLoginsQueueResponse extends IQueueResponse {
    countSessions: number;
}
