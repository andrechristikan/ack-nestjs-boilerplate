import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import { DeviceDomain } from '@modules/device/domains/device.domain';
import { NotificationDomain } from '@modules/notification/domains/notification.domain';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import type { INotificationRecipient } from '@modules/notification/interfaces/notification.interface';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import type { UserSendEmailVerificationRequestDto } from '@modules/user/dtos/request/user.send-email-verification.request.dto';
import type { UserVerifyEmailRequestDto } from '@modules/user/dtos/request/user.verify-email.request.dto';
import type { IUserRecipient } from '@modules/user/interfaces/user.interface';
import { UserVerificationDomain } from '@modules/user/domains/user.verification.domain';
import { UserVerificationUtil } from '@modules/user/utils/user.verification.util';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserVerificationHttpService {
    constructor(
        private readonly userVerificationDomain: UserVerificationDomain,
        private readonly userVerificationUtil: UserVerificationUtil,
        private readonly deviceDomain: DeviceDomain,
        private readonly notificationDomain: NotificationDomain,
        private readonly activityLogDomain: ActivityLogDomain,
        private readonly notificationQueue: NotificationQueue,
        private readonly notificationUtil: NotificationUtil,
        private readonly helperDateService: HelperDateService
    ) {}

    private async getRecipient(
        user: IUserRecipient,
        kind: EnumNotificationKind
    ): Promise<INotificationRecipient> {
        const [tokens, settings] = await Promise.all([
            this.deviceDomain.getNotificationTokens(user.id),
            this.notificationDomain.getListUserSetting(user.id),
        ]);

        return this.notificationUtil.mapRecipient(user, kind, tokens, settings);
    }

    async verifyEmail({
        token,
    }: UserVerifyEmailRequestDto): Promise<IResponseReturn<void>> {
        const { verification, user } =
            await this.userVerificationDomain.getOneActiveByEmailToken(token);

        const activityLogs = [
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.userVerifiedEmail,
                userId: verification.userId,
                createdBy: verification.userId,
            }),
        ];
        // Sequential by design: write must not run if an earlier step throws
        const recipient = await this.getRecipient(
            user,
            EnumNotificationKind.verifiedEmail
        );
        await this.userVerificationDomain.verifyEmail(verification);

        this.activityLogDomain.stagePrepared(activityLogs);

        await this.notificationQueue.sendVerifiedEmail(recipient, {
            reference: verification.reference,
        });

        return {};
    }

    async sendVerificationEmail({
        email,
    }: UserSendEmailVerificationRequestDto): Promise<IResponseReturn<void>> {
        const user =
            await this.userVerificationDomain.getOneForResendByEmail(email);
        if (user === null) {
            return {};
        }

        const emailVerification = this.userVerificationUtil.createEmail();
        const activityLogs = [
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.userSendVerificationEmail,
                userId: user.id,
                createdBy: user.id,
            }),
        ];
        // Sequential by design: write must not run if an earlier step throws
        const recipient = await this.getRecipient(
            user,
            EnumNotificationKind.verificationEmail
        );
        await this.userVerificationDomain.persistVerificationEmail(
            user.id,
            user.email,
            emailVerification
        );

        this.activityLogDomain.stagePrepared(activityLogs);

        const expiredAt = this.helperDateService.formatToIso(
            emailVerification.expiredAt
        );
        await this.notificationQueue.sendVerificationEmail(recipient, {
            expiredAt,
            reference: emailVerification.reference,
            link: emailVerification.link,
            expiredInMinutes: emailVerification.expiredInMinutes,
        });

        return {};
    }
}
