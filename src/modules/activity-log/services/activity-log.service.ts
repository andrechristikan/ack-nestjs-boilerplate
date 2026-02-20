import {
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { ActivityLogResponseDto } from '@modules/activity-log/dtos/response/activity-log.response.dto';
import { IActivityLogService } from '@modules/activity-log/interfaces/activity-log.service.interface';
import { ActivityLogRepository } from '@modules/activity-log/repositories/activity-log.repository';
import { ActivityLogUtil } from '@modules/activity-log/utils/activity-log.util';
import { accessibleBy } from '@casl/prisma';
import { IPolicyAbilityRule } from '@modules/policy/interfaces/policy.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ActivityLogService implements IActivityLogService {
    constructor(
        private readonly activityRepository: ActivityLogRepository,
        private readonly activityUtil: ActivityLogUtil
    ) {}

    async getListOffset(
        userId: string,
        pagination: IPaginationQueryOffsetParams,
        ability: IPolicyAbilityRule
    ): Promise<IResponsePagingReturn<ActivityLogResponseDto>> {
        const { data, ...others } =
            await this.activityRepository.findWithPaginationOffset({
                ...pagination,
                where: {
                    AND: [
                        pagination.where,
                        accessibleBy(ability).ActivityLog,
                        { userId },
                    ].filter(Boolean),
                },
            });

        return {
            data: this.activityUtil.mapList(data),
            ...others,
        };
    }

    async getListCursor(
        userId: string,
        pagination: IPaginationQueryCursorParams,
        ability: IPolicyAbilityRule
    ): Promise<IResponsePagingReturn<ActivityLogResponseDto>> {

        const { data, ...others } =
            await this.activityRepository.findWithPaginationCursor({
                ...pagination,
                where: {
                    AND: [
                        accessibleBy(ability).ActivityLog,
                        pagination.where,
                        { userId },
                    ].filter(Boolean),
                },
            });

        return {
            data: this.activityUtil.mapList(data),
            ...others,
        };
    }
}
