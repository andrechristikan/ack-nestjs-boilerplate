import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type { UserVerifyEmailRequestDto } from '@modules/user/dtos/request/user.verify-email.request.dto';
import { UserVerificationService } from '@modules/user/services/user.verification.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';

@Injectable()
export class UserVerifyEmailUseCase implements IAppUseCase<
    [IRequestContext, IApiKeyContext, UserVerifyEmailRequestDto],
    IResponseReturn<void>
> {
    constructor(
        private readonly userVerificationService: UserVerificationService
    ) {}

    async execute(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        { token }: UserVerifyEmailRequestDto
    ): Promise<IResponseReturn<void>> {
        const { verification } =
            await this.userVerificationService.getOneActiveByEmailToken(token);

        // Sequential by design: write must not run if an earlier step throws
        await this.userVerificationService.verifyEmail(
            requestContext,
            apiKeyContext,
            verification
        );

        return {};
    }
}
