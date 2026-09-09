import {
    IAuthTwoFactorBackupCodes,
    IAuthTwoFactorBackupCodesVerifyResult,
    IAuthTwoFactorSetup,
    IAuthTwoFactorVerify,
    IAuthTwoFactorVerifyResult,
} from '@modules/auth/interfaces/auth.interface';
import { IUser, IUserTwoFactor } from '@modules/user/interfaces/user.interface';

export interface IAuthTwoFactorService {
    generateSecret(): string;
    generateEncryptionIv(): string;
    encryptSecret(secret: string, iv: string): string;
    decryptSecret(secret: string, iv: string): string;
    generateBackupCodes(): IAuthTwoFactorBackupCodes;
    verifyBackupCode(
        backupCodes: string[],
        input: string
    ): IAuthTwoFactorBackupCodesVerifyResult;
    verifyCode(secret: string, code: string): boolean;
    verifyTwoFactor(
        twoFactor: IUserTwoFactor,
        verify: IAuthTwoFactorVerify
    ): Promise<IAuthTwoFactorVerifyResult>;
    setupTwoFactor(email: string): Promise<IAuthTwoFactorSetup>;
    checkAttempt(user: IUser): boolean;
}
