import { ISessionCache } from '@modules/session/interfaces/session.interface';

export interface ISessionCacheService {
    getLogin(userId: string, sessionId: string): Promise<ISessionCache | null>;
    setLogin(
        userId: string,
        sessionId: string,
        jti: string,
        expiredAt: Date
    ): Promise<void>;
    updateLogin(
        userId: string,
        sessionId: string,
        session: ISessionCache,
        jti: string,
        expiredInMs: number
    ): Promise<void>;
    deleteOneLogin(userId: string, sessionId: string): Promise<void>;
    deleteAllLogins(userId: string, sessions: { id: string }[]): Promise<void>;
}
