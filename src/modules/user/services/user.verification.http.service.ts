import { UserSendEmailVerificationRequestDto } from '@modules/user/dtos/request/user.send-email-verification.request.dto';
import { UserVerifyEmailRequestDto } from '@modules/user/dtos/request/user.verify-email.request.dto';
import { IUserVerificationHttpService } from '@modules/user/interfaces/user.verification.http.service.interface';
import { UserVerificationService } from '@modules/user/services/user.verification.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserVerificationHttpService implements IUserVerificationHttpService {
    constructor(
        private readonly userVerificationService: UserVerificationService
    ) {}

    async verifyEmail({ token }: UserVerifyEmailRequestDto): Promise<void> {
        await this.userVerificationService.verifyEmail(token);
    }

    async sendVerificationEmail({
        email,
    }: UserSendEmailVerificationRequestDto): Promise<void> {
        await this.userVerificationService.sendVerificationEmail(email);
    }
}
