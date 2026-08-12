import {
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { Prisma } from '@generated/prisma-client';
import { ActivityLogResponseDto } from '@modules/activity-log/dtos/response/activity-log.response.dto';

export interface IActivityLogService {
    getListOffsetByUser(
        userId: string,
        pagination: IPaginationQueryOffsetParams<Prisma.ActivityLogWhereInput>
    ): Promise<IResponsePagingReturn<ActivityLogResponseDto>>;
    getListCursorByUser(
        userId: string,
        pagination: IPaginationQueryCursorParams<Prisma.ActivityLogWhereInput>
    ): Promise<IResponsePagingReturn<ActivityLogResponseDto>>;
    getListOffsetByWorkspace(
        workspaceId: string,
        userId: string | null,
        pagination: IPaginationQueryOffsetParams<Prisma.ActivityLogWhereInput>
    ): Promise<IResponsePagingReturn<ActivityLogResponseDto>>;
    getListCursorByWorkspace(
        workspaceId: string,
        userId: string | null,
        pagination: IPaginationQueryCursorParams<Prisma.ActivityLogWhereInput>
    ): Promise<IResponsePagingReturn<ActivityLogResponseDto>>;
}
