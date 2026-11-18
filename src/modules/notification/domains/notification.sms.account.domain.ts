import { AwsSNSService } from '@common/aws/services/aws.sns.service';
import { HelperEncryptionService } from '@common/helper/services/helper.encryption.service';
import { MessageService } from '@common/message/services/message.service';
import { EnumNotificationChannel } from '@generated/prisma-client/client';
import { NotificationPayloadEncryptionPurpose } from '@modules/notification/constants/notification.constant';
import { EnumNotificationSmsProcess } from '@modules/notification/enums/notification.enum';
import type { INotificationSendSmsVerificationPayload } from '@modules/notification/interfaces/notification.interface';
import { NotificationRepository } from '@modules/notification/repositories/notification.repository';
import { UserMobileNumberDomain } from '@modules/user/domains/user.mobile-number.domain';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { IQueueResponse } from '@queues/interfaces/queue.interface';

/** Decrypts and sends the account verification SMS through SNS. */
@Injectable()
export class NotificationSmsAccountDomain {
    private readonly encryptionSecretKey: string;

    constructor(
        private readonly awsSNSService: AwsSNSService,
        private readonly configService: ConfigService,
        private readonly helperEncryptionService: HelperEncryptionService,
        private readonly messageService: MessageService,
        private readonly notificationRepository: NotificationRepository,
        private readonly userMobileNumberDomain: UserMobileNumberDomain
    ) {
        this.encryptionSecretKey = this.configService.get<string>(
            'app.encryptionSecretKey'
        )!;
    }

    /**
     * Sends the one-time code to the phone number; skips when SNS is off or the
     * number is empty.
     */
    async processVerificationMobileNumber({
        userId,
        notificationId,
        phoneNumber,
        encryptedOtp,
        expiredInMinutes,
        mobileNumberId,
        reference,
    }: INotificationSendSmsVerificationPayload): Promise<IQueueResponse> {
        const initialized = this.awsSNSService.isInitialized();
        if (!initialized || !phoneNumber) {
            return { message: 'SMS notification skipped' };
        }

        const isActiveVerification =
            await this.userMobileNumberDomain.isActiveVerification(
                userId,
                mobileNumberId,
                reference
            );
        if (!isActiveVerification) {
            return { message: 'Inactive SMS verification skipped' };
        }

        // Sequential by design: the row must be marked processing before the send, and sent only after it succeeds.
        const notification = await this.notificationRepository.updateProcessAt(
            userId,
            notificationId,
            EnumNotificationChannel.sms
        );
        if (!notification) {
            return {
                message: 'Notification not found, skipping SMS notification',
            };
        }

        const otp = this.helperEncryptionService.aes256Decrypt(
            encryptedOtp,
            this.encryptionSecretKey,
            NotificationPayloadEncryptionPurpose,
            userId
        );
        const message = this.messageService.setMessage(
            `notification.sms.${EnumNotificationSmsProcess.verificationMobileNumber}`,
            { properties: { otp, expiredInMinutes } }
        );
        const result = await this.awsSNSService.sendSms({
            phoneNumber,
            message,
        });

        await this.notificationRepository.updateSentAt(
            userId,
            notificationId,
            EnumNotificationChannel.sms,
            []
        );

        return { message: 'SMS verification processed', result };
    }
}
