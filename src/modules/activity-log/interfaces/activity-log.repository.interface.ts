import type {
    IPaginationCursorReturn,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import type {
    IActivityLog,
    IActivityLogCreate,
} from '@modules/activity-log/interfaces/activity-log.interface';

export interface IActivityLogRepository {
    findUserScopedWithPaginationOffset(
        userId: string,
        { where, ...params }: IPaginationQueryOffsetParams
    ): Promise<IResponsePaginationReturn<IActivityLog>>;
    findUserScopedWithPaginationCursor(
        userId: string,
        { where, ...params }: IPaginationQueryCursorParams
    ): Promise<IPaginationCursorReturn<IActivityLog>>;
    findByWorkspaceWithPaginationOffset(
        workspaceId: string,
        userId: string | null,
        { where, ...params }: IPaginationQueryOffsetParams
    ): Promise<IResponsePaginationReturn<IActivityLog>>;
    findByWorkspaceWithPaginationCursor(
        workspaceId: string,
        userId: string | null,
        { where, ...params }: IPaginationQueryCursorParams
    ): Promise<IPaginationCursorReturn<IActivityLog>>;
    createMany(rows: IActivityLogCreate[]): Promise<void>;
}
