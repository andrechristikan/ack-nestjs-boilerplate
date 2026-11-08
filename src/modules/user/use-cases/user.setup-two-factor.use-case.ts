import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import { EnumAuthTwoFactorMethod } from '@modules/auth/enums/auth.enum';
import { UserAuthService } from '@modules/user/services/user.auth.service';
import { UserPasswordService } from '@modules/user/services/user.password.service';
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
    [IUser, UserTwoFactorSetupRequestDto],
    IResponseReturn<IUserTwoFactorSetup>
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
        { backupCode, password }: UserTwoFactorSetupRequestDto
    ): Promise<IResponseReturn<IUserTwoFactorSetup>> {
        const activityLogs = [
            this.activityLogService.prepare({
                action: EnumActivityLogAction.userSetupTwoFactor,
                userId: user.id,
                createdBy: user.id,
            }),
        ];
        // Sequential by design: gate before the work it guards
        await this.assertPasswordMatched(user, password ?? null);
        const backupCodeForSetup =
            this.userTwoFactorService.getBackupCodeForSetup(
                user,
                backupCode ?? null
            );
        let backupCodeVerified: IUserTwoFactorVerifyResult | null = null;
        if (backupCodeForSetup !== null) {
            await this.assertTwoFactorAttemptCounted(user);
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
                backupCodeVerified
            );
        } else {
            await this.userTwoFactorService.saveSetup(user.id, encryptedSecret);
        }

        this.activityLogService.stagePrepared(activityLogs);

        return { data: { secret, otpauthUrl } };
    }
}
