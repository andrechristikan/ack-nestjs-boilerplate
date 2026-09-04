import { EnumUserLoginWith } from '@generated/prisma-client';
import { IAuthToken } from '@modules/auth/interfaces/auth.interface';
import {
    IUser,
    IUserLoginCredential,
    IUserLoginOutcome,
    IUserLoginSocial,
    IUserSignUp,
} from '@modules/user/interfaces/user.interface';

export interface IUserAuthService {
    loginCredential({
        email,
        password,
        from,
        device,
    }: IUserLoginCredential): Promise<IUserLoginOutcome>;
    loginWithSocial(
        email: string,
        loginWith: EnumUserLoginWith,
        { from, device, ...others }: IUserLoginSocial
    ): Promise<IUserLoginOutcome>;
    refresh(user: IUser, refreshToken: string): Promise<IAuthToken>;
    signUp({
        countryId,
        email,
        password,
        ...others
    }: IUserSignUp): Promise<void>;
    logout(
        userId: string,
        sessionId: string,
        deviceOwnershipId: string
    ): Promise<void>;
}
