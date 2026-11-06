import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import { NotificationDomain } from '@modules/notification/domains/notification.domain';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import type { UserSendEmailVerificationRequestDto } from '@modules/user/dtos/request/user.send-email-verification.request.dto';
import type { UserVerifyEmailRequestDto } from '@modules/user/dtos/request/user.verify-email.request.dto';
import { UserVerificationDomain } from '@modules/user/domains/user.verification.domain';
import { UserVerificationUtil } from '@modules/user/utils/user.verification.util';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserVerificationHttpService {
    constructor(
        private readonly userVerificationDomain: UserVerificationDomain,
        private readonly userVerificationUtil: UserVerificationUtil,
        private readonly notificationDomain: NotificationDomain,
        private readonly activityLogDomain: ActivityLogDomain,
        private readonly notificationQueue: NotificationQueue
    ) {}

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
        const recipient = await this.notificationDomain.getRecipient(
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

        const activityLogs = [
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.userSendVerificationEmail,
                userId: user.id,
                createdBy: user.id,
            }),
        ];
        // Sequential by design: write must not run if an earlier step throws
        const recipient = await this.notificationDomain.getRecipient(
            user,
            EnumNotificationKind.verificationEmail
        );
        const emailVerification = await this.userVerificationDomain.createEmail(
            user.id,
            user.email
        );

        this.activityLogDomain.stagePrepared(activityLogs);

        const payload =
            this.userVerificationUtil.mapEmailPayload(emailVerification);
        await this.notificationQueue.sendVerificationEmail(recipient, payload);

        return {};
    }
}
