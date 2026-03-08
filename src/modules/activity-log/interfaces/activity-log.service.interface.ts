import {
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { Prisma } from '@generated/prisma-client';
import { ActivityLogResponseDto } from '@modules/activity-log/dtos/response/activity-log.response.dto';
import { PolicyAbility } from '@modules/policy/interfaces/policy.interface';

export interface IActivityLogService {
    getListOffset(
        userId: string,
        pagination: IPaginationQueryOffsetParams<
            Prisma.ActivityLogSelect,
            Prisma.ActivityLogWhereInput
        >,
        ability: PolicyAbility
    ): Promise<IResponsePagingReturn<ActivityLogResponseDto>>;
    getListCursor(
        userId: string,
        pagination: IPaginationQueryCursorParams<
            Prisma.ActivityLogSelect,
            Prisma.ActivityLogWhereInput
        >,
        ability: PolicyAbility
    ): Promise<IResponsePagingReturn<ActivityLogResponseDto>>;
}
