import { TwoFactor } from '@generated/prisma-client';
import {
    IAuthTwoFactorBackupCodes,
    IAuthTwoFactorBackupCodesVerifyResult,
    IAuthTwoFactorSetup,
    IAuthTwoFactorVerify,
    IAuthTwoFactorVerifyResult,
} from '@modules/auth/interfaces/auth.interface';
import { IUser } from '@modules/user/interfaces/user.interface';

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
        twoFactor: TwoFactor,
        verify: IAuthTwoFactorVerify
    ): Promise<IAuthTwoFactorVerifyResult>;
    setupTwoFactor(email: string): Promise<IAuthTwoFactorSetup>;
    checkAttempt(user: IUser): boolean;
}
