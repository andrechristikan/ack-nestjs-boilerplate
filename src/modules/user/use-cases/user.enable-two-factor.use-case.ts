import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { UserAuthService } from '@modules/user/services/user.auth.service';
import type { UserTwoFactorEnableRequestDto } from '@modules/user/dtos/request/user.two-factor-enable.request.dto';
import type { UserTwoFactorEnableResponseDto } from '@modules/user/dtos/response/user.two-factor-enable.response.dto';
import type { IUser } from '@modules/user/interfaces/user.interface';
import { UserTwoFactorService } from '@modules/user/services/user.two-factor.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class UserEnableTwoFactorUseCase implements IAppUseCase<
    [IUser, UserTwoFactorEnableRequestDto, IRequestContext],
    IResponseReturn<UserTwoFactorEnableResponseDto>
> {
    constructor(
        private readonly userTwoFactorService: UserTwoFactorService,
        private readonly userAuthService: UserAuthService
    ) {}

    async execute(
        user: IUser,
        { code, password }: UserTwoFactorEnableRequestDto,
        context: IRequestContext
    ): Promise<IResponseReturn<UserTwoFactorEnableResponseDto>> {
        // Sequential by design: gate before the work it guards
        await this.userAuthService.assertCurrentPassword(
            user,
            password ?? null,
            context
        );
        const pendingSecret = this.userTwoFactorService.getPendingSecret(user);
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
