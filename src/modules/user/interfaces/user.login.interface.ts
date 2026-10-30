import type { IAuthToken } from '@modules/auth/interfaces/auth.interface';
import type { ISessionRef } from '@modules/session/interfaces/session.interface';

export interface IUserLoginRefresh {
    tokens: IAuthToken | null;
    revoked: ISessionRef[];
}
