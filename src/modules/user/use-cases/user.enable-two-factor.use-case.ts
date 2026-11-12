import type { IRequestContextUser } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { UserAuthService } from '@modules/user/services/user.auth.service';
import type { UserTwoFactorEnableRequestDto } from '@modules/user/dtos/request/user.two-factor-enable.request.dto';
import type { UserTwoFactorEnableResponseDto } from '@modules/user/dtos/response/user.two-factor-enable.response.dto';
import { UserTwoFactorService } from '@modules/user/services/user.two-factor.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class UserEnableTwoFactorUseCase implements IAppUseCase<
    [IRequestContextUser, UserTwoFactorEnableRequestDto],
    IResponseReturn<UserTwoFactorEnableResponseDto>
> {
    constructor(
        private readonly userTwoFactorService: UserTwoFactorService,
        private readonly userAuthService: UserAuthService
    ) {}

    async execute(
        context: IRequestContextUser,
        { code, password }: UserTwoFactorEnableRequestDto
    ): Promise<IResponseReturn<UserTwoFactorEnableResponseDto>> {
        const { user } = context;
        // Sequential by design: gate before the work it guards
        await this.userAuthService.assertCurrentPassword(
            context.snapshot,
            user,
            password ?? null
        );
        const pendingSecret = this.userTwoFactorService.getPendingSecret(user);
        await this.userTwoFactorService.assertAttemptCounted(
            context.snapshot,
            user
        );
        await this.userTwoFactorService.verifySetupCode(
            user,
            pendingSecret,
            code
        );
        const backupCodes = await this.userTwoFactorService.enableTwoFactor(
            context.snapshot,
            user.id,
            pendingSecret
        );

        return { data: { backupCodes } };
    }
}
