import {
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { ActivityLogResponseDto } from '@modules/activity-log/dtos/response/activity-log.response.dto';
import { IPolicyAbilityRule } from '@modules/policy/interfaces/policy.interface';

export interface IActivityLogService {
    getListOffsetByAdmin(
        userId: string,
        pagination: IPaginationQueryOffsetParams,
        ability: IPolicyAbilityRule
    ): Promise<IResponsePagingReturn<ActivityLogResponseDto>>;
    getListCursor(
        pagination: IPaginationQueryCursorParams,
        ability: IPolicyAbilityRule
    ): Promise<IResponsePagingReturn<ActivityLogResponseDto>>;
}
