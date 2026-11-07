import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import { AuthTwoFactorService } from '@modules/auth/services/auth.two-factor.service';
import { UserTwoFactorService } from '@modules/user/services/user.two-factor.service';
import type { UserLoginSetupTwoFactorRequestDto } from '@modules/user/dtos/request/user.login-setup-two-factor.request.dto';
import type { UserTwoFactorEnableResponseDto } from '@modules/user/dtos/response/user.two-factor-enable.response.dto';
import type { IUser } from '@modules/user/interfaces/user.interface';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class UserLoginSetupTwoFactorUseCase implements IAppUseCase<
    [UserLoginSetupTwoFactorRequestDto],
    IResponseReturn<UserTwoFactorEnableResponseDto>
> {
    constructor(
        private readonly userTwoFactorService: UserTwoFactorService,
        private readonly authTwoFactorService: AuthTwoFactorService,
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

    async execute({
        code,
        challengeToken,
    }: UserLoginSetupTwoFactorRequestDto): Promise<
        IResponseReturn<UserTwoFactorEnableResponseDto>
    > {
        const challenge =
            await this.authTwoFactorService.getChallenge(challengeToken);

        const { user, pendingSecret } =
            await this.userTwoFactorService.getOneForLoginSetup(
                challenge.userId
            );
        // Sequential by design: gate before the work it guards
        await this.assertTwoFactorAttemptCounted(user);
        // Sequential by design: the attempt is counted before the code is checked
        await this.userTwoFactorService.verifySetupCode(
            user,
            pendingSecret,
            code
        );

        const activityLogs = [
            this.activityLogService.prepare({
                action: EnumActivityLogAction.userEnableTwoFactor,
                userId: user.id,
                createdBy: user.id,
            }),
        ];
        const backupCodes = await this.userTwoFactorService.enableTwoFactor(
            user.id,
            pendingSecret
        );

        this.activityLogService.stagePrepared(activityLogs);

        return { data: { backupCodes } };
    }
}
