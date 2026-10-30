import type {
    INotificationTermPolicyBatchRecipient,
    INotificationTermPolicyPage,
    INotificationTermPolicyRecipientState,
} from '@modules/notification/interfaces/notification.interface';
import type { IUserRecipient } from '@modules/user/interfaces/user.interface';

export function buildTermPolicyMarker(
    userId: string,
    batchId: string,
    sentAt: Date | null = null,
    claimedAt: Date | null = null
): INotificationTermPolicyRecipientState {
    return {
        userId,
        notificationId: `n-${userId}`,
        batchId,
        sentAt,
        claimedAt,
    };
}

export function buildTermPolicyRecipient(
    { id, email, username }: IUserRecipient,
    notificationId: string
): INotificationTermPolicyBatchRecipient {
    return { userId: id, notificationId, email, username };
}

export function buildTermPolicyPage(
    users: IUserRecipient[],
    freshUsers: IUserRecipient[] = users,
    pendingBatchIds: string[] = []
): INotificationTermPolicyPage {
    return { users, freshUsers, pendingBatchIds };
}
