import {
    IAuthToken,
    IAuthTwoFactorVerify,
} from '@modules/auth/interfaces/auth.interface';
import {
    IUser,
    IUserTwoFactor,
    IUserTwoFactorSetup,
} from '@modules/user/interfaces/user.interface';

export interface IUserTwoFactorService {
    loginVerifyTwoFactor(
        challengeToken: string,
        { code, backupCode, method }: IAuthTwoFactorVerify
    ): Promise<IAuthToken>;
    loginSetupTwoFactor(
        challengeToken: string,
        code: string
    ): Promise<string[]>;
    getTwoFactorStatus(user: IUser): IUserTwoFactor;
    setupTwoFactor(user: IUser): Promise<IUserTwoFactorSetup>;
    enableTwoFactor(user: IUser, code: string): Promise<string[]>;
    disableTwoFactor(
        user: IUser,
        { code, backupCode, method }: IAuthTwoFactorVerify
    ): Promise<void>;
    regenerateTwoFactorBackupCodes(
        user: IUser,
        code: string
    ): Promise<string[]>;
    resetTwoFactorByAdmin(userId: string, updatedBy: string): Promise<void>;
}
