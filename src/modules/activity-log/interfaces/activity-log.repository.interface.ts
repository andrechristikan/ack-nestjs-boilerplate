import type {
    IPaginationCursorReturn,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import type {
    IActivityLog,
    IActivityLogCreate,
    IActivityLogScope,
} from '@modules/activity-log/interfaces/activity-log.interface';
import { Prisma } from '@generated/prisma-client/client';

export interface IActivityLogRepository {
    findWithPaginationOffset(
        scope: IActivityLogScope,
        {
            where,
            ...params
        }: IPaginationQueryOffsetParams<Prisma.ActivityLogWhereInput>,
        additionalWhere?: Prisma.ActivityLogWhereInput
    ): Promise<IResponsePaginationReturn<IActivityLog>>;
    findWithPaginationCursor(
        scope: IActivityLogScope,
        {
            where,
            ...params
        }: IPaginationQueryCursorParams<Prisma.ActivityLogWhereInput>,
        additionalWhere?: Prisma.ActivityLogWhereInput
    ): Promise<IPaginationCursorReturn<IActivityLog>>;
    createMany(rows: IActivityLogCreate[]): Promise<Prisma.BatchPayload>;
}
