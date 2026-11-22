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

export type ISessionLogin = Prisma.SessionGetPayload<{
    select: typeof SessionLoginSelect;
}>;
