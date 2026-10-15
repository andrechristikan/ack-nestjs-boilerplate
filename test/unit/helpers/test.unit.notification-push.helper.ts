import type { MockProxy } from 'vitest-mock-extended';
import type { FirebaseService } from '@common/firebase/services/firebase.service';
import type { HelperEncryptionService } from '@common/helper/services/helper.encryption.service';
import { EnumNotificationChannel } from '@generated/prisma-client/client';
import { EnumNotificationStep } from '@modules/notification/enums/notification.enum';
import type {
    INotificationPushStepResult,
    INotificationRecipient,
    INotificationRecipientEncryptedPayload,
    INotificationSendPushEncryptedPayload,
} from '@modules/notification/interfaces/notification.interface';
import type { NotificationPushQueue } from '@modules/notification/queues/notification.push.queue';
import type { NotificationRepository } from '@modules/notification/repositories/notification.repository';

export interface INotificationPushDoubles {
    firebaseService: MockProxy<FirebaseService>;
    notificationRepository: MockProxy<NotificationRepository>;
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
    { notificationPushQueue, notificationRepository }: INotificationPushDoubles,
    send: INotificationSendPushEncryptedPayload,
    result: INotificationPushStepResult,
    message: string
): void {
    expect(notificationPushQueue.sendCleanupTokens).toHaveBeenCalledWith(
        send.notificationId,
        send.userId,
        ['cipher(token-1)']
    );
    expect(notificationRepository.updateSentAt).toHaveBeenCalledWith(
        send.userId,
        send.notificationId,
        EnumNotificationChannel.push,
        ['token-1']
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
        notificationRepository,
    }: INotificationPushDoubles,
    send: INotificationSendPushEncryptedPayload,
    result: INotificationPushStepResult
): void {
    expect(firebaseService.sendMulticast).not.toHaveBeenCalled();
    expect(notificationPushQueue.sendCleanupTokens).not.toHaveBeenCalled();
    expect(notificationRepository.updateSentAt).toHaveBeenCalledWith(
        send.userId,
        send.notificationId,
        EnumNotificationChannel.push,
        ['token-1']
    );
    expect(result.failedSteps).toEqual([]);
    expect(result.completedSteps).toEqual(PushAllSteps);
}

export function expectPushAllStepsSkipped(
    {
        firebaseService,
        notificationPushQueue,
        notificationRepository,
    }: INotificationPushDoubles,
    result: INotificationPushStepResult
): void {
    expect(firebaseService.sendMulticast).not.toHaveBeenCalled();
    expect(notificationPushQueue.sendCleanupTokens).not.toHaveBeenCalled();
    expect(notificationRepository.updateSentAt).not.toHaveBeenCalled();
    expect(result.failedSteps).toEqual([]);
    expect(result.completedSteps).toEqual(PushAllSteps);
}

export function expectPushSentAtFailure(
    { notificationPushQueue }: INotificationPushDoubles,
    result: INotificationPushStepResult
): void {
    expect(notificationPushQueue.sendCleanupTokens).toHaveBeenCalledTimes(1);
    expect(result.failedSteps).toEqual([
        { step: EnumNotificationStep.updateSentAt, error: 'mongo' },
    ]);
    expect(result.completedSteps).toEqual(PushRecordedSteps);
}

export function expectPushSendFailure(
    { notificationPushQueue, notificationRepository }: INotificationPushDoubles,
    result: INotificationPushStepResult
): void {
    expect(notificationPushQueue.sendCleanupTokens).not.toHaveBeenCalled();
    expect(notificationRepository.updateSentAt).not.toHaveBeenCalled();
    expect(result.failedSteps).toEqual([
        { step: EnumNotificationStep.sendMulticast, error: 'fcm' },
    ]);
    expect(result.completedSteps).toEqual([
        EnumNotificationStep.updateProcessAt,
    ]);
    expect(result.encryptedFailureTokens).toBeNull();
    expect(result.encryptedPendingTokens).toBeNull();
}

export function expectPushOutagePending(
    { notificationPushQueue, notificationRepository }: INotificationPushDoubles,
    result: INotificationPushStepResult
): void {
    expect(notificationRepository.updateSentAt).not.toHaveBeenCalled();
    expect(notificationPushQueue.sendCleanupTokens).not.toHaveBeenCalled();
    expect(result.failedSteps).toEqual([
        {
            step: EnumNotificationStep.sendMulticast,
            error: '2 tokens pending retry',
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
        notificationRepository,
    }: INotificationPushDoubles,
    send: INotificationSendPushEncryptedPayload,
    result: INotificationPushStepResult
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
    expect(notificationRepository.updateSentAt).toHaveBeenCalledWith(
        send.userId,
        send.notificationId,
        EnumNotificationChannel.push,
        ['token-1']
    );
    expect(result.failedSteps).toEqual([]);
    expect(result.completedSteps).toEqual(PushAllSteps);
    expect(result.encryptedPendingTokens).toEqual([]);
}

export function expectPushFailureTokensMerged(
    { notificationRepository }: INotificationPushDoubles,
    send: INotificationSendPushEncryptedPayload,
    result: INotificationPushStepResult
): void {
    expect(notificationRepository.updateSentAt).toHaveBeenCalledWith(
        send.userId,
        send.notificationId,
        EnumNotificationChannel.push,
        ['old', 'token-1']
    );
    expect(result.encryptedFailureTokens).toEqual([
        'cipher(old)',
        'cipher(token-1)',
    ]);
    expect(result.encryptedPendingTokens).toEqual([]);
}
