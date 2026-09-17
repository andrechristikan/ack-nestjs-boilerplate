import type {
    IPaginationCursorReturn,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import type { IRequestLog } from '@common/request/interfaces/request.interface';
import type { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import type {
    IActivityLog,
    IActivityLogMetadata,
} from '@modules/activity-log/interfaces/activity-log.interface';
import { EnumActivityLogAction, Prisma } from '@generated/prisma-client/client';

export interface IActivityLogCreateManyRow {
    userId: string;
    createdBy: string;
    workspaceId: string | null;
    action: EnumActivityLogAction;
    description: string;
    requestLog: IRequestLog;
    metadata: IActivityLogMetadata;
}

export interface IActivityLogRepository {
    findUserScopedWithPaginationOffset(
        userId: string,
        {
            where,
            ...params
        }: IPaginationQueryOffsetParams<Prisma.ActivityLogWhereInput>
    ): Promise<IResponsePagingReturn<IActivityLog>>;
    findUserScopedWithPaginationCursor(
        userId: string,
        {
            where,
            ...params
        }: IPaginationQueryCursorParams<Prisma.ActivityLogWhereInput>
    ): Promise<IPaginationCursorReturn<IActivityLog>>;
    findByWorkspaceWithPaginationOffset(
        workspaceId: string,
        userId: string | null,
        {
            where,
            ...params
        }: IPaginationQueryOffsetParams<Prisma.ActivityLogWhereInput>
    ): Promise<IResponsePagingReturn<IActivityLog>>;
    findByWorkspaceWithPaginationCursor(
        workspaceId: string,
        userId: string | null,
        {
            where,
            ...params
        }: IPaginationQueryCursorParams<Prisma.ActivityLogWhereInput>
    ): Promise<IPaginationCursorReturn<IActivityLog>>;
    createMany(rows: IActivityLogCreateManyRow[]): Promise<Prisma.BatchPayload>;
}
