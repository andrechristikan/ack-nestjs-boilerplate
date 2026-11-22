import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import type { IPaginationCursorReturn } from '@common/pagination/interfaces/pagination.interface';
import type {
    ITermPolicyRecipientPage,
    ITermPolicyRecipientState,
} from '@modules/term-policy/interfaces/term-policy.interface';
import type { IUserRecipient } from '@modules/user/interfaces/user.interface';

export function buildTermPolicyMarker(
    userId: string,
    batchId: string,
    sentAt: Date | null = null,
    claimedAt: Date | null = null
): ITermPolicyRecipientState {
    return {
        userId,
        notificationId: `n-${userId}`,
        batchId,
        sentAt,
        claimedAt,
    };
}

export function buildTermPolicyPage(
    users: IUserRecipient[],
    freshUsers: IUserRecipient[] = users,
    pendingBatchIds: string[] = []
): ITermPolicyRecipientPage {
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
