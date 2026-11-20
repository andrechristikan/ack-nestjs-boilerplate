import { HelperEncryptionService } from '@common/helper/services/helper.encryption.service';
import type { INotificationTermPolicyBatchRecipientEncryptedPayload } from '@modules/notification/interfaces/notification.interface';
import { NotificationPayloadEncryptionPurpose } from '@modules/notification/constants/notification.constant';
import { TestUnitKitEncryptionSecret } from '@test/unit/helpers/test.unit.kit.helper';

export const TestPushStampedAt = new Date('2024-03-01T00:00:00.000Z');

export function buildSealedNotificationPayload(
    plaintext: string,
    context: string
): string {
    return new HelperEncryptionService().aes256Encrypt(
        plaintext,
        TestUnitKitEncryptionSecret,
        NotificationPayloadEncryptionPurpose,
        context
    );
}

export function buildUnsealedNotificationPayload(
    sealed: string,
    context: string
): string {
    return new HelperEncryptionService().aes256Decrypt(
        sealed,
        TestUnitKitEncryptionSecret,
        NotificationPayloadEncryptionPurpose,
        context
    );
}

export function buildSealedNotificationPayloads(
    plainValues: string[],
    context: string
): string[] {
    const sealed: string[] = [];
    for (const plaintext of plainValues) {
        sealed.push(buildSealedNotificationPayload(plaintext, context));
    }

    return sealed;
}

export function buildUnsealedNotificationPayloads(
    sealed: string[],
    context: string
): string[] {
    const plainValues: string[] = [];
    for (const value of sealed) {
        plainValues.push(buildUnsealedNotificationPayload(value, context));
    }

    return plainValues;
}

export function buildUnsealedRecipientEmails(
    recipients: INotificationTermPolicyBatchRecipientEncryptedPayload[]
): string[] {
    const emails: string[] = [];
    for (const { userId, encryptedEmail } of recipients) {
        emails.push(buildUnsealedNotificationPayload(encryptedEmail, userId));
    }

    return emails;
}
