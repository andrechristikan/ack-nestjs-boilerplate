import type { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import type {
    IAnalyticProjectCount,
    IAnalyticProjectCreation,
} from '@modules/analytic/interfaces/analytic.interface';

export interface IAnalyticProjectRepository {
    findCreation(
        startDate: Date,
        endDate: Date,
        perWorkspaceLimit: number
    ): Promise<IAnalyticProjectCreation>;
    groupMembership(
        params: IPaginationQueryOffsetParams
    ): Promise<IResponsePaginationReturn<IAnalyticProjectCount>>;
}
