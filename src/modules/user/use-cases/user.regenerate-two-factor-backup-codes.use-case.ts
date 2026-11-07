import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import { EnumAuthTwoFactorMethod } from '@modules/auth/enums/auth.enum';
import type { UserTwoFactorRegenerateBackupCodeRequestDto } from '@modules/user/dtos/request/user.two-factor-regenerate-backup-code.request.dto';
import type { UserTwoFactorEnableResponseDto } from '@modules/user/dtos/response/user.two-factor-enable.response.dto';
import type { IUser } from '@modules/user/interfaces/user.interface';
import { UserTwoFactorService } from '@modules/user/services/user.two-factor.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class UserRegenerateTwoFactorBackupCodesUseCase implements IAppUseCase<
    [IUser, UserTwoFactorRegenerateBackupCodeRequestDto],
    IResponseReturn<UserTwoFactorEnableResponseDto>
> {
    constructor(
        private readonly userTwoFactorService: UserTwoFactorService,
        private readonly activityLogService: ActivityLogService
    ) {}

    private async assertTwoFactorAttemptCounted(user: IUser): Promise<void> {
        const attempt = await this.userTwoFactorService.countAttempt(user);
        const lockoutLogs = attempt.lockoutStages.map(stage =>
            this.activityLogService.prepare(stage)
        );
        this.activityLogService.stagePrepared(lockoutLogs);

        this.userTwoFactorService.assertAttemptCounted(
            attempt.isAttemptCounted
        );
    }

    async execute(
        user: IUser,
        { code }: UserTwoFactorRegenerateBackupCodeRequestDto
    ): Promise<IResponseReturn<UserTwoFactorEnableResponseDto>> {
        this.userTwoFactorService.assertEnabled(user);
        // Sequential by design: gate before the work it guards
        await this.assertTwoFactorAttemptCounted(user);
        // Sequential by design: the attempt is counted before the code is checked
        await this.userTwoFactorService.verify(user, {
            method: EnumAuthTwoFactorMethod.code,
            code,
            backupCode: null,
        });

        const activityLogs = [
            this.activityLogService.prepare({
                action: EnumActivityLogAction.userRegenerateTwoFactorBackupCodes,
            }),
        ];
        const backupCodes =
            await this.userTwoFactorService.regenerateTwoFactorBackupCodes(
                user.id
            );

        this.activityLogService.stagePrepared(activityLogs);

        return { data: { backupCodes } };
    }
}
