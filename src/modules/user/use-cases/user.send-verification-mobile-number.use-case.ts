import { OutboxService } from '@common/outbox/services/outbox.service';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import { UserMobileNumberService } from '@modules/user/services/user.mobile-number.service';
import { UserVerificationService } from '@modules/user/services/user.verification.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';

@Injectable()
export class UserSendVerificationMobileNumberUseCase implements IAppUseCase<
    [IRequestContext, IApiKeyContext, IAuthJwtAccessContext, string],
    IResponseReturn<void>
> {
    constructor(
        private readonly userMobileNumberService: UserMobileNumberService,
        private readonly userVerificationService: UserVerificationService,
        private readonly activityLogService: ActivityLogService,
        private readonly outboxService: OutboxService
    ) {}

    async execute(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        mobileNumberId: string
    ): Promise<IResponseReturn<void>> {
        const { userId } = authContext;
        // Sequential by design: gates before the write they guard
        const mobileNumber =
            await this.userMobileNumberService.getOneUnverifiedMobileNumber(
                userId,
                mobileNumberId
            );
        const isResendable =
            await this.userVerificationService.isMobileResendable(
                userId,
                mobileNumberId
            );
        if (!isResendable) {
            return {};
        }

        const to = this.userMobileNumberService.toDialableNumber(mobileNumber);
        await this.outboxService.withTransaction(async tx => {
            await this.userVerificationService.sendMobileInTx(
                tx,
                userId,
                mobileNumberId,
                to
            );
            const entry = this.activityLogService.recordEffect(
                requestContext,
                apiKeyContext,
                authContext,
                null,
                {
                    action: EnumActivityLogAction.userSendVerificationMobileNumber,
                }
            );
            await this.outboxService.addInTx(tx, entry);
        });

        return {};
    }
}
