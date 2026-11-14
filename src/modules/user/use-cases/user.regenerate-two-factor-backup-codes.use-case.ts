import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumAuthTwoFactorMethod } from '@modules/auth/enums/auth.enum';
import type { UserTwoFactorRegenerateBackupCodeRequestDto } from '@modules/user/dtos/request/user.two-factor-regenerate-backup-code.request.dto';
import type { UserTwoFactorEnableResponseDto } from '@modules/user/dtos/response/user.two-factor-enable.response.dto';
import { UserTwoFactorService } from '@modules/user/services/user.two-factor.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';
import type { IUserContext } from '@modules/user/interfaces/user.interface';

@Injectable()
export class UserRegenerateTwoFactorBackupCodesUseCase implements IAppUseCase<
    [
        IRequestContext,
        IApiKeyContext,
        IAuthJwtAccessContext,
        IUserContext,
        UserTwoFactorRegenerateBackupCodeRequestDto,
    ],
    IResponseReturn<UserTwoFactorEnableResponseDto>
> {
    constructor(private readonly userTwoFactorService: UserTwoFactorService) {}

    async execute(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        userContext: IUserContext,
        { code }: UserTwoFactorRegenerateBackupCodeRequestDto
    ): Promise<IResponseReturn<UserTwoFactorEnableResponseDto>> {
        const { user } = userContext;
        this.userTwoFactorService.assertEnabled(user);
        // Sequential by design: gate before the work it guards
        await this.userTwoFactorService.assertAttemptCounted(
            requestContext,
            apiKeyContext,
            user
        );
        await this.userTwoFactorService.verify(user, {
            method: EnumAuthTwoFactorMethod.code,
            code,
            backupCode: null,
        });
        const backupCodes =
            await this.userTwoFactorService.regenerateTwoFactorBackupCodes(
                requestContext,
                apiKeyContext,
                authContext
            );

        return { data: { backupCodes } };
    }
}
