import { UserSendEmailVerificationRequestDto } from '@modules/user/dtos/request/user.send-email-verification.request.dto';
import { UserVerifyEmailRequestDto } from '@modules/user/dtos/request/user.verify-email.request.dto';

export interface IUserVerificationHttpService {
    verifyEmail({ token }: UserVerifyEmailRequestDto): Promise<void>;
    sendVerificationEmail({
        email,
    }: UserSendEmailVerificationRequestDto): Promise<void>;
}
