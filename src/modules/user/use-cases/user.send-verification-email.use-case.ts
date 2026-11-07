import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import { NotificationService } from '@modules/notification/services/notification.service';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import type { UserSendEmailVerificationRequestDto } from '@modules/user/dtos/request/user.send-email-verification.request.dto';
import { UserVerificationService } from '@modules/user/services/user.verification.service';
import { UserVerificationUtil } from '@modules/user/utils/user.verification.util';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class UserSendVerificationEmailUseCase implements IAppUseCase<
    [UserSendEmailVerificationRequestDto],
    IResponseReturn<void>
> {
    constructor(
        private readonly userVerificationService: UserVerificationService,
        private readonly userVerificationUtil: UserVerificationUtil,
        private readonly notificationService: NotificationService,
        private readonly activityLogService: ActivityLogService,
        private readonly notificationQueue: NotificationQueue
    ) {}

    async execute({
        email,
    }: UserSendEmailVerificationRequestDto): Promise<IResponseReturn<void>> {
        const user =
            await this.userVerificationService.getOneForResendByEmail(email);
        if (user === null) {
            return {};
        }

        const activityLogs = [
            this.activityLogService.prepare({
                action: EnumActivityLogAction.userSendVerificationEmail,
                userId: user.id,
                createdBy: user.id,
            }),
        ];
        // Sequential by design: write must not run if an earlier step throws
        const recipient = await this.notificationService.getRecipient(
            user,
            EnumNotificationKind.verificationEmail
        );
        const emailVerification =
            await this.userVerificationService.createEmail(user.id, user.email);

        this.activityLogService.stagePrepared(activityLogs);

        const payload =
            this.userVerificationUtil.mapEmailPayload(emailVerification);
        await this.notificationQueue.sendVerificationEmail(recipient, payload);

        return {};
    }
}
