import type { UserSendEmailVerificationRequestDto } from '@modules/user/dtos/request/user.send-email-verification.request.dto';
import type { UserVerifyEmailRequestDto } from '@modules/user/dtos/request/user.verify-email.request.dto';
import { UserVerificationDomain } from '@modules/user/domains/user.verification.domain';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserVerificationHttpService {
    constructor(
        private readonly userVerificationDomain: UserVerificationDomain
    ) {}

    async verifyEmail({ token }: UserVerifyEmailRequestDto): Promise<void> {
        await this.userVerificationDomain.verifyEmail(token);
    }

    async sendVerificationEmail({
        email,
    }: UserSendEmailVerificationRequestDto): Promise<void> {
        await this.userVerificationDomain.sendVerificationEmail(email);
    }
}
