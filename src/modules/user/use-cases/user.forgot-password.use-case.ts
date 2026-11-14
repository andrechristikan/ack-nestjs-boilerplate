import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { UserPasswordService } from '@modules/user/services/user.password.service';
import type { UserForgotPasswordRequestDto } from '@modules/user/dtos/request/user.forgot-password.request.dto';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';

@Injectable()
export class UserForgotPasswordUseCase implements IAppUseCase<
    [IRequestContext, IApiKeyContext, UserForgotPasswordRequestDto],
    IResponseReturn<void>
> {
    constructor(private readonly userPasswordService: UserPasswordService) {}

    async execute(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        { email }: UserForgotPasswordRequestDto
    ): Promise<IResponseReturn<void>> {
        const prepared =
            await this.userPasswordService.prepareForgotPassword(email);
        if (prepared === null) {
            return {};
        }

        const { user, forgot } = prepared;
        await this.userPasswordService.createForgotPassword(
            requestContext,
            apiKeyContext,
            user.id,
            email,
            forgot
        );

        return {};
    }
}
