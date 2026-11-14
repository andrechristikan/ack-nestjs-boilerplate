import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumAuthTwoFactorMethod } from '@modules/auth/enums/auth.enum';
import { UserAuthService } from '@modules/user/services/user.auth.service';
import type { UserTwoFactorSetupRequestDto } from '@modules/user/dtos/request/user.two-factor-setup.request.dto';
import type {
    IUserContext,
    IUserTwoFactorSetup,
    IUserTwoFactorVerifyResult,
} from '@modules/user/interfaces/user.interface';
import { UserTwoFactorService } from '@modules/user/services/user.two-factor.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';

@Injectable()
export class UserSetupTwoFactorUseCase implements IAppUseCase<
    [
        IRequestContext,
        IApiKeyContext,
        IAuthJwtAccessContext,
        IUserContext,
        UserTwoFactorSetupRequestDto,
    ],
    IResponseReturn<IUserTwoFactorSetup>
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
        { backupCode, password }: UserTwoFactorSetupRequestDto
    ): Promise<IResponseReturn<IUserTwoFactorSetup>> {
        const { user } = userContext;
        // Sequential by design: gate before the work it guards
        await this.userAuthService.assertCurrentPassword(
            requestContext,
            apiKeyContext,
            user,
            password ?? null
        );
        const backupCodeForSetup =
            this.userTwoFactorService.getBackupCodeForSetup(
                user,
                backupCode ?? null
            );
        let backupCodeVerified: IUserTwoFactorVerifyResult | null = null;
        if (backupCodeForSetup !== null) {
            await this.userTwoFactorService.assertAttemptCounted(
                requestContext,
                apiKeyContext,
                user
            );
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
                requestContext,
                apiKeyContext,
                user,
                encryptedSecret,
                backupCodeVerified
            );
        } else {
            await this.userTwoFactorService.saveSetup(
                requestContext,
                apiKeyContext,
                authContext.userId,
                encryptedSecret
            );
        }

        return { data: { secret, otpauthUrl } };
    }
}
