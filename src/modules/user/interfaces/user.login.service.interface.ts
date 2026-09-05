import { EnumUserLoginFrom, EnumUserLoginWith } from '@generated/prisma-client';
import {
    IAuthToken,
    IAuthTwoFactorVerify,
    IAuthTwoFactorVerifyResult,
} from '@modules/auth/interfaces/auth.interface';
import { IDeviceIdentity } from '@modules/device/interfaces/device.interface';
import {
    IUser,
    IUserLoginOutcome,
} from '@modules/user/interfaces/user.interface';

export interface IUserLoginService {
    assertWorkspaceInvitationAllowed(): Promise<void>;
    createTokenAndSession(
        user: IUser,
        device: IDeviceIdentity,
        loginFrom: EnumUserLoginFrom,
        loginWith: EnumUserLoginWith,
        loginAt: Date
    ): Promise<IAuthToken>;
    handleLogin(
        user: IUser,
        device: IDeviceIdentity,
        loginFrom: EnumUserLoginFrom,
        loginWith: EnumUserLoginWith,
        loginAt: Date
    ): Promise<IUserLoginOutcome>;
    handleTwoFactorValidation(
        user: IUser,
        { method, code, backupCode }: IAuthTwoFactorVerify
    ): Promise<IAuthTwoFactorVerifyResult>;
    revokeAllSessions(userId: string): Promise<void>;
    revokeSession(userId: string, sessionId: string): Promise<void>;
    refreshSession(user: IUser, refreshToken: string): Promise<IAuthToken>;
}
