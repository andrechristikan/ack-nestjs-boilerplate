import type { IAuthToken } from '@modules/auth/interfaces/auth.interface';
import type { IUser } from '@modules/user/interfaces/user.interface';

export interface IUserAuthSession {
    tokens: IAuthToken;
    sessionId: string;
}

export interface IUserAuthSignUp {
    user: IUser;
    tokens: IAuthToken;
}
