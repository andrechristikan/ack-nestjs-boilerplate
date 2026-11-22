import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type { UserSendEmailVerificationRequestDto } from '@modules/user/dtos/request/user.send-email-verification.request.dto';
import { UserVerificationService } from '@modules/user/services/user.verification.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';

@Injectable()
export class UserSendVerificationEmailUseCase implements IAppUseCase<
    [IRequestContext, IApiKeyContext, UserSendEmailVerificationRequestDto],
    IResponseReturn<void>
> {
    constructor(
        private readonly userVerificationService: UserVerificationService
    ) {}

    async execute(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        { email }: UserSendEmailVerificationRequestDto
    ): Promise<IResponseReturn<void>> {
        const user =
            await this.userVerificationService.getOneForResendByEmail(email);
        if (user === null) {
            return {};
        }

        await this.userVerificationService.sendEmail(
            requestContext,
            apiKeyContext,
            user.id,
            user.email
        );

        return {};
    }
}
