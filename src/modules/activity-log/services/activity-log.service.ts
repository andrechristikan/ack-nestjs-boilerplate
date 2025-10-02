import {
    IPaginationEqual,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { ActivityLogResponseDto } from '@modules/activity-log/dtos/response/activity-log.response.dto';
import { IActivityLogService } from '@modules/activity-log/interfaces/activity-log.service.interface';
import { ActivityLogRepository } from '@modules/activity-log/repositories/activity-log.repository';
import { ActivityLogUtil } from '@modules/activity-log/utils/activity-log.util';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ActivityLogService implements IActivityLogService {
    constructor(
        private readonly activityRepository: ActivityLogRepository,
        private readonly activityUtil: ActivityLogUtil
    ) {}

    async getListOffset(
        pagination: IPaginationQueryOffsetParams,
        user?: Record<string, IPaginationEqual>
    ): Promise<IResponsePagingReturn<ActivityLogResponseDto>> {
        const { data, ...others } =
            await this.activityRepository.findWithPaginationOffset(
                pagination,
                user
            );

        const activityLogs: ActivityLogResponseDto[] =
            this.activityUtil.mapList(data);
        return {
            data: activityLogs,
            ...others,
        };
    }

    async getListCursor(
        pagination: IPaginationQueryCursorParams,
        user?: Record<string, IPaginationEqual>
    ): Promise<IResponsePagingReturn<ActivityLogResponseDto>> {
        const { data, ...others } =
            await this.activityRepository.findWithPaginationCursor(
                pagination,
                user
            );

        const activityLogs: ActivityLogResponseDto[] =
            this.activityUtil.mapList(data);
        return {
            data: activityLogs,
            ...others,
        };
    }
}
