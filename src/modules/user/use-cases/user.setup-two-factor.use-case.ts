import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumAuthTwoFactorMethod } from '@modules/auth/enums/auth.enum';
import { UserAuthService } from '@modules/user/services/user.auth.service';
import type { UserTwoFactorSetupRequestDto } from '@modules/user/dtos/request/user.two-factor-setup.request.dto';
import type {
    IUser,
    IUserTwoFactorSetup,
    IUserTwoFactorVerifyResult,
} from '@modules/user/interfaces/user.interface';
import { UserTwoFactorService } from '@modules/user/services/user.two-factor.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class UserSetupTwoFactorUseCase implements IAppUseCase<
    [IUser, UserTwoFactorSetupRequestDto, IRequestContext],
    IResponseReturn<IUserTwoFactorSetup>
> {
    constructor(
        private readonly userTwoFactorService: UserTwoFactorService,
        private readonly userAuthService: UserAuthService
    ) {}

    async execute(
        user: IUser,
        { backupCode, password }: UserTwoFactorSetupRequestDto,
        context: IRequestContext
    ): Promise<IResponseReturn<IUserTwoFactorSetup>> {
        // Sequential by design: gate before the work it guards
        await this.userAuthService.assertCurrentPassword(
            user,
            password ?? null,
            context
        );
        const backupCodeForSetup =
            this.userTwoFactorService.getBackupCodeForSetup(
                user,
                backupCode ?? null
            );
        let backupCodeVerified: IUserTwoFactorVerifyResult | null = null;
        if (backupCodeForSetup !== null) {
            await this.userTwoFactorService.assertAttemptCounted(user, context);
            backupCodeVerified = await this.userTwoFactorService.verify(user, {
                method: EnumAuthTwoFactorMethod.backupCodes,
                code: null,
                backupCode: backupCodeForSetup,
            });
        }

        const { encryptedSecret, otpauthUrl, secret } =
            await this.userTwoFactorService.setup(user);
        if (backupCodeVerified) {
            await this.userTwoFactorService.saveSetupConsumingBackupCode(
                user,
                encryptedSecret,
                backupCodeVerified,
                context
            );
        } else {
            await this.userTwoFactorService.saveSetup(
                user.id,
                encryptedSecret,
                context
            );
        }

        return { data: { secret, otpauthUrl } };
    }
}
