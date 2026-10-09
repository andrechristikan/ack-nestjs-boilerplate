import type { MockProxy } from 'vitest-mock-extended';
import type { FirebaseService } from '@common/firebase/services/firebase.service';
import {
    EnumNotificationChannel,
    EnumNotificationPriority,
    EnumNotificationType,
} from '@generated/prisma-client/client';
import type { Notification } from '@generated/prisma-client/client';
import { EnumNotificationStep } from '@modules/notification/enums/notification.enum';
import type {
    INotificationPushStepResult,
    INotificationSendPushPayload,
} from '@modules/notification/interfaces/notification.interface';
import type { NotificationPushQueue } from '@modules/notification/queues/notification.push.queue';
import type { NotificationRepository } from '@modules/notification/repositories/notification.repository';

export interface INotificationPushDoubles {
    firebaseService: MockProxy<FirebaseService>;
    notificationRepository: MockProxy<NotificationRepository>;
    notificationPushQueue: MockProxy<NotificationPushQueue>;
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

export function buildPushNotification(): Notification {
    return {
        id: 'notification-id',
        userId: 'user-id',
        type: EnumNotificationType.transactional,
        priority: EnumNotificationPriority.normal,
        title: 'title',
        body: 'body',
        metadata: null,
        isRead: false,
        readAt: null,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedBy: null,
    };
}

export function expectPushSentWithCleanup(
    { notificationPushQueue, notificationRepository }: INotificationPushDoubles,
    send: INotificationSendPushPayload,
    result: INotificationPushStepResult,
    message: string
): void {
    expect(notificationPushQueue.sendCleanupTokens).toHaveBeenCalledWith(
        send.notificationId,
        send.userId,
        ['bad']
    );
    expect(notificationRepository.updateSentAt).toHaveBeenCalledWith(
        send.userId,
        send.notificationId,
        EnumNotificationChannel.push,
        ['bad']
    );
    expect(result).toEqual({
        message,
        completedSteps: PushAllSteps,
        failedSteps: [],
        failureTokens: ['bad'],
        pendingTokens: [],
    });
}

export function expectPushRetrySkipsSend(
    {
        firebaseService,
        notificationPushQueue,
        notificationRepository,
    }: INotificationPushDoubles,
    send: INotificationSendPushPayload,
    result: INotificationPushStepResult
): void {
    expect(firebaseService.sendMulticast).not.toHaveBeenCalled();
    expect(notificationPushQueue.sendCleanupTokens).not.toHaveBeenCalled();
    expect(notificationRepository.updateSentAt).toHaveBeenCalledWith(
        send.userId,
        send.notificationId,
        EnumNotificationChannel.push,
        ['bad']
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
    expect(result.failureTokens).toBeNull();
    expect(result.pendingTokens).toBeNull();
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
    expect(result.failureTokens).toEqual([]);
    expect(result.pendingTokens).toEqual(['t1', 't2']);
}

export function expectPushRetrySendsPending(
    {
        firebaseService,
        notificationPushQueue,
        notificationRepository,
    }: INotificationPushDoubles,
    send: INotificationSendPushPayload,
    result: INotificationPushStepResult
): void {
    expect(firebaseService.sendMulticast).toHaveBeenCalledWith(
        ['t2'],
        expect.any(Object)
    );
    expect(notificationPushQueue.sendCleanupTokens).toHaveBeenCalledWith(
        send.notificationId,
        send.userId,
        ['bad']
    );
    expect(notificationRepository.updateSentAt).toHaveBeenCalledWith(
        send.userId,
        send.notificationId,
        EnumNotificationChannel.push,
        ['bad']
    );
    expect(result.failedSteps).toEqual([]);
    expect(result.completedSteps).toEqual(PushAllSteps);
    expect(result.pendingTokens).toEqual([]);
}

export function expectPushFailureTokensMerged(
    { notificationRepository }: INotificationPushDoubles,
    send: INotificationSendPushPayload,
    result: INotificationPushStepResult
): void {
    expect(notificationRepository.updateSentAt).toHaveBeenCalledWith(
        send.userId,
        send.notificationId,
        EnumNotificationChannel.push,
        ['old', 'bad']
    );
    expect(result.failureTokens).toEqual(['old', 'bad']);
    expect(result.pendingTokens).toEqual([]);
}
