import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import { UserAuthService } from '@modules/user/services/user.auth.service';
import { UserPasswordService } from '@modules/user/services/user.password.service';
import type { UserTwoFactorEnableRequestDto } from '@modules/user/dtos/request/user.two-factor-enable.request.dto';
import type { UserTwoFactorEnableResponseDto } from '@modules/user/dtos/response/user.two-factor-enable.response.dto';
import type { IUser } from '@modules/user/interfaces/user.interface';
import { UserTwoFactorService } from '@modules/user/services/user.two-factor.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class UserEnableTwoFactorUseCase implements IAppUseCase<
    [IUser, UserTwoFactorEnableRequestDto],
    IResponseReturn<UserTwoFactorEnableResponseDto>
> {
    constructor(
        private readonly userTwoFactorService: UserTwoFactorService,
        private readonly userPasswordService: UserPasswordService,
        private readonly userAuthService: UserAuthService,
        private readonly activityLogService: ActivityLogService
    ) {}

    /** Temporary: one UserPasswordService method recording the attempt through recordEffect (phase 3D). */
    private async assertPasswordMatched(
        user: IUser,
        password: string | null
    ): Promise<void> {
        const attempt =
            await this.userPasswordService.countPasswordAttempt(user);
        if (attempt === null) {
            return;
        }

        const lockoutLogs = attempt.lockoutStages.map(stage =>
            this.activityLogService.prepare(stage)
        );
        this.activityLogService.stagePrepared(lockoutLogs);

        await this.userAuthService.assertPasswordAttempt(attempt, password);
    }

    /** Temporary: one UserTwoFactorService method recording the attempt through recordEffect (phase 3D). */
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
        { code, password }: UserTwoFactorEnableRequestDto
    ): Promise<IResponseReturn<UserTwoFactorEnableResponseDto>> {
        // Sequential by design: gate before the work it guards
        await this.assertPasswordMatched(user, password ?? null);
        const pendingSecret = this.userTwoFactorService.getPendingSecret(user);
        await this.assertTwoFactorAttemptCounted(user);
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
