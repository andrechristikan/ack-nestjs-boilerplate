import { Session, User } from '@prisma/client';

export interface ISession extends Session {
    user: User;
}
