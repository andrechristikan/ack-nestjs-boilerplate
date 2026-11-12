import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumAuthTwoFactorMethod } from '@modules/auth/enums/auth.enum';
import type { UserTwoFactorRegenerateBackupCodeRequestDto } from '@modules/user/dtos/request/user.two-factor-regenerate-backup-code.request.dto';
import type { UserTwoFactorEnableResponseDto } from '@modules/user/dtos/response/user.two-factor-enable.response.dto';
import type { IUser } from '@modules/user/interfaces/user.interface';
import { UserTwoFactorService } from '@modules/user/services/user.two-factor.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class UserRegenerateTwoFactorBackupCodesUseCase implements IAppUseCase<
    [IUser, UserTwoFactorRegenerateBackupCodeRequestDto, IRequestContext],
    IResponseReturn<UserTwoFactorEnableResponseDto>
> {
    constructor(private readonly userTwoFactorService: UserTwoFactorService) {}

    async execute(
        user: IUser,
        { code }: UserTwoFactorRegenerateBackupCodeRequestDto,
        context: IRequestContext
    ): Promise<IResponseReturn<UserTwoFactorEnableResponseDto>> {
        this.userTwoFactorService.assertEnabled(user);
        // Sequential by design: gate before the work it guards
        await this.userTwoFactorService.assertAttemptCounted(user, context);
        await this.userTwoFactorService.verify(user, {
            method: EnumAuthTwoFactorMethod.code,
            code,
            backupCode: null,
        });
        const backupCodes =
            await this.userTwoFactorService.regenerateTwoFactorBackupCodes(
                user.id,
                context
            );

        return { data: { backupCodes } };
    }
}
