import type { MockProxy } from 'vitest-mock-extended';
import type { FirebaseService } from '@common/firebase/services/firebase.service';
import type { HelperEncryptionService } from '@common/helper/services/helper.encryption.service';
import { EnumNotificationChannel } from '@generated/prisma-client/client';
import type { NotificationPushDeliveryDomain } from '@modules/notification/domains/notification.push.delivery.domain';
import {
    EnumNotificationPushProcess,
    EnumNotificationStep,
} from '@modules/notification/enums/notification.enum';
import type {
    INotificationPushStepResult,
    INotificationRecipient,
    INotificationRecipientEncryptedPayload,
    INotificationSendPushEncryptedPayload,
} from '@modules/notification/interfaces/notification.interface';
import type { NotificationPushQueue } from '@modules/notification/queues/notification.push.queue';

export const TestPushStampedAt = new Date('2024-03-01T00:00:00.000Z');

export interface INotificationPushDoubles {
    firebaseService: MockProxy<FirebaseService>;
    notificationPushDeliveryDomain: MockProxy<NotificationPushDeliveryDomain>;
    notificationPushQueue: MockProxy<NotificationPushQueue>;
    helperEncryptionService: MockProxy<HelperEncryptionService>;
}

export const TestRecipient: INotificationRecipient = {
    userId: 'user-id',
    email: 'nadia@example.com',
    username: 'nadia',
    notificationTokens: ['token-1', 'token-2'],
    channels: [EnumNotificationChannel.email, EnumNotificationChannel.push],
};

export const TestEncryptedRecipient: INotificationRecipientEncryptedPayload = {
    encryptedEmail: 'cipher(nadia@example.com)',
    username: 'nadia',
    encryptedNotificationTokens: ['cipher(token-1)', 'cipher(token-2)'],
    channels: [EnumNotificationChannel.email, EnumNotificationChannel.push],
};

export function stubCipherDecryption(
    helperEncryptionService: MockProxy<HelperEncryptionService>
): void {
    helperEncryptionService.aes256Decrypt.mockImplementation(
        (encrypted: string) => encrypted.replace(/^cipher\((.*)\)$/, '$1')
    );
}

export function expectRecipientEncrypted(
    helperEncryptionService: MockProxy<HelperEncryptionService>,
    { userId, email, notificationTokens }: INotificationRecipient
): void {
    expect(helperEncryptionService.aes256Encrypt).toHaveBeenCalledWith(
        email,
        'secret-key',
        'notification.payload',
        userId
    );
    for (const token of notificationTokens) {
        expect(helperEncryptionService.aes256Encrypt).toHaveBeenCalledWith(
            token,
            'secret-key',
            'notification.payload',
            userId
        );
    }
}

export const PushRecordedSteps: EnumNotificationStep[] = [
    EnumNotificationStep.updateProcessAt,
    EnumNotificationStep.sendMulticast,
    EnumNotificationStep.cleanupTokens,
];

export const PushAllSteps: EnumNotificationStep[] = [
    ...PushRecordedSteps,
    EnumNotificationStep.updateSentAt,
];

export function expectPushSentWithCleanup(
    {
        notificationPushQueue,
        notificationPushDeliveryDomain,
    }: INotificationPushDoubles,
    send: INotificationSendPushEncryptedPayload,
    result: INotificationPushStepResult,
    message: string,
    process: EnumNotificationPushProcess
): void {
    expect(notificationPushQueue.sendCleanupTokens).toHaveBeenCalledWith(
        send.notificationId,
        send.userId,
        ['cipher(token-1)']
    );
    expect(notificationPushDeliveryDomain.stampSent).toHaveBeenCalledWith(
        send.notificationId,
        ['token-1'],
        process
    );
    expect(result).toEqual({
        message,
        completedSteps: PushAllSteps,
        failedSteps: [],
        encryptedFailureTokens: ['cipher(token-1)'],
        encryptedPendingTokens: [],
    });
}

export function expectPushRetrySkipsSend(
    {
        firebaseService,
        notificationPushQueue,
        notificationPushDeliveryDomain,
    }: INotificationPushDoubles,
    send: INotificationSendPushEncryptedPayload,
    result: INotificationPushStepResult,
    process: EnumNotificationPushProcess
): void {
    expect(firebaseService.sendMulticast).not.toHaveBeenCalled();
    expect(notificationPushQueue.sendCleanupTokens).not.toHaveBeenCalled();
    expect(notificationPushDeliveryDomain.stampSent).toHaveBeenCalledWith(
        send.notificationId,
        ['token-1'],
        process
    );
    expect(result.failedSteps).toEqual([]);
    expect(result.completedSteps).toEqual(PushAllSteps);
}

export function expectPushAllStepsSkipped(
    {
        firebaseService,
        notificationPushQueue,
        notificationPushDeliveryDomain,
    }: INotificationPushDoubles,
    result: INotificationPushStepResult
): void {
    expect(firebaseService.sendMulticast).not.toHaveBeenCalled();
    expect(notificationPushQueue.sendCleanupTokens).not.toHaveBeenCalled();
    expect(notificationPushDeliveryDomain.stampSent).not.toHaveBeenCalled();
    expect(result.failedSteps).toEqual([]);
    expect(result.completedSteps).toEqual(PushAllSteps);
}

export function expectPushSentAtFailure(
    { notificationPushQueue }: INotificationPushDoubles,
    result: INotificationPushStepResult
): void {
    expect(notificationPushQueue.sendCleanupTokens).toHaveBeenCalledTimes(1);
    expect(result.failedSteps).toEqual([
        {
            step: EnumNotificationStep.updateSentAt,
            rawError: new Error('mongo'),
        },
    ]);
    expect(result.completedSteps).toEqual(PushRecordedSteps);
}

export function expectPushSendFailure(
    {
        notificationPushQueue,
        notificationPushDeliveryDomain,
    }: INotificationPushDoubles,
    result: INotificationPushStepResult
): void {
    expect(notificationPushQueue.sendCleanupTokens).not.toHaveBeenCalled();
    expect(notificationPushDeliveryDomain.stampSent).not.toHaveBeenCalled();
    expect(result.failedSteps).toEqual([
        {
            step: EnumNotificationStep.sendMulticast,
            rawError: new Error('fcm'),
        },
    ]);
    expect(result.completedSteps).toEqual([
        EnumNotificationStep.updateProcessAt,
    ]);
    expect(result.encryptedFailureTokens).toBeNull();
    expect(result.encryptedPendingTokens).toBeNull();
}

export function expectPushOutagePending(
    {
        notificationPushQueue,
        notificationPushDeliveryDomain,
    }: INotificationPushDoubles,
    result: INotificationPushStepResult
): void {
    expect(notificationPushDeliveryDomain.stampSent).not.toHaveBeenCalled();
    expect(notificationPushQueue.sendCleanupTokens).not.toHaveBeenCalled();
    expect(result.failedSteps).toEqual([
        {
            step: EnumNotificationStep.sendMulticast,
            rawError: new Error('notification.queue.push.error.tokensPending'),
        },
    ]);
    expect(result.completedSteps).toEqual([
        EnumNotificationStep.updateProcessAt,
    ]);
    expect(result.encryptedFailureTokens).toEqual([]);
    expect(result.encryptedPendingTokens).toEqual([
        'cipher(token-1)',
        'cipher(token-2)',
    ]);
}

export function expectPushRetrySendsPending(
    {
        firebaseService,
        notificationPushQueue,
        notificationPushDeliveryDomain,
    }: INotificationPushDoubles,
    send: INotificationSendPushEncryptedPayload,
    result: INotificationPushStepResult,
    process: EnumNotificationPushProcess
): void {
    expect(firebaseService.sendMulticast).toHaveBeenCalledWith(
        ['token-2'],
        expect.any(Object)
    );
    expect(notificationPushQueue.sendCleanupTokens).toHaveBeenCalledWith(
        send.notificationId,
        send.userId,
        ['cipher(token-1)']
    );
    expect(notificationPushDeliveryDomain.stampSent).toHaveBeenCalledWith(
        send.notificationId,
        ['token-1'],
        process
    );
    expect(result.failedSteps).toEqual([]);
    expect(result.completedSteps).toEqual(PushAllSteps);
    expect(result.encryptedPendingTokens).toEqual([]);
}

export function expectPushFailureTokensMerged(
    { notificationPushDeliveryDomain }: INotificationPushDoubles,
    send: INotificationSendPushEncryptedPayload,
    result: INotificationPushStepResult,
    process: EnumNotificationPushProcess
): void {
    expect(notificationPushDeliveryDomain.stampSent).toHaveBeenCalledWith(
        send.notificationId,
        ['old', 'token-1'],
        process
    );
    expect(result.encryptedFailureTokens).toEqual([
        'cipher(old)',
        'cipher(token-1)',
    ]);
    expect(result.encryptedPendingTokens).toEqual([]);
}
