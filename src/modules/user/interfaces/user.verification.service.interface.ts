import { EnumVerificationType } from '@generated/prisma-client';
import { IUserVerificationCreate } from '@modules/user/interfaces/user.interface';

export interface IUserVerificationService {
    verificationCreateReference(): string;
    verificationCreateOtp(): string;
    verificationCreateToken(): string;
    verificationSetExpiredDate(): Date;
    verificationCreateVerification(
        userId: string,
        type: EnumVerificationType
    ): IUserVerificationCreate;
    verifyEmail(token: string): Promise<void>;
    sendVerificationEmail(email: string): Promise<void>;
}
