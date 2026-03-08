import {
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { Prisma } from '@generated/prisma-client';
import { ActivityLogResponseDto } from '@modules/activity-log/dtos/response/activity-log.response.dto';
import { IActivityLogService } from '@modules/activity-log/interfaces/activity-log.service.interface';
import { ActivityLogRepository } from '@modules/activity-log/repositories/activity-log.repository';
import { ActivityLogUtil } from '@modules/activity-log/utils/activity-log.util';
import { accessibleBy } from '@casl/prisma';
import { PolicyAbility } from '@modules/policy/interfaces/policy.interface';
import { PolicyService } from '@modules/policy/services/policy.service';
import { Injectable } from '@nestjs/common';
import {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@modules/policy/enums/policy.enum';

@Injectable()
export class ActivityLogService implements IActivityLogService {
    constructor(
        private readonly activityRepository: ActivityLogRepository,
        private readonly activityUtil: ActivityLogUtil,
        private readonly policyService: PolicyService
    ) {}

    //TODO: Move to utils
    private buildFieldOptions(permittedFields?: string[]) {
        if (!permittedFields) {return {};}
        return { select: Object.fromEntries(permittedFields.map(f => [f, true])) };
    }

    async getListOffset(
        userId: string,
        pagination: IPaginationQueryOffsetParams<
            Prisma.ActivityLogSelect,
            Prisma.ActivityLogWhereInput
        >,
        ability: PolicyAbility
    ): Promise<IResponsePagingReturn<ActivityLogResponseDto>> {
        const permittedFields = this.policyService.getPermittedFields(
            ability,
            EnumPolicyAction.read,
            EnumPolicySubject.activityLog
        );
        const { data, ...others } =
            await this.activityRepository.findWithPaginationOffset({
                ...pagination,
                ...this.buildFieldOptions(permittedFields),
                where: {
                    AND: [
                        pagination.where,
                        accessibleBy(ability).ActivityLog,
                        { userId },
                    ].filter(Boolean),
                },
            });

        const activityLogs: ActivityLogResponseDto[] =
            this.activityUtil.mapList(data);
        return {
            data: activityLogs,
            ...others,
        };
    }

    async getListCursor(
        userId: string,
        pagination: IPaginationQueryCursorParams<
            Prisma.ActivityLogSelect,
            Prisma.ActivityLogWhereInput
        >,
        ability: PolicyAbility
    ): Promise<IResponsePagingReturn<ActivityLogResponseDto>> {
        const permittedFields = this.policyService.getPermittedFields(
            ability,
            EnumPolicyAction.read,
            EnumPolicySubject.activityLog
        );
        const { data, ...others } =
            await this.activityRepository.findWithPaginationCursor({
                ...pagination,
                ...this.buildFieldOptions(permittedFields),
                where: {
                    AND: [
                        accessibleBy(ability).ActivityLog,
                        pagination.where,
                        { userId },
                    ].filter(Boolean),
                },
            });

        const activityLogs: ActivityLogResponseDto[] =
            this.activityUtil.mapList(data);
        return {
            data: activityLogs,
            ...others,
        };
    }
}
