import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { AuthTwoFactorService } from '@modules/auth/services/auth.two-factor.service';
import { UserTwoFactorService } from '@modules/user/services/user.two-factor.service';
import type { UserLoginSetupTwoFactorRequestDto } from '@modules/user/dtos/request/user.login-setup-two-factor.request.dto';
import type { UserTwoFactorEnableResponseDto } from '@modules/user/dtos/response/user.two-factor-enable.response.dto';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class UserLoginSetupTwoFactorUseCase implements IAppUseCase<
    [UserLoginSetupTwoFactorRequestDto, IRequestContext],
    IResponseReturn<UserTwoFactorEnableResponseDto>
> {
    constructor(
        private readonly userTwoFactorService: UserTwoFactorService,
        private readonly authTwoFactorService: AuthTwoFactorService
    ) {}

    async execute(
        { code, challengeToken }: UserLoginSetupTwoFactorRequestDto,
        context: IRequestContext
    ): Promise<IResponseReturn<UserTwoFactorEnableResponseDto>> {
        const challenge =
            await this.authTwoFactorService.getChallenge(challengeToken);

        const { user, pendingSecret } =
            await this.userTwoFactorService.getOneForLoginSetup(
                challenge.userId
            );
        // Sequential by design: gate before the work it guards
        await this.userTwoFactorService.assertAttemptCounted(user, context);
        await this.userTwoFactorService.verifySetupCode(
            user,
            pendingSecret,
            code
        );
        const backupCodes = await this.userTwoFactorService.enableTwoFactor(
            user.id,
            pendingSecret,
            context
        );

        return { data: { backupCodes } };
    }
}
