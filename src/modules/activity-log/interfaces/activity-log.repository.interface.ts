import { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import {
    IPaginationCursorReturn,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { IRequestLog } from '@common/request/interfaces/request.interface';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import {
    IActivityLog,
    IActivityLogMetadata,
} from '@modules/activity-log/interfaces/activity-log.interface';
import {
    ActivityLog,
    EnumActivityLogAction,
    Prisma,
} from '@generated/prisma-client';

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
    create(
        userId: string,
        action: EnumActivityLogAction,
        description: string,
        requestLog: IRequestLog,
        metadata?: IActivityLogMetadata
    ): Promise<ActivityLog>;
    createInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        action: EnumActivityLogAction,
        description: string,
        requestLog: IRequestLog,
        metadata: IActivityLogMetadata | undefined,
        workspaceId: string | null
    ): Promise<ActivityLog>;
}
