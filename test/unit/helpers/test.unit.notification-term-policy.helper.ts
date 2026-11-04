import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import type { IPaginationCursorReturn } from '@common/pagination/interfaces/pagination.interface';
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

export function buildTermPolicyCursorPage(
    data: IUserRecipient[],
    hasNext: boolean
): IPaginationCursorReturn<IUserRecipient> {
    return {
        type: EnumPaginationType.cursor,
        perPage: 3,
        hasNext,
        data,
        ...(hasNext && { cursor: `cursor-after-${data.at(-1)?.id}` }),
    };
}
