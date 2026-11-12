import type { IAuthToken } from '@modules/auth/interfaces/auth.interface';

export interface IUserLoginSession {
    tokens: IAuthToken;
    sessionId: string;
    jti: string;
}
