import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import { FeatureFlagService } from '@modules/feature-flag/services/feature-flag.service';
import {
    EnumFeatureFlagKey,
    EnumFeatureFlagMetadataKey,
} from '@modules/feature-flag/enums/feature-flag.enum';
import { NotificationService } from '@modules/notification/services/notification.service';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { UserPasswordService } from '@modules/user/services/user.password.service';
import type { UserForgotPasswordRequestDto } from '@modules/user/dtos/request/user.forgot-password.request.dto';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class UserForgotPasswordUseCase implements IAppUseCase<
    [UserForgotPasswordRequestDto],
    IResponseReturn<void>
> {
    constructor(
        private readonly userPasswordService: UserPasswordService,
        private readonly notificationService: NotificationService,
        private readonly featureFlagService: FeatureFlagService,
        private readonly activityLogService: ActivityLogService,
        private readonly notificationQueue: NotificationQueue,
        private readonly helperDateService: HelperDateService
    ) {}

    async execute({
        email,
    }: UserForgotPasswordRequestDto): Promise<IResponseReturn<void>> {
        // Sequential by design: gate before the work it guards
        await this.featureFlagService.validateFeatureFlagMetadata(
            EnumFeatureFlagKey.changePassword,
            EnumFeatureFlagMetadataKey.forgotAllowed
        );

        const prepared =
            await this.userPasswordService.prepareForgotPassword(email);
        if (prepared === null) {
            return {};
        }

        const { user, forgot } = prepared;
        const activityLogs = [
            this.activityLogService.prepare({
                action: EnumActivityLogAction.userForgotPassword,
                userId: user.id,
                createdBy: user.id,
            }),
        ];

        // Sequential by design: write must not run if an earlier step throws
        const recipient = await this.notificationService.getRecipient(
            user,
            EnumNotificationKind.forgotPassword
        );
        await this.userPasswordService.createForgotPassword(
            user.id,
            email,
            forgot
        );

        this.activityLogService.stagePrepared(activityLogs);

        const expiredAt = this.helperDateService.formatToIso(forgot.expiredAt);
        await this.notificationQueue.sendForgotPassword(recipient, {
            expiredAt,
            link: forgot.link,
            reference: forgot.reference,
            expiredInMinutes: forgot.expiredInMinutes,
            resendInMinutes: forgot.resendInMinutes,
        });

        return {};
    }
}
