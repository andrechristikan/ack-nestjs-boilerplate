import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import { AuthTwoFactorNotEnabledException } from '@modules/auth/exceptions/auth.two-factor-not-enabled.exception';
import { SessionService } from '@modules/session/services/session.service';
import type { ISessionRef } from '@modules/session/interfaces/session.interface';
import { SessionQueue } from '@modules/session/queues/session.queue';
import type { UserTwoFactorDisableRequestDto } from '@modules/user/dtos/request/user.two-factor-disable.request.dto';
import type { IUser } from '@modules/user/interfaces/user.interface';
import { UserTwoFactorService } from '@modules/user/services/user.two-factor.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class UserDisableTwoFactorUseCase implements IAppUseCase<
    [IUser, UserTwoFactorDisableRequestDto],
    IResponseReturn<void>
> {
    constructor(
        private readonly userTwoFactorService: UserTwoFactorService,
        private readonly sessionService: SessionService,
        private readonly activityLogService: ActivityLogService,
        private readonly sessionQueue: SessionQueue,
        private readonly databaseService: DatabaseService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly helperDateService: HelperDateService
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
        { code, backupCode, method }: UserTwoFactorDisableRequestDto
    ): Promise<IResponseReturn<void>> {
        this.userTwoFactorService.assertEnabled(user);
        // Sequential by design: gate before the work it guards
        await this.assertTwoFactorAttemptCounted(user);
        // Sequential by design: the attempt is counted before the code is checked
        await this.userTwoFactorService.verify(user, {
            code: code ?? null,
            backupCode: backupCode ?? null,
            method,
        });

        const activityLogs = [
            this.activityLogService.prepare({
                action: EnumActivityLogAction.userDisableTwoFactor,
            }),
        ];
        const now = this.helperDateService.create();
        let revoked: ISessionRef[];
        try {
            // Sequential by design: write must not run if an earlier step throws
            revoked = await this.databaseService.withTransaction(async tx => {
                await this.userTwoFactorService.disableInTx(tx, user.id);

                return this.sessionService.revokeActiveByUserInTx(
                    tx,
                    user.id,
                    user.id,
                    now
                );
            });
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            const mapped = this.databaseUtil.toException(err);
            if (mapped instanceof DatabaseWriteConflictException) {
                throw new AuthTwoFactorNotEnabledException();
            }

            throw new AppUnknownException(err);
        }

        await this.sessionQueue.purgeLogins(user.id, revoked);

        this.activityLogService.stagePrepared(activityLogs);

        return {};
    }
}
