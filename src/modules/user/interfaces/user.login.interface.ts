import type { IAuthToken } from '@modules/auth/interfaces/auth.interface';
import type { IUser } from '@modules/user/interfaces/user.interface';

export interface IUserLoginSession {
    tokens: IAuthToken;
    sessionId: string;
}

export interface IUserLoginSignUp {
    user: IUser;
    tokens: IAuthToken;
}
