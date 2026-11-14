import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { UserAuthService } from '@modules/user/services/user.auth.service';
import type { UserTwoFactorEnableRequestDto } from '@modules/user/dtos/request/user.two-factor-enable.request.dto';
import type { UserTwoFactorEnableResponseDto } from '@modules/user/dtos/response/user.two-factor-enable.response.dto';
import { UserTwoFactorService } from '@modules/user/services/user.two-factor.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';
import type { IUserContext } from '@modules/user/interfaces/user.interface';

@Injectable()
export class UserEnableTwoFactorUseCase implements IAppUseCase<
    [
        IRequestContext,
        IApiKeyContext,
        IAuthJwtAccessContext,
        IUserContext,
        UserTwoFactorEnableRequestDto,
    ],
    IResponseReturn<UserTwoFactorEnableResponseDto>
> {
    constructor(
        private readonly userTwoFactorService: UserTwoFactorService,
        private readonly userAuthService: UserAuthService
    ) {}

    async execute(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        userContext: IUserContext,
        { code, password }: UserTwoFactorEnableRequestDto
    ): Promise<IResponseReturn<UserTwoFactorEnableResponseDto>> {
        const { user } = userContext;
        // Sequential by design: gate before the work it guards
        await this.userAuthService.assertCurrentPassword(
            requestContext,
            apiKeyContext,
            user,
            password ?? null
        );
        const pendingSecret = this.userTwoFactorService.getPendingSecret(user);
        await this.userTwoFactorService.assertAttemptCounted(
            requestContext,
            apiKeyContext,
            user
        );
        await this.userTwoFactorService.verifySetupCode(
            user,
            pendingSecret,
            code
        );
        const backupCodes = await this.userTwoFactorService.enableTwoFactor(
            requestContext,
            apiKeyContext,
            authContext.userId,
            pendingSecret
        );

        return { data: { backupCodes } };
    }
}
