import type { Prisma, Session } from '@generated/prisma-client/client';
import type {
    SessionListSelect,
    SessionRefSelect,
} from '@modules/session/constants/session.constant';

export type ISessionList = Prisma.SessionGetPayload<{
    select: typeof SessionListSelect;
}>;

export type ISessionRef = Prisma.SessionGetPayload<{
    select: typeof SessionRefSelect;
}>;

export type ISessionLogin = Pick<Session, 'jtiDigest'>;
