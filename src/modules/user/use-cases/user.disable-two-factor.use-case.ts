import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import { OutboxService } from '@modules/outbox/services/outbox.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import { AuthTwoFactorNotEnabledException } from '@modules/auth/exceptions/auth.two-factor-not-enabled.exception';
import { SessionService } from '@modules/session/services/session.service';
import type { UserTwoFactorDisableRequestDto } from '@modules/user/dtos/request/user.two-factor-disable.request.dto';
import type { IUser } from '@modules/user/interfaces/user.interface';
import { UserTwoFactorService } from '@modules/user/services/user.two-factor.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class UserDisableTwoFactorUseCase implements IAppUseCase<
    [IUser, UserTwoFactorDisableRequestDto, IRequestContext],
    IResponseReturn<void>
> {
    constructor(
        private readonly userTwoFactorService: UserTwoFactorService,
        private readonly sessionService: SessionService,
        private readonly activityLogService: ActivityLogService,
        private readonly outboxService: OutboxService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly helperDateService: HelperDateService
    ) {}

    async execute(
        user: IUser,
        { code, backupCode, method }: UserTwoFactorDisableRequestDto,
        context: IRequestContext
    ): Promise<IResponseReturn<void>> {
        this.userTwoFactorService.assertEnabled(user);
        // Sequential by design: gate before the work it guards; write must not run if an earlier step throws
        await this.userTwoFactorService.assertAttemptCounted(user, context);
        await this.userTwoFactorService.verify(user, {
            code: code ?? null,
            backupCode: backupCode ?? null,
            method,
        });

        const now = this.helperDateService.create();
        try {
            await this.outboxService.withTransaction(async tx => {
                await this.userTwoFactorService.disableInTx(tx, user.id);
                await this.sessionService.revokeActiveByUserInTx(
                    tx,
                    user.id,
                    user.id,
                    now
                );
                const entry = this.activityLogService.recordEffect(
                    { action: EnumActivityLogAction.userDisableTwoFactor },
                    context
                );
                await this.outboxService.addInTx(tx, entry);
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

        return {};
    }
}
