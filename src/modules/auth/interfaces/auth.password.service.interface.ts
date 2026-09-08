import {
    IAuthPassword,
    IAuthPasswordOptions,
} from '@modules/auth/interfaces/auth.interface';
import { PasswordHistory, User } from '@generated/prisma-client';

export interface IAuthPasswordService {
    validatePassword(passwordString: string, passwordHash: string): boolean;
    checkPasswordAttempt(user: User): boolean;
    createPassword(
        userId: string,
        password: string,
        options?: IAuthPasswordOptions
    ): IAuthPassword;
    encryptPassword(userId: string, password: string): string;
    decryptPassword(userId: string, encrypted: string): string;
    createPasswordRandom(): string;
    checkPasswordExpired(passwordExpired?: Date | null): boolean;
    checkPasswordPeriod(
        histories: PasswordHistory[],
        password: string
    ): PasswordHistory | null;
    getPasswordPeriodInDays(): number;
}
