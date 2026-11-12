import type { IRequestContextPublic } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type { UserSendEmailVerificationRequestDto } from '@modules/user/dtos/request/user.send-email-verification.request.dto';
import { UserVerificationService } from '@modules/user/services/user.verification.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class UserSendVerificationEmailUseCase implements IAppUseCase<
    [IRequestContextPublic, UserSendEmailVerificationRequestDto],
    IResponseReturn<void>
> {
    constructor(
        private readonly userVerificationService: UserVerificationService
    ) {}

    async execute(
        context: IRequestContextPublic,
        { email }: UserSendEmailVerificationRequestDto
    ): Promise<IResponseReturn<void>> {
        const user =
            await this.userVerificationService.getOneForResendByEmail(email);
        if (user === null) {
            return {};
        }

        // Sequential by design: write must not run if an earlier step throws
        await this.userVerificationService.sendEmail(
            context.snapshot,
            user.id,
            user.email
        );

        return {};
    }
}
