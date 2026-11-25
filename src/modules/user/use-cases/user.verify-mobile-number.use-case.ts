import { DatabaseService } from '@common/database/services/database.service';
import { OutboxService } from '@common/outbox/services/outbox.service';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import type { UserVerifyMobileNumberRequestDto } from '@modules/user/dtos/request/user.verify-mobile-number.request.dto';
import { UserMobileNumberService } from '@modules/user/services/user.mobile-number.service';
import { UserVerificationService } from '@modules/user/services/user.verification.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';

@Injectable()
export class UserVerifyMobileNumberUseCase implements IAppUseCase<
    [
        IRequestContext,
        IApiKeyContext,
        IAuthJwtAccessContext,
        string,
        UserVerifyMobileNumberRequestDto,
    ],
    IResponseReturn<void>
> {
    constructor(
        private readonly userMobileNumberService: UserMobileNumberService,
        private readonly userVerificationService: UserVerificationService,
        private readonly notificationQueue: NotificationQueue,
        private readonly activityLogQueue: ActivityLogQueue,
        private readonly databaseService: DatabaseService,
        private readonly outboxService: OutboxService
    ) {}

    async execute(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        mobileNumberId: string,
        { otp }: UserVerifyMobileNumberRequestDto
    ): Promise<IResponseReturn<void>> {
        const { userId } = authContext;
        const [verification] = await Promise.all([
            this.userVerificationService.getOneActiveByMobileOtp(
                userId,
                mobileNumberId,
                otp
            ),
            this.userMobileNumberService.getOneUnverifiedMobileNumber(
                userId,
                mobileNumberId
            ),
        ]);

        await this.databaseService.withTransaction(async tx => {
            const consumed =
                await this.userVerificationService.markMobileUsedInTx(
                    tx,
                    verification.id,
                    userId
                );

            await this.userMobileNumberService.markVerifiedInTx(
                tx,
                userId,
                mobileNumberId
            );
            const entry = this.activityLogQueue.recordEffect(
                requestContext,
                apiKeyContext,
                authContext,
                null,
                {
                    action: EnumActivityLogAction.userMobileNumberVerified,
                }
            );
            const effect = this.notificationQueue.notify(
                EnumNotificationKind.verifiedMobileNumber,
                {
                    userId,
                    proceedBy: userId,
                    reference: consumed.reference,
                    mobileNumber: consumed.to,
                }
            );
            await this.outboxService.addManyInTx(tx, [entry, effect]);
        });

        return {};
    }
}
