import {
    IPaginationEqual,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { ActivityLogResponseDto } from '@modules/activity-log/dtos/response/activity-log.response.dto';

export interface IActivityLogService {
    getListOffset(
        pagination: IPaginationQueryOffsetParams,
        user?: Record<string, IPaginationEqual>
    ): Promise<IResponsePagingReturn<ActivityLogResponseDto>>;
    getListCursor(
        pagination: IPaginationQueryCursorParams,
        user?: Record<string, IPaginationEqual>
    ): Promise<IResponsePagingReturn<ActivityLogResponseDto>>;
}
